import { NextResponse } from "next/server";
import { getResearchItem, updateResearchItemAnalysis } from "@/features/competitor-research/store";
import { researchAnalysisSchema } from "@/features/competitor-research/schemas";
import { buildResearchAnalysisPrompt } from "@/features/competitor-research/prompts";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { freeComfyUIModels } from "@/features/comfyui/free";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getResearchItem(id);
  if (!item) {
    return NextResponse.json({ error: "Research item not found" }, { status: 404 });
  }

  const { system, prompt } = buildResearchAnalysisPrompt({
    platform: item.platform,
    sourceAd: item.sourceAd,
    sourceUrl: item.sourceUrl || undefined,
  });

  const config = getProviderConfig();
  // Free GPU held by ComfyUI models before LLM inference
  await freeComfyUIModels();
  const provider = new OpenAICompatibleProvider(config);

  try {
    const analysis = await provider.generateContent({
      config,
      system,
      prompt,
      schema: researchAnalysisSchema,
    });

    const updated = updateResearchItemAnalysis(id, analysis);
    return NextResponse.json({ researchItem: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI competitor analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
