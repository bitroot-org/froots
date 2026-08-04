---
id: index
title: heartbit
slug: /
sidebar_position: 1
---

# heartbit

:::caution Planned — not yet deployed

heartbit has no endpoint on the fleet yet. This page reserves its place in
the docs; the tool reference lands with the server. Watch
<a href="/health"><code>/health</code></a> for the authoritative list of what is live.

:::

Market-pulse listening: read feeds and trends, then distil audience clusters
and content ideas the Bitroot way.

## Planned shape

| Endpoint | Status |
|---|---|
| `POST /mcp/heartbit` | not deployed |

Intended tools, subject to change as the server is built:

- **read the pulse** — pull from configured feeds and surface what is moving
- **cluster the audience** — group signals into audience segments
- **suggest content** — turn a cluster into concrete content ideas

## Building it

The server would live at `src/servers/heartbit.mjs` and register in the
`REGISTRY` in `src/index.mjs`. See
[Adding a new server](/docs/operations#adding-a-new-server-to-the-fleet) for
the full checklist.
