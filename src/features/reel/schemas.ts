import { z } from "zod";

/** Strict ReelSpec — the only shape the planner may produce and the composer accepts. */
export const reelSpecSchema = z
  .strictObject({
    version: z.literal(1),
    /** B-model contract: reels are always exactly 15 or 30 seconds. */
    durationSeconds: z.union([z.literal(15), z.literal(30)]),
    /** How many storyboard images to generate and use (1–3). */
    imageCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    /** Spoken narration — also the on-screen captions. */
    narration: z.string().min(30).max(600),
    /** One visual brief per image, following the narration beats. */
    imageBriefs: z.array(z.string().min(5).max(300)).min(1).max(3),
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
      .default({ musicVolume: 0.25, fadeInSec: 1, fadeOutSec: 2 }),
    captions: z
      .strictObject({
        position: z.literal("bottom"),
        fontSize: z.number().min(24).max(96),
        stroke: z.number().min(0).max(8),
        safeMargin: z.number().min(0).max(0.25),
      })
      .default({ position: "bottom", fontSize: 52, stroke: 3, safeMargin: 0.06 }),
  })
  .superRefine((val, ctx) => {
    const words = val.narration.trim().split(/\s+/).length;
    const minWords = val.durationSeconds === 15 ? 25 : 50;
    const maxWords = val.durationSeconds === 15 ? 70 : 140;
    if (words < minWords || words > maxWords) {
      ctx.addIssue({
        code: "custom",
        path: ["narration"],
        message: `narration must be ${minWords}–${maxWords} words for a ${val.durationSeconds}s reel (got ${words})`,
      });
    }
    if (val.imageBriefs.length !== val.imageCount) {
      ctx.addIssue({
        code: "custom",
        path: ["imageBriefs"],
        message: `imageBriefs length must equal imageCount (${val.imageCount})`,
      });
    }
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
export const VOICE_SPEED_MIN = 0.85;
export const VOICE_SPEED_MAX = 1.18;

export function voiceFitCheck(voiceSeconds: number, durationSeconds: number): { ok: boolean; message?: string } {
  const ratio = voiceSeconds / durationSeconds;
  if (ratio < VOICE_SPEED_MIN || ratio > VOICE_SPEED_MAX) {
    return {
      ok: false,
      message: `Voice is ${voiceSeconds.toFixed(1)}s — narration should be about ${durationSeconds}s (±15%). Adjust the script and regenerate the plan.`,
    };
  }
  return { ok: true };
}
