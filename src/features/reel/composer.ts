import {
  VOICE_SPEED_MAX,
  VOICE_SPEED_MIN,
  type ReelAssets,
  type ReelSpec,
  type ReelStyle,
} from "./schemas";
import { estimateWordTimings } from "./wordTiming";

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
  /** Round-robin pool: every image clip gets effects[i % effects.length] (empty = no VFX for this style). */
  effects: Array<{ type: string; params: Record<string, unknown> }>;
  /** One consistent set_color_grading payload applied to every image clip. */
  colorGrade: Record<string, unknown>;
  /** Per-glyph animator used for kinetic hook-text popups. */
  popupAnimator: { tool: "add_motion_text_animator" | "add_motion_text_shader_animator"; presetOrShaderId: string };
}

export function directivesForStyle(style: ReelStyle, slice: number): StyleDirectives {
  const transDuration = Math.min(+(slice * 0.2).toFixed(2), 0.45);

  switch (style) {
    case "cinematic":
      return {
        transitions: [
          { type: "crossfade", duration: transDuration },
          { type: "dipToBlack", duration: transDuration },
          { type: "zoom", duration: transDuration },
        ],
        effects: [
          { type: "tilt-shift", params: {} },
          { type: "lens-flare", params: {} },
          { type: "exposure", params: {} },
        ],
        colorGrade: { temp: -6, tint: 1, hsl: { saturation: -8 } },
        popupAnimator: { tool: "add_motion_text_animator", presetOrShaderId: "text-reveal-up" },
      };
    case "tech-explainer":
      return {
        transitions: [
          { type: "push", duration: transDuration },
          { type: "radialWipe", duration: transDuration },
          { type: "circleReveal", duration: transDuration },
        ],
        effects: [
          { type: "vibrance", params: {} },
          { type: "glow", params: {} },
        ],
        colorGrade: { temp: 3, tint: -1, hsl: { saturation: 10 } },
        popupAnimator: { tool: "add_motion_text_shader_animator", presetOrShaderId: "glyph-glow-wave" },
      };
    case "minimalist":
      return {
        transitions: [
          { type: "crossfade", duration: transDuration },
          { type: "crossfade", duration: transDuration },
        ],
        effects: [],
        colorGrade: { temp: 0, tint: 0, hsl: { saturation: -2 } },
        popupAnimator: { tool: "add_motion_text_animator", presetOrShaderId: "text-type-on" },
      };
    case "high-energy":
    default:
      return {
        transitions: [
          { type: "whipPan", duration: transDuration },
          { type: "glitch", duration: Math.min(transDuration, 0.35) },
          { type: "flash", duration: Math.min(transDuration, 0.3) },
        ],
        effects: [
          { type: "vhs-glitch", params: { scanlines: 20, rgbSplit: 35, jitter: 15 } },
          { type: "chromatic-aberration", params: {} },
        ],
        colorGrade: { temp: 6, tint: -2, hsl: { saturation: 18 } },
        popupAnimator: { tool: "add_motion_text_shader_animator", presetOrShaderId: "glyph-dissolve" },
      };
  }
}

/**
 * Target speech finish before end of reel for a clean finish (Solution C):
 * earlier still if a CTA end-card follows, so the voice doesn't run into the
 * CTA's zone. This is the ASPIRATION fed into the speed-fit calculation below
 * — the actual finish, after clamping to [VOICE_SPEED_MIN, VOICE_SPEED_MAX],
 * can miss it. Captions must follow the real finish, not this target
 * (Final review #9).
 */
