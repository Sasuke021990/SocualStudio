import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import type { VoiceProfile } from "./types";

const execFileAsync = promisify(execFile);

const CLI_PATH = join(process.cwd(), "data", "audiocpp", "vulkan", "audiocpp_cli.exe");
const MODEL_PATH = join(process.cwd(), "data", "models", "ming-3.0-tts-0.5b-q8_0.gguf");

export const TTS_OUTPUT_DIR = join(process.cwd(), "data", "voice", "output");

export async function generateSpeech(params: {
  text: string;
  voice: VoiceProfile;
  outPath: string;
  language?: string;
}): Promise<{ outPath: string }> {
  const { text, voice, outPath, language = "en" } = params;

  const args = [
    "--family", "ming3_tts",
    "--backend", "vulkan",
    "--model", MODEL_PATH,
    "--request-option", `language=${language}`,
    "--text", text,
    "--out", outPath,
  ];

  // Preset voices use voice-design instruction; clones use reference audio
  if (voice.kind === "preset" && voice.instruct) {
    args.push("--task", "vdes", "--request-option", `instruct=${voice.instruct}`);
  } else if (voice.kind === "cloned" && voice.referencePath) {
    args.push("--task", "clon", "--voice-ref", voice.referencePath);
  } else {
    args.push("--task", "tts");
  }

  if (typeof voice.pitchShift === "number" && voice.pitchShift !== 0) {
    args.push("--pitch-shift", String(voice.pitchShift));
  }

  try {
    await execFileAsync(CLI_PATH, args, {
      timeout: 300_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    // audiocpp_cli may exit non-zero while still writing valid audio.
    // The caller checks the output file; log for diagnostics.
    const stderr = err instanceof Error ? (err as { stderr?: string }).stderr : "";
    if (stderr) console.error("[tts]", stderr.slice(0, 500));
  }

  return { outPath };
}

export async function ttsAvailable(): Promise<{ ok: boolean; message: string }> {
  const { stat } = await import("node:fs/promises");
  try {
    await stat(CLI_PATH);
    await stat(MODEL_PATH);
    return { ok: true, message: "Ming TTS engine ready (Vulkan)" };
  } catch {
    return { ok: false, message: "TTS engine or model missing" };
  }
}
