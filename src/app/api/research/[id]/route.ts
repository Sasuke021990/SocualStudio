import { NextResponse } from "next/server";
import { updateResearchItemStatus } from "@/features/competitor-research/store";
import { updateResearchItemStatusSchema } from "@/features/competitor-research/schemas";
import { updateAdVariantStatus } from "@/features/ad-generation/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateResearchItemStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = updateResearchItemStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Research item not found" }, { status: 404 });
  }

  // Approving the research item also approves the ad variants created from its beats
  // (research -> create -> approve).
  if (parsed.data.status === "approved") {
    for (const adVariantId of updated.createdAdVariantIds) {
      updateAdVariantStatus(adVariantId, "approved");
    }
  }

  return NextResponse.json({ researchItem: updated });
}
