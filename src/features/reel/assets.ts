import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getWorkspaceConfig } from "@/features/workspace-config/store";

/**
 * Reel assets are staged inside the user's Videos folder — one of OpenReel's
 * allowed roots (import_media_from_path refuses anything outside them).
 */
export function reelWorkDir(itemId: string): string {
  const base = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\Public";
  return join(base, "Videos", "SocialStudio", itemId);
}

export async function ensureReelDir(itemId: string): Promise<string> {
  const dir = reelWorkDir(itemId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Only cleanup trigger in the lifecycle: post deletion. */
export async function removeReelDir(itemId: string): Promise<void> {
  await rm(reelWorkDir(itemId), { recursive: true, force: true });
}

export async function copyIntoReelDir(itemId: string, sourcePath: string, name: string): Promise<string> {
  const dir = await ensureReelDir(itemId);
  const dest = join(dir, name);
  await copyFile(sourcePath, dest);
  return dest;
}

export async function downloadIntoReelDir(itemId: string, url: string, name: string): Promise<string> {
  const dir = await ensureReelDir(itemId);
  const dest = join(dir, name);
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to download asset: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

/** Duration in seconds from a WAV header (RIFF: byteRate @28, data chunk size). */
export async function wavDurationSec(filePath: string): Promise<number> {
  const buf = await readFile(filePath);
  const byteRate = buf.readUInt32LE(28);
  let pos = 12;
  while (pos < buf.length - 8) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "data") return size / byteRate;
    pos += 8 + size + (size % 2);
  }
  throw new Error("WAV data chunk not found");
}

/** Copy the rendered reel into the workspace export folder (per-post subfolder). */
export async function copyReelToExport(itemId: string, reelPath: string): Promise<string> {
  const config = await getWorkspaceConfig();
  const dir = join(config.exportPath, itemId);
  await mkdir(dir, { recursive: true });
  const dest = join(dir, "reel.mp4");
  await copyFile(reelPath, dest);
  return dest;
}
