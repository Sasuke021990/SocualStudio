import { z } from "zod";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { prepareForLlm } from "@/features/ai-provider/gpu";
import { reelSpecSchema, repairKineticPopups, type ReelSpec, type ReelStyle } from "./schemas";
import { INDIA_CONTEXT, INDIA_IMAGE_CONTEXT } from "@/features/prompts/india";
import { stripEmoji, stripHashtags } from "@/features/prompts/clean";

const creativeSchema = z.object({
  hookScore: z.number().min(1).max(10),
  narration: z.string(),
  imageBriefs: z.array(z.string()),
  kineticPopups: z
    .array(
      z.object({
        text: z.string(),
        startTime: z.number().optional(),
        duration: z.number().optional(),
      })
    )
    .optional(),
  cta: z.string().optional(),
  musicMood: z.string().optional(),
});

type Creative = z.infer<typeof creativeSchema>;

const HOOK_LIBRARY = [
  "Bold claim — state a surprising fact or opinion in the first line",
  "Question — ask something the viewer cannot help answering in their head",
  "Curiosity gap — tease a payoff that is only revealed at the end",
  "Mistake callout — 'Stop doing X…' naming a common wrong move",
  "Number promise — '3 things that…' / 'in 15 seconds you will…'",
  "Contrarian — challenge common advice ('Most advice about X is wrong')",
  "Transformation — before/after or day-in-the-life framing",
  "Relatable pain — name a frustration the audience feels daily",
  "Story hook — drop into the middle of a mini-story ('So I tried…')",
  "Direct callout — 'If you <audience>, watch this'",
  "FOMO — what people are missing out on right now",
  "Aspiration — paint the outcome the viewer wants",
];

export interface PlanReelInput {
  brandName: string;
  caption: string;
  hashtags?: string[];
  postCta?: string;
  soundDescription?: string;
  imageConcept?: string;
  /** User's creative direction from the "15-sec reel prompt" field. */
  reelPrompt: string;
  durationSeconds: 15 | 30;
  imageCount: number;
  style?: ReelStyle;
}

function buildSystem(input: PlanReelInput): string {
  // Calibrated for 2.6 words/sec natural speech cadence (Solution C)
  const words = input.durationSeconds === 15 ? "38–42" : "82–92";
  const style = input.style ?? "high-energy";

  return `You are the Viral Director for short-form vertical reels. You write the NARRATION SCRIPT, the IMAGE STORYBOARD, and KINETIC HOOK POPUPS for a ${input.durationSeconds}-second vertical reel for the brand "${input.brandName}".

STYLE: ${style.toUpperCase()} (High-impact pacing, scroll-stopping visual retention).
GOAL: Maximum viewer retention. The narration doubles as on-screen captions, so it must work muted AND spoken.

${INDIA_CONTEXT}

${INDIA_IMAGE_CONTEXT}

HOOK (first line): pick exactly ONE formula from this library and apply it:
${HOOK_LIBRARY.map((h, i) => `${i + 1}. ${h}`).join("\n")}

STRUCTURE (in order):
1. Hook line — pattern-interrupt in the first sentence (first 3 seconds)
2. 2–4 story/tension lines — one idea per line, short punchy sentences (max ~8 words each)
3. Payoff — deliver the promise
${input.postCta ? `4. Optional soft CTA feel in the last line (the CTA card says "${input.postCta}")` : "4. Land on an emotional final line"}

RULES:
- Narration: EXACTLY ${words} words total. This timing is CRITICAL for the voice synthesizer.
- Sentences ARE the captions: spoken text, verbatim, no emojis, no hashtags.
- Self-score your hook 1–10 on "would a stranger stop scrolling?" Be honest.
- imageBriefs: JSON array of exactly ${input.imageCount} NON-EMPTY strings — one storyboard frame per time slice, matched to that specific moment in the narration (the hook frame should visually punch as hard as the hook line; the payoff frame should visually land the payoff). Each brief: specific subject, setting, lighting, mood, vertical composition — under 40 words, photographic, consistent visual style (same color grade, same world) across the whole reel.
  - Not every frame needs a person — mix product/object shots, environment/mood shots, and human-focus shots across the sequence; use whichever sells that narration beat hardest.
  - Be concrete, not generic: name the object, material, color, or action instead of writing "a nice photo of X". A stranger should be able to picture the exact frame from the brief alone.
  - Vary shot type and framing across the sequence (wide, medium, macro/close-up, overhead) so consecutive frames don't feel repetitive — but keep lighting, color palette, and "world" consistent so the reel reads as one continuous story, not unrelated stock photos.
  - If the same person, product, or location needs to recur across multiple frames, describe it identically each time (same clothing, same object, same room) so the visuals stay continuous.
  - Example (human focus): "Young Indian founder laughing mid-sentence in a sunlit co-working space, leaning forward with energy, vertical medium shot, shallow depth of field"
  - Example (product focus): "Close-up of a phone screen lighting up with a notification, warm desk lamp glow, vertical macro shot, shallow depth of field"
  - Example (environment focus): "Empty late-night office with one lit desk lamp and a steaming chai cup, moody blue-gold contrast, vertical wide shot"
- kineticPopups: JSON array of 1–3 punchy uppercase keyword cards for the hook (e.g. [{"text": "STOP SCROLLING", "startTime": 0.2, "duration": 1.5}]).
- musicMood: 2–5 words describing the background music vibe.
- cta: max 3 words or omit it.
- Plain JSON prose only.`;
}

