import fs from "node:fs";
import path from "node:path";
import type { BrandBrain, BrandBrainContent, BrandBrain2Profile } from "./types";

let brains: BrandBrain[] = [];

function makeId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

const BRANDS_DIR = path.join(process.cwd(), "data", "brands");

export function listBrandBrains(): BrandBrain[] {
  return brains.map((brain) => ({ ...brain, versions: [...brain.versions] }));
}

export function getBrandBrain(id: string): BrandBrain | null {
  const brain = brains.find((b) => b.id === id);
  if (brain) {
    return { ...brain, versions: [...brain.versions] };
  }

  // Fallback to reading data/brands/{id}/profile.json from disk
  try {
    const jsonPath = path.join(BRANDS_DIR, id, "profile.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const profile = JSON.parse(raw) as BrandBrain2Profile;
      const content: BrandBrainContent = {
        business: profile.business,
        industry: profile.industry,
        usp: profile.usp,
        tone: profile.voicePersona,
        audiencePains: profile.audiencePains,
        audienceDesires: profile.audienceDesires,
        benefits: profile.coreOffers,
        wordsToUse: profile.wordsToUse,
        wordsToAvoid: profile.wordsToAvoid,
        competitors: profile.competitors,
      };
      return {
        id,
        sourceUrl: "",
        status: "ready",
        content,
        profile,
        versions: [{ version: 1, content, createdAt: now() }],
        createdAt: now(),
        updatedAt: now(),
      };
    }
  } catch {
    // Disk read failed
  }

  return null;
}

export function createBrandBrain(input: {
  sourceUrl: string;
  content?: BrandBrainContent | Partial<BrandBrainContent> | null;
  profile?: BrandBrain2Profile | null;
}): BrandBrain {
  const timestamp = now();
  const status = input.content || input.profile ? "ready" : "intake";
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
    profile: input.profile ?? null,
    versions: content ? [{ version: 1, content, createdAt: timestamp }] : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  brains = [brain, ...brains];
  return { ...brain, versions: [...brain.versions] };
}
