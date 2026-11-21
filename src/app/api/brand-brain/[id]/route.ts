import { NextResponse } from "next/server";
import { getBrandBrain } from "@/features/brand-brain/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brain = getBrandBrain(id);
  if (!brain) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  return NextResponse.json({ brandBrain: brain });
}
