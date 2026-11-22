import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { getProviderConfig } from "@/features/ai-provider/store";
import { OpenAICompatibleProvider } from "@/features/ai-provider";
import { acquireToolset } from "@/features/mcp-client/registry";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { generateSoundEffect, SFX_OUTPUT_DIR, sfxAvailable } from "@/features/voice/sfx";
import type { ProviderConfig } from "@/features/ai-provider/types";

const requestSchema = z.object({
  caption: z.string().min(1, "Caption required"),
  imageConcept: z.string().optional(),
  brandName: z.string().optional(),
  soundPrompt: z.string().optional(),
});

const sfxPromptSchema = z.object({
  soundPrompt: z.string(),
});

/** Generate an engaging sound bed matched to a post's caption + image concept */
export async function POST(request: Request) {
  const raw = await request.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const { caption, imageConcept, brandName, soundPrompt: presetSoundPrompt } = parsed.data;

  const engine = await sfxAvailable();
  if (!engine.ok) {
    return NextResponse.json({ error: engine.message }, { status: 503 });
  }

  // Phase 1: use the post's pre-generated sound description if available,
  // otherwise have the LLM write one matched to the caption
  let soundPrompt: string;
  if (presetSoundPrompt?.trim()) {
    soundPrompt = presetSoundPrompt.trim();
  } else {
    const config: ProviderConfig = getProviderConfig();
    await freeComfyUIModels();
    const provider = new OpenAICompatibleProvider(config);

    const systemPrompt = `You are a sound designer for social media posts. Write ONE concise sound-effect description (max 30 words) for a sound bed that matches the post's mood, message, and visual.

Rules:
- Describe concrete, evocative sounds (textures, rhythms, ambience) — not music melodies
- Match the emotion of the caption exactly
- Include 2-3 layered sound elements
- Plain descriptive English, no hashtags or quotes

Schema: { "soundPrompt": string }`;

    try {
      const toolset = await acquireToolset("contentGeneration");
      const result = await provider.generateContent<z.infer<typeof sfxPromptSchema>>({
        config,
        system: systemPrompt,
        toolset: toolset ?? undefined,
        prompt: `Post for ${brandName ?? "a brand"}:\n\nCaption: ${caption}\n${imageConcept ? `\nVisual: ${imageConcept}` : ""}\n\nWrite the sound-effect description.`,
        schema: sfxPromptSchema,
        maxRetries: 2,
      });
      soundPrompt = result.soundPrompt;
    } catch {
      // Fall back to a simple prompt derived from the caption
      soundPrompt = caption.slice(0, 80);
    }
  }

  // Phase 2: free GPU (unload LLM + ComfyUI), then MOSS generates the sound
  await freeComfyUIModels();
  await unloadLocalModel(await getProviderConfig());

  await mkdir(SFX_OUTPUT_DIR, { recursive: true });
  const outName = `sfx-${Date.now()}.wav`;
  const outPath = join(SFX_OUTPUT_DIR, outName);

  try {
    await generateSoundEffect({ prompt: soundPrompt, outPath });
    const st = await stat(outPath).catch(() => null);
    if (!st || st.size === 0) {
      return NextResponse.json({ error: "Sound generation produced no audio" }, { status: 500 });
    }
    return NextResponse.json({
      soundPrompt,
      audio: { url: `/api/voice/audio?file=${encodeURIComponent(outName)}`, fileName: outName, size: st.size },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sound generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
