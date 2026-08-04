---
id: operations
sidebar_position: 3
title: Operations
---

# Operations

## Deployment

froots runs as a single Docker container on Bitroot's **Dokploy** instance. The `Dockerfile` at the repo root is the whole build — Dokploy auto-deploys from `main`.

The build is two-stage: stage one compiles this documentation site with Docusaurus, stage two copies the static output in alongside the app. One container serves the landing page, the docs, and every `/mcp/*` endpoint, so the docs can never drift from the deployment they describe.

Environment (set in Dokploy → froots → Environment):

```bash
FROOTS_TOKENS=token1,token2      # comma-separated bearer allowlist
GEMINI_API_KEY=...               # Nano Banana + analysis
OPENAI_API_KEY=...               # gpt-image (optional)
```

## Issuing & revoking tokens

Tokens are plain strings in `FROOTS_TOKENS`. Convention: `froots_<person>_<random>`.

```bash
echo "froots_alice_$(openssl rand -hex 12)"
```

Add it to the env var, redeploy (seconds), share it. Revoke by removing it. One token per person/app — never share tokens between consumers, or you lose the ability to revoke selectively.

## Adding a new server to the fleet

1. Create `src/servers/<name>.mjs` exporting `build<Name>Server()` — an `McpServer` with your tools (copy `bit-graphics.mjs` as the template).
2. Register it in `src/index.mjs`: add to `REGISTRY`.
3. Document it: create `docs/content/<name>/index.md` and add one entry to the `SERVERS` array in `docs/docusaurus.config.js`. The sidebar autogenerates from the folder and the navbar link follows — no sidebar file to edit.
4. Push to `main` — Dokploy redeploys, the endpoint is live at `/mcp/<name>`, and its docs are live at `/<name>/docs`.

## Health

`GET /health` (no auth) returns `{ ok, servers }` — wire it into uptime monitoring.
