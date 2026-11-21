import { NextResponse } from "next/server";
import { createResearchItem, listResearchItems } from "@/features/competitor-research/store";
import { createResearchItemSchema } from "@/features/competitor-research/schemas";

export async function GET() {
  const items = listResearchItems();
  return NextResponse.json({ researchItems: items });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createResearchItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid research item payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const item = createResearchItem({
    sourceUrl: parsed.data.sourceUrl ?? null,
    sourceAd: parsed.data.sourceAd,
    platform: parsed.data.platform,
  });
  return NextResponse.json({ researchItem: item }, { status: 201 });
}
