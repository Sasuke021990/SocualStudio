import { mkdir, readFile, readdir, rm, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { BrandBrain2Profile } from "./types";

const BRANDS_DIR = join(process.cwd(), "data", "brands");

function sanitizeName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9\s\-_]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 64) || "unnamed-brand"
  );
}

function brandDir(brainId: string): string {
  return join(BRANDS_DIR, sanitizeName(brainId));
}

export async function saveBrandBrainFile(
  brainId: string,
  brandName: string,
  markdown: string,
): Promise<{ path: string; fileName: string }> {
  const dir = brandDir(brainId);
  await mkdir(dir, { recursive: true });
  const fileName = `${sanitizeName(brandName)}.md`;
  const filePath = join(dir, fileName);
  await writeFile(filePath, markdown, "utf-8");
  return { path: filePath, fileName };
}

export async function saveBrandProfileJson(
  brainId: string,
  profile: BrandBrain2Profile,
): Promise<string> {
  const dir = brandDir(brainId);
  await mkdir(dir, { recursive: true });
  const jsonPath = join(dir, "profile.json");
  await writeFile(jsonPath, JSON.stringify(profile, null, 2), "utf-8");
  return jsonPath;
}

export async function loadBrandProfileJson(brainId: string): Promise<BrandBrain2Profile | null> {
  const dir = brandDir(brainId);
  const jsonPath = join(dir, "profile.json");
  try {
    const raw = await readFile(jsonPath, "utf-8");
    return JSON.parse(raw) as BrandBrain2Profile;
  } catch {
    return null;
  }
}

export function buildMarkdownFromProfile(profile: BrandBrain2Profile): string {
  const lines: string[] = [];
  lines.push(`# ${profile.brandName}`);
  if (profile.tagline) lines.push(`*${profile.tagline}*`);
  lines.push("");
  lines.push(`> Saved: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Business");
  lines.push(profile.business);
  lines.push("");

  lines.push("## Industry");
  lines.push(profile.industry);
  lines.push("");

  lines.push("## Unique Selling Proposition (USP)");
  lines.push(profile.usp);
  lines.push("");

  if (profile.mission) {
    lines.push("## Mission");
    lines.push(profile.mission);
    lines.push("");
  }

  if (profile.founderPersona) {
    lines.push("## Founder Persona");
    lines.push(profile.founderPersona);
    lines.push("");
  }

  lines.push("## Target Audience");
  lines.push(`- **Demographics:** ${profile.demographics.targetRoles.join(", ")} | ${profile.demographics.ageBracket} | ${profile.demographics.geography}`);
  lines.push("");
  lines.push("### Pains");
  for (const p of profile.audiencePains) lines.push(`- ${p}`);
  lines.push("");
  lines.push("### Desires");
  for (const d of profile.audienceDesires) lines.push(`- ${d}`);
  lines.push("");
  if (profile.objections.length) {
    lines.push("### Key Objections");
    for (const o of profile.objections) lines.push(`- ${o}`);
    lines.push("");
  }

  lines.push("## Visual & Art Direction (ComfyUI)");
  lines.push(`- **Visual Style:** ${profile.visualStyle}`);
  lines.push(`- **Palette:** Primary \`${profile.colorPalette.primary}\`, Secondary \`${profile.colorPalette.secondary}\`, Accent \`${profile.colorPalette.accent}\``);
  lines.push(`- **Lighting:** ${profile.lightingStyle}`);
  lines.push(`- **Composition:** ${profile.compositionStyle}`);
  if (profile.imagePromptKeywords.length) {
    lines.push(`- **Image Prompt Keywords:** ${profile.imagePromptKeywords.join(", ")}`);
  }
  lines.push("");

  lines.push("## Audio & Voice Identity (Ming-TTS / SFX)");
  lines.push(`- **Voice Persona:** ${profile.voicePersona}`);
  lines.push(`- **Recommended Voice ID:** \`${profile.recommendedVoiceId}\``);
  lines.push(`- **Sound Bed Genre:** ${profile.soundBedGenre} (${profile.soundBedBpm} BPM)`);
  lines.push("");

  lines.push("## Content Strategy");
  if (profile.contentPillars.length) {
    lines.push("### Content Pillars");
    for (const cp of profile.contentPillars) lines.push(`- ${cp}`);
    lines.push("");
  }
  if (profile.viralHookAngles.length) {
    lines.push("### Proven Viral Hook Angles");
    for (const vh of profile.viralHookAngles) lines.push(`- ${vh}`);
    lines.push("");
  }

  lines.push("## Words to Use");
  for (const w of profile.wordsToUse) lines.push(`- ${w}`);
  lines.push("");

  lines.push("## Words to Avoid");
  for (const w of profile.wordsToAvoid) lines.push(`- ${w}`);
  lines.push("");

  if (profile.competitors.length) {
    lines.push("## Competitors");
    for (const c of profile.competitors) lines.push(`- ${c}`);
    lines.push("");
  }

  lines.push("## Offers & Conversion");
  if (profile.coreOffers.length) {
    for (const o of profile.coreOffers) lines.push(`- ${o}`);
  }
  if (profile.pricingModel) lines.push(`- **Pricing Model:** ${profile.pricingModel}`);
  lines.push(`- **Primary CTA:** ${profile.primaryCta}`);

  return lines.join("\n");
}

