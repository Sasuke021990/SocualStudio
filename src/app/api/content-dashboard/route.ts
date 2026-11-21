import { NextResponse } from "next/server";
import { z } from "zod";
import { listContentItems, createContentItem, getContentStats, updateContentItem, updateContentItemStatus } from "@/features/content-dashboard/store";
import { CONTENT_STATUSES, CONTENT_TYPES } from "@/features/content-dashboard/types";

const createSchema = z.object({
  brandName: z.string().min(1),
  brainId: z.string().min(1),
  type: z.enum(CONTENT_TYPES),
  title: z.string().min(1),
  prompt: z.string().min(1),
  output: z.string().min(1),
  platform: z.string().min(1),
  variation: z.object({
    imageConcept: z.record(z.string(), z.string()),
    soundPrompt: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    generatedImage: z.string().nullable().optional(),
    voiceAudio: z.string().nullable().optional(),
    sfxAudio: z.string().nullable().optional(),
  }).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brainId = url.searchParams.get("brainId") ?? undefined;
  const brandName = url.searchParams.get("brandName") ?? undefined;
  const filter = { brainId, brandName };
  const items = await listContentItems(filter);
  const stats = await getContentStats(filter);
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

  const item = await createContentItem(parsed.data);
  return NextResponse.json({ item }, { status: 201 });
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CONTENT_STATUSES).optional(),
  title: z.string().optional(),
  output: z.string().optional(),
  variation: z.object({
    imageConcept: z.record(z.string(), z.string()),
    soundPrompt: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
    generatedImage: z.string().nullable().optional(),
    voiceAudio: z.string().nullable().optional(),
    sfxAudio: z.string().nullable().optional(),
  }).optional(),
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

  const { id, status, title, output, variation } = parsed.data;

  // Content edit (title/output/variation) vs status change
  if (title !== undefined || output !== undefined || variation !== undefined) {
    const item = await updateContentItem(id, { title, output, variation });
    if (!item) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  if (!status) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const item = await updateContentItemStatus(id, status);
  if (!item) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
