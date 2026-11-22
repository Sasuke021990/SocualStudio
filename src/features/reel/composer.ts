import {
  VOICE_SPEED_MAX,
  VOICE_SPEED_MIN,
  type ReelAssets,
  type ReelSpec,
} from "./schemas";

/**
 * Deterministic ReelSpec → OpenReel tool-call plan. Zero LLM: every timing
 * number here is machine-computed so output is constant for a given spec.
 *
 * Track id placeholders are resolved by the executor via `list_tracks` /
 * `list_clips` at the points marked `resolve`.
 */
export interface ReelToolStep {
  label: string;
  tool: string;
  args: Record<string, unknown>;
  /** Id queries the executor must run BEFORE this step (substitutes placeholders). */
  resolve?: Array<"tracks" | "clips" | "media">;
  /** For `import` steps: logical names matching the imported paths order. */
  mediaNames?: string[];
  /** For `add_clip` steps: logical name of the placed media (clip id key). */
  clipName?: string;
}

const VIDEO_TRACK = "__videoTrack__";
const AUDIO_TRACK_1 = "__audioTrack1__";
const AUDIO_TRACK_2 = "__audioTrack2__";
const clipToken = (mediaName: string) => `__clip:${mediaName}__`;
const mediaToken = (mediaName: string) => `__media:${mediaName}__`;

/** Split narration into caption sentences (verbatim speech text). */
export function captionCues(narration: string, durationSeconds: number, hasCta: boolean): Array<{ text: string; startTime: number; endTime: number }> {
  const sentences = narration
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const speechEnd = hasCta ? durationSeconds * 0.8 : durationSeconds;
  const totalChars = sentences.reduce((s, x) => s + x.length, 0) || 1;
  const cues: Array<{ text: string; startTime: number; endTime: number }> = [];
  let t = 0;
  for (const s of sentences) {
    const end = +(t + (speechEnd * s.length) / totalChars).toFixed(2);
    cues.push({ text: s.replace(/[.!?]+$/, ""), startTime: +t.toFixed(2), endTime: Math.min(end, +speechEnd.toFixed(2)) });
    t = end;
  }
  return cues;
}

export function composeReelPlan(spec: ReelSpec, assets: ReelAssets, opts: { projectName: string }): ReelToolStep[] {
  const D = spec.durationSeconds;
  const N = spec.imageCount;
  const slice = +(D / N).toFixed(3);
  const steps: ReelToolStep[] = [];

  steps.push({ label: "Create project", tool: "create_project", args: { name: opts.projectName, width: 1080, height: 1920, frameRate: 30 } });

  steps.push({
    label: "Import assets",
    tool: "import_media_from_path",
    args: {
      paths: [...assets.imagePaths, assets.voicePath, assets.musicPath],
    },
    resolve: ["media"],
    mediaNames: [...assets.imagePaths.map((_, i) => `img${i}`), "voice", "music"],
  });

  steps.push({ label: "Video track", tool: "add_track", args: { trackType: "video", position: 0 } });
  steps.push({ label: "Voice track", tool: "add_track", args: { trackType: "audio", position: 1 } });
  steps.push({ label: "Music track", tool: "add_track", args: { trackType: "audio", position: 2 } });

  // Image slices: contiguous 0 → D
  for (let i = 0; i < N; i++) {
    steps.push({
      label: `Image ${i + 1}/${N}`,
      tool: "add_clip",
      args: { trackId: VIDEO_TRACK, mediaId: mediaToken(`img${i}`), startTime: +(i * slice).toFixed(3) },
      clipName: `img${i}`,
      ...(i === 0 ? { resolve: ["tracks"] as const } : {}),
    });
  }
  steps.push({ label: "Voice-over", tool: "add_clip", args: { trackId: AUDIO_TRACK_1, mediaId: mediaToken("voice"), startTime: 0 }, clipName: "voice" });
  steps.push({ label: "Background music", tool: "add_clip", args: { trackId: AUDIO_TRACK_2, mediaId: mediaToken("music"), startTime: 0 }, clipName: "music" });

  steps.push({ label: "Resolve clips", tool: "noop", args: {}, resolve: ["clips"] });

  // Exact slice lengths (image clips default to 5s)
  for (let i = 0; i < N; i++) {
    steps.push({
      label: `Trim image ${i + 1}/${N} to ${slice}s`,
      tool: "trim_clip",
      args: { clipId: clipToken(`img${i}`), inPoint: 0, outPoint: slice },
    });
  }

  // Voice fits exactly D seconds (micro speed-fit, validated within tolerance)
  const speed = +(assets.voiceSeconds / D).toFixed(3);
  const clamped = Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, speed));
  if (Math.abs(clamped - 1) > 0.01) {
    steps.push({ label: `Fit voice to ${D}s`, tool: "set_clip_speed", args: { clipId: clipToken("voice"), speed: clamped } });
  }

  // Music covers the whole reel, quiet, with fades
  if (assets.musicSeconds < D - 0.2) {
    steps.push({
      label: `Stretch music to ${D}s`,
      tool: "set_clip_speed",
      args: { clipId: clipToken("music"), speed: +(assets.musicSeconds / D).toFixed(3) },
    });
  } else {
    steps.push({ label: `Trim music to ${D}s`, tool: "trim_clip", args: { clipId: clipToken("music"), inPoint: 0, outPoint: D } });
  }
  steps.push({ label: "Music volume", tool: "set_clip_volume", args: { clipId: clipToken("music"), volume: spec.audio.musicVolume } });
  steps.push({
    label: "Music fades",
    tool: "set_clip_fade",
    args: { clipId: clipToken("music"), fadeIn: spec.audio.fadeInSec, fadeOut: spec.audio.fadeOutSec },
  });

  // Bottom captions, synced to the voice; optional CTA end-card
  const cues = captionCues(spec.narration, D, Boolean(spec.cta));
  for (const cue of cues) {
    steps.push({ label: `Caption "${cue.text.slice(0, 24)}…"`, tool: "add_subtitle", args: { ...cue } });
  }
  if (spec.cta) {
    steps.push({
      label: "CTA end card",
      tool: "add_subtitle",
      args: { text: spec.cta, startTime: +(D * 0.8).toFixed(2), endTime: D },
    });
  }
  steps.push({
    label: "Caption style",
    tool: "set_caption_style",
    args: {
      style: {
        position: spec.captions.position,
        fontSize: spec.captions.fontSize,
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: spec.captions.stroke,
        shadowColor: "#000000",
        shadowBlur: 10,
        safeMargin: spec.captions.safeMargin,
      },
    },
  });

  steps.push({
    label: `Export ${D}s reel`,
    tool: "export_video",
    args: {
      format: "mp4",
      codec: "h264",
      width: spec.format.width,
      height: spec.format.height,
      frameRate: spec.format.fps,
      bitrateKbps: spec.format.bitrateKbps,
      audioChannels: "stereo",
      outputPath: assets.outputPath,
      overwrite: true,
    },
  });

  return steps;
}
