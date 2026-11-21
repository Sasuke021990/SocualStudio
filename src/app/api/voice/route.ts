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

  const buffer = await file.arrayBuffer();
  const referencePath = await saveReferenceFile(buffer, file.name);
  const voice = await saveClonedVoice({ name: voiceName, referencePath, referenceName: file.name });
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
