import { z } from "zod";

/** 8-point structured image prompt — every field required, validation fails if any missing. */
export const imageConceptSchema = z.object({
  subject: z.string().min(3, "subject required"),
  setting: z.string().min(3, "setting required"),
  lighting: z.string().min(3, "lighting required"),
  colorPalette: z.string().min(3, "colorPalette required"),
  style: z.string().min(3, "style required"),
  composition: z.string().min(3, "composition required"),
  mood: z.string().min(3, "mood required"),
  technical: z.string().min(3, "technical required"),
});

export type ImageConcept = z.infer<typeof imageConceptSchema>;

export const postVariationSchema = z.object({
  id: z.string(),
  imageConcept: imageConceptSchema,
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  likes: z.number(),
  comments: z.number(),
});

export type PostVariation = z.infer<typeof postVariationSchema>;

/** Assemble the final ComfyUI prompt deterministically from the 8 fields. */
export function assembleImagePrompt(c: ImageConcept): string {
  return [
    c.subject,
    c.setting,
    c.lighting,
    c.colorPalette,
    c.style,
    c.composition,
    c.mood,
    c.technical,
  ].join(", ");
}
