import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { acquireToolset } from "@/features/mcp-client/registry";
import { prepareForLlm } from "@/features/ai-provider/gpu";
import { freeComfyUIModels } from "@/features/comfyui/free";
import type { ProviderConfig } from "@/features/ai-provider/types";

const extractRequestSchema = z.object({
  sourceType: z.enum(["url", "text"]),
  sourceValue: z.string().min(1, "sourceValue is required"),
});

const brandExtractionSchema = z.object({
  brandName: z.string(),
  tagline: z.string().optional(),
  business: z.string(),
  industry: z.string(),
  usp: z.string(),
  tone: z.string(),
  audiencePains: z.array(z.string()),
  audienceDesires: z.array(z.string()),
  benefits: z.array(z.string()),
  wordsToUse: z.array(z.string()),
  wordsToAvoid: z.array(z.string()),
  competitors: z.array(z.string()),
  keyMessages: z.array(z.string()).optional(),
  brandVoice: z.string().optional(),
  visualStyle: z.string().optional(),
});

type BrandExtraction = z.infer<typeof brandExtractionSchema>;

async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandBrainExtractor/1.0)" },
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
  return text.slice(0, 8000);
}

export async function POST(request: Request) {
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

  const { sourceType, sourceValue } = parsed.data;

  let sourceText: string;
  if (sourceType === "url") {
    try {
      sourceText = await fetchUrlContent(sourceValue);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch URL";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  } else {
    sourceText = sourceValue;
  }

  const config: ProviderConfig = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const systemPrompt = `You are a brand strategist. Extract structured brand information from the provided source material.
Return ONLY valid JSON matching this schema — no markdown fences, no prose.
Schema:
{
  "brandName": string,
  "tagline"?: string,
  "business": string,
  "industry": string,
  "usp": string,
  "tone": string,
  "brandVoice"?: string,
  "visualStyle"?: string,
  "audiencePains": string[],
  "audienceDesires": string[],
  "benefits": string[],
  "keyMessages"?: string[],
  "wordsToUse": string[],
  "wordsToAvoid": string[],
  "competitors": string[]
}
Extract as much detail as possible. Use arrays even for single items. If information is missing, use empty arrays or descriptive strings based on inference from the source.`;

  try {
    await prepareForLlm();
            const toolset = await acquireToolset("brandExtraction");
    const result = await provider.generateContent<BrandExtraction>({
      config,
      system: systemPrompt,
      toolset: toolset ?? undefined,
      prompt: `Extract all brand details from the following source material:\n\n---\n${sourceText}\n---`,
      schema: brandExtractionSchema,
    });

    // Do NOT save — return extraction for user to review and edit first
    return NextResponse.json({ brand: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Brand extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
