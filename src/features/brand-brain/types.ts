export const BRAND_BRAIN_STATUSES = ["intake", "ready"] as const;
export type BrandBrainStatus = (typeof BRAND_BRAIN_STATUSES)[number];

export interface BrandBrainContent {
  business: string;
  industry: string;
  usp: string;
  tone: string;
  audiencePains: string[];
  audienceDesires: string[];
  benefits: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  competitors: string[];
}

export interface BrandBrainVersion {
  version: number;
  content: BrandBrainContent;
  createdAt: string;
}

export interface BrandBrain {
  id: string;
  sourceUrl: string;
  status: BrandBrainStatus;
  content: BrandBrainContent | null;
  versions: BrandBrainVersion[];
  createdAt: string;
  updatedAt: string;
}
