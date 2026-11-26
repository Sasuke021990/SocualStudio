export const BRAND_BRAIN_STATUSES = ["intake", "ready"] as const;
export type BrandBrainStatus = (typeof BRAND_BRAIN_STATUSES)[number];

export interface BrandBrain2Profile {
  // 1. Identity & Business
  brandName: string;
  tagline?: string;
  business: string;
  industry: string;
  usp: string;
  mission?: string;
  founderPersona?: string;

  // 2. Target Audience
  demographics: {
    targetRoles: string[];
    ageBracket: string;
    geography: string;
  };
  audiencePains: string[];
  audienceDesires: string[];
  objections: string[];

  // 3. Visual & Art Direction (ComfyUI)
  visualStyle: string;
  colorPalette: {
    primary: string; // HEX
    secondary: string;
    accent: string;
  };
  lightingStyle: string;
  compositionStyle: string;
  imagePromptKeywords: string[];

  // 4. Audio & Voice Identity (Ming-TTS / SFX)
  voicePersona: string;
  recommendedVoiceId: string;
  soundBedGenre: string;
  soundBedBpm: number;

  // 5. Content Strategy
  contentPillars: string[];
  viralHookAngles: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  competitors: string[];

  // 6. Offer & CTA
  coreOffers: string[];
  pricingModel?: string;
  primaryCta: string;
}

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
  profile?: BrandBrain2Profile | null;
  versions: BrandBrainVersion[];
  createdAt: string;
  updatedAt: string;
}