export async function loadBrandBrainFile(
  brainId: string,
  brandName: string,
): Promise<string | null> {
  const dir = brandDir(brainId);
  const filePath = join(dir, `${sanitizeName(brandName)}.md`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listBrandBrainFiles(
  brainId: string,
): Promise<Array<{ name: string; path: string; size: number; modifiedAt: string }>> {
  const dir = brandDir(brainId);
  try {
    const entries = await readdir(dir);
    const files = await Promise.all(
      entries
        .filter((e) => e.endsWith(".md"))
        .map(async (name) => {
          const filePath = join(dir, name);
          const st = await stat(filePath);
          return {
            name: name.replace(/\.md$/, ""),
            path: filePath,
            size: st.size,
            modifiedAt: st.mtime.toISOString(),
          };
        }),
    );
    return files;
  } catch {
    return [];
  }
}

export interface ProjectEntry {
  brainId: string;
  brandName: string;
  fileName: string;
  filePath: string;
  size: number;
  modifiedAt: string;
  heading: string;
}

/** List all brand projects across all brain directories. */
export async function listAllProjects(): Promise<ProjectEntry[]> {
  const projects: ProjectEntry[] = [];
  try {
    const brainDirs = await readdir(BRANDS_DIR, { withFileTypes: true });
    for (const brainEntry of brainDirs) {
      if (!brainEntry.isDirectory()) continue;
      const brainPath = join(BRANDS_DIR, brainEntry.name);
      const files = await readdir(brainPath);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const filePath = join(brainPath, file);
        const st = await stat(filePath);
        const raw = await readFile(filePath, "utf-8").catch(() => "");
        const heading = /^#\s+(.+)$/m.exec(raw)?.[1]?.trim() ?? file.replace(/\.md$/, "");
        projects.push({
          brainId: brainEntry.name,
          brandName: file.replace(/\.md$/, ""),
          fileName: file,
          filePath,
          size: st.size,
          modifiedAt: st.mtime.toISOString(),
          heading,
        });
      }
    }
  } catch {
    // data/brands doesn't exist yet — return empty
  }
  return projects.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/** Removes the brand folder (all .md profiles and json) for a brainId. */
export async function deleteBrandBrainDir(brainId: string): Promise<boolean> {
  const dir = brandDir(brainId);
  try {
    await stat(dir);
  } catch {
    return false;
  }
  await rm(dir, { recursive: true, force: true });
  return true;
}

export async function brandBrainFileExists(
  brainId: string,
  brandName: string,
): Promise<boolean> {
  const dir = brandDir(brainId);
  const filePath = join(dir, `${sanitizeName(brandName)}.md`);
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
