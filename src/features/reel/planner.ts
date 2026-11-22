import { z } from "zod";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { reelSpecSchema, type ReelSpec } from "./schemas";

const creativeSchema = z.object({
  hookScore: z.number().min(1).max(10),
  narration: z.string(),
  imageBriefs: z.array(z.string()),
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
  imageCount: 1 | 2 | 3;
}

function buildSystem(input: PlanReelInput): string {
  const words = input.durationSeconds === 15 ? "25–70" : "50–140";
  return `You are the Viral Director for short-form vertical reels. You write the NARRATION SCRIPT and the IMAGE STORYBOARD for a ${input.durationSeconds}-second 9:16 reel for the brand "${input.brandName}".

GOAL: maximum retention and views. The narration doubles as on-screen captions, so it must work muted AND spoken.

HOOK (first line): pick exactly ONE formula from this library and apply it:
${HOOK_LIBRARY.map((h, i) => `${i + 1}. ${h}`).join("\n")}

STRUCTURE (in order):
1. Hook line — pattern-interrupt in the first sentence
2. 2–4 story/tension lines — one idea per line, short punchy sentences (max ~8 words each)
3. Payoff — deliver the promise
${input.postCta ? `4. Optional soft CTA feel in the last line (the CTA card says "${input.postCta}")` : "4. Land on an emotional final line"}

RULES:
- Narration: ${words} words total. Emotional over informational (aspiration, surprise, relatability).
- Sentences ARE the captions: spoken text, verbatim, no emojis, no stage directions.
- Self-score your hook 1–10 on "would a stranger stop scrolling?" Be honest.
- imageBriefs: a JSON array of exactly ${input.imageCount} NON-EMPTY strings (never "", never null) — one visual brief per time slice, following the narration beats (hook visual → story → payoff). Each brief: subject, setting, light, mood, vertical composition — under 40 words. Photographic, consistent style across briefs.
- musicMood: 2–5 words describing the background music vibe.
- cta: max 3 words or omit it.
- No placeholders, no numbering, no markdown — plain prose only.`;
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
    briefs.push(`vertical cinematic 9:16 still, story scene ${briefs.length + 1}, consistent lighting and mood`);
  }
  return reelSpecSchema.parse({
    version: 1,
    durationSeconds: input.durationSeconds,
    imageCount: input.imageCount,
    narration: creative.narration.trim(),
    imageBriefs: briefs,
    ...(creative.cta?.trim() ? { cta: clampText(creative.cta, 40) } : {}),
    ...(creative.musicMood?.trim() ? { musicMood: clampText(creative.musicMood, 80) } : {}),
  });
}

/** Viral Director: creative fields only — all timing math lives in the composer. */
export async function planReelSpec(input: PlanReelInput, signal?: AbortSignal): Promise<{ spec: ReelSpec; hookScore: number }> {
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
