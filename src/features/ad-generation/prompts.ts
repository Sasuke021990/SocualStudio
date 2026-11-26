import type { BrandBrainContent } from "@/features/brand-brain/types";
import { INDIA_CONTEXT } from "@/features/prompts/india";
import { META_AD_LIMITS, type AdPlatform } from "./types";

export interface AdVariantGenerationInput {
  platform: AdPlatform;
  objective: string;
  format: string;
  angle: string;
  brandContent?: BrandBrainContent | null;
}

function formatBrandContext(brandContent: BrandBrainContent | null | undefined): string {
  if (!brandContent) {
    return "No brand profile attached. Use general best practices for the platform.";
  }
  const lines: string[] = [];
  if (brandContent.business) lines.push(`Business: ${brandContent.business}`);
  if (brandContent.industry) lines.push(`Industry: ${brandContent.industry}`);
  if (brandContent.usp) lines.push(`Unique selling proposition: ${brandContent.usp}`);
  if (brandContent.tone) lines.push(`Tone of voice: ${brandContent.tone}`);
  if (brandContent.audiencePains.length) lines.push(`Audience pains: ${brandContent.audiencePains.join(", ")}`);
  if (brandContent.audienceDesires.length) lines.push(`Audience desires: ${brandContent.audienceDesires.join(", ")}`);
  if (brandContent.benefits.length) lines.push(`Benefits to highlight: ${brandContent.benefits.join(", ")}`);
  if (brandContent.wordsToUse.length) lines.push(`Words to use: ${brandContent.wordsToUse.join(", ")}`);
  if (brandContent.wordsToAvoid.length) lines.push(`Words to avoid: ${brandContent.wordsToAvoid.join(", ")}`);
  if (brandContent.competitors.length) lines.push(`Competitors to differentiate from: ${brandContent.competitors.join(", ")}`);
  return lines.length ? lines.join("\n") : "No brand profile attached. Use general best practices for the platform.";
}

export function buildAdVariantGenerationPrompt(input: AdVariantGenerationInput): { system: string; prompt: string } {
  const system = `You are a senior paid-social copywriter who has run high-ROAS campaigns across ${input.platform}. You write ad copy that earns the click, not copy that just describes the product.

${INDIA_CONTEXT}

HOOK ANGLES — open with ONE of these, matched to the campaign objective:
1. Specific number or result ("3x faster checkout", "₹499, not ₹1,999")
2. Named pain point the reader will recognize instantly
3. Direct callout to the audience ("If you run a ${input.platform.toLowerCase()} store...")
4. Contrarian or myth-busting claim
5. Before/after transformation in one line
6. Urgency/scarcity grounded in a real, specific detail (a real stock count, a real deadline) — never fabricated or misleading pressure

MATCH THE HOOK TO THE OBJECTIVE:
- Awareness: lead with the pain point or contrarian angle — the goal is to be remembered, not to close.
- Conversion/sales: lead with the number/result or the before/after — the goal is to make the value undeniable in one line.
- Retargeting/remarketing: assume familiarity — skip the intro, lead with the objection-handler or the specific reason to act now.

COPY RULES:
- Trade vague adjectives ("amazing", "best-in-class", "game-changing", "revolutionary") for one concrete, checkable specific: a number, a named benefit, a timeframe, a comparison.
- primaryText earns the hook; headline is the clincher in ${META_AD_LIMITS.headline} characters or fewer; description adds the proof point or objection-handler; cta is a direct instruction, not a vague nudge.
- Avoid stock ad clichés: "Unlock your potential", "Take your X to the next level", "Say goodbye to X forever", "Limited time only!!!" with no real deadline.
- Write for the stated creative angle and objective — do not default to generic "check this out" copy.
- Keep primaryText at most ${META_AD_LIMITS.primaryText} characters and description at most ${META_AD_LIMITS.description} characters.

EXAMPLE (fictional fitness app, awareness objective, "transformation" angle):
{ "primaryText": "847 people quit the gym this month. These 12 didn't — here's the one habit that made the difference.", "headline": "The 7-Minute Habit That Stuck", "description": "No equipment, no excuses. Built for the days you almost skip.", "cta": "Start Free" }

You reply ONLY with a single JSON object with exactly these string keys: "primaryText", "headline", "description", "cta". No markdown, no commentary, no code fences.`;

  const prompt = [
    `Platform: ${input.platform}`,
    `Campaign objective: ${input.objective}`,
    `Ad format: ${input.format}`,
    `Creative angle: ${input.angle}`,
    "",
    "Brand context:",
    formatBrandContext(input.brandContent),
    "",
    `Write one ad variant for this platform and angle, using one of the hook angles above matched to the objective. Return JSON with keys: primaryText, headline, description, cta.`,
  ].join("\n");

  return { system, prompt };
}
