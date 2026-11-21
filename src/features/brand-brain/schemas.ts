import { z } from "zod";

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
