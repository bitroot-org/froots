---
id: connect
sidebar_position: 2
title: Connecting your agent
---

# Connecting your agent

Everything speaks MCP over HTTP. You need two things: the **base URL** of the froots deployment and a **bearer token** (ask the Bitroot team).

## Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bit-graphics": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://FROOTS_BASE_URL/mcp/bit-graphics",
        "--header", "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

Restart Claude Desktop; the tools appear under the 🔨 icon. `mcp-remote` bridges the HTTP endpoint into the stdio transport Claude Desktop expects.

## Claude Code

```bash
claude mcp add bit-graphics --transport http \
  https://FROOTS_BASE_URL/mcp/bit-graphics \
  --header "Authorization: Bearer YOUR_TOKEN"
```

## bit-cli / Bit2

`~/.config/bit-cli/mcp.json`:

```json
{
  "mcpServers": {
    "bit-graphics": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://FROOTS_BASE_URL/mcp/bit-graphics",
        "--header", "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

Then hit **Sync MCP** on Bit2's Tools page.

## Raw JSON-RPC (any client)

```bash
curl -X POST https://FROOTS_BASE_URL/mcp/bit-graphics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
