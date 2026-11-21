import { NextResponse } from "next/server";
import { createCalendarItem, listCalendarItems } from "@/features/content-calendar/store";
import { createCalendarItemSchema } from "@/features/content-calendar/schemas";

export async function GET() {
  const items = listCalendarItems();
  return NextResponse.json({ calendarItems: items });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCalendarItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid calendar item payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const item = createCalendarItem({
    brandBrainId: parsed.data.brandBrainId,
    date: parsed.data.date,
    platforms: parsed.data.platforms,
    content: parsed.data.content,
  });
  return NextResponse.json({ calendarItem: item }, { status: 201 });
}
