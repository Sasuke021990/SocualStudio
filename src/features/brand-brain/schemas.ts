import { z } from "zod";

export const brandBrain2ProfileSchema = z.object({
  brandName: z.string().min(1, "brandName is required"),
  tagline: z.string().optional().default(""),
  business: z.string().min(1, "business is required"),
  industry: z.string().min(1, "industry is required"),
  usp: z.string().min(1, "usp is required"),
  mission: z.string().optional().default(""),
  founderPersona: z.string().optional().default(""),

  demographics: z
    .object({
      targetRoles: z.array(z.string()).default([]),
      ageBracket: z.string().default("20-40"),
      geography: z.string().default("Global / India"),
    })
    .default({ targetRoles: [], ageBracket: "20-40", geography: "Global / India" }),

  audiencePains: z.array(z.string()).default([]),
  audienceDesires: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),

  visualStyle: z.string().default("Modern Clean High-Tech"),
  colorPalette: z
    .object({
      primary: z.string().default("#0A0F1D"),
      secondary: z.string().default("#6366F1"),
      accent: z.string().default("#06B6D4"),
    })
    .default({ primary: "#0A0F1D", secondary: "#6366F1", accent: "#06B6D4" }),

  lightingStyle: z.string().default("Dramatic studio volumetric rim lighting"),
  compositionStyle: z.string().default("Centered cinematic subject, shallow depth of field"),
  imagePromptKeywords: z.array(z.string()).default([]),

  voicePersona: z.string().default("Confident, engaging creator with clear modern pacing"),
  recommendedVoiceId: z.string().default("preset-energetic-host"),
  soundBedGenre: z.string().default("808 Trending Trap / Drill"),
  soundBedBpm: z.number().default(138),

  contentPillars: z.array(z.string()).default([]),
  viralHookAngles: z.array(z.string()).default([]),
  wordsToUse: z.array(z.string()).default([]),
  wordsToAvoid: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),

  coreOffers: z.array(z.string()).default([]),
  pricingModel: z.string().optional().default("Freemium"),
  primaryCta: z.string().default("Link in bio"),
});

export type BrandBrain2ProfileSchemaType = z.infer<typeof brandBrain2ProfileSchema>;

export const brandBrainContentSchema = z.object({
  business: z.string().optional(),
  industry: z.string().optional(),
  usp: z.string().optional(),
  tone: z.string().optional(),
  audiencePains: z.array(z.string()).optional(),
  audienceDesires: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  wordsToUse: z.array(z.string()).optional(),
  wordsToAvoid: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
});

export const createBrandBrainSchema = z.object({
  sourceUrl: z.string().min(1, "sourceUrl is required"),
  content: brandBrainContentSchema.optional(),
});

export const brandBrainSchema = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  status: z.enum(["intake", "ready"]),
  content: brandBrainContentSchema.nullable().optional(),
  versions: z
    .array(
      z.object({
        version: z.number(),
        content: brandBrainContentSchema,
        createdAt: z.string(),
      }),
    )
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
