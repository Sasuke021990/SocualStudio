import { NextResponse } from "next/server";
import { z } from "zod";
import { basename, join } from "node:path";
import { getContentItem, updateContentItem } from "@/features/content-dashboard/store";
import { getComfyUIState, getActiveConnection } from "@/features/comfyui/store";
import { generateComfyImages } from "@/features/comfyui/generate";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { preloadLocalModel } from "@/features/ai-provider/preload";
import { getProviderConfig } from "@/features/ai-provider/store";
import { getMcpConfig } from "@/features/mcp-client/store";
import { composeReelPlan } from "@/features/reel/composer";
import { executeReelPlan, ReelStepError } from "@/features/reel/executor";
import { voiceFitCheck, type ReelAssets, type ReelSpec } from "@/features/reel/schemas";
import {
  copyIntoReelDir,
  copyReelToExport,
  downloadIntoReelDir,
  reelWorkDir,
  wavDurationSec,
} from "@/features/reel/assets";
import { TTS_OUTPUT_DIR } from "@/features/voice/tts";
import { SFX_OUTPUT_DIR } from "@/features/voice/sfx";

const generateRequestSchema = z.object({
  itemId: z.string().min(1),
  connectionId: z.string().optional(),
});

function audioFileName(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const file = new URL(url, "http://localhost").searchParams.get("file");
    return file ? basename(file) : null;
  } catch {
    return null;
  }
}

/** Render a reel from the approved plan. Streams NDJSON progress events. */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const item = await getContentItem(parsed.data.itemId);
  if (!item) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (item.status === "approved") {
    return NextResponse.json({ error: "Approved posts are not editable" }, { status: 403 });
  }
  const variation = item.variation;
  const spec = variation?.reelSpec as ReelSpec | undefined;
  if (!spec) return NextResponse.json({ error: "No reel plan — generate a plan first" }, { status: 400 });

  const voiceFile = audioFileName(variation?.voiceAudio);
  const musicFile = audioFileName(variation?.sfxAudio);
  if (!voiceFile || !musicFile) {
    return NextResponse.json(
      { error: "Generate voice-over and sound first — the reel needs both." },
      { status: 400 },
    );
  }

  const connection = parsed.data.connectionId
    ? (await getComfyUIState()).connections.find((c) => c.id === parsed.data.connectionId) ?? null
    : await getActiveConnection();
  if (!connection?.workflowJson) {
    return NextResponse.json({ error: "No ComfyUI connection with workflow" }, { status: 400 });
  }

  const mcp = await getMcpConfig();
  const openreel = mcp.servers.find((s) => s.name.toLowerCase() === "openreel" && s.enabled);
  if (!openreel) {
    return NextResponse.json({ error: "OpenReel MCP server is not connected (Settings → MCP)" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);
  const itemId = item.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let unloaded = false;
      try {
        // ── 1. Generate storyboard images (VRAM: unload LLM first, free Comfy after) ──
        await unloadLocalModel(await getProviderConfig());
        unloaded = true;
        const imagePaths: string[] = [];
        for (let i = 0; i < spec.imageCount; i++) {
          controller.enqueue(send({ phase: `Generating image ${i + 1}/${spec.imageCount}…` }));
          // Reel storyboard images are 9:16 — they must fill the vertical frame.
          const images = await generateComfyImages(connection, spec.imageBriefs[i], undefined, { width: 720, height: 1280 });
          const path = await downloadIntoReelDir(itemId, images[0].viewUrl, `img${i}.png`);
          imagePaths.push(path);
        }
        await freeComfyUIModels();

        // ── 2. Stage audio ──
        controller.enqueue(send({ phase: "Staging voice and sound…" }));
        const voicePath = await copyIntoReelDir(itemId, join(TTS_OUTPUT_DIR, voiceFile), "voice.wav");
        const musicPath = await copyIntoReelDir(itemId, join(SFX_OUTPUT_DIR, musicFile), "music.wav");
        const voiceSeconds = await wavDurationSec(voicePath);
        const musicSeconds = await wavDurationSec(musicPath);

        const fit = voiceFitCheck(voiceSeconds, spec.durationSeconds);
        if (!fit.ok) throw new Error(fit.message);

        // ── 3. Compose + execute the plan ──
        controller.enqueue(send({ phase: "Building timeline…" }));
        const assets: ReelAssets = {
          imagePaths,
          voicePath,
          musicPath,
          voiceSeconds,
          musicSeconds,
          outputPath: join(reelWorkDir(itemId), "reel.mp4"),
        };
        const steps = composeReelPlan(spec, assets, { projectName: item.title.slice(0, 60) });

        controller.enqueue(send({ phase: `Rendering ${spec.durationSeconds}s reel…` }));
        await executeReelPlan(openreel, steps);

        controller.enqueue(send({ phase: "Exporting…" }));
        await copyReelToExport(itemId, assets.outputPath);

        await updateContentItem(itemId, {
          variation: {
            ...variation!,
            reel: {
              videoFile: "reel.mp4",
              imageFiles: imagePaths.map((p) => basename(p)),
              createdAt: new Date().toISOString(),
            },
          },
        });

        controller.enqueue(
          send({ done: { videoUrl: `/api/reel/file?item=${itemId}`, durationSeconds: spec.durationSeconds, imageCount: spec.imageCount } }),
        );
      } catch (err) {
        const msg =
          err instanceof ReelStepError
            ? `OpenReel step failed — ${err.stepLabel}: ${err.message.replace(err.stepLabel + ": ", "")}`
            : err instanceof Error
              ? err.message
              : "Reel generation failed";
        controller.enqueue(send({ error: msg }));
      } finally {
        // VRAM is free again — warm the model back so planning/LLM calls stay instant.
        if (unloaded) void preloadLocalModel(await getProviderConfig());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
