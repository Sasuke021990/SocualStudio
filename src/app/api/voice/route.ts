import { NextResponse } from "next/server";
import { listClonedVoices, saveClonedVoice, saveReferenceFile, removeClonedVoice } from "@/features/voice/store";
import { VOICE_PRESETS } from "@/features/voice/types";
import { ttsAvailable } from "@/features/voice/tts";

export async function GET() {
  const cloned = await listClonedVoices();
  const engine = await ttsAvailable();
  return NextResponse.json({ presets: VOICE_PRESETS, cloned, engine });
}

/** Upload a voice reference file and create a cloned voice profile */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const name = form.get("name");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file required" }, { status: 400 });
  }
  const voiceName = (typeof name === "string" && name.trim()) || file.name.replace(/\.[^.]+$/, "");

  // The TTS engine requires PCM WAV — convert MP3/M4A/etc. uploads with ffmpeg.
  let buffer = await file.arrayBuffer();
  let referenceName = file.name;
  if (!/\.wav$/i.test(file.name)) {
    const { writeFile, readFile, unlink } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const stem = join(tmpdir(), `ref-${Date.now()}`);
    const inPath = `${stem}-in`;
    const outPath = `${stem}-ref.wav`;
    try {
      await writeFile(inPath, Buffer.from(buffer));
      await run("ffmpeg", ["-y", "-i", inPath, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", outPath], {
        timeout: 60_000,
        windowsHide: true,
      });
      buffer = (await readFile(outPath)).buffer as ArrayBuffer;
      referenceName = `${file.name.replace(/\.[^.]+$/, "")}.wav`;
    } catch {
      return NextResponse.json(
        { error: "Could not convert audio to WAV. Upload a WAV/MP3/M4A file and make sure ffmpeg is installed." },
        { status: 400 },
      );
    } finally {
      await unlink(inPath).catch(() => {});
      await unlink(outPath).catch(() => {});
    }
  }

  const referencePath = await saveReferenceFile(buffer, referenceName);
  const voice = await saveClonedVoice({ name: voiceName, referencePath, referenceName });
  return NextResponse.json({ voice }, { status: 201 });
}

/** Delete a cloned voice */
export async function DELETE(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = (body as { id?: string })?.id;
  if (!parsed) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const removed = await removeClonedVoice(parsed);
  if (!removed) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
