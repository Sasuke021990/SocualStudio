import type { BrandBrain, BrandBrainContent } from "./types";

let brains: BrandBrain[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function listBrandBrains(): BrandBrain[] {
  return brains.map((brain) => ({ ...brain, versions: [...brain.versions] }));
}

export function getBrandBrain(id: string): BrandBrain | null {
  const brain = brains.find((b) => b.id === id);
  if (!brain) {
    return null;
  }
  return { ...brain, versions: [...brain.versions] };
}

export function createBrandBrain(input: {
  sourceUrl: string;
  content?: BrandBrainContent | Partial<BrandBrainContent> | null;
}): BrandBrain {
  const timestamp = now();
  const status = input.content ? "ready" : "intake";
  const content: BrandBrainContent | null = input.content
    ? {
        business: input.content.business ?? "",
        industry: input.content.industry ?? "",
        usp: input.content.usp ?? "",
        tone: input.content.tone ?? "",
        audiencePains: input.content.audiencePains ?? [],
        audienceDesires: input.content.audienceDesires ?? [],
        benefits: input.content.benefits ?? [],
        wordsToUse: input.content.wordsToUse ?? [],
        wordsToAvoid: input.content.wordsToAvoid ?? [],
        competitors: input.content.competitors ?? [],
      }
    : null;
  const brain: BrandBrain = {
    id: makeId(),
    sourceUrl: input.sourceUrl,
    status,
    content,
    versions: content ? [{ version: 1, content, createdAt: timestamp }] : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  brains = [brain, ...brains];
  return { ...brain, versions: [...brain.versions] };
}
