import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * bit-voice MCP — natural Indian voices for any product or game.
 *
 * A thin, token-gated front for Bitroot's voice service
 * (voice.bitroot.club, Pipecat + Sarvam + Claude, hosted in India).
 * MCP cannot carry live audio, so a conversation works in two steps:
 * start_voice_session returns a short-lived WebSocket URL; the product
 * hands it to a browser, which talks through voice.bitroot.club/client.js.
 * speak() is plain text-to-speech and returns the audio inline.
 */

const API = (process.env.VOICE_API_URL || "https://voice.bitroot.club").replace(/\/$/, "");

const VOICES = [
  "shubh", "aditya", "rahul", "rohan", "amit", "dev", "varun", "manan", "sumit", "kabir", "aayan",
  "ashutosh", "advait", "ratan", "ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita",
  "shreya", "roopa", "amelia", "sophia",
];
const LANGUAGES = ["en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN", "mr-IN", "gu-IN", "pa-IN", "od-IN"];
const MODELS = ["claude-haiku-4-5", "sarvam-105b-conversations", "deepseek-v4.1-flash"];

async function call(path, init = {}) {
  const key = process.env.VOICE_API_KEY;
  if (!key) throw new Error("VOICE_API_KEY is not configured on the server");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`voice service ${res.status}: ${body.slice(0, 600)}`);
  }
  return res;
}

const json = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: "text", text: String(err?.message ?? err) }] });

function embedSnippet(wsUrl) {
  return [
    `<script src="${API}/client.js"></script>`,
    "<script>",
    "  // Call from a click: browsers only allow the microphone after a user gesture.",
    `  const call = await BitVoice.connect(${JSON.stringify(wsUrl)}, {`,
    "    onState: (s) => console.log('voice', s),         // connecting | live | ended | error",
    "    onSpeaking: (on) => {/* animate the character */},",
    "  });",
    "  // call.mute(true); call.hangup();",
    "</script>",
  ].join("\n");
}

export function buildBitVoiceServer() {
  const server = new McpServer({ name: "froots/bit-voice", version: "1.0.0" });

  server.tool(
    "start_voice_session",
    "Start a live web voice conversation and get a WebSocket URL for a browser. " +
      "persona 'aarav' is Bitroot's AI sales rep (CRM playbook, logs the person as a lead). " +
      "persona 'custom' is any character you define: name, personality, objective, voice. " +
      "The URL must be opened within 10 minutes, in a browser, with voice.bitroot.club/client.js.",
    {
      persona: z.enum(["aarav", "custom"]).describe("'aarav' for sales conversations, 'custom' for your own character"),
      // aarav
      lead_name: z.string().max(120).optional().describe("aarav: the person's name (required for aarav)"),
      lead_email: z.string().max(200).optional().describe("aarav: email, lets Aarav book a meeting"),
      lead_company: z.string().max(200).optional(),
      lead_message: z.string().max(2000).optional().describe("aarav: what they asked about"),
      source: z.string().max(60).optional().describe("aarav: where the person came from, e.g. 'pricing-page'"),
      // custom
      name: z.string().max(60).optional().describe("custom: the character's name (required for custom)"),
      personality: z.string().max(8000).optional().describe("custom: who the character is and how they talk (required for custom)"),
      objective: z.string().max(2000).optional().describe("custom: what the character wants from this conversation"),
      context: z.record(z.any()).optional().describe("custom: facts the character knows right now (game state, user profile)"),
      first_speaker: z.enum(["agent", "user"]).optional().describe("custom: who speaks first. Default 'agent'"),
      opening_line: z.string().max(400).optional().describe("custom: first line when the agent speaks first"),
      voice: z.enum(VOICES).optional().describe("custom: voice, default 'shubh'. See list_voices"),
      language: z.enum(LANGUAGES).optional().describe("custom: default 'en-IN' (English + Hinglish)"),
      model: z.enum(MODELS).optional().describe("custom: default claude-haiku-4-5 (most natural); sarvam-105b-conversations is fastest"),
      pace: z.number().min(0.7).max(1.5).optional(),
      ambience: z.enum(["none", "office", "room"]).optional().describe("custom: background sound, default 'none'"),
      ambience_volume: z.number().int().min(0).max(40).optional(),
      idle_timeout_sec: z.number().int().min(0).max(120).optional().describe("custom: nudge, then end, after this much silence. 0 = never"),
      goodbye_line: z.string().max(200).optional(),
      // both
      max_duration_sec: z.number().int().min(30).max(1800).optional().describe("Hard limit, default 600"),
      webhook_url: z.string().url().optional().describe("Receives the session result (JSON POST) when it ends"),
      metadata: z.record(z.any()).optional().describe("Echoed back in results; never sent to the model"),
    },
    async (a) => {
      try {
        const common = {
          max_duration_sec: a.max_duration_sec, webhook_url: a.webhook_url, metadata: a.metadata,
        };
        let body;
        if (a.persona === "aarav") {
          if (!a.lead_name) return fail("lead_name is required for persona 'aarav'");
          body = {
            persona: "aarav",
            lead: { name: a.lead_name, email: a.lead_email, company: a.lead_company, message: a.lead_message },
            source: a.source || "froots",
            ...common,
          };
        } else {
          if (!a.name || !a.personality) return fail("name and personality are required for persona 'custom'");
          const { persona, lead_name, lead_email, lead_company, lead_message, source, ...rest } = a;
          body = { persona: "custom", ...rest };
        }
        // Drop undefined so the voice service applies its defaults.
        body = JSON.parse(JSON.stringify(body));
        const res = await call("/v1/sessions", { method: "POST", body: JSON.stringify(body) });
        const session = await res.json();
        return json({ ...session, embed: embedSnippet(session.ws_url) });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "get_voice_session",
    "Status, transcript and cost of a voice session. For 'aarav' sessions it also returns the CRM review " +
      "(outcome, summary, lead score, booked meeting) once the call has been reviewed, about 30 seconds after it ends.",
    { session_id: z.string().min(3).max(60) },
    async ({ session_id }) => {
      try {
        const res = await call(`/v1/sessions/${encodeURIComponent(session_id)}`);
        return json(await res.json());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "speak",
    "Text to speech in a natural Indian voice. Returns a WAV clip inline. " +
      "Use it for lines your product or game already wrote (NPC barks, notifications). About ₹0.003 per character.",
    {
      text: z.string().min(1).max(1500),
      voice: z.enum(VOICES).optional().describe("Default 'shubh'"),
      language: z.enum(LANGUAGES).optional().describe("Default 'en-IN'. Hinglish in Roman script works with en-IN"),
      pace: z.number().min(0.5).max(2).optional(),
      sample_rate: z.union([z.literal(8000), z.literal(16000), z.literal(22050), z.literal(24000)]).optional(),
    },
    async (a) => {
      try {
        const res = await call("/v1/speak", { method: "POST", body: JSON.stringify(a) });
        const wav = Buffer.from(await res.arrayBuffer()).toString("base64");
        return {
          content: [
            { type: "audio", data: wav, mimeType: "audio/wav" },
            { type: "text", text: `Spoke ${a.text.length} characters in voice '${a.voice || "shubh"}'.` },
          ],
        };
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.tool(
    "list_voices",
    "Voices, languages, models and background sounds that start_voice_session and speak accept.",
    {},
    async () => {
      try {
        const res = await call("/v1/voices");
        return json(await res.json());
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}
