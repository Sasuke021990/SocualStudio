import { NextResponse } from "next/server";
import { z } from "zod";
import { listContentItems, createContentItem, getContentStats } from "@/features/content-dashboard/store";
import { CONTENT_STATUSES, CONTENT_TYPES } from "@/features/content-dashboard/types";

const createSchema = z.object({
  brandName: z.string().min(1),
  brainId: z.string().min(1),
  type: z.enum(CONTENT_TYPES),
  title: z.string().min(1),
  prompt: z.string().min(1),
  output: z.string().min(1),
  platform: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brainId = url.searchParams.get("brainId") ?? undefined;
  const items = listContentItems(brainId);
  const stats = getContentStats(brainId);
  return NextResponse.json({ items, stats });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const item = createContentItem(parsed.data);
  return NextResponse.json({ item }, { status: 201 });
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CONTENT_STATUSES),
});

export async function PATCH(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { updateContentItemStatus } = await import("@/features/content-dashboard/store");
  const item = updateContentItemStatus(parsed.data.id, parsed.data.status);
  if (!item) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
