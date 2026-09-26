---
id: index
title: bit-voice
slug: /
sidebar_position: 1
---

# bit-voice

Natural Indian voices for any product or game. Two things you can do:

- **Talk live**, from a web page: with **Aarav**, Bitroot's AI sales rep, or with **your own character** (a game NPC, a product guide).
- **Speak a line**: text to speech in 25 voices, English and Hinglish plus 10 Indian languages.

Voices are Sarvam Bulbul v3, speech recognition is Sarvam Saaras (Hinglish code-mix), the brain is Claude Haiku 4.5 by default. The voice service runs in India (`voice.bitroot.club`), next to Sarvam, to keep replies fast.

## How a live conversation works

MCP carries tool calls, not live audio. So a conversation takes two steps:

1. Your server (or agent) calls **`start_voice_session`**. It returns a `ws_url` that is valid for 10 minutes and works once.
2. A browser opens that URL with the client script. The person talks; the voice answers.

```html
<script src="https://voice.bitroot.club/client.js"></script>
<button id="talk">Talk</button>
<script>
  document.getElementById("talk").onclick = async () => {
    const { ws_url } = await fetch("/my-server/voice-session", { method: "POST" }).then((r) => r.json());
    const call = await BitVoice.connect(ws_url, {
      onState: (s) => console.log(s),        // connecting | live | ended | error
      onSpeaking: (on) => npc.talking = on,  // animate the character's mouth
      onTranscript: (line) => {              // each line as it is spoken
        if (line.final) chat.add(line.role, line.text);
      },
    });
    // call.mute(true); call.setVolume(0.8); call.hangup();
  };
</script>
```

### Live transcript

During the call, `onTranscript` receives every line as it is spoken:

```js
{ role: "agent" | "user", text: "…", turn: 3, final: true, interrupted: false }
```

- `turn` is the line's position in the session transcript, so it matches `get_voice_session` exactly.
- `final: false` lines are an early preview of what the person is saying. The same `turn` comes again with `final: true` when they finish. Act only on final lines.
- `interrupted: true` on an agent line means the person talked over it. `text` is what was actually said before the stop.
- `get_voice_session` also shows the transcript growing while the session is `live`. `duration_sec` and `cost_inr` are filled in when it ends.

Needs client.js 1.1.0 or later (`BitVoice.version`).

Keep the froots token (or the voice API key) on your server. Only the `ws_url` goes to the browser: it is signed, single-use and short-lived. Call `connect()` from a click or key press, because browsers only allow the microphone after a user gesture.

## Tools

### `start_voice_session`

| Param | For | Notes |
|---|---|---|
| `persona` | both | `aarav` or `custom` |
| `lead_name` | aarav | Required. Aarav greets them by first name |
| `lead_email`, `lead_company`, `lead_message` | aarav | Optional. With an email, Aarav can book a meeting on cal.com/bitroot |
| `source` | aarav | Where the person came from. The CRM shows `api:froots:<source>` |
| `name`, `personality` | custom | Required. Who the character is and how they talk |
| `objective` | custom | What the character wants from this conversation |
| `context` | custom | JSON facts the character knows right now (game state, the player's inventory) |
| `first_speaker` | custom | `agent` (default) or `user`, for NPCs that wait to be spoken to |
| `opening_line` | custom | First line when the agent speaks first |
| `voice` | custom | Default `shubh`. See `list_voices` |
| `language` | custom | Default `en-IN`, which covers English and Hinglish |
| `model` | custom | `claude-haiku-4-5` (default, most natural), `sarvam-105b-conversations` (fastest, cheapest, mostly English), `deepseek-v4.1-flash` |
| `pace` | custom | 0.7–1.5, default 1.05 |
| `ambience`, `ambience_volume` | custom | `none` (default), `office`, `room`; volume 0–40 % |
| `idle_timeout_sec` | custom | After this much silence the voice nudges, then says goodbye. `0` turns it off. Default 15 |
| `goodbye_line` | custom | Said when the voice ends the conversation |
| `max_duration_sec` | both | Hard limit, 30–1800, default 600 |
| `webhook_url` | both | Gets a JSON POST with the transcript and cost when the session ends |
| `metadata` | both | Echoed back in every result, never shown to the model |

Returns `session_id`, `ws_url`, `connect_by` and a ready `embed` snippet.

**Aarav sessions** always use Aarav's CRM settings (playbook, voice, background) and create a lead in the Bitroot CRM. Nobody is ever phoned from a web session.

### `get_voice_session`

`session_id` → `status` (`created`, `live`, `ended`, `expired`), `result.transcript` (grows during a live session), `result.duration_sec`, `result.cost_inr`, your `metadata`. For Aarav it adds `crm`: outcome, summary, lead score, qualification and any booked meeting, about 30 seconds after the call ends.

### `speak`

`text` (max 1,500 characters), `voice`, `language`, `pace`, `sample_rate` → a WAV clip as an inline audio block. Use it for lines your game or product already wrote.

### `list_voices`

Voices, languages, models and background sounds.

## Writing good characters

- **Let your code decide, let the voice speak.** Compute facts in your game (`"can_afford": false`, `"quest_done": true`) and pass them in `context`. The voice model is not reliable at arithmetic or rules.
- Keep `personality` to a few sentences: who they are, how they talk, one quirk. Put the goal in `objective`.
- Replies are capped at about 30 words, so the conversation feels like talk, not a lecture. Set `voice_rules: false` through the REST API if you need longer answers.

## Costs and limits

| | Cost |
|---|---|
| Live conversation, Claude | ≈ ₹4–6 per minute |
| Live conversation, Sarvam model | ≈ ₹2–3 per minute |
| `speak` | ≈ ₹0.003 per character |

At most 5 live sessions run at once across all products; beyond that `ws_url` connections get a "busy" error. Every session has a hard time limit.

## REST API

The same features are available without MCP at `https://voice.bitroot.club/v1` (`POST /v1/sessions`, `GET /v1/sessions/{id}`, `POST /v1/speak`, `GET /v1/voices`) with `Authorization: Bearer <voice API key>`. Interactive reference: [voice.bitroot.club/v1/docs](https://voice.bitroot.club/v1/docs). Ask Bitroot for a key per product.
