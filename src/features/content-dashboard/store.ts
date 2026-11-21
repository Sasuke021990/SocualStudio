import type { ContentItem, ContentStatus, ContentType } from "./types";

let items: ContentItem[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function listContentItems(brainId?: string): ContentItem[] {
  const filtered = brainId ? items.filter((i) => i.brainId === brainId) : items;
  return filtered.map((i) => ({ ...i }));
}

export function getContentItem(id: string): ContentItem | null {
  const item = items.find((i) => i.id === id);
  return item ? { ...item } : null;
}

export function createContentItem(input: {
  brandName: string;
  brainId: string;
  type: ContentType;
  title: string;
  prompt: string;
  output: string;
  platform: string;
}): ContentItem {
  const timestamp = now();
  const item: ContentItem = {
    id: makeId(),
    brandName: input.brandName,
    brainId: input.brainId,
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    output: input.output,
    status: "draft",
    platform: input.platform,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  items = [item, ...items];
  return { ...item };
}

export function updateContentItemStatus(id: string, status: ContentStatus): ContentItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = now();
  return { ...item };
}

export function deleteContentItem(id: string): boolean {
  const before = items.length;
  items = items.filter((i) => i.id !== id);
  return items.length < before;
}

export function getContentStats(brainId?: string): {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  published: number;
} {
  const filtered = brainId ? items.filter((i) => i.brainId === brainId) : items;
  return {
    total: filtered.length,
    draft: filtered.filter((i) => i.status === "draft").length,
    inProgress: filtered.filter((i) => i.status === "in-progress").length,
    approved: filtered.filter((i) => i.status === "approved").length,
    published: filtered.filter((i) => i.status === "published").length,
  };
}
