import { NextResponse } from "next/server";
import { z } from "zod";
import { getBrandBrain } from "@/features/brand-brain/store";
import { deleteBrandBrainDir } from "@/features/brand-brain/file-storage";
import { deleteContentItemsByBrainId } from "@/features/content-dashboard/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brain = getBrandBrain(id);
  if (!brain) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  return NextResponse.json({ brandBrain: brain });
}

const deleteSchema = z.object({
  includeApproved: z.boolean().optional(),
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Approved posts survive unless includeApproved is set (manual wipe).
  const removed = await deleteContentItemsByBrainId(id, {
    includeApproved: parsed.data.includeApproved ?? false,
  });
  const brandDeleted = await deleteBrandBrainDir(id);

  return NextResponse.json({
    brandDeleted,
    deletedDrafts: removed.deletedDrafts,
    deletedApproved: removed.deletedApproved,
  });
}
