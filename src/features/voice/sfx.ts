import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const CLI_PATH = join(process.cwd(), "data", "audiocpp", "vulkan", "audiocpp_cli.exe");
const MOSS_MODEL_PATH = join(process.cwd(), "data", "models", "moss-soundeffect-v2-q8_0.gguf");

export const SFX_OUTPUT_DIR = join(process.cwd(), "data", "voice", "sfx");

export async function generateSoundEffect(params: {
  prompt: string;
  outPath: string;
}): Promise<{ outPath: string }> {
  const { prompt, outPath } = params;

  const args = [
    "--family", "moss_soundeffect",
    "--task", "gen",
    "--backend", "vulkan",
    "--model", MOSS_MODEL_PATH,
    "--text", prompt,
    "--out", outPath,
  ];

  try {
    await execFileAsync(CLI_PATH, args, {
      timeout: 300_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    // CLI may exit non-zero while writing valid audio — caller verifies output file
    const stderr = err instanceof Error ? (err as { stderr?: string }).stderr : "";
    if (stderr) console.error("[sfx]", stderr.slice(0, 500));
  }

  return { outPath };
}

export async function sfxAvailable(): Promise<{ ok: boolean; message: string }> {
  const { stat } = await import("node:fs/promises");
  try {
    await stat(CLI_PATH);
    await stat(MOSS_MODEL_PATH);
    return { ok: true, message: "MOSS SoundEffect engine ready (Vulkan)" };
  } catch {
    return { ok: false, message: "MOSS model missing — downloading?" };
  }
}
