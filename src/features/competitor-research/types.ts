import type { AdPlatform } from "../ad-generation/types";

export const RESEARCH_ITEM_STATUSES = ["planned", "analyzed", "created", "approved"] as const;
export type ResearchItemStatus = (typeof RESEARCH_ITEM_STATUSES)[number];

export interface BeatVariant {
  primaryText: string;
  headline: string;
  description?: string;
  cta: string;
}

export interface ResearchItem {
  id: string;
  sourceUrl: string;
  sourceAd: string;
  platform: AdPlatform;
  findings: string;
  beatVariants: BeatVariant[];
  createdAdVariantIds: string[];
  status: ResearchItemStatus;
  createdAt: string;
  updatedAt: string;
}
