const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const SHIM_PATH = "C:\\Users\\Administrator\\AppData\\Local\\Programs\\@openreeldesktop\\resources\\app.asar.unpacked\\dist\\mcp-shim\\index.js";
const OUTPUT_DIR = "C:\\Users\\Administrator\\Videos\\SocialStudio\\spike-test\\zenG-love";
const PUBLIC_REEL_DIR = path.join(process.cwd(), "public", "reels");
const CLI_PATH = path.join(process.cwd(), "data", "audiocpp", "vulkan", "audiocpp_cli.exe");
const MODEL_PATH = path.join(process.cwd(), "data", "models", "ming-3.0-tts-0.5b-q8_0.gguf");
const COMFY_URL = "http://127.0.0.1:8188";

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_REEL_DIR)) fs.mkdirSync(PUBLIC_REEL_DIR, { recursive: true });

// 10-Scene Script (Total: 45 seconds, ~4.5s per scene)
const SCRIPT_SCENES = [
  {
    index: 0,
    timeRange: [0.0, 4.5],
    voiceText: "In a world obsessed with ghosting and mixed signals...",
    visualPrompt: "Cinematic medium shot of a stylish young Indian guy standing on a dimly lit metro platform at night, holding his smartphone with gentle reflection on his face, moody cyan and warm amber neon city bokeh in background, 35mm film photography, masterpiece, 8k resolution, clean composition, absolutely no text, no words, no letters, no logos, no watermarks, no labels, no icons",
  },
  {
    index: 1,
    timeRange: [4.5, 9.0],
    voiceText: "...I found someone who replies in two seconds, without overthinking.",
    visualPrompt: "Candid cinematic portrait of a charming young Indian woman smiling warmly while holding a coffee cup in a cozy aesthetic cafe, golden morning light through sheer curtains, beautiful natural expression, depth of field, 35mm film look, pure visual, absolutely no text, no words, no letters, no logos, no watermarks, no labels",
  },
  {
    index: 2,
    timeRange: [9.0, 13.5],
    voiceText: "We never had that awkward talking stage.",
    visualPrompt: "Cinematic wide angle shot, two young friends leaning side by side against a vintage brick balcony railing at sunset, looking out over city rooftops with golden dusk sky, effortless closeness, warm vintage color palette, 35mm photography, clean composition, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 3,
    timeRange: [13.5, 18.0],
    voiceText: "Just spontaneous late-night chai and shared playlists on the metro.",
    visualPrompt: "Atmospheric medium shot, young couple sharing a pair of wired white earbuds on a moving city train, sitting close together with gentle smiles, soft transit reflections on window, cinematic storytelling, 35mm film grain, pure photography, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 4,
    timeRange: [18.0, 22.5],
    voiceText: "Sitting in comfortable silence while the entire city rushes past.",
    visualPrompt: "Cinematic night photography, young Indian couple standing by a street tea stall under amber streetlights, holding steaming clay chai cups, night city traffic motion blur behind them, romantic cozy atmosphere, warm lighting, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 5,
    timeRange: [22.5, 27.0],
    voiceText: "No games, no ego, just effortless reassurance every single day.",
    visualPrompt: "Cinematic warm indoor shot, aesthetic living room with glowing fairy lights, young couple sitting on a plush rug laughing softly while listening to music, warm intimate aesthetic, 35mm portrait lens, pure visual photography, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 6,
    timeRange: [27.0, 31.5],
    voiceText: "You turned mundane grocery runs into core memories.",
    visualPrompt: "Candid lifestyle shot, young couple walking together down a vibrant city street market at dusk holding paper bags with fresh flowers, candid laughter, lively warm ambient lights, natural spontaneous romance, 35mm documentary style, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 7,
    timeRange: [31.5, 36.0],
    voiceText: "And taught my anxious heart how peaceful real love feels.",
    visualPrompt: "Cinematic golden hour silhouette and warm rim lighting, young couple walking peacefully along a serene waterfront promenade during sunset, orange and lavender sky reflecting on calm water, gentle romantic embrace, pure visual, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 8,
    timeRange: [36.0, 40.5],
    voiceText: "Because with you, I never have to second-guess where I stand.",
    visualPrompt: "Intimate close-up portrait of young couple gazing affectionately into each other's eyes under soft evening string lights outdoors, tender authentic romance, shallow depth of field, gorgeous bokeh, film still, absolutely no text, no words, no letters, no logos, no watermarks",
  },
  {
    index: 9,
    timeRange: [40.5, 45.0],
    voiceText: "If this is what forever looks like, I'm staying right here.",
    visualPrompt: "Breathtaking cinematic rooftop shot at blue hour, young couple standing together looking at city skyline glowing with thousands of twinkling lights below, romantic embrace from behind, cinematic masterpiece, 8k resolution, 35mm film still, absolutely no text, no words, no letters, no logos, no watermarks",
  },
];

