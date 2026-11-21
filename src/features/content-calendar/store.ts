import type { CalendarItem } from "./types";

let items: CalendarItem[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function listCalendarItems(): CalendarItem[] {
  return items.map((item) => ({ ...item }));
}

export function createCalendarItem(input: {
  brandBrainId: string;
  date: string;
  platforms: CalendarItem["platforms"];
  content: string;
}): CalendarItem {
  const timestamp = now();
  const item: CalendarItem = {
    id: makeId(),
    brandBrainId: input.brandBrainId,
    date: input.date,
    platforms: input.platforms,
    content: input.content,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  items = [item, ...items];
  return { ...item };
}

export function updateCalendarItemStatus(id: string, status: CalendarItem["status"]): CalendarItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) {
    return null;
  }
  const updated: CalendarItem = { ...item, status, updatedAt: new Date().toISOString() };
  items = items.map((i) => (i.id === id ? updated : i));
  return { ...updated };
}
