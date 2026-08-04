---
id: index
title: teamlife
slug: /
sidebar_position: 1
---

# teamlife

:::caution Planned — not yet deployed

teamlife has no endpoint on the fleet yet. This page reserves its place in
the docs; the tool reference lands with the server. Watch
<a href="/health"><code>/health</code></a> for the authoritative list of what is live.

:::

Project-board tools: list, create and update tasks, post progress and attach
screenshots — all attributed to the agent that did the work.

## Planned shape

| Endpoint | Status |
|---|---|
| `POST /mcp/teamlife` | not deployed |

Intended tools, subject to change as the server is built:

- **list tasks** — read the board, filtered by project or assignee
- **create / update task** — open work items and move them along
- **post progress** — comment on a task, optionally attaching a screenshot

## Building it

The server would live at `src/servers/teamlife.mjs` and register in the
`REGISTRY` in `src/index.mjs`. See
[Adding a new server](/docs/operations#adding-a-new-server-to-the-fleet) for
the full checklist.
