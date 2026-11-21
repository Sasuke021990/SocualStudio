import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { TTS_OUTPUT_DIR } from "@/features/voice/tts";
import { SFX_OUTPUT_DIR } from "@/features/voice/sfx";

/** Serve generated TTS and SFX audio files */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file parameter required" }, { status: 400 });
  }

  // Prevent path traversal; check both output dirs (tts-*.wav and sfx-*.wav)
  const safeName = basename(file);
  const candidates = [join(TTS_OUTPUT_DIR, safeName), join(SFX_OUTPUT_DIR, safeName)];

  for (const filePath of candidates) {
    try {
      const st = await stat(filePath);
      const buffer = await readFile(filePath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": String(st.size),
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // try next
    }
  }

  return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
}
