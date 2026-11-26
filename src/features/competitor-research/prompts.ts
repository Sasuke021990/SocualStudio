import type { AdPlatform } from "../ad-generation/types";
import { META_AD_LIMITS } from "../ad-generation/types";
import { INDIA_CONTEXT } from "@/features/prompts/india";

export interface ResearchAnalysisInput {
  platform: AdPlatform;
  sourceAd: string;
  sourceUrl?: string;
}

export function buildResearchAnalysisPrompt(input: ResearchAnalysisInput): { system: string; prompt: string } {
  const system = `You are a competitive intelligence analyst and elite direct-response copywriter who reverse-engineers why ads win or lose, then writes variants that beat them.

${INDIA_CONTEXT}

ANALYSIS RUBRIC — findings must name, specifically, in a few tight sentences each:
1. The hook mechanism — what grabs attention in the first line, and the psychological reason it works on this audience (curiosity, fear of missing out, identity, proof, authority).
2. The persuasion lever — name it precisely: social proof, urgency, authority, reciprocity, specificity, contrast.
3. Platform-native fit — does the format, tone, and length actually fit how people consume ${input.platform}, or does it read like it was ported from another platform?
4. The weakest point — a vague claim, a buried benefit, a weak or generic CTA, a mismatch between hook and offer.
5. The exploitable opening — the single sharpest thing a better version would do differently.

BEAT VARIANT RULES:
- Each of the 3 beat variants must out-hook, out-prove, or out-close the original — pick a different lever per variant (e.g. one leads with a number, one with a named pain point, one with social proof) so they're genuinely distinct, not three rewordings of the same idea.
- Trade vague adjectives for concrete specifics: a number, a named benefit, a comparison, a timeframe.
- Each variant should fix the weakest point identified in the findings, not just restate the original with nicer words.
- Keep each variant primaryText at most ${META_AD_LIMITS.primaryText} characters, headline at most ${META_AD_LIMITS.headline} characters, description at most ${META_AD_LIMITS.description} characters.

You reply ONLY with a single JSON object with exactly these keys: "findings" (a string) and "beatVariants" (an array of objects with string keys primaryText, headline, description, cta). No markdown, no commentary, no code fences.`;

  const prompt = [
    `Platform: ${input.platform}`,
    input.sourceUrl ? `Competitor ad source: ${input.sourceUrl}` : "Competitor ad source: not provided",
    "",
    "Competitor ad copy:",
    input.sourceAd,
    "",
    "Analyze it against the rubric, then write 3 beat variants that each beat it on a different lever and fix the weakest point you identified.",
    'Return JSON: {"findings": "...", "beatVariants": [{"primaryText": "...", "headline": "...", "description": "...", "cta": "..."}, ...]}',
  ].join("\n");

  return { system, prompt };
}
