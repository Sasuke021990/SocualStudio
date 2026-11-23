import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContentItem, ContentStatus, ContentType } from "./types";

const DATA_DIR = join(process.cwd(), "data", "content");
const ITEMS_PATH = join(DATA_DIR, "items.json");

let items: ContentItem[] | null = null;

async function loadFromDisk(): Promise<ContentItem[]> {
  try {
    const raw = await readFile(ITEMS_PATH, "utf-8");
    return JSON.parse(raw) as ContentItem[];
  } catch {
    return [];
  }
}

async function persist(next: ContentItem[]): Promise<void> {
  items = next;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ITEMS_PATH, JSON.stringify(next, null, 2), "utf-8");
}

async function ensureItems(): Promise<ContentItem[]> {
  if (!items) items = await loadFromDisk();
  return items;
}

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function listContentItems(filter?: { brainId?: string; brandName?: string }): Promise<ContentItem[]> {
  const all = await ensureItems();
  let filtered = all;
  if (filter?.brandName) {
    filtered = filtered.filter((i) => i.brandName === filter.brandName);
  }
  if (filter?.brainId) {
    filtered = filtered.filter((i) => i.brainId === filter.brainId);
  }
  return filtered.map((i) => ({ ...i }));
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const all = await ensureItems();
  const item = all.find((i) => i.id === id);
  return item ? { ...item } : null;
}

export async function createContentItem(input: {
  brandName: string;
  brainId: string;
  type: ContentType;
  title: string;
  prompt: string;
  output: string;
  platform: string;
  variation?: ContentItem["variation"];
}): Promise<ContentItem> {
  const all = await ensureItems();
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
    variation: input.variation,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await persist([item, ...all]);
  return { ...item };
}

export async function updateContentItem(
  id: string,
  patch: Partial<Pick<ContentItem, "title" | "output" | "variation">>,
): Promise<ContentItem | null> {
  const all = await ensureItems();
  const item = all.find((i) => i.id === id);
  if (!item) return null;
  if (patch.title !== undefined) item.title = patch.title;
  if (patch.output !== undefined) item.output = patch.output;
  if (patch.variation !== undefined) {
    // Merge: clients send the fields they know — never wipe fields they omit
    // (e.g. reelSpec/reel must survive saves from tabs loaded before they existed).
    item.variation = { ...item.variation, ...patch.variation };
  }
  item.updatedAt = now();
  await persist([...all]);
  return { ...item };
}

export async function updateContentItemStatus(id: string, status: ContentStatus): Promise<ContentItem | null> {
  const all = await ensureItems();
  const item = all.find((i) => i.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = now();
  await persist([...all]);
  return { ...item };
}

export async function deleteContentItem(id: string): Promise<boolean> {
  const all = await ensureItems();
  const before = all.length;
  const next = all.filter((i) => i.id !== id);
  if (next.length === before) return false;
  await persist(next);
  return true;
}

/** Removes a brand's content items. Approved posts are kept unless includeApproved is true. */
export async function deleteContentItemsByBrainId(
  brainId: string,
  opts?: { includeApproved?: boolean },
): Promise<{ deletedDrafts: number; deletedApproved: number; removedIds: string[] }> {
  const all = await ensureItems();
  const keep = all.filter((i) => {
    if (i.brainId !== brainId) return true;
    if (i.status === "approved" && !opts?.includeApproved) return true;
    return false;
  });
  const removed = all.filter((i) => !keep.includes(i));
  const deletedDrafts = removed.filter((i) => i.status !== "approved").length;
  const deletedApproved = removed.filter((i) => i.status === "approved").length;
  if (removed.length > 0) await persist(keep);
  return { deletedDrafts, deletedApproved, removedIds: removed.map((i) => i.id) };
}

export async function getContentStats(filter?: { brainId?: string; brandName?: string }): Promise<{
  total: number;
  draft: number;
  approved: number;
  published: number;
}> {
  const items = await listContentItems(filter);
  return {
    total: items.length,
    draft: items.filter((i) => i.status === "draft").length,
    approved: items.filter((i) => i.status === "approved").length,
    published: items.filter((i) => i.status === "published").length,
  };
}
