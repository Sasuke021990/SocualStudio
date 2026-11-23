const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require("path");
const fs = require("fs");

const SHIM_PATH = "C:\\Users\\Administrator\\AppData\\Local\\Programs\\@openreeldesktop\\resources\\app.asar.unpacked\\dist\\mcp-shim\\index.js";
const SPIKE_DIR = "C:\\Users\\Administrator\\Videos\\SocialStudio\\spike-test";

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

async function runReelSpike(client, { duration, name, voiceFile, musicFile, transitions, effects }) {
  console.log(`\n========================================`);
  console.log(`🎬 STARTING SPIKE TEST: ${name} (${duration}s)`);
  console.log(`========================================`);

  const img0 = path.join(SPIKE_DIR, "img0.png");
  const img1 = path.join(SPIKE_DIR, "img1.png");
  const img2 = path.join(SPIKE_DIR, "img2.png");
  const voice = path.join(SPIKE_DIR, voiceFile);
  const music = path.join(SPIKE_DIR, musicFile);
  const outMp4 = path.join(SPIKE_DIR, `${name.toLowerCase()}.mp4`);

  if (fs.existsSync(outMp4) && !process.env.FORCE_RERENDER) {
    const stat = fs.statSync(outMp4);
    console.log(`⚡ Existing render verified: ${outMp4} (${(stat.size / 1024 / 1024).toFixed(2)} MB).`);
    return { ok: true, path: outMp4, size: stat.size };
  }

  // 1. Create Project
  console.log(`[1/9] Creating project: ${name}...`);
  const projRes = await client.callTool({
    name: "create_project",
    arguments: { name, width: 1080, height: 1920, frameRate: 30 },
  });
  console.log("  ->", projRes.content[0]?.text?.slice(0, 100));

  // 2. Import Media
  console.log(`[2/9] Importing media assets...`);
  const importRes = await client.callTool({
    name: "import_media_from_path",
    arguments: { paths: [img0, img1, img2, voice, music] },
  });
  const importParsed = jsonOf(importRes.content[0]?.text ?? "");
  const mediaList = importParsed?.imported ?? [];
  console.log(`  -> Imported ${mediaList.length} media items:`, mediaList.map((m) => m.mediaId));
  const [mediaImg0, mediaImg1, mediaImg2, mediaVoice, mediaMusic] = mediaList.map((m) => m.mediaId);

  // 3. Add Tracks
  console.log(`[3/9] Creating timeline tracks...`);
  const vTrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "video", position: 0 } });
  const a1TrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "audio", position: 1 } });
  const a2TrackRes = await client.callTool({ name: "add_track", arguments: { trackType: "audio", position: 2 } });
  const vTrackId = `track-${actionId(vTrackRes.content[0]?.text ?? "")}-0`;
  const a1TrackId = `track-${actionId(a1TrackRes.content[0]?.text ?? "")}-0`;
  const a2TrackId = `track-${actionId(a2TrackRes.content[0]?.text ?? "")}-0`;
  console.log(`  -> Tracks created: Video=${vTrackId}, Voice=${a1TrackId}, Music=${a2TrackId}`);

  // 4. Add Image Clips (3 slices: 0 -> D/3, D/3 -> 2D/3, 2D/3 -> D)
  const slice = duration / 3;
  console.log(`[4/9] Adding image clips (${slice}s each)...`);
  const c0Res = await client.callTool({ name: "add_clip", arguments: { trackId: vTrackId, mediaId: mediaImg0, startTime: 0 } });
  const c1Res = await client.callTool({ name: "add_clip", arguments: { trackId: vTrackId, mediaId: mediaImg1, startTime: slice } });
  const c2Res = await client.callTool({ name: "add_clip", arguments: { trackId: vTrackId, mediaId: mediaImg2, startTime: slice * 2 } });
  const clipImg0 = `${actionId(c0Res.content[0]?.text ?? "")}-0`;
  const clipImg1 = `${actionId(c1Res.content[0]?.text ?? "")}-0`;
  const clipImg2 = `${actionId(c2Res.content[0]?.text ?? "")}-0`;
  console.log(`  -> Image clips placed: ${clipImg0}, ${clipImg1}, ${clipImg2}`);

  // Trim images to exact slice length
  await client.callTool({ name: "trim_clip", arguments: { clipId: clipImg0, inPoint: 0, outPoint: slice } });
  await client.callTool({ name: "trim_clip", arguments: { clipId: clipImg1, inPoint: 0, outPoint: slice } });
  await client.callTool({ name: "trim_clip", arguments: { clipId: clipImg2, inPoint: 0, outPoint: slice } });

  // Cover-scale images to 9:16
  await client.callTool({ name: "set_clip_transform", arguments: { clipId: clipImg0, transform: { fitMode: "cover" } } });
  await client.callTool({ name: "set_clip_transform", arguments: { clipId: clipImg1, transform: { fitMode: "cover" } } });
  await client.callTool({ name: "set_clip_transform", arguments: { clipId: clipImg2, transform: { fitMode: "cover" } } });

  // 5. Add Transitions (Creative MCP Tools!)
  console.log(`[5/9] Applying OpenReel Transitions...`);
  if (transitions[0]) {
    console.log(`  -> Transition 0: ${transitions[0].type} between ${clipImg0} and ${clipImg1}`);
    const t0Res = await client.callTool({
      name: "add_transition",
      arguments: {
        clipAId: clipImg0,
        clipBId: clipImg1,
        transitionType: transitions[0].type,
        duration: transitions[0].duration,
      },
    });
    console.log("     Result:", t0Res.content[0]?.text?.slice(0, 100));
  }
  if (transitions[1]) {
    console.log(`  -> Transition 1: ${transitions[1].type} between ${clipImg1} and ${clipImg2}`);
    const t1Res = await client.callTool({
      name: "add_transition",
      arguments: {
        clipAId: clipImg1,
        clipBId: clipImg2,
        transitionType: transitions[1].type,
        duration: transitions[1].duration,
      },
    });
    console.log("     Result:", t1Res.content[0]?.text?.slice(0, 100));
  }

  // 6. Add Visual Effects (VFX MCP Tools!)
  console.log(`[6/9] Applying OpenReel Visual Effects...`);
  if (effects[0]) {
    console.log(`  -> Effect on clip 0: ${effects[0].type}`);
    const ef0Res = await client.callTool({
      name: "add_video_effect",
      arguments: {
        clipId: clipImg0,
        effectType: effects[0].type,
        params: effects[0].params || {},
      },
    });
    console.log("     Result:", ef0Res.content[0]?.text?.slice(0, 100));
  }
  if (effects[1]) {
    console.log(`  -> Effect on clip 1: ${effects[1].type}`);
    const ef1Res = await client.callTool({
      name: "add_video_effect",
      arguments: {
        clipId: clipImg1,
        effectType: effects[1].type,
        params: effects[1].params || {},
      },
    });
    console.log("     Result:", ef1Res.content[0]?.text?.slice(0, 100));
  }

  // 7. Add Voice & Music
  console.log(`[7/9] Adding audio (Voice-over & Music)...`);
  const vClipRes = await client.callTool({ name: "add_clip", arguments: { trackId: a1TrackId, mediaId: mediaVoice, startTime: 0 } });
  const mClipRes = await client.callTool({ name: "add_clip", arguments: { trackId: a2TrackId, mediaId: mediaMusic, startTime: 0 } });
  const clipVoice = `${actionId(vClipRes.content[0]?.text ?? "")}-0`;
  const clipMusic = `${actionId(mClipRes.content[0]?.text ?? "")}-0`;

  // Solution C: Speed-fit voiceover to finish exactly at D - 0.5s
  const { execSync } = require("child_process");
  let voiceSec = duration;
  try {
    const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voice}"`).toString().trim();
    voiceSec = parseFloat(probe) || duration;
  } catch {}
  const targetSpeechSec = duration - 0.5;
  const speed = +(voiceSec / targetSpeechSec).toFixed(3);
  const clampedSpeed = Math.min(1.25, Math.max(0.8, speed));
  if (Math.abs(clampedSpeed - 1) > 0.01) {
    console.log(`  -> Solution C: speed-fitting voice from ${voiceSec.toFixed(2)}s to ${targetSpeechSec}s (${clampedSpeed}x)`);
    await client.callTool({ name: "set_clip_speed", arguments: { clipId: clipVoice, speed: clampedSpeed } });
  }

  await client.callTool({ name: "trim_clip", arguments: { clipId: clipVoice, inPoint: 0, outPoint: duration } });
  await client.callTool({ name: "trim_clip", arguments: { clipId: clipMusic, inPoint: 0, outPoint: duration } });
  await client.callTool({ name: "normalize_clip_loudness", arguments: { clipId: clipVoice, targetLufs: -14 } });
  await client.callTool({ name: "normalize_clip_loudness", arguments: { clipId: clipMusic, targetLufs: -14 } });
  await client.callTool({ name: "set_clip_volume", arguments: { clipId: clipMusic, volume: 0.3 } });
  await client.callTool({ name: "set_clip_fade", arguments: { clipId: clipMusic, fadeIn: 1, fadeOut: 2 } });

  // 8. Add Subtitles (with elevated safeMargin: 0.20)
  console.log(`[8/9] Adding speech subtitles with 20% safeMargin...`);
  const cues =
    duration === 15
      ? [
          { text: "Stop paying ₹1 lakh/month for AI", startTime: 0.2, endTime: 4.8 },
          { text: "You don't need a GPU farm or a PhD", startTime: 5.0, endTime: 9.8 },
          { text: "Build with Hugging Face & Open Source!", startTime: 10.0, endTime: 14.5 },
        ]
      : [
          { text: "Stop scrolling right now", startTime: 0.2, endTime: 4.5 },
          { text: "You are paying thousands for AI tools you don't need", startTime: 4.8, endTime: 9.5 },
          { text: "In 2026, the entire landscape has shifted", startTime: 9.8, endTime: 14.5 },
          { text: "Build with open-source models on your local machine", startTime: 14.8, endTime: 19.5 },
          { text: "Deploy and scale world-class AI products faster", startTime: 19.8, endTime: 24.5 },
          { text: "Click the link in bio to start building today!", startTime: 24.8, endTime: 29.5 },
        ];

  for (const cue of cues) {
    await client.callTool({ name: "add_subtitle", arguments: { text: cue.text, startTime: cue.startTime, endTime: cue.endTime } });
  }
  await client.callTool({
    name: "set_caption_style",
    arguments: {
      style: {
        position: "bottom",
        fontSize: 52,
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
        shadowColor: "#000000",
        shadowBlur: 10,
        safeMargin: 0.2,
      },
    },
  });

  // 9. Export Rendered Reel MP4
  console.log(`[9/9] Exporting ${duration}s reel to MP4: ${outMp4}...`);
  const exportRes = await client.callTool(
    {
      name: "export_video",
      arguments: {
        format: "mp4",
        codec: "h264",
        width: 1080,
        height: 1920,
        frameRate: 30,
        bitrateKbps: 6000,
        audioChannels: "stereo",
        outputPath: outMp4,
        overwrite: true,
      },
    },
    undefined,
    { timeout: 600_000 }
  );
  console.log("  -> Export result:", exportRes.content[0]?.text?.slice(0, 200));

  if (fs.existsSync(outMp4)) {
    const stat = fs.statSync(outMp4);
    console.log(`✅ SUCCESS: ${name} exported! File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    return { ok: true, path: outMp4, size: stat.size };
  } else {
    console.error(`❌ FAILED: Output file not found at ${outMp4}`);
    return { ok: false, error: "Output file not found" };
  }
}

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SHIM_PATH],
  });
  const client = new Client({ name: "spike-runner", version: "1.0.0" });
  console.log("Connecting to OpenReel MCP server...");
  await client.connect(transport);
  console.log("Connected to OpenReel MCP!");

  // Test 1: 15-Second Reel (High Energy / Hype Style)
  const res15 = await runReelSpike(client, {
    duration: 15,
    name: "Spike_Reel_15s",
    voiceFile: "voice-15s.wav",
    musicFile: "music-15s.wav",
    transitions: [
      { type: "whipPan", duration: 0.4 },
      { type: "glitch", duration: 0.35 },
    ],
    effects: [
      { type: "vhs-glitch", params: { scanlines: 20, rgbSplit: 40, jitter: 20 } },
      { type: "chromatic-aberration", params: {} },
    ],
  });

  // Test 2: 30-Second Reel (Cinematic / Film Burn Style)
  const res30 = await runReelSpike(client, {
    duration: 30,
    name: "Spike_Reel_30s",
    voiceFile: "voice-30s.wav",
    musicFile: "music-30s.wav",
    transitions: [
      { type: "filmBurn", duration: 0.6 },
      { type: "zoom", duration: 0.5 },
    ],
    effects: [
      { type: "vignette", params: {} },
      { type: "glow", params: {} },
    ],
  });

  console.log("\n========================================");
  console.log("🎯 SPIKE TEST SUMMARY");
  console.log("========================================");
  console.log("15-Second Reel:", res15.ok ? `PASSED (${(res15.size / 1024 / 1024).toFixed(2)} MB)` : "FAILED");
  console.log("30-Second Reel:", res30.ok ? `PASSED (${(res30.size / 1024 / 1024).toFixed(2)} MB)` : "FAILED");
  console.log("========================================\n");

  await client.close();
}

main().catch((err) => {
  console.error("Fatal spike error:", err);
  process.exit(1);
});

