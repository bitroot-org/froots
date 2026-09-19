import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * bit-graphics MCP — hosted twin of the local stdio server in the
 * bit-graphics repo. Generates social-media imagery (Gemini Nano
 * Banana / OpenAI gpt-image) and analyzes image style. Being hosted,
 * it returns images as MCP image content blocks (base64) instead of
 * file paths — clients like Claude Desktop render them inline.
 */

const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2-2026-04-21";
const ANALYSIS_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const OPENAI_ANALYSIS_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";

const PROVIDERS = ["gemini", "openai"];
const KEY_ENV = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY" };
const configuredProviders = () => PROVIDERS.filter((p) => process.env[KEY_ENV[p]]);

// Mirror of bit-graphics lib/presets.ts channel formats.
const FORMATS = {
  "ig-square": { channel: "instagram", label: "Instagram Square Post", ratio: "1:1" },
  "ig-portrait": { channel: "instagram", label: "Instagram Portrait Post", ratio: "4:5" },
  "ig-story": { channel: "instagram", label: "Instagram Story / Reel Cover", ratio: "9:16" },
  "li-square": { channel: "linkedin", label: "LinkedIn Square Post", ratio: "1:1" },
  "li-landscape": { channel: "linkedin", label: "LinkedIn Landscape Post", ratio: "16:9" },
  "li-story": { channel: "linkedin", label: "LinkedIn Story", ratio: "9:16" },
  "custom-square": { channel: "custom", label: "Square 1:1", ratio: "1:1" },
  "custom-portrait": { channel: "custom", label: "Portrait 3:4", ratio: "3:4" },
  "custom-story": { channel: "custom", label: "Story 9:16", ratio: "9:16" },
  "custom-landscape": { channel: "custom", label: "Landscape 4:3", ratio: "4:3" },
  "custom-widescreen": { channel: "custom", label: "Widescreen 16:9", ratio: "16:9" },
};

async function generateGemini(prompt, ratio, count) {
  const { GoogleGenAI, Modality } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");
  const ai = new GoogleGenAI({ apiKey });
  const runs = Array.from({ length: count }, () =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: ratio } },
    }).then((res) => {
      const bufs = [];
      for (const part of res.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) bufs.push(part.inlineData.data);
      }
      return bufs;
    }),
  );
  // Completion order: fastest variant first.
  const images = [];
  const errors = [];
  await Promise.all(runs.map((run) =>
    run.then((bufs) => images.push(...bufs)).catch((err) => errors.push(err)),
  ));
  if (!images.length) throw errors[0] ?? new Error("Gemini returned no image data");
  return images;
}

function openaiSize(ratio) {
  if (ratio === "1:1") return "1024x1024";
  const [w, h] = ratio.split(":").map(Number);
  return w >= h ? "1536x1024" : "1024x1536";
}

async function generateOpenAI(prompt, ratio, count) {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server");
  const client = new OpenAI({ apiKey });
  const res = await client.images.generate({
    model: OPENAI_MODEL, prompt, n: count, size: openaiSize(ratio),
  });
  const images = (res.data ?? []).filter((d) => d.b64_json).map((d) => d.b64_json);
  if (!images.length) throw new Error("OpenAI returned no image data");
  return images;
}

const ANALYSIS_PROMPT = `You are a senior brand designer analyzing an image's visual style so it can be reproduced.
Return strict JSON with:
- "label": short scannable style name (≤ 4 words)
- "prompt": a long-form, reusable description of the visual language — composition, subject treatment, lighting, texture, mood — written so an image model can recreate the style on new subjects
- "palette": { "bg", "accent", "accentSecondary", "ink", "inkOnAccent" } as hex strings read from the image
- "typography": { "weight", "case", "tracking", "mood" } as short descriptors (or null if no type present)
- "era": one short descriptor of the design era/movement it evokes
Ground everything in what is actually visible. No commentary outside the JSON.`;

async function analyzeStyleOpenAI(imageBase64, mimeType) {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server");
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: OPENAI_ANALYSIS_MODEL,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: ANALYSIS_PROMPT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    }],
  });
  const text = res.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("OpenAI returned no analysis");
  return JSON.parse(text);
}

async function analyzeStyle(imageBase64, mimeType) {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: [{
      role: "user",
      parts: [
        { text: ANALYSIS_PROMPT },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
    }],
    config: { responseMimeType: "application/json" },
  });
  const text = res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned no analysis");
  return JSON.parse(text);
}

