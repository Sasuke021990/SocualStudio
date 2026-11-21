import { z } from "zod";
import { AD_PLATFORMS, AD_VARIANT_ORIGINS, AD_VARIANT_STATUSES } from "./types";

export const adPlatformSchema = z.enum(AD_PLATFORMS);

export const adVariantStatusSchema = z.enum(AD_VARIANT_STATUSES);

export const adVariantOriginSchema = z.enum(AD_VARIANT_ORIGINS);

export const adVariantCharCountsSchema = z.object({
  primaryText: z.number(),
  headline: z.number(),
  description: z.number(),
});

export const adVariantSchema = z.object({
  id: z.string(),
  brandBrainId: z.string().nullable().optional(),
  platform: adPlatformSchema,
  objective: z.string(),
  format: z.string(),
  angle: z.string(),
  primaryText: z.string(),
  headline: z.string(),
  description: z.string(),
  cta: z.string(),
  charCounts: adVariantCharCountsSchema,
  origin: adVariantOriginSchema,
  status: adVariantStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adVariantContentSchema = z.object({
  primaryText: z.string().min(1, "primaryText is required"),
  headline: z.string().min(1, "headline is required"),
  description: z.string().optional(),
  cta: z.string().min(1, "cta is required"),
});

export const MAX_BATCH_ANGLES = 8;

export const generateAdVariantSchema = z
  .object({
    brandBrainId: z.string().nullable().optional(),
    platform: adPlatformSchema,
    objective: z.string().min(1, "objective is required"),
    format: z.string().min(1, "format is required"),
    angle: z.string().min(1, "angle is required").optional(),
    angles: z
      .array(z.string().min(1, "each angle must be non-empty"))
      .min(1, "angles must contain at least one angle")
      .max(MAX_BATCH_ANGLES, `at most ${MAX_BATCH_ANGLES} angles per request`)
      .optional(),
  })
  .refine((data) => Boolean(data.angle) || Boolean(data.angles?.length), {
    message: "Provide either `angle` or `angles`",
    path: ["angle"],
  });

/** Normalize `angle`/`angles` into a deduplicated batch list. */
export function resolveGenerationAngles(data: {
  angle?: string | null;
  angles?: string[] | null;
}): string[] {
  const all = [...(data.angles ?? []), ...(data.angle ? [data.angle] : [])];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of all) {
    const angle = raw.trim();
    if (angle && !seen.has(angle)) {
      seen.add(angle);
      result.push(angle);
    }
  }
  return result;
}

export const createAdVariantSchema = z.object({
  brandBrainId: z.string().nullable().optional(),
  platform: adPlatformSchema,
  objective: z.string().min(1, "objective is required"),
  format: z.string().min(1, "format is required"),
  angle: z.string().min(1, "angle is required"),
  primaryText: z.string(),
  headline: z.string(),
  description: z.string(),
  cta: z.string(),
});

export const updateAdVariantStatusSchema = z.object({
  status: adVariantStatusSchema,
});
