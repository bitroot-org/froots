---
id: index
title: What is froots?
slug: /
---

# froots 🌱

**froots** is Bitroot's hosted fleet of MCP servers and agent APIs — every useful capability we build, published once, reachable by **any agent** (Claude Desktop, Claude Code, bit-cli/Bit2, custom agents) through a single URL per server.

## Why it exists

We kept building capabilities inside individual projects — image generation in bit-graphics, task boards in teamlife. Every new machine or teammate meant cloning repos, installing dependencies, and passing around API keys. froots ends that:

- **One deployment** on our own infrastructure (Dokploy), one URL per capability
- **Keys live server-side** — clients hold only a revocable bearer token
- **Add a server, everyone gets it** — the fleet grows in one repo

## The fleet

| Server | Endpoint | What it does |
|---|---|---|
| [bit-graphics](servers/bit-graphics) | `POST /mcp/bit-graphics` | Social-media image generation (Gemini Nano Banana / OpenAI gpt-image) + image style analysis |

## Architecture

```
froots (Node + Express, one container on Dokploy)
├── POST /mcp/bit-graphics    ← streamable HTTP MCP, stateless
├── POST /mcp/<next-server>   ← future capabilities mount here
└── GET  /health              ← liveness + fleet listing
```

Each endpoint is a standard [MCP](https://modelcontextprotocol.io) server over streamable HTTP. Auth is a bearer token checked against the `FROOTS_TOKENS` allowlist — issue one token per person or app, revoke by removing it.

Start with **[Connecting your agent →](connect)**
