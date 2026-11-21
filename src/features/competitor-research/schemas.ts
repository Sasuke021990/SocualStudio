import { z } from "zod";
import { adPlatformSchema } from "../ad-generation/schemas";
import { RESEARCH_ITEM_STATUSES } from "./types";

export const researchItemStatusSchema = z.enum(RESEARCH_ITEM_STATUSES);

export const beatVariantSchema = z.object({
  primaryText: z.string().min(1, "primaryText is required"),
  headline: z.string().min(1, "headline is required"),
  description: z.string().optional(),
  cta: z.string().min(1, "cta is required"),
});

export const researchAnalysisSchema = z.object({
  findings: z.string().min(1, "findings is required"),
  beatVariants: z.array(beatVariantSchema).min(1, "at least one beat variant is required"),
});

export const createResearchItemSchema = z.object({
  sourceUrl: z.string().optional(),
  sourceAd: z.string().min(1, "sourceAd is required"),
  platform: adPlatformSchema,
});

export const updateResearchItemStatusSchema = z.object({
  status: researchItemStatusSchema,
});

export const createBeatAdVariantSchema = z.object({
  beatIndex: z.number().int().min(0, "beatIndex must be a non-negative integer"),
});
