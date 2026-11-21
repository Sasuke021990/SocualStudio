export const AD_VARIANT_STATUSES = ["draft", "approved"] as const;
export type AdVariantStatus = (typeof AD_VARIANT_STATUSES)[number];

export const AD_PLATFORMS = ["meta", "linkedin"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const AD_VARIANT_ORIGINS = ["wizard", "single", "batch", "calendar", "ai"] as const;
export type AdVariantOrigin = (typeof AD_VARIANT_ORIGINS)[number];

export interface AdVariantCharCounts {
  primaryText: number;
  headline: number;
  description: number;
}

export interface AdVariantContent {
  primaryText: string;
  headline: string;
  description?: string;
  cta: string;
}

export interface AdVariant {
  id: string;
  brandBrainId: string | null;
  platform: AdPlatform;
  objective: string;
  format: string;
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  charCounts: AdVariantCharCounts;
  origin: AdVariantOrigin;
  status: AdVariantStatus;
  createdAt: string;
  updatedAt: string;
}

export const META_AD_LIMITS = {
  primaryText: 220,
  headline: 40,
  description: 30,
} as const;
