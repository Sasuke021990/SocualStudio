import { z } from "zod";
import { cleanCaption } from "@/features/prompts/clean";

export const reelStyleSchema = z.enum(["high-energy", "cinematic", "tech-explainer", "minimalist"]);
export type ReelStyle = z.infer<typeof reelStyleSchema>;

/**
 * Request body for POST /api/reel/plan. Kept here (not in route.ts) so it can
 * be unit-tested directly: importing route.ts drags in next/server, which
 * this repo's lightweight node:test loader cannot resolve.
 */
export const planRequestSchema = z.object({
  itemId: z.string().min(1),
  prompt: z.string().min(1, "Reel prompt required").max(500),
  durationSeconds: z.union([z.literal(15), z.literal(30)]),
  /** 1-10, matching reelSpecSchema; the UI itself gates new plans to 3-10. */
  imageCount: z.number().int().min(1).max(10),
  style: reelStyleSchema.optional(),
});

export const kineticPopupSchema = z.object({
  text: z.string().min(1).max(30),
  startTime: z.number().min(0),
  duration: z.number().min(0.4).max(3.0),
  position: z.enum(["center", "upper-center"]).default("center"),
  color: z.string().default("#FFE600"),
  strokeColor: z.string().default("#000000"),
  fontSize: z.number().min(30).max(120).default(76),
});
export type KineticPopup = z.infer<typeof kineticPopupSchema>;

export const transitionTypeSchema = z.enum([
  "whipPan",
  "glitch",
  "zoom",
  "crossfade",
  "filmBurn",
  "push",
  "radialWipe",
  "blur",
]);
export type TransitionType = z.infer<typeof transitionTypeSchema>;

export const videoEffectSchema = z.enum([
  "chromatic-aberration",
  "vhs-glitch",
  "vignette",
  "lens-flare",
  "motion-blur",
  "glow",
]);
export type VideoEffect = z.infer<typeof videoEffectSchema>;

export function repairKineticPopups(popups: unknown, narration: string, duration: number): KineticPopup[] {
  const parsed = z.array(kineticPopupSchema).safeParse(popups);
  if (parsed.success && parsed.data.length > 0) return parsed.data;

  // Auto-extract high-impact words from the hook line
  const firstSentence = narration.split(/[.!?]/)[0] ?? "";
  const words = firstSentence.split(/\s+/).filter((w) => w.length >= 3);
  const hookWords = words.slice(0, 3).join(" ").toUpperCase();

  return [
    {
      text: hookWords || "WATCH THIS",
      startTime: 0.2,
      duration: Math.min(2.0, +(duration * 0.15).toFixed(2)),
      position: "upper-center",
      color: "#FFE600",
      strokeColor: "#000000",
      fontSize: 76,
    },
  ];
}

/** Strict ReelSpec — the only shape the planner may produce and the composer accepts. */
export const reelSpecSchema = z
  .strictObject({
    version: z.literal(1),
    /** B-model contract: reels are always exactly 15 or 30 seconds. */
    durationSeconds: z.union([z.literal(15), z.literal(30)]),
    /** Visual pacing style */
    style: reelStyleSchema.default("high-energy"),
    /** How many storyboard images to generate and use (1–10; the UI gates new plans to 3–10). */
    imageCount: z.number().int().min(1).max(10),
    /** Spoken narration — also the on-screen captions. Auto-sanitized to strip emojis/hashtags. */
    narration: z
      .string()
      .min(10)
      .max(1000)
      .transform((s) => cleanCaption(s).caption),
    /** One visual brief per image, following the narration beats. */
    imageBriefs: z.array(z.string().min(5).max(500)).min(1).max(10),
    /** MrBeast-style punchy kinetic word popups for the hook. */
    kineticPopups: z.array(kineticPopupSchema).default([]),
    /** Optional end-card text (shown in the last 20% of the reel). */
    cta: z.string().min(1).max(40).optional(),
    /** Mood hint for background music. */
    musicMood: z.string().min(1).max(80).optional(),
    format: z
      .strictObject({
        width: z.literal(1080),
        height: z.literal(1920),
        fps: z.literal(30),
        bitrateKbps: z.number().int().min(2000).max(20000),
      })
      .default({ width: 1080, height: 1920, fps: 30, bitrateKbps: 6000 }),
    audio: z
      .strictObject({
        musicVolume: z.number().min(0).max(1),
        fadeInSec: z.number().min(0).max(5),
        fadeOutSec: z.number().min(0).max(5),
      })
      .default({ musicVolume: 0.3, fadeInSec: 1, fadeOutSec: 2 }),
    captions: z
      .strictObject({
        position: z.literal("bottom"),
        fontSize: z.number().min(24).max(96),
        stroke: z.number().min(0).max(8),
        safeMargin: z.number().min(0).max(0.35),
      })
      .default({ position: "bottom", fontSize: 52, stroke: 3, safeMargin: 0.20 }),
  })
  .transform((val) => {
    const briefs = [...val.imageBriefs];
    while (briefs.length < val.imageCount) {
      briefs.push(briefs[briefs.length - 1] ?? "Cinematic vertical brand scene, pure photography, no text");
    }
    return {
      ...val,
      imageBriefs: briefs.slice(0, val.imageCount),
    };
  });

export type ReelSpec = z.infer<typeof reelSpecSchema>;

/** Everything the composer needs besides the spec: staged files + measurements. */
export interface ReelAssets {
  /** Absolute paths inside OpenReel's allowed roots (staged by the executor). */
  imagePaths: string[];
  voicePath: string;
  musicPath: string;
  /** Measured durations in seconds (WAV header). */
  voiceSeconds: number;
  musicSeconds: number;
  /** Absolute destination for the rendered MP4 (inside allowed roots). */
  outputPath: string;
}

/** Validation gate for voice length vs target duration (speed-fit tolerance). */
export const VOICE_SPEED_MIN = 0.6;
export const VOICE_SPEED_MAX = 1.5;
const VOICE_GOOD_MIN = 0.85;
const VOICE_GOOD_MAX = 1.18;

export function voiceSpeedFor(
  voiceSeconds: number,
  durationSeconds: number,
): { speed: number; quality: "good" | "acceptable" | "unusable" } {
  // Solution C: voice targets D - 0.5s for clean finish before reel loop
  const targetSpeechSec = durationSeconds - 0.5;
  const ratio = voiceSeconds / targetSpeechSec;
  const speed = Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, ratio));
  const quality =
    ratio >= VOICE_GOOD_MIN && ratio <= VOICE_GOOD_MAX
      ? "good"
      : ratio >= VOICE_SPEED_MIN && ratio <= VOICE_SPEED_MAX
        ? "acceptable"
        : "unusable";
  return { speed: +speed.toFixed(3), quality };
}

export function voiceFitCheck(voiceSeconds: number, durationSeconds: number): { ok: boolean; message?: string } {
  const fit = voiceSpeedFor(voiceSeconds, durationSeconds);
  if (fit.quality === "unusable") {
    return {
      ok: false,
      message: `Voice is ${voiceSeconds.toFixed(1)}s — narration should be about ${durationSeconds}s (±15%). Adjust the script and regenerate the plan.`,
    };
  }
  return { ok: true };
}
