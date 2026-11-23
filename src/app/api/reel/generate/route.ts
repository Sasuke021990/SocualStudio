import { NextResponse } from "next/server";
import { z } from "zod";
import { basename, join } from "node:path";
import { getContentItem, updateContentItem } from "@/features/content-dashboard/store";
import type { ContentItem } from "@/features/content-dashboard/types";
import { getComfyUIState, getActiveConnection } from "@/features/comfyui/store";
import { generateComfyImages } from "@/features/comfyui/generate";
import { freeComfyUIModels } from "@/features/comfyui/free";
import { unloadLocalModel } from "@/features/ai-provider/unload";
import { getProviderConfig } from "@/features/ai-provider/store";
import { getMcpConfig } from "@/features/mcp-client/store";
import { composeReelPlan } from "@/features/reel/composer";
import { executeReelPlan, ReelStepError } from "@/features/reel/executor";
import { voiceSpeedFor, type ReelAssets, type ReelSpec } from "@/features/reel/schemas";
import { createReelJob, finishReelJob, type ReelJob } from "@/features/reel/jobs";
import {
  copyIntoReelDir,
  copyReelToExport,
  downloadIntoReelDir,
  ensureReelDir,
  reelWorkDir,
  wavDurationSec,
} from "@/features/reel/assets";
import { generateSpeech } from "@/features/voice/tts";
import { getVoiceById } from "@/features/voice/store";
import { VOICE_PRESETS } from "@/features/voice/types";
import { SFX_OUTPUT_DIR } from "@/features/voice/sfx";

