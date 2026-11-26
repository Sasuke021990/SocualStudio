import { NextResponse } from "next/server";
import { z } from "zod";
import { saveBrandBrainFile, saveBrandProfileJson, buildMarkdownFromProfile } from "@/features/brand-brain/file-storage";
import { brandBrain2ProfileSchema } from "@/features/brand-brain/schemas";
import type { BrandBrain2Profile } from "@/features/brand-brain/types";

const saveRequestSchema = z.object({
  brainId: z.string().min(1, "brainId is required"),
  brand: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { brainId, brand: rawBrand } = parsed.data;

  // Normalize legacy and Brand Brain 2.0 fields
  const normalized: Partial<BrandBrain2Profile> = {
    brandName: String(rawBrand.brandName || "My Brand"),
    tagline: String(rawBrand.tagline || ""),
    business: String(rawBrand.business || ""),
    industry: String(rawBrand.industry || ""),
    usp: String(rawBrand.usp || ""),
    mission: String(rawBrand.mission || ""),
    founderPersona: String(rawBrand.founderPersona || ""),
    demographics: typeof rawBrand.demographics === "object" && rawBrand.demographics !== null
      ? (rawBrand.demographics as BrandBrain2Profile["demographics"])
      : { targetRoles: [], ageBracket: "20-40", geography: "Global / India" },
    audiencePains: Array.isArray(rawBrand.audiencePains) ? (rawBrand.audiencePains as string[]) : [],
    audienceDesires: Array.isArray(rawBrand.audienceDesires) ? (rawBrand.audienceDesires as string[]) : [],
    objections: Array.isArray(rawBrand.objections) ? (rawBrand.objections as string[]) : [],
    visualStyle: String(rawBrand.visualStyle || "Modern Clean High-Tech"),
    colorPalette: typeof rawBrand.colorPalette === "object" && rawBrand.colorPalette !== null
      ? (rawBrand.colorPalette as BrandBrain2Profile["colorPalette"])
      : { primary: "#0A0F1D", secondary: "#6366F1", accent: "#06B6D4" },
    lightingStyle: String(rawBrand.lightingStyle || "Dramatic studio volumetric rim lighting"),
    compositionStyle: String(rawBrand.compositionStyle || "Centered cinematic subject, shallow depth of field"),
    imagePromptKeywords: Array.isArray(rawBrand.imagePromptKeywords) ? (rawBrand.imagePromptKeywords as string[]) : [],
    voicePersona: String(rawBrand.voicePersona || rawBrand.tone || "Confident modern creator"),
    recommendedVoiceId: String(rawBrand.recommendedVoiceId || "preset-energetic-host"),
    soundBedGenre: String(rawBrand.soundBedGenre || "808 Trending Trap / Drill"),
    soundBedBpm: typeof rawBrand.soundBedBpm === "number" ? rawBrand.soundBedBpm : 138,
    contentPillars: Array.isArray(rawBrand.contentPillars) ? (rawBrand.contentPillars as string[]) : [],
    viralHookAngles: Array.isArray(rawBrand.viralHookAngles) ? (rawBrand.viralHookAngles as string[]) : [],
    wordsToUse: Array.isArray(rawBrand.wordsToUse) ? (rawBrand.wordsToUse as string[]) : [],
    wordsToAvoid: Array.isArray(rawBrand.wordsToAvoid) ? (rawBrand.wordsToAvoid as string[]) : [],
    competitors: Array.isArray(rawBrand.competitors) ? (rawBrand.competitors as string[]) : [],
    coreOffers: Array.isArray(rawBrand.coreOffers)
      ? (rawBrand.coreOffers as string[])
      : Array.isArray(rawBrand.benefits)
      ? (rawBrand.benefits as string[])
      : [],
    pricingModel: String(rawBrand.pricingModel || "Freemium"),
    primaryCta: String(rawBrand.primaryCta || "Link in bio"),
  };

  const validated = brandBrain2ProfileSchema.parse(normalized);

  // 1. Build & save rich human-readable markdown
  const markdown = buildMarkdownFromProfile(validated);
  const { path: mdPath, fileName } = await saveBrandBrainFile(brainId, validated.brandName, markdown);

  // 2. Save structured machine-readable JSON profile
  const jsonPath = await saveBrandProfileJson(brainId, validated);

  return NextResponse.json({
    success: true,
    brainId,
    brandName: validated.brandName,
    file: { path: mdPath, fileName, jsonPath },
    profile: validated,
  });
}
