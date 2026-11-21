import { NextResponse } from "next/server";
import { createAdVariant, listAdVariants } from "@/features/ad-generation/store";
import { createAdVariantSchema } from "@/features/ad-generation/schemas";

export async function GET() {
  const variants = listAdVariants();
  return NextResponse.json({ adVariants: variants });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAdVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid ad variant payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const variant = createAdVariant({
    brandBrainId: parsed.data.brandBrainId ?? null,
    platform: parsed.data.platform,
    objective: parsed.data.objective,
    format: parsed.data.format,
    angle: parsed.data.angle,
    primaryText: parsed.data.primaryText,
    headline: parsed.data.headline,
    description: parsed.data.description,
    cta: parsed.data.cta,
  });
  return NextResponse.json({ adVariant: variant }, { status: 201 });
}