function targetSpeechSeconds(durationSeconds: number, hasCta: boolean): number {
  return hasCta ? durationSeconds * 0.8 : durationSeconds - 0.5;
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
    // Ken Burns: slow continuous zoom over the clip's full on-screen time.
    // Alternate in/out by index so a multi-image reel doesn't zoom the same
    // way on every clip.
    const zoomIn = i % 2 === 0;
    const scaleStart = zoomIn ? 1.0 : 1.08;
    const scaleEnd = zoomIn ? 1.08 : 1.0;
    steps.push({
      label: `Ken Burns zoom image ${i + 1}/${N}`,
      tool: "set_clip_keyframes",
      args: {
        clipId: clipToken(`img${i}`),
        keyframes: [
          { time: 0, property: "scale.x", value: scaleStart },
          { time: 0, property: "scale.y", value: scaleStart },
          { time: slice, property: "scale.x", value: scaleEnd },
          { time: slice, property: "scale.y", value: scaleEnd },
        ],
      },
    });
    steps.push({
      label: `Color grade image ${i + 1}/${N}`,
      tool: "set_color_grading",
      args: { clipId: clipToken(`img${i}`), colorGrading: styleDirectives.colorGrade },
    });
  }

  // Transitions between adjacent image clips (Creative MCP Tools): cycle
  // through the style's pool so variety keeps going past 2 transitions.
  for (let i = 0; i < N - 1; i++) {
    const trans = styleDirectives.transitions[i % styleDirectives.transitions.length];
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

  // Visual Effects (VFX MCP Tools): every image gets one, cycling through the
  // style's effect pool so a 3rd/4th image isn't left with no VFX at all.
  if (styleDirectives.effects.length > 0) {
    for (let i = 0; i < N; i++) {
      const ef = styleDirectives.effects[i % styleDirectives.effects.length];
      steps.push({
        label: `VFX ${ef.type} on Image ${i + 1}`,
        tool: "add_video_effect",
        args: {
          clipId: clipToken(`img${i}`),
          effectType: ef.type,
          params: ef.params,
        },
      });
    }
  }

  // Kinetic hook-text popups (MrBeast-style): each one is its own Motion
  // Creator composition with a single per-glyph animated text layer, placed
  // onto the main timeline. All four steps are non-fatal creative polish —
  // if the composition fails to create, the dependent layer/animator/insert
  // steps fail too (their tokens won't resolve), which is an accepted
  // cascade rather than special-cased handling (see design doc section 9e).
  // Known limitation carried over from the original plain-text hook: no
  // code-side handling of popup.position is attempted here either.
  spec.kineticPopups.forEach((popup, n) => {
    const compositionToken = `__composition:popup${n}__`;
    const layerToken = `__layer:popup${n}__`;
    steps.push({
      label: `Create popup composition "${popup.text}"`,
      tool: "create_motion_composition",
      args: {
        name: `Popup ${n + 1}: ${popup.text}`,
        duration: popup.duration,
        width: spec.format.width,
        height: spec.format.height,
        frameRate: spec.format.fps,
      },
      captureAs: compositionToken,
    });
    steps.push({
      label: `Add popup text layer "${popup.text}"`,
      tool: "add_motion_layer",
      args: {
        compositionId: compositionToken,
        layerType: "text",
        text: popup.text,
        color: popup.color,
        strokeColor: popup.strokeColor,
        fontSize: popup.fontSize,
      },
      captureAs: layerToken,
    });
    const animator = styleDirectives.popupAnimator;
    steps.push({
      label: `Animate popup "${popup.text}"`,
      tool: animator.tool,
      args:
        animator.tool === "add_motion_text_shader_animator"
          ? { compositionId: compositionToken, layerId: layerToken, shaderId: animator.presetOrShaderId }
          : { compositionId: compositionToken, layerId: layerToken, presetId: animator.presetOrShaderId },
    });
    steps.push({
      label: `Place popup "${popup.text}" on timeline`,
      tool: "insert_motion_into_editor",
      args: { compositionId: compositionToken, startTime: popup.startTime, duration: popup.duration },
    });
  });

  // Voice speed-fitting (Solution C): speed the voice clip to hit
  // targetSpeechSeconds, clamped to the tool's supported speed range. The
  // ACTUAL speech end (actualSpeechEnd) can differ from the target when
  // clamping kicks in — captions are timed against the actual end, below.
  const targetSpeechSec = targetSpeechSeconds(D, Boolean(spec.cta));
  const speed = +(assets.voiceSeconds / targetSpeechSec).toFixed(3);
  const clamped = Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, speed));
  const actualSpeechEnd = +(assets.voiceSeconds / clamped).toFixed(3);
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

  // Word-level animated captions: character-weighted estimate (no ASR tool
  // fits a general "transcribe this TTS audio" need in the OpenReel catalog)
  // grouped into import_captions's word-timed transcript JSON format. Timed
  // against actualSpeechEnd (the real post-speed-fit voice end), not the
  // aspirational target — otherwise clamping silently desyncs captions from
  // the audio (Final review #9).
  const captionSegments = estimateWordTimings(spec.narration, actualSpeechEnd);
  steps.push({
    label: "Import word-timed captions",
    tool: "import_captions",
    args: { content: JSON.stringify({ segments: captionSegments }) },
  });
  if (spec.cta) {
    // Real end-card graphic instead of a plain subtitle. "end-card" is a
    // list_graphic_templates CATEGORY filter, not a templateId (confirmed
    // from the catalog: templateId must be "an id or name from
    // list_graphic_templates") — Final review #5. So look the category up
    // first and feed its first match's id into insert_graphic_template via
    // captureAs. The "text" values key is still a best guess; it varies per
    // template and needs confirming against a live call. Both steps are
    // non-fatal: if no end-card template exists, the reel still completes
    // without a CTA card instead of failing (see design doc 9e).
    const endCardTemplateToken = "__template:end-card__";
    steps.push({
      label: "Find end-card template",
      tool: "list_graphic_templates",
      args: { category: "end-card" },
      captureAs: endCardTemplateToken,
    });
    steps.push({
      label: "CTA end card",
      tool: "insert_graphic_template",
      args: {
        templateId: endCardTemplateToken,
        startTime: +(D * 0.8).toFixed(2),
        duration: +(D * 0.2).toFixed(2),
        values: { text: spec.cta },
      },
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
        highlightColor: "#FFE600",
        strokeColor: "#000000",
        strokeWidth: spec.captions.stroke,
        shadowColor: "#000000",
        shadowBlur: 10,
        safeMargin: spec.captions.safeMargin,
      },
    },
  });

  // Pacing cleanup: caption_qc only reports (reading speed, overlaps, gaps);
  // it never edits the timeline, so it's safe to run unconditionally. The
  // original plan also called for remove_filler_words/remove_pauses, but
  // both ripple-cut the timeline (per their own catalog descriptions) —
  // running them here, after every other step has already computed its
  // timing against a fixed D, would silently desync the word-timed
  // captions, popups and CTA against whatever's left of the timeline, with
  // no non-fatal safety net because the call *succeeds* (Final review #1).
  // The narration is TTS from a clean generated script, not live dictation,
  // so there's no real "filler" or dead air to remove in the first place.
  steps.push({ label: "Caption QC", tool: "caption_qc", args: {} });

  // Beat-sync pulse on the hook popup, only when there's both music to sync
  // to and a popup layer to pulse. Always targets popup index 0 — more
  // popups pulsing independently is a future enhancement, not this task's
  // scope (design doc 9c item 7).
  if (assets.musicSeconds > 1 && spec.kineticPopups.length > 0) {
    steps.push({
      label: "Sync motion to music beat",
      tool: "sync_motion_to_audio",
      args: { compositionId: "__composition:popup0__", mediaId: mediaToken("music") },
    });
    steps.push({
      label: "Pulse hook text on beat",
      tool: "apply_motion_preset_to_beats",
      args: { compositionId: "__composition:popup0__", layerId: "__layer:popup0__", presetId: "pulse" },
    });
  }

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
