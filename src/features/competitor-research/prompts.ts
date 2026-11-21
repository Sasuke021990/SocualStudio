import type { AdPlatform } from "../ad-generation/types";
import { META_AD_LIMITS } from "../ad-generation/types";

export interface ResearchAnalysisInput {
  platform: AdPlatform;
  sourceAd: string;
  sourceUrl?: string;
}

export function buildResearchAnalysisPrompt(input: ResearchAnalysisInput): { system: string; prompt: string } {
  const system = [
    "You are a competitive intelligence analyst and elite direct-response copywriter.",
    'You reply ONLY with a single JSON object with exactly these keys: "findings" (a string) and "beatVariants" (an array of objects with string keys primaryText, headline, description, cta).',
    "No markdown, no commentary, no code fences.",
    "findings must explain why the competitor ad works, its weaknesses, and the openings to exploit.",
    "Each beat variant must be a stronger ad for the same offer and platform: sharper hook, clearer benefit, and a compelling call to action.",
    `Keep each beat variant primaryText at most ${META_AD_LIMITS.primaryText} characters, headline at most ${META_AD_LIMITS.headline} characters, description at most ${META_AD_LIMITS.description} characters.`,
  ].join(" ");

  const prompt = [
    `Platform: ${input.platform}`,
    input.sourceUrl ? `Competitor ad source: ${input.sourceUrl}` : "Competitor ad source: not provided",
    "",
    "Competitor ad copy:",
    input.sourceAd,
    "",
    "Analyze it, then write 3 beat variants that outperform it.",
    'Return JSON: {"findings": "...", "beatVariants": [{"primaryText": "...", "headline": "...", "description": "...", "cta": "..."}, ...]}',
  ].join("\n");

  return { system, prompt };
}