function jsonOf(text) {
  const a = text.indexOf("[");
  const o = text.indexOf("{");
  const i = a >= 0 && (o < 0 || a < o) ? a : o;
  if (i < 0) return null;
  try {
    return JSON.parse(text.slice(i));
  } catch {
    return null;
  }
}

function actionId(text) {
  const data = jsonOf(text);
  return data?.actionId ?? data?.id ?? null;
}

// -------------------------------------------------------------
// STEP 1: Generate 10 Images with Z Image Turbo (1152x1152, 8 steps)
// -------------------------------------------------------------
async function generateAllImages() {
  console.log(`\n======================================================`);
  console.log(`🎨 STEP 1: Generating 10 Images via Z Image Turbo (1152x1152, 8 steps)`);
  console.log(`======================================================`);

  const connections = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "comfyui", "connections.json"), "utf8"));
  const zturbo = connections.connections.find((c) => c.name.includes("Z Image Turbo"));
  if (!zturbo) throw new Error("Z Image Turbo connection not found in connections.json");

  const imagePaths = [];

  for (let i = 0; i < SCRIPT_SCENES.length; i++) {
    const scene = SCRIPT_SCENES[i];
    const targetFile = path.join(OUTPUT_DIR, `img${i}.png`);

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 50000 && !process.env.REGEN_IMAGES) {
      console.log(`  ⚡ Scene ${i + 1}/10: Using existing image -> ${targetFile}`);
      imagePaths.push(targetFile);
      continue;
    }

    console.log(`\n  🚀 Generating Scene ${i + 1}/10...`);
    console.log(`     Prompt: "${scene.visualPrompt.slice(0, 90)}..."`);

    // Clone workflow and configure finalized sweet-spot parameters
    const wf = JSON.parse(JSON.stringify(zturbo.workflowJson));

    // 1152x1152 Resolution
    if (wf["57:13"] && wf["57:13"].inputs) {
      wf["57:13"].inputs.width = 1152;
      wf["57:13"].inputs.height = 1152;
    }
    // 8 Steps, CFG 1
    if (wf["57:3"] && wf["57:3"].inputs) {
      wf["57:3"].inputs.steps = 8;
      wf["57:3"].inputs.cfg = 1;
      wf["57:3"].inputs.seed = Math.floor(Math.random() * 2 ** 32);
    }
    // Positive prompt
    if (wf["57:27"] && wf["57:27"].inputs) {
      wf["57:27"].inputs.text = scene.visualPrompt;
    }
    // Filename prefix
    if (wf["9"] && wf["9"].inputs) {
      wf["9"].inputs.filename_prefix = `zeng-love-${i}`;
    }

    const t0 = Date.now();
    const queueRes = await fetch(`${COMFY_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: wf }),
    });

    if (!queueRes.ok) {
      throw new Error(`ComfyUI rejected prompt: ${queueRes.status} ${await queueRes.text()}`);
    }

    const { prompt_id: promptId } = await queueRes.json();
    console.log(`     Queued prompt ID: ${promptId}. Waiting for AMD GPU inference...`);

    // Poll until completed
    let downloaded = false;
    while (Date.now() - t0 < 60_000) {
      await new Promise((r) => setTimeout(r, 1500));
      const histRes = await fetch(`${COMFY_URL}/history/${promptId}`);
      if (!histRes.ok) continue;
      const hist = await histRes.json();
      const entry = hist[promptId];

      if (entry?.outputs?.["9"]?.images?.length) {
        const imgInfo = entry.outputs["9"].images[0];
        const viewUrl = `${COMFY_URL}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder)}&type=${encodeURIComponent(imgInfo.type)}`;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
        console.log(`     ✅ Completed in ${elapsed}s! Output: ${imgInfo.filename}`);

        // Download image to local target path
        const dlRes = await fetch(viewUrl);
        const buf = Buffer.from(await dlRes.arrayBuffer());
        fs.writeFileSync(targetFile, buf);
        console.log(`     Saved to: ${targetFile} (${(buf.length / 1024).toFixed(1)} KB)`);
        imagePaths.push(targetFile);
        downloaded = true;
        break;
      }
    }

    if (!downloaded) {
      throw new Error(`Timeout generating image for scene ${i}`);
    }
  }

  return imagePaths;
}

// -------------------------------------------------------------
// STEP 2: Synthesize Voice Track using Ming-TTS (Vulkan GPU)
// -------------------------------------------------------------
function generateVoiceover() {
  console.log(`\n======================================================`);
  console.log(`🎙️ STEP 2: Synthesizing 45s Gen-Z Voiceover via Ming-TTS (Vulkan)`);
  console.log(`======================================================`);

  const voiceOut = path.join(OUTPUT_DIR, "voice_45s.wav");
  const fullText = SCRIPT_SCENES.map((s) => s.voiceText).join(" ");
  console.log(`  Narration script (${fullText.split(/\s+/).length} words):\n  "${fullText}"\n`);

  const ttsArgs = [
    `"${CLI_PATH}"`,
    `--family ming3_tts`,
    `--backend vulkan`,
    `--model "${MODEL_PATH}"`,
    `--task vdes`,
    `--request-option "instruct=印度英语口音，年轻女孩温柔声音，自然随性"`,
    `--request-option "language=en"`,
    `--text "${fullText.replace(/"/g, '\\"')}"`,
    `--out "${voiceOut}"`,
  ].join(" ");

  const t0 = Date.now();
  console.log(`  Executing Vulkan TTS on AMD Radeon AI PRO R9700...`);
  execSync(ttsArgs, { stdio: "inherit" });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  let duration = 45;
  try {
    const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceOut}"`).toString().trim();
    duration = parseFloat(probe) || 45;
  } catch {}

  console.log(`  ✅ Voice synthesized in ${elapsed}s! Duration: ${duration.toFixed(2)}s`);
  return { voiceOut, duration };
}