// Pull an HTTP-ish status out of either SDK's error (both expose `.status`;
// Gemini also embeds it in the message as JSON / RESOURCE_EXHAUSTED).
function errorStatus(err) {
  const direct = Number(err?.status ?? err?.code);
  if (Number.isInteger(direct) && direct >= 100 && direct < 600) return direct;
  const msg = String(err?.message ?? "");
  const m = msg.match(/"code"\s*:\s*(\d{3})/) ?? msg.match(/\b(429|500|502|503|504)\b/);
  if (m) return Number(m[1]);
  if (/RESOURCE_EXHAUSTED/.test(msg)) return 429;
  if (/UNAVAILABLE|overloaded/i.test(msg)) return 503;
  return undefined;
}

// Tool-level failure the client can act on: says which provider failed, why,
// and which provider to pass on the next attempt.
function providerFailure(provider, err) {
  const status = errorStatus(err);
  const alternatives = PROVIDERS.filter((p) => p !== provider);
  const available = alternatives.filter((p) => configuredProviders().includes(p));
  const retryable = status === 429 || (status !== undefined && status >= 500);
  return {
    isError: true,
    content: [{
      type: "text",
      text: JSON.stringify({
        error: String(err?.message ?? err).slice(0, 500),
        provider,
        status: status ?? null,
        retryable,
        retryWithProvider: available[0] ?? null,
        hint: available.length
          ? `${provider} failed${status ? ` (${status})` : ""}. Call this tool again with provider: "${available[0]}".`
          : `${provider} failed${status ? ` (${status})` : ""}; no other provider is configured on the server.`,
      }, null, 2),
    }],
  };
}

export function buildBitGraphicsServer() {
  const server = new McpServer({ name: "froots/bit-graphics", version: "1.0.0" });

  server.tool(
    "list_formats",
    "List the social-media format presets (channel, label, aspect ratio) available to generate_social_image.",
    {},
    async () => ({
      content: [{
        type: "text",
        text: Object.entries(FORMATS)
          .map(([id, f]) => `${id} — ${f.label} (${f.ratio})`)
          .join("\n"),
      }],
    }),
  );

  server.tool(
    "generate_social_image",
    "Generate social-media-ready images. Returns 2 variants by default (count=1 opts out) as inline images, fastest first. provider: gemini = Nano Banana (default), openai = gpt-image. If a call fails (e.g. 429 rate limit), the error result names a retryWithProvider — call again with that provider.",
    {
      prompt: z.string().describe("What the image should depict, including style guidance"),
      format: z.enum(Object.keys(FORMATS)).optional().describe("Format preset; default ig-square"),
      provider: z.enum(PROVIDERS).optional()
        .describe("Image backend: gemini (Nano Banana, default) or openai (gpt-image). Switch to the other on 429/5xx errors."),
      count: z.number().int().min(1).max(4).optional().describe("Variants (default 2)"),
    },
    async ({ prompt, format, provider, count }) => {
      const formatId = format && FORMATS[format] ? format : "ig-square";
      const spec = FORMATS[formatId];
      const n = Math.min(Math.max(count ?? 2, 1), 4);
      const styled = `${prompt}\n\nFormat: ${spec.label} (${spec.ratio}) for ${spec.channel}.`;
      const used = provider === "openai" ? "openai" : "gemini";
      let images;
      try {
        images = used === "openai"
          ? await generateOpenAI(styled, spec.ratio, n)
          : await generateGemini(styled, spec.ratio, n);
      } catch (err) {
        return providerFailure(used, err);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              provider: used,
              model: used === "openai" ? OPENAI_MODEL : GEMINI_MODEL,
              format: formatId,
              aspectRatio: spec.ratio,
              variants: images.length,
              order: "fastest first",
            }, null, 2),
          },
          ...images.map((data) => ({ type: "image", data, mimeType: "image/png" })),
        ],
      };
    },
  );

  server.tool(
    "analyze_image_style",
    "Analyze an image's visual style: returns a reusable style prompt, hex palette, typography notes and era as JSON. Feed the prompt into generate_social_image to reproduce the style. provider: gemini (default) or openai; switch on 429/5xx errors.",
    {
      image_base64: z.string().describe("Base64-encoded image data (no data: prefix)"),
      mime_type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
      provider: z.enum(PROVIDERS).optional()
        .describe("Vision backend: gemini (default) or openai. Switch to the other on 429/5xx errors."),
    },
    async ({ image_base64, mime_type, provider }) => {
      const used = provider === "openai" ? "openai" : "gemini";
      let analysis;
      try {
        analysis = used === "openai"
          ? await analyzeStyleOpenAI(image_base64, mime_type ?? "image/png")
          : await analyzeStyle(image_base64, mime_type ?? "image/png");
      } catch (err) {
        return providerFailure(used, err);
      }
      return {
        content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
      };
    },
  );

  return server;
}
