import { NextResponse } from "next/server";
import { createBrandBrain, listBrandBrains } from "@/features/brand-brain/store";
import { createBrandBrainSchema } from "@/features/brand-brain/schemas";

export async function GET() {
  const brains = listBrandBrains();
  return NextResponse.json({ brandBrains: brains });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBrandBrainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid brand payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const brain = createBrandBrain({
    sourceUrl: parsed.data.sourceUrl,
    content: parsed.data.content ?? null,
  });
  return NextResponse.json({ brandBrain: brain }, { status: 201 });
}