const generateRequestSchema = z.object({
  itemId: z.string().min(1),
  connectionId: z.string().optional(),
  /** Client-side media — sent so unsaved assets still work. */
  voiceUrl: z.string().nullish(),
  sfxUrl: z.string().nullish(),
  imageUrl: z.string().nullish(),
  /** Voice for the reel narration (the post voice-over reads the full caption). */
  voiceId: z.string().nullish(),
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

/**
 * Start rendering a reel from the approved plan. Runs detached and reports
 * progress via /api/reel/job?job=<id> polling — long streams die behind
 * proxies, polls do not.
 */
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

  const musicFile = audioFileName(parsed.data.sfxUrl ?? variation?.sfxAudio);
  if (!musicFile) {
    return NextResponse.json(
      { error: "Generate sound first — the reel needs a music bed. Voice is created from the reel script." },
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

  const job = createReelJob();
  void runReelJob(job, {
    itemId: item.id,
    itemTitle: item.title,
    variation: variation!,
    spec,
    musicFile,
    voiceId: parsed.data.voiceId ?? undefined,
    existingImageUrl: parsed.data.imageUrl ?? variation?.generatedImage ?? undefined,
    connection,
    openreel,
  });

  return NextResponse.json({ job: job.id });
}

interface RunDeps {
  itemId: string;
  itemTitle: string;
  variation: NonNullable<ContentItem["variation"]>;
  spec: ReelSpec;
  musicFile: string;
  voiceId?: string;
  existingImageUrl?: string;
  connection: NonNullable<Awaited<ReturnType<typeof getActiveConnection>>>;
  openreel: NonNullable<Awaited<ReturnType<typeof getMcpConfig>>["servers"][number]>;
}

async function runReelJob(job: ReelJob, deps: RunDeps): Promise<void> {
  const { itemId, itemTitle, variation, spec, musicFile, voiceId, existingImageUrl, connection, openreel } = deps;
  let unloaded = false;
  try {
    // ── 1. Storyboard images (VRAM: unload LLM first, free Comfy after) ──
    await unloadLocalModel(await getProviderConfig());
    unloaded = true;
    const imagePaths: string[] = [];
    // The post's generated image becomes storyboard shot 1 — only the missing
    // shots are generated fresh.
    if (existingImageUrl) {
      job.phase = "Using existing image…";
      const absUrl = existingImageUrl.startsWith("http")
        ? existingImageUrl
        : `http://127.0.0.1:3000${existingImageUrl}`;
      imagePaths.push(await downloadIntoReelDir(itemId, absUrl, "img0.png"));
    }
    for (let i = imagePaths.length; i < spec.imageCount; i++) {
      job.phase = `Generating image ${i + 1}/${spec.imageCount}…`;
      // Reel storyboard images are 9:16 — they must fill the vertical frame.
      const images = await generateComfyImages(connection, spec.imageBriefs[i], undefined, { width: 720, height: 1280 });
      imagePaths.push(await downloadIntoReelDir(itemId, images[0].viewUrl, `img${i}.png`));
    }
    await freeComfyUIModels();

    // ── 2. Audio: narration voice from the reel script + music bed ──
    // Voice auto-fit: synthesize up to 3 attempts and pick the length closest
    // to the target; only unusable lengths (outside 0.6–1.5x) fail.
    job.phase = "Generating reel voice…";
    const voice = (await getVoiceById(voiceId ?? "")) ?? VOICE_PRESETS[0];
    const voicePath = join(await ensureReelDir(itemId), "reel-voice.wav");
    let best: { path: string; seconds: number } | null = null;
    let lastFitError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await generateSpeech({ text: spec.narration, voice, outPath: voicePath });
      const seconds = await wavDurationSec(voicePath);
      const fit = voiceSpeedFor(seconds, spec.durationSeconds);
      if (fit.quality === "unusable") {
        lastFitError =
          `Voice is ${seconds.toFixed(1)}s — narration should be about ${spec.durationSeconds}s. Adjust the script and regenerate the plan.`;
        continue;
      }
      const distance = Math.abs(seconds - spec.durationSeconds);
      if (!best || distance < Math.abs(best.seconds - spec.durationSeconds)) {
        best = { path: voicePath, seconds };
      }
      if (fit.quality === "good") break;
    }
    if (!best) throw new Error(lastFitError ?? "Voice generation failed");

    job.phase = "Staging music…";
    const musicPath = await copyIntoReelDir(itemId, join(SFX_OUTPUT_DIR, musicFile), "music.wav");
    const voiceSeconds = best.seconds;
    const musicSeconds = await wavDurationSec(musicPath);

    // ── 3. Compose + execute ──
    job.phase = "Building timeline…";
    const assets: ReelAssets = {
      imagePaths,
      voicePath,
      musicPath,
      voiceSeconds,
      musicSeconds,
      outputPath: join(reelWorkDir(itemId), "reel.mp4"),
    };
    const steps = composeReelPlan(spec, assets, { projectName: itemTitle.slice(0, 60) });

    job.phase = `Rendering ${spec.durationSeconds}s reel…`;
    await executeReelPlan(openreel, steps);

    job.phase = "Exporting…";
    await copyReelToExport(itemId, assets.outputPath);

    await updateContentItem(itemId, {
      variation: {
        ...variation,
        reel: {
          videoFile: "reel.mp4",
          imageFiles: imagePaths.map((p) => basename(p)),
          createdAt: new Date().toISOString(),
        },
      },
    });

    job.done = { videoUrl: `/api/reel/file?item=${itemId}`, durationSeconds: spec.durationSeconds, imageCount: spec.imageCount };
    job.phase = "Done";
    finishReelJob(job.id);
  } catch (err) {
    const raw =
      err instanceof ReelStepError
        ? `OpenReel step failed — ${err.stepLabel}: ${err.message.replace(err.stepLabel + ": ", "")}`
        : err instanceof Error
          ? err.message
          : "Reel generation failed";
    job.error = /fetch failed/i.test(raw)
      ? "OpenReel is not reachable — open the OpenReel desktop app and try again."
      : raw;
    job.phase = "Failed";
    finishReelJob(job.id);
  } finally {
    // LLM stays unloaded after generation — it loads on demand for the next
    // content call (VRAM stays free for the GPU while idle).
  }
}
