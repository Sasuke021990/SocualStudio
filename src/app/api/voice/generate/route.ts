import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { getVoiceById } from "@/features/voice/store";
import { VOICE_PRESETS } from "@/features/voice/types";
import { generateSpeech, TTS_OUTPUT_DIR } from "@/features/voice/tts";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { getProviderConfig } from "@/features/ai-provider/store";
import { freeComfyUIModels } from "@/features/comfyui/free";

const generateSchema = z.object({
  text: z.string().min(1, "Text required"),
  voiceId: z.string().min(1, "voiceId required"),
  language: z.string().default("en"),
});

export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const { text, voiceId, language } = parsed.data;

  // Resolve voice: preset or cloned
  const voice = VOICE_PRESETS.find((v) => v.id === voiceId) ?? (await getVoiceById(voiceId));
  if (!voice) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 });
  }

  // Free GPU: unload LLM + free ComfyUI before TTS
  await freeComfyUIModels();
  await unloadLocalModel(await getProviderConfig());

  await mkdir(TTS_OUTPUT_DIR, { recursive: true });
  const outName = `tts-${Date.now()}.wav`;
  const outPath = join(TTS_OUTPUT_DIR, outName);

  try {
    await generateSpeech({ text, voice, outPath, language });

    // Verify output exists (CLI may exit non-zero but still write valid audio)
    const st = await stat(outPath).catch(() => null);
    if (!st || st.size === 0) {
      return NextResponse.json({ error: "Speech generation produced no audio" }, { status: 500 });
    }

    return NextResponse.json({
      audio: { url: `/api/voice/audio?file=${encodeURIComponent(outName)}`, fileName: outName, size: st.size },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Speech generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
