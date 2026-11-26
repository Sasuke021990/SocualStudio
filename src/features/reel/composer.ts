import {
  VOICE_SPEED_MAX,
  VOICE_SPEED_MIN,
  type ReelAssets,
  type ReelSpec,
  type ReelStyle,
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
  /** Store this step's returned actionId/id under this token for later substitution. */
  captureAs?: string;
}

const VIDEO_TRACK = "__videoTrack__";
const AUDIO_TRACK_1 = "__audioTrack1__";
const AUDIO_TRACK_2 = "__audioTrack2__";
const clipToken = (mediaName: string) => `__clip:${mediaName}__`;
const mediaToken = (mediaName: string) => `__media:${mediaName}__`;

interface StyleDirectives {
  transitions: Array<{ type: string; duration: number }>;
  effects: Array<{ clipIndex: number; type: string; params: Record<string, unknown> }>;
}

function directivesForStyle(style: ReelStyle, slice: number): StyleDirectives {
  const transDuration = Math.min(+(slice * 0.2).toFixed(2), 0.45);

  switch (style) {
    case "cinematic":
      return {
        transitions: [
          { type: "filmBurn", duration: transDuration },
          { type: "zoom", duration: transDuration },
        ],
        effects: [
          { clipIndex: 0, type: "vignette", params: {} },
          { clipIndex: 1, type: "glow", params: {} },
        ],
      };
    case "tech-explainer":
      return {
        transitions: [
          { type: "push", duration: transDuration },
          { type: "radialWipe", duration: transDuration },
        ],
        effects: [
          { clipIndex: 0, type: "halftone", params: {} },
        ],
      };
    case "minimalist":
      return {
        transitions: [
          { type: "crossfade", duration: transDuration },
          { type: "crossfade", duration: transDuration },
        ],
        effects: [],
      };
    case "high-energy":
    default:
      return {
        transitions: [
          { type: "whipPan", duration: transDuration },
          { type: "glitch", duration: Math.min(transDuration, 0.35) },
        ],
        effects: [
          { clipIndex: 0, type: "vhs-glitch", params: { scanlines: 20, rgbSplit: 35, jitter: 15 } },
          { clipIndex: 1, type: "chromatic-aberration", params: {} },
        ],
      };
  }
}

/** Split narration into caption sentences (verbatim speech text). */
export function captionCues(narration: string, durationSeconds: number, hasCta: boolean): Array<{ text: string; startTime: number; endTime: number }> {
  const sentences = narration
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Speech finishes 0.5s before end of reel for clean audio finish (Solution C)
  const speechEnd = hasCta ? durationSeconds * 0.8 : durationSeconds - 0.5;
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
  const styleDirectives = directivesForStyle(spec.style, slice);

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

  // Exact slice lengths and 9:16 cover fit
  for (let i = 0; i < N; i++) {
    steps.push({
      label: `Trim image ${i + 1}/${N} to ${slice}s`,
      tool: "trim_clip",
      args: { clipId: clipToken(`img${i}`), inPoint: 0, outPoint: slice },
    });
    steps.push({
      label: `Cover fit image ${i + 1}/${N}`,
      tool: "set_clip_transform",
      args: { clipId: clipToken(`img${i}`), transform: { fitMode: "cover" } },
    });
  }

  // Transitions between adjacent image clips (Creative MCP Tools)
  for (let i = 0; i < N - 1; i++) {
    const trans = styleDirectives.transitions[i] ?? { type: "whipPan", duration: 0.4 };
    steps.push({
      label: `Transition ${trans.type} (${i + 1} -> ${i + 2})`,
      tool: "add_transition",
      args: {
        clipAId: clipToken(`img${i}`),
        clipBId: clipToken(`img${i + 1}`),
        transitionType: trans.type,
        duration: trans.duration,
      },
    });
  }

  // Visual Effects (VFX MCP Tools)
  for (const ef of styleDirectives.effects) {
    if (ef.clipIndex < N) {
      steps.push({
        label: `VFX ${ef.type} on Image ${ef.clipIndex + 1}`,
        tool: "add_video_effect",
        args: {
          clipId: clipToken(`img${ef.clipIndex}`),
          effectType: ef.type,
          params: ef.params,
        },
      });
    }
  }

  // Voice speed-fitting (Solution C: targets D - 0.5s for clean audio conclusion)
  const targetSpeechSec = D - 0.5;
  const speed = +(assets.voiceSeconds / targetSpeechSec).toFixed(3);
  const clamped = Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, speed));
  if (Math.abs(clamped - 1) > 0.01) {
    steps.push({ label: `Fit voice to ${targetSpeechSec}s`, tool: "set_clip_speed", args: { clipId: clipToken("voice"), speed: clamped } });
  }
  steps.push({ label: "Voice loudness", tool: "normalize_clip_loudness", args: { clipId: clipToken("voice"), targetLufs: -14 } });

  // Music covers the whole reel, ducked, with fades
  if (assets.musicSeconds < D - 0.2) {
    steps.push({
      label: `Stretch music to ${D}s`,
      tool: "set_clip_speed",
      args: { clipId: clipToken("music"), speed: +(assets.musicSeconds / D).toFixed(3) },
    });
  } else {
    steps.push({ label: `Trim music to ${D}s`, tool: "trim_clip", args: { clipId: clipToken("music"), inPoint: 0, outPoint: D } });
  }
  steps.push({ label: "Music loudness", tool: "normalize_clip_loudness", args: { clipId: clipToken("music"), targetLufs: -14 } });
  steps.push({ label: "Music volume", tool: "set_clip_volume", args: { clipId: clipToken("music"), volume: spec.audio.musicVolume } });
  steps.push({
    label: "Music fades",
    tool: "set_clip_fade",
    args: { clipId: clipToken("music"), fadeIn: spec.audio.fadeInSec, fadeOut: spec.audio.fadeOutSec },
  });

  // Bottom captions with safeMargin 0.20
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