// -------------------------------------------------------------
// STEP 3: Prepare 45s Romantic Background Music Track
// -------------------------------------------------------------
function prepareMusicTrack() {
  console.log(`\n======================================================`);
  console.log(`🎵 STEP 3: Preparing 45s Background Music Track`);
  console.log(`======================================================`);

  const sourceMusic = path.join("C:\\Users\\Administrator\\Videos\\SocialStudio\\spike-test", "music-30s.wav");
  const targetMusic = path.join(OUTPUT_DIR, "music_45s.wav");

  // Loop & trim to 45s with gentle 2s fade out
  const ffmpegCmd = `ffmpeg -y -stream_loop -1 -i "${sourceMusic}" -t 45 -af "afade=t=in:st=0:d=1,afade=t=out:st=43:d=2,volume=0.25" "${targetMusic}"`;
  execSync(ffmpegCmd, { stdio: "pipe" });

  console.log(`  ✅ 45s background music prepared at ${targetMusic}`);
  return targetMusic;
}

// -------------------------------------------------------------
// STEP 4: Render Reel with OpenReel MCP
// -------------------------------------------------------------
async function renderOpenReelSpike(images, voiceFile, musicFile, totalDuration) {
  console.log(`\n======================================================`);
  console.log(`🎬 STEP 4: Assembling & Rendering Reel via OpenReel MCP`);
  console.log(`======================================================`);

  const client = new Client({ name: "zenG-reel-spike", version: "1.0.0" }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: "node",
    args: [SHIM_PATH],
    env: { ...process.env, OPENREEL_HEADLESS: "1" },
  });

  await client.connect(transport);
  console.log("  Connected to OpenReel MCP Server!");

  const outMp4 = path.join(OUTPUT_DIR, "zenG_love_reel_45s.mp4");
  const publicMp4 = path.join(PUBLIC_REEL_DIR, "zenG_love_reel_45s.mp4");

  // 1. Create Project
  console.log("  [1/7] Creating OpenReel Project (1080x1920 @ 30fps)...");
  await client.callTool({
    name: "create_project",
    arguments: { name: "ZenG_Love_Reel_45s", width: 1080, height: 1920, frameRate: 30 },
  });

  // 2. Import Assets
  console.log("  [2/7] Importing media assets into timeline...");
  const importRes = await client.callTool({
    name: "import_media_from_path",
    arguments: { paths: [...images, voiceFile, musicFile] },
  });
  const importParsed = jsonOf(importRes.content[0]?.text ?? "");
  const mediaList = importParsed?.imported ?? [];
  console.log(`    Imported ${mediaList.length} media items.`);

  const imageMediaIds = mediaList.slice(0, 10).map((m) => m.mediaId);
  const voiceMediaId = mediaList[10]?.mediaId;
  const musicMediaId = mediaList[11]?.mediaId;

  // 3. Create Tracks
  console.log("  [3/7] Creating Timeline Tracks (Video, Voice, Music)...");
  const vTrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "video", position: 0 } });
  const a1TrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "audio", position: 1 } });
  const a2TrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "audio", position: 2 } });
  const vTrackId = `track-${actionId(vTrackRes.content[0]?.text ?? "")}-0`;
  const a1TrackId = `track-${actionId(a1TrackRes.content[0]?.text ?? "")}-0`;
  const a2TrackId = `track-${actionId(a2TrackRes.content[0]?.text ?? "")}-0`;

  // 4. Add 10 Image Clips (4.5s each)
  const clipDuration = 4.5;
  console.log(`  [4/7] Placing 10 Image Clips (each ${clipDuration}s)...`);
  const imageClipIds = [];

  for (let i = 0; i < imageMediaIds.length; i++) {
    const startTime = i * clipDuration;
    const clipRes = await client.callTool({
      name: "add_clip",
      arguments: { trackId: vTrackId, mediaId: imageMediaIds[i], startTime },
    });
    const clipId = `${actionId(clipRes.content[0]?.text ?? "")}-0`;
    imageClipIds.push(clipId);

    // Trim to 4.5s & set Cover scaling (no black bars!)
    await client.callTool({ name: "trim_clip", arguments: { clipId, inPoint: 0, outPoint: clipDuration } });
    await client.callTool({ name: "set_clip_transform", arguments: { clipId, transform: { fitMode: "cover" } } });
  }

  // Add Crossfade Transitions between scenes
  console.log("    Applying crossfade transitions between scenes...");
  for (let i = 0; i < imageClipIds.length - 1; i++) {
    try {
      await client.callTool({
        name: "add_transition",
        arguments: {
          clipAId: imageClipIds[i],
          clipBId: imageClipIds[i + 1],
          transitionType: "crossfade",
          duration: 0.6,
        },
      });
    } catch (e) {
      // Transition optional if edge alignment differs
    }
  }

  // 5. Add Audio Clips
  console.log("  [5/7] Placing Voiceover and Background Music...");
  const vClipRes = await client.callTool({ name: "add_clip", arguments: { trackId: a1TrackId, mediaId: voiceMediaId, startTime: 0 } });
  const mClipRes = await client.callTool({ name: "add_clip", arguments: { trackId: a2TrackId, mediaId: musicMediaId, startTime: 0 } });
  const clipVoice = `${actionId(vClipRes.content[0]?.text ?? "")}-0`;
  const clipMusic = `${actionId(mClipRes.content[0]?.text ?? "")}-0`;

  // Speed fit voice to finish at 44.5s
  const speed = +(totalDuration / 44.5).toFixed(3);
  const clampedSpeed = Math.min(1.25, Math.max(0.8, speed));
  if (Math.abs(clampedSpeed - 1) > 0.02) {
    await client.callTool({ name: "set_clip_speed", arguments: { clipId: clipVoice, speed: clampedSpeed } });
  }

  await client.callTool({ name: "trim_clip", arguments: { clipId: clipVoice, inPoint: 0, outPoint: 45 } });
  await client.callTool({ name: "trim_clip", arguments: { clipId: clipMusic, inPoint: 0, outPoint: 45 } });
  await client.callTool({ name: "set_clip_volume", arguments: { clipId: clipMusic, volume: 0.22 } });

  // 6. Add Synchronized Subtitles
  console.log("  [6/7] Adding 10 Synchronized Subtitle Cues...");
  for (const scene of SCRIPT_SCENES) {
    await client.callTool({
      name: "add_subtitle",
      arguments: {
        text: scene.voiceText,
        startTime: scene.timeRange[0] + 0.1,
        endTime: scene.timeRange[1] - 0.1,
      },
    });
  }

  await client.callTool({
    name: "set_caption_style",
    arguments: {
      style: {
        position: "bottom",
        fontSize: 48,
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
        shadowColor: "#000000",
        shadowBlur: 10,
        safeMargin: 0.18,
      },
    },
  });

  // 7. Render and Export Video
  console.log(`  [7/7] Exporting 45s Reel to MP4: ${outMp4}...`);
  const exportRes = await client.callTool(
    {
      name: "export_video",
      arguments: {
        format: "mp4",
        codec: "h264",
        width: 1080,
        height: 1920,
        frameRate: 30,
        bitrateKbps: 7000,
        audioChannels: "stereo",
        outputPath: outMp4,
        overwrite: true,
      },
    },
    undefined,
    { timeout: 600_000 }
  );
  console.log("    Export response:", exportRes.content[0]?.text?.slice(0, 150));

  await client.close();

  if (fs.existsSync(outMp4)) {
    const stat = fs.statSync(outMp4);
    // Also copy to public directory for direct browser viewing
    fs.copyFileSync(outMp4, publicMp4);
    console.log(`\n🎉 SUCCESS! Rendered 45s Reel:`);
    console.log(`   📂 File: ${outMp4}`);
    console.log(`   🌐 Public View: ${publicMp4}`);
    console.log(`   📊 File Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    return { ok: true, outMp4, publicMp4, size: stat.size };
  } else {
    throw new Error(`Exported MP4 not found at ${outMp4}`);
  }
}

async function main() {
  const overallStart = Date.now();
  console.log(`================================================================`);
  console.log(`🚀 STARTING END-TO-END 45s GENG-Z LOVE REEL SPIKE PIPELINE`);
  console.log(`================================================================`);

  // Step 1: Generate 10 images with Z Image Turbo
  const images = await generateAllImages();

  // Step 2: Generate Voiceover with Ming-TTS
  const { voiceOut, duration } = generateVoiceover();

  // Step 3: Prepare 45s Background Music
  const musicFile = prepareMusicTrack();

  // Step 4: Render Reel with OpenReel MCP
  const result = await renderOpenReelSpike(images, voiceOut, musicFile, duration);

  const totalTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log(`\n================================================================`);
  console.log(`🏁 COMPLETE PIPELINE FINISHED IN ${totalTime}s (~${(totalTime / 60).toFixed(1)} min)`);
  console.log(`   Video saved at: ${result.outMp4}`);
  console.log(`================================================================\n`);
}

main().catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});

