import { NextResponse } from "next/server";
import { addResearchBeatAdVariant, getResearchItem } from "@/features/competitor-research/store";
import { createBeatAdVariantSchema } from "@/features/competitor-research/schemas";
import { createAdVariant } from "@/features/ad-generation/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBeatAdVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid beat payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const item = getResearchItem(id);
  if (!item) {
    return NextResponse.json({ error: "Research item not found" }, { status: 404 });
  }

  const beat = item.beatVariants[parsed.data.beatIndex];
  if (!beat) {
    return NextResponse.json({ error: "Beat variant not found" }, { status: 404 });
  }

  const adVariant = createAdVariant({
    brandBrainId: null,
    platform: item.platform,
    objective: "Competitive steal & beat",
    format: "single-image",
    angle: `beat-${parsed.data.beatIndex + 1}`,
    primaryText: beat.primaryText,
    headline: beat.headline,
    description: beat.description ?? "",
    cta: beat.cta,
    origin: "ai",
  });

  const updated = addResearchBeatAdVariant(id, adVariant.id);
  return NextResponse.json({ researchItem: updated, adVariant }, { status: 201 });
}
