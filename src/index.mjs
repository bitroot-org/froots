import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildBitGraphicsServer } from "./servers/bit-graphics.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(rootDir, "public");
const docsDir = join(rootDir, "docs", "build");

/**
 * froots — Bitroot's hosted MCP fleet.
 *
 * One process, one endpoint per capability:
 *   POST /mcp/bit-graphics   (streamable HTTP MCP, stateless)
 *   GET  /health
 *
 * Auth: Authorization: Bearer <token>, tokens from FROOTS_TOKENS
 * (comma-separated). Add a server = add a builder to REGISTRY.
 */

const REGISTRY = {
  "bit-graphics": buildBitGraphicsServer,
};

const tokens = new Set(
  (process.env.FROOTS_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
);

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, servers: Object.keys(REGISTRY) });
});

// Landing page + assets first, so `/` is the landing page and not the
// docs site's own index. /mcp/* routes are declared below; everything
// else falls through to the static site.
app.use(express.static(publicDir));

// Docusaurus output: fleet docs at /docs, and one section per server at
// /<server>/docs. Built into docs/build by the Dockerfile; absent in a
// bare `npm start`, in which case these routes simply 404.
//
// The site is built with trailingSlash:true, so every page is a directory
// holding index.html — /docs 301s to /docs/ and lands on the page, which
// is also the canonical form Docusaurus generates its own links in.
app.use(express.static(docsDir));

function authorized(req) {
  if (tokens.size === 0) return false; // no tokens configured = locked
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return tokens.has(token);
}

app.post("/mcp/:name", async (req, res) => {
  if (!authorized(req)) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized — missing or invalid bearer token" },
      id: req.body?.id ?? null,
    });
    return;
  }
  const build = REGISTRY[req.params.name];
  if (!build) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32601, message: `No such server: ${req.params.name}` },
      id: req.body?.id ?? null,
    });
    return;
  }

  // Stateless: fresh server + transport per request — no session
  // bookkeeping, safe behind any proxy.
  const server = build();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: String(err?.message ?? err) },
        id: req.body?.id ?? null,
      });
    }
  }
});

// GET/DELETE on MCP endpoints: stateless server → 405 per spec.
app.all("/mcp/:name", (_req, res) => {
  res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed — stateless server, POST only" },
    id: null,
  });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`froots listening on :${port} — servers: ${Object.keys(REGISTRY).join(", ")}`);
  if (tokens.size === 0) {
    console.warn("WARNING: FROOTS_TOKENS is empty — all requests will be rejected.");
  }
});
