import { NextResponse } from "next/server";
import { createAdVariant } from "@/features/ad-generation/store";
import {
  adVariantContentSchema,
  generateAdVariantSchema,
  resolveGenerationAngles,
} from "@/features/ad-generation/schemas";
import type { AdVariant } from "@/features/ad-generation/types";
import { buildAdVariantGenerationPrompt } from "@/features/ad-generation/prompts";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { acquireToolset } from "@/features/mcp-client/registry";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { getBrandBrain } from "@/features/brand-brain/store";

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateAdVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid ad generation request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { brandBrainId, platform, objective, format } = parsed.data;
  const angles = resolveGenerationAngles(parsed.data);

  const brandContent = brandBrainId ? (getBrandBrain(brandBrainId)?.content ?? null) : null;

  const config = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  const adVariants: AdVariant[] = [];
  const failures: Array<{ angle: string; error: string }> = [];

  // Generate one variant per angle in a single request. Local inference
  // endpoints handle concurrency poorly, so generate sequentially.
  for (const angle of angles) {
    const { system, prompt } = buildAdVariantGenerationPrompt({
      platform,
      objective,
      format,
      angle,
      brandContent,
    });

    try {
      const toolset = await acquireToolset("contentGeneration");
      const generated = await provider.generateContent({
        config,
        system,
        prompt,
        toolset: toolset ?? undefined,
        schema: adVariantContentSchema,
      });

      const adVariant = createAdVariant({
        brandBrainId: brandBrainId ?? null,
        platform,
        objective,
        format,
        angle,
        primaryText: generated.primaryText,
        headline: generated.headline,
        description: generated.description ?? "",
        cta: generated.cta,
        origin: "ai",
      });
      adVariants.push(adVariant);
    } catch (error) {
      failures.push({
        angle,
        error: error instanceof Error ? error.message : "AI ad variant generation failed",
      });
    }
  }

  if (adVariants.length === 0) {
    return NextResponse.json(
      { error: "AI ad variant generation failed for all angles", failures },
      { status: 502 },
    );
  }

  return NextResponse.json({ adVariants, failures }, { status: 201 });
}
