import { NextResponse } from "next/server";
import { getContentItem, updateContentItem } from "@/features/content-dashboard/store";
import { planReelSpec } from "@/features/reel/planner";
import { planRequestSchema } from "@/features/reel/schemas";

/** Plan a reel (Viral Director → strict ReelSpec) and persist it on the post. */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const item = await getContentItem(parsed.data.itemId);
  if (!item) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (item.status === "approved") {
    return NextResponse.json({ error: "Approved posts are not editable" }, { status: 403 });
  }

  const variation = item.variation;
  try {
    const { spec, hookScore } = await planReelSpec({
      brandName: item.brandName,
      caption: variation?.caption ?? item.output,
      hashtags: variation?.hashtags ?? [],
      postCta: variation?.cta,
      soundDescription: variation?.soundPrompt,
      imageConcept: variation?.imageConcept
        ? Object.values(variation.imageConcept).join(". ")
        : undefined,
      reelPrompt: parsed.data.prompt,
      durationSeconds: parsed.data.durationSeconds,
      imageCount: parsed.data.imageCount,
      style: parsed.data.style,
    });

    await updateContentItem(item.id, {
      variation: { ...emptyVariation(), ...variation, reelSpec: spec },
    });

    return NextResponse.json({ spec, hookScore });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Planning failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function emptyVariation() {
  return { imageConcept: {}, soundPrompt: "", caption: "", hashtags: [], cta: "" };
}
