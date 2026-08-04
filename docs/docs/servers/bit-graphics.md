---
id: bit-graphics
title: bit-graphics
---

# bit-graphics

Social-media image generation and style analysis, powered by the same provider stack as the [bit-graphics](https://github.com/yashthakur1/bit-graphics) studio app. Being hosted, generated images come back as **inline MCP image blocks** — Claude Desktop renders them directly in the conversation.

## Tools

### `generate_social_image`

Generate social-media-ready images. **2 variants by default**, returned fastest-first.

| Param | Type | Notes |
|---|---|---|
| `prompt` | string, required | What to depict, including style guidance |
| `format` | enum | Preset controlling aspect ratio — see `list_formats`. Default `ig-square` |
| `provider` | `gemini` \| `openai` | Nano Banana (default) or gpt-image |
| `count` | 1–4 | Variants; default 2 |

**Formats:** `ig-square` 1:1 · `ig-portrait` 4:5 · `ig-story` 9:16 · `li-square` 1:1 · `li-landscape` 16:9 · `li-story` 9:16 · `custom-square/portrait/story/landscape/widescreen`

### `analyze_image_style`

Send an image (base64), get structured style JSON back: a short `label`, a long reusable `prompt` describing the visual language, a hex `palette`, `typography` notes, and the design `era`. Feed the returned prompt into `generate_social_image` to produce new imagery in the same style.

| Param | Type | Notes |
|---|---|---|
| `image_base64` | string, required | Raw base64, no `data:` prefix |
| `mime_type` | enum | `image/png` (default), `jpeg`, `webp`, `gif` |

### `list_formats`

No parameters — returns the format preset table.

## Notes

- Generation takes **20–90s** depending on variant count; clients should allow long tool timeouts.
- Model selection is server-side via env (`GEMINI_IMAGE_MODEL`, `OPENAI_IMAGE_MODEL`, `GEMINI_TEXT_MODEL`).
- The local stdio twin of this server lives in the bit-graphics repo (`scripts/mcp-server.mjs`) — it writes files to disk instead of returning inline images, and its analysis uses the studio app's exact preset vocabulary.
