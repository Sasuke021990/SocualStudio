import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { getContentItem } from "@/features/content-dashboard/store";
import { getWorkspaceConfig } from "@/features/workspace-config/store";
import { SFX_OUTPUT_DIR } from "@/features/voice/sfx";
import { TTS_OUTPUT_DIR } from "@/features/voice/tts";

const EXPORTS_DIR_DEFAULT = join(process.cwd(), "exports");

const exportSchema = z.object({
  itemId: z.string().min(1, "itemId required"),
});

/** Resolve an app media URL to a filesystem path. */
async function resolveMediaFile(mediaUrl: string): Promise<string | null> {
  try {
    const u = new URL(mediaUrl, "http://localhost:3000");
    const file = u.searchParams.get("file");
    const target = u.searchParams.get("url");
    if (file) {
      const safe = basename(file);
      for (const dir of [SFX_OUTPUT_DIR, TTS_OUTPUT_DIR]) {
        const p = join(/*turbopackIgnore: true*/ dir, safe);
        if (await stat(p).catch(() => null)) return p;
      }
    }
    if (target) {
      // ComfyUI proxied image — download
      const res = await fetch(target, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return null;
      const p = join(TTS_OUTPUT_DIR, `export-img-${Date.now()}.png`);
      await writeFile(p, Buffer.from(await res.arrayBuffer()));
      return p;
    }
  } catch {
    return null;
  }
  return null;
}

function safeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").slice(0, 60) || "untitled-post";
}

/**
 * Export a post into a workspace folder with separate files:
 * image, voice, sound, caption text, README.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const item = await getContentItem(parsed.data.itemId);
  if (!item?.variation) {
    return NextResponse.json({ error: "Post not found or has no content" }, { status: 404 });
  }

  const v = item.variation;
  const folderName = safeFolderName(item.title);
  const workspace = await getWorkspaceConfig();
  const baseDir = workspace.exportPath || EXPORTS_DIR_DEFAULT;
  const folderPath = join(/*turbopackIgnore: true*/ baseDir, folderName);
  await mkdir(folderPath, { recursive: true });

  const saved: string[] = [];

  // Image
  if (v.generatedImage) {
    const src = await resolveMediaFile(v.generatedImage);
    if (src) {
      const buf = await readFile(/*turbopackIgnore: true*/ src);
      await writeFile(join(/*turbopackIgnore: true*/ folderPath, "image.png"), buf);
      saved.push("image.png");
    }
  }

  // Voice
  if (v.voiceAudio) {
    const src = await resolveMediaFile(v.voiceAudio);
    if (src) {
      const buf = await readFile(/*turbopackIgnore: true*/ src);
      await writeFile(join(/*turbopackIgnore: true*/ folderPath, "voice.wav"), buf);
      saved.push("voice.wav");
    }
  }

  // Sound
  if (v.sfxAudio) {
    const src = await resolveMediaFile(v.sfxAudio);
    if (src) {
      const buf = await readFile(/*turbopackIgnore: true*/ src);
      await writeFile(join(/*turbopackIgnore: true*/ folderPath, "sound.wav"), buf);
      saved.push("sound.wav");
    }
  }

  // Caption text
  const captionText = `${v.caption}\n\n${v.hashtags.map((h) => `#${h}`).join(" ")}\n\nCTA: ${v.cta}`;
  await writeFile(join(/*turbopackIgnore: true*/ folderPath, "caption.txt"), captionText, "utf-8");
  saved.push("caption.txt");

  // README
  const readme = [
    `# ${item.title}`,
    "",
    `Brand: ${item.brandName}`,
    `Platform: ${item.platform}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    "## Files",
    "- image.png — post image (publish as the post visual)",
    "- voice.wav — voice-over audio (use in Reels/Stories)",
    "- sound.wav — sound bed (use in Reels/Stories)",
    "- caption.txt — full caption with hashtags and CTA (copy-paste when posting)",
    "",
    "## Image concept (for reference)",
    ...Object.entries(v.imageConcept ?? {}).map(([k, val]) => `- ${k}: ${val}`),
    "",
    "## Sound description",
    v.soundPrompt || "-",
    "",
  ].join("\n");
  await writeFile(join(/*turbopackIgnore: true*/ folderPath, "README.md"), readme, "utf-8");
  saved.push("README.md");

  return NextResponse.json({
    folder: { path: folderPath, name: folderName, files: saved },
  });
}
