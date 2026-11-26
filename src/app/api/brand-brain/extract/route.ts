import { NextResponse } from "next/server";
import { z } from "zod";
import mammoth from "mammoth";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { acquireToolset } from "@/features/mcp-client/registry";
import { prepareForLlm } from "@/features/ai-provider/gpu";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { autoFreeVram } from "@/features/vram";
import { brandBrain2ProfileSchema } from "@/features/brand-brain/schemas";
import type { BrandBrain2Profile } from "@/features/brand-brain/types";
import type { ProviderConfig } from "@/features/ai-provider/types";

const extractRequestSchema = z.object({
  sourceType: z.enum(["url", "text", "file"]),
  sourceValue: z.string().min(1, "sourceValue is required"),
  fileName: z.string().optional(),
});

async function parsePdfBuffer(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
  const data = await pdf(buf);
  return data.text || "";
}

async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 20_000);
}

export async function POST(request: Request) {
  let sourceType: "url" | "text" | "file" = "text";
  let sourceValue = "";
  let fileName = "";

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        sourceType = "file";
        fileName = file.name;
        const arrayBuf = await file.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (fileName.toLowerCase().endsWith(".pdf")) {
          sourceValue = await parsePdfBuffer(buf);
        } else if (fileName.toLowerCase().endsWith(".docx")) {
          const parsedDocx = await mammoth.extractRawText({ buffer: buf });
          sourceValue = parsedDocx.value;
        } else {
          sourceValue = buf.toString("utf-8");
        }
      } else {
        const textVal = formData.get("sourceValue")?.toString() || "";
        sourceType = (formData.get("sourceType")?.toString() as "url" | "text") || "text";
        sourceValue = textVal;
      }
    } catch (err) {
      return NextResponse.json({ error: "Failed to parse uploaded form data: " + (err instanceof Error ? err.message : String(err)) }, { status: 400 });
    }
  } else {
    const raw = await request.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = extractRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    sourceType = parsed.data.sourceType;
    sourceValue = parsed.data.sourceValue;
    fileName = parsed.data.fileName || "";

    if (sourceType === "file" && fileName) {
      try {
        const buf = Buffer.from(sourceValue, "base64");
        if (fileName.toLowerCase().endsWith(".pdf")) {
          sourceValue = await parsePdfBuffer(buf);
        } else if (fileName.toLowerCase().endsWith(".docx")) {
          const parsedDocx = await mammoth.extractRawText({ buffer: buf });
          sourceValue = parsedDocx.value;
        } else {
          sourceValue = buf.toString("utf-8");
        }
      } catch (err) {
        return NextResponse.json({ error: "Failed to parse file: " + (err instanceof Error ? err.message : String(err)) }, { status: 422 });
      }
    }
  }

  let sourceText = "";
  if (sourceType === "url") {
    try {
      sourceText = await fetchUrlContent(sourceValue);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch URL";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  } else {
    sourceText = sourceValue.slice(0, 25_000);
  }

  if (!sourceText.trim()) {
    return NextResponse.json({ error: "Source material is empty or could not be read." }, { status: 400 });
  }

  const config: ProviderConfig = getProviderConfig();
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const systemPrompt = `You are a Principal Brand Strategist & Multi-Modal Content Director.
Extract deep, comprehensive brand intelligence from the source material to power social media content, viral vertical reels, image generation (ComfyUI), and voiceovers (Ming-TTS).

Output MUST be valid JSON adhering strictly to this schema:
{
  "brandName": string,
  "tagline": string,
  "business": string,
  "industry": string,
  "usp": string,
  "mission": string,
  "founderPersona": string,
  "demographics": {
    "targetRoles": string[],
    "ageBracket": string,
    "geography": string
  },
  "audiencePains": string[],
  "audienceDesires": string[],
  "objections": string[],
  "visualStyle": string,
  "colorPalette": {
    "primary": string,
    "secondary": string,
    "accent": string
  },
  "lightingStyle": string,
  "compositionStyle": string,
  "imagePromptKeywords": string[],
  "voicePersona": string,
  "recommendedVoiceId": "preset-energetic-host" | "preset-professional" | "preset-friendly" | "preset-warm-narrator" | "preset-storyteller",
  "soundBedGenre": string,
  "soundBedBpm": number,
  "contentPillars": string[],
  "viralHookAngles": string[],
  "wordsToUse": string[],
  "wordsToAvoid": string[],
  "competitors": string[],
  "coreOffers": string[],
  "pricingModel": string,
  "primaryCta": string
}

RULES:
1. "recommendedVoiceId" must be selected from the 5 available Ming-TTS profiles based on brand tone:
   - "preset-energetic-host": Upbeat, fast-paced young Indian male (ideal for viral reels, tech, hype)
   - "preset-professional": Polished, articulate Indian businesswoman (ideal for enterprise, B2B SaaS, finance)
   - "preset-friendly": Relaxed, relatable conversational Indian male (ideal for lifestyle, education)
   - "preset-warm-narrator": Calm, melodic, trustworthy Indian woman (ideal for wellness, storytelling)
   - "preset-storyteller": Deep, expressive Indian male with dramatic pauses (ideal for luxury, deep-dives)
2. "colorPalette" must contain valid 6-character hex codes (e.g. #0A0F1D, #6366F1).
3. "imagePromptKeywords": 5-8 descriptive visual prompt modifiers suitable for ComfyUI diffusion models.
4. "contentPillars": 4-6 distinct thematic buckets for social media publishing.
5. "viralHookAngles": 3-5 proven viral hooks customized for this brand.
Extract exhaustive detail. Infer accurately when fields are implicit in the text.`;

  try {
    await prepareForLlm();
    const toolset = await acquireToolset("brandExtraction");
    const result = await provider.generateContent<BrandBrain2Profile>({
      config,
      system: systemPrompt,
      toolset: toolset ?? undefined,
      prompt: `Extract complete Brand Brain 2.0 intelligence from the following source material:\n\n---\n${sourceText}\n---`,
      schema: brandBrain2ProfileSchema,
    });

    return NextResponse.json({ brand: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Brand extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await autoFreeVram({ target: "llm" });
  }
}
