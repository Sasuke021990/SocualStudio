import { z } from "zod";
import type { BrandBrainContent } from "@/features/brand-brain/types";
import { INDIA_CONTEXT } from "@/features/prompts/india";
import type { AdPlatform } from "@/features/ad-generation/types";

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
  return lines.length ? lines.join("\n") : "No brand profile attached. Use general best practices for the platform.";
}

export const calendarContentSchema = z.object({
  content: z.string().min(1, "content is required"),
});

export interface CalendarContentInput {
  platform: AdPlatform;
  topic: string;
  date: string;
  brandContent?: BrandBrainContent | null;
}

export function buildCalendarContentPrompt(input: CalendarContentInput): { system: string; prompt: string } {
  const system = `You are a senior social media copywriter writing scheduled organic/paid posts that earn stops, not scrolls past.

${INDIA_CONTEXT}

HOOK FIRST: open with a specific claim, number, question, or relatable moment — never a generic greeting or throat-clearing first line.
STRUCTURE: hook line, then 1-3 short lines of story/insight/proof, then a closing line that invites a reply, save, or share. One idea per line — no dense paragraphs.
SPECIFICITY RULE: trade vague adjectives ("amazing", "exciting", "game-changing") for one concrete, checkable detail — a number, a named benefit, a timeframe.
PLATFORM FIT: match the typical post length and tone of ${input.platform} — don't write a long-form caption for a platform built for short, punchy posts, or vice versa.
Keep the post concrete, benefit-driven, and native to the platform's tone.

EXAMPLES (fictional brand, for tone reference only — write fresh content for the actual topic):
- Productivity tip: "3 tabs open, 2 meetings booked, 1 deadline today. Sound familiar? Here's the one calendar trick that got our whole team back to inbox zero by Friday."
- Product update: "We killed the 4-step checkout. It's 1 step now. Here's what changed and why it took us 3 months to get right."

You reply ONLY with a single JSON object with exactly one string key: "content". No markdown, no commentary, no code fences.`;

  const prompt = [
    `Platform: ${input.platform}`,
    `Scheduled date: ${input.date}`,
    `Topic: ${input.topic}`,
    "",
    "Brand context:",
    formatBrandContext(input.brandContent),
    "",
    'Write one social post for this platform and topic, hook first. Return JSON with key: content.',
  ].join("\n");

  return { system, prompt };
}

export const creativeScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  hookStrength: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  ctaStrength: z.number().min(0).max(100),
  platformFit: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
});

export interface CreativeScoreInput {
  platform: AdPlatform;
  objective: string;
  primaryText: string;
  headline?: string;
  description?: string;
  cta?: string;
}

export function buildCreativeScorePrompt(input: CreativeScoreInput): { system: string; prompt: string } {
  const system = [
    "You are a senior paid-social creative reviewer scoring ad copy.",
    'You reply ONLY with a single JSON object with exactly these keys: "overall", "hookStrength", "clarity", "ctaStrength", "platformFit", "strengths", "improvements".',
    "Scores are numbers from 0 to 100. strengths and improvements are arrays of short strings (max 5 each).",
    "No markdown, no commentary, no code fences.",
  ].join(" ");

  const prompt = [
    `Platform: ${input.platform}`,
    `Campaign objective: ${input.objective}`,
    `Primary text: ${input.primaryText}`,
    input.headline ? `Headline: ${input.headline}` : "",
    input.description ? `Description: ${input.description}` : "",
    input.cta ? `CTA: ${input.cta}` : "",
    "",
    "Score this creative. Return JSON with keys: overall, hookStrength, clarity, ctaStrength, platformFit, strengths, improvements.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, prompt };
}