function clampText(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return (cut.slice(0, cut.lastIndexOf(" ")).trim() || cut.trim()).slice(0, max);
}

const clampBrief = (text: string) => clampText(text, 480);

function assemble(input: PlanReelInput, creative: Creative): ReelSpec {
  const cleaned = creative.imageBriefs
    .filter((b): b is string => typeof b === "string")
    .map(clampBrief)
    .filter((b) => b.length >= 5);
  const briefs = cleaned.slice(0, input.imageCount);
  while (briefs.length < input.imageCount) {
    briefs.push(`vertical cinematic still, story scene ${briefs.length + 1}, consistent lighting and mood`);
  }

  const narration = stripHashtags(stripEmoji(creative.narration));
  const kineticPopups = repairKineticPopups(creative.kineticPopups, narration, input.durationSeconds);

  return reelSpecSchema.parse({
    version: 1,
    durationSeconds: input.durationSeconds,
    style: input.style ?? "high-energy",
    imageCount: input.imageCount,
    narration,
    imageBriefs: briefs,
    kineticPopups,
    ...(creative.cta?.trim() ? { cta: stripEmoji(creative.cta).slice(0, 40) } : {}),
    ...(creative.musicMood?.trim() ? { musicMood: clampText(creative.musicMood, 80) } : {}),
  });
}

/** Viral Director: creative fields only — all timing math lives in the composer. */
export async function planReelSpec(input: PlanReelInput, signal?: AbortSignal): Promise<{ spec: ReelSpec; hookScore: number }> {
  await prepareForLlm();
  const config = await getProviderConfig();
  const provider = new OpenAICompatibleProvider(config);
  const system = buildSystem(input);
  const userPrompt = `Brand context:\n${input.caption}\n${(input.hashtags ?? []).map((h) => `#${h}`).join(" ")}\n${input.imageConcept ? `Image concept: ${input.imageConcept}` : ""}\n${input.soundDescription ? `Sound mood: ${input.soundDescription}` : ""}\n\nReel direction from the user:\n${input.reelPrompt}`;

  let lastError: Error | undefined;
  let lastScore: number | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const creative: Creative = await provider.generateContent({
        config,
        system,
        prompt:
          attempt === 0 || lastScore === null
            ? userPrompt
            : `${userPrompt}\n\nPrevious attempt scored ${lastScore}/10 on the hook and was rejected. Make the hook unmistakably scroll-stopping.`,
        schema: creativeSchema,
        signal,
      });
      lastScore = creative.hookScore;
      if (creative.hookScore < 7) {
        lastError = new Error(`Hook scored ${creative.hookScore}/10`);
        continue;
      }
      return { spec: assemble(input, creative), hookScore: creative.hookScore };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new Error(`Viral Director failed to produce an approved plan: ${lastError?.message ?? "unknown error"}`);
}
