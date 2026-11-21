import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import type { VoiceProfile } from "./types";

const DATA_DIR = join(process.cwd(), "data", "voice");
const VOICES_PATH = join(DATA_DIR, "voices.json");
export const REFERENCE_DIR = join(DATA_DIR, "references");

interface VoiceState {
  cloned: VoiceProfile[];
}

const EMPTY: VoiceState = { cloned: [] };

let state: VoiceState | null = null;

async function loadFromDisk(): Promise<VoiceState> {
  try {
    const raw = await readFile(VOICES_PATH, "utf-8");
    return JSON.parse(raw) as VoiceState;
  } catch {
    return { ...EMPTY, cloned: [] };
  }
}

async function persist(next: VoiceState): Promise<void> {
  state = next;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(VOICES_PATH, JSON.stringify(next, null, 2), "utf-8");
}

export async function listClonedVoices(): Promise<VoiceProfile[]> {
  if (!state) state = await loadFromDisk();
  return [...state.cloned];
}

export async function saveClonedVoice(input: {
  name: string;
  referencePath: string;
  referenceName: string;
}): Promise<VoiceProfile> {
  const s = state ?? (await loadFromDisk());
  const voice: VoiceProfile = {
    id: `clone-${crypto.randomUUID()}`,
    name: input.name,
    kind: "cloned",
    referencePath: input.referencePath,
    referenceName: input.referenceName,
    createdAt: new Date().toISOString(),
  };
  await persist({ cloned: [...s.cloned, voice] });
  return { ...voice };
}

export async function removeClonedVoice(id: string): Promise<boolean> {
  const s = state ?? (await loadFromDisk());
  const target = s.cloned.find((v) => v.id === id);
  if (!target) return false;
  if (target.referencePath) {
    await unlink(target.referencePath).catch(() => {});
  }
  await persist({ cloned: s.cloned.filter((v) => v.id !== id) });
  return true;
}

export async function getVoiceById(id: string): Promise<VoiceProfile | null> {
  const s = state ?? (await loadFromDisk());
  return s.cloned.find((v) => v.id === id) ?? null;
}

export async function saveReferenceFile(buffer: ArrayBuffer, filename: string): Promise<string> {
  await mkdir(REFERENCE_DIR, { recursive: true });
  const safeName = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = join(REFERENCE_DIR, `${Date.now()}-${safeName}`);
  await writeFile(filePath, Buffer.from(buffer));
  return filePath;
}
