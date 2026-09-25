# froots 🌱

Bitroot's hosted MCP fleet — every capability we build, published once, reachable by any agent through one URL per server.

- **Endpoints**: `POST /mcp/bit-graphics`, `POST /mcp/bit-voice` (more servers mount as the fleet grows)
- **Auth**: `Authorization: Bearer <token>` against the `FROOTS_TOKENS` allowlist
- **Runs on**: Bitroot's Dokploy instance, single Docker container
- **Docs**: https://froots.bitroot.club/docs (per-server: `/<server>/docs`) — built into the app container, not GitHub Pages

## Local dev

```bash
npm install
FROOTS_TOKENS=dev GEMINI_API_KEY=... npm run dev
curl -s localhost:3000/health
```

## Adding a server

`src/servers/<name>.mjs` → export a builder → register in `REGISTRY` in `src/index.mjs` → document in `docs/`. Push to main; Dokploy redeploys.

