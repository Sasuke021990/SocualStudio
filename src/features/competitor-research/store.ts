import type { BeatVariant, ResearchItem } from "./types";

let items: ResearchItem[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function copyOf(item: ResearchItem): ResearchItem {
  return {
    ...item,
    beatVariants: item.beatVariants.map((beat) => ({ ...beat })),
    createdAdVariantIds: [...item.createdAdVariantIds],
  };
}

export function listResearchItems(): ResearchItem[] {
  return items.map(copyOf);
}

export function getResearchItem(id: string): ResearchItem | null {
  const item = items.find((i) => i.id === id);
  return item ? copyOf(item) : null;
}

export function createResearchItem(input: {
  sourceUrl?: string | null;
  sourceAd: string;
  platform: ResearchItem["platform"];
}): ResearchItem {
  const timestamp = now();
  const item: ResearchItem = {
    id: makeId(),
    sourceUrl: input.sourceUrl ?? "",
    sourceAd: input.sourceAd,
    platform: input.platform,
    findings: "",
    beatVariants: [],
    createdAdVariantIds: [],
    status: "planned",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  items = [item, ...items];
  return copyOf(item);
}

export function updateResearchItemAnalysis(
  id: string,
  analysis: { findings: string; beatVariants: BeatVariant[] },
): ResearchItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) {
    return null;
  }
  const updated: ResearchItem = {
    ...item,
    findings: analysis.findings,
    beatVariants: analysis.beatVariants.map((beat) => ({ ...beat })),
    status: "analyzed",
    updatedAt: now(),
  };
  items = items.map((i) => (i.id === id ? updated : i));
  return copyOf(updated);
}

export function addResearchBeatAdVariant(id: string, adVariantId: string): ResearchItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) {
    return null;
  }
  const updated: ResearchItem = {
    ...item,
    createdAdVariantIds: [...item.createdAdVariantIds, adVariantId],
    status: "created",
    updatedAt: now(),
  };
  items = items.map((i) => (i.id === id ? updated : i));
  return copyOf(updated);
}

export function updateResearchItemStatus(id: string, status: ResearchItem["status"]): ResearchItem | null {
  const item = items.find((i) => i.id === id);
  if (!item) {
    return null;
  }
  const updated: ResearchItem = { ...item, status, updatedAt: now() };
  items = items.map((i) => (i.id === id ? updated : i));
  return copyOf(updated);
}
