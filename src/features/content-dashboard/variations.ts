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
  soundPrompt: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  likes: z.number(),
  comments: z.number(),
});

export type PostVariation = z.infer<typeof postVariationSchema>;

export const DEFAULT_NO_TEXT_NEGATIVE_PROMPT =
  "text, typography, letters, words, caption, subtitle, watermark, logo, brand mark, signature, badge, UI overlay, screen text, signage, company name, GitHub logo";

/** Assemble the final ComfyUI prompt deterministically from the 8 fields, stripping text cues. */
export function assembleImagePrompt(c: ImageConcept): string {
  const sanitize = (s: string) =>
    s
      .replace(/\b(text|words|letters|typography|logo|watermark|badge|signage|label|brand name)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const parts = [
    sanitize(c.subject),
    sanitize(c.setting),
    sanitize(c.lighting),
    sanitize(c.colorPalette),
    sanitize(c.style),
    sanitize(c.composition),
    sanitize(c.mood),
    sanitize(c.technical),
    "clean composition, pure photography, no text, no watermark, no logo",
  ].filter(Boolean);

  return parts.join(", ");
}
