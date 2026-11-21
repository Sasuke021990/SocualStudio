import { NextResponse } from "next/server";
import { updateAdVariantStatus } from "@/features/ad-generation/store";
import { updateAdVariantStatusSchema } from "@/features/ad-generation/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAdVariantStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = updateAdVariantStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Ad variant not found" }, { status: 404 });
  }
  return NextResponse.json({ adVariant: updated });
}
