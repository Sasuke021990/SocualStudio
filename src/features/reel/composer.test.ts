import { test } from "node:test";
import assert from "node:assert/strict";
import { composeReelPlan, directivesForStyle } from "./composer";
import type { ReelSpec, ReelAssets } from "./schemas";

export function specWith(overrides: Partial<ReelSpec> = {}): ReelSpec {
  const imageCount = overrides.imageCount ?? 2;
  return {
    version: 1,
    durationSeconds: 15,
    style: "high-energy",
    imageCount,
    narration: "Hi there. This is a short test narration for the reel.",
    imageBriefs: Array.from({ length: imageCount }, (_, i) => `Brief ${i}`),
    kineticPopups: [],
    format: { width: 1080, height: 1920, fps: 30, bitrateKbps: 6000 },
    audio: { musicVolume: 0.3, fadeInSec: 1, fadeOutSec: 2 },
    captions: { position: "bottom", fontSize: 52, stroke: 3, safeMargin: 0.2 },
    ...overrides,
  } as ReelSpec;
}

export function assetsWith(overrides: Partial<ReelAssets> = {}): ReelAssets {
  return {
    imagePaths: ["/img0.png", "/img1.png", "/img2.png"],
    voicePath: "/voice.wav",
    musicPath: "/music.wav",
    voiceSeconds: 12,
    musicSeconds: 20,
    outputPath: "/out.mp4",
    ...overrides,
  };
}

const STYLES: ReelSpec["style"][] = ["cinematic", "tech-explainer", "minimalist", "high-energy"];
const COUNTS: ReelSpec["imageCount"][] = [1, 2, 3];

for (const style of STYLES) {
  for (const imageCount of COUNTS) {
    test(`${style} with imageCount=${imageCount}: every image gets a VFX effect (or none for minimalist)`, () => {
      const steps = composeReelPlan(specWith({ style, imageCount }), assetsWith(), { projectName: "t" });
      const vfxSteps = steps.filter((s) => s.tool === "add_video_effect");
      assert.equal(vfxSteps.length, style === "minimalist" ? 0 : imageCount);
    });
  }
}

for (const style of ["cinematic", "tech-explainer", "high-energy"] as const) {
  test(`${style} has at least 3 transition types in its pool (room to rotate beyond 2)`, () => {
    const directives = directivesForStyle(style, 5);
    assert.ok(directives.transitions.length >= 3, `expected >=3, got ${directives.transitions.length}`);
  });
}

test("minimalist keeps its 2-entry crossfade pool (no variety wanted there)", () => {
  const directives = directivesForStyle("minimalist", 5);
  assert.equal(directives.transitions.length, 2);
  assert.ok(directives.transitions.every((t) => t.type === "crossfade"));
});

test("transitions in the plan cycle through the pool via index modulo", () => {
  const steps = composeReelPlan(specWith({ style: "high-energy", imageCount: 3 }), assetsWith(), { projectName: "t" });
  const pool = directivesForStyle("high-energy", 5).transitions;
  const types = steps.filter((s) => s.tool === "add_transition").map((s) => s.args.transitionType);
  assert.deepEqual(types, [pool[0].type, pool[1].type]);
});

test("every image clip gets a set_clip_keyframes step animating scale over its full slice duration", () => {
  const steps = composeReelPlan(specWith({ imageCount: 2, durationSeconds: 30 }), assetsWith(), { projectName: "t" });
  const kf = steps.filter((s) => s.tool === "set_clip_keyframes");
  assert.equal(kf.length, 2);
  const firstKeyframes = (kf[0].args as { keyframes: Array<{ time: number; property: string; value: number }> }).keyframes;
  const scaleXStart = firstKeyframes.find((k) => k.property === "scale.x" && k.time === 0);
  const scaleXEnd = firstKeyframes.find((k) => k.property === "scale.x" && k.time === 15);
  assert.ok(scaleXStart, "expected a scale.x keyframe at time 0");
  assert.ok(scaleXEnd, "expected a scale.x keyframe at time=slice (15)");
  assert.notEqual(scaleXStart!.value, scaleXEnd!.value);
});

test("set_clip_keyframes targets the matching image clip's token", () => {
  const steps = composeReelPlan(specWith({ imageCount: 2, durationSeconds: 30 }), assetsWith(), { projectName: "t" });
  const kf = steps.filter((s) => s.tool === "set_clip_keyframes");
  assert.equal((kf[0].args as { clipId: string }).clipId, "__clip:img0__");
  assert.equal((kf[1].args as { clipId: string }).clipId, "__clip:img1__");
});

test("every image clip gets a set_color_grading step matching its style's grade", () => {
  const steps = composeReelPlan(specWith({ style: "cinematic", imageCount: 2 }), assetsWith(), { projectName: "t" });
  const grades = steps.filter((s) => s.tool === "set_color_grading");
  assert.equal(grades.length, 2);
  assert.ok((grades[0].args as { colorGrading: object }).colorGrading);
  assert.equal((grades[0].args as { clipId: string }).clipId, "__clip:img0__");
});

test("different styles get different color grades", () => {
  const cinematic = directivesForStyle("cinematic", 5).colorGrade;
  const highEnergy = directivesForStyle("high-energy", 5).colorGrade;
  const minimalist = directivesForStyle("minimalist", 5).colorGrade;
  assert.notDeepEqual(cinematic, highEnergy);
  assert.notDeepEqual(cinematic, minimalist);
});

test("each kineticPopup produces a 4-step motion-composition chain wired by captureAs tokens", () => {
  const spec = specWith({
    style: "high-energy",
    kineticPopups: [{ text: "WAIT FOR IT", startTime: 1, duration: 1.5, position: "center", color: "#FFE600", strokeColor: "#000000", fontSize: 76 }],
  });
  const steps = composeReelPlan(spec, assetsWith(), { projectName: "t" });
  const names = steps.map((s) => s.tool);
  assert.ok(names.includes("create_motion_composition"));
  assert.ok(names.includes("add_motion_layer"));
  assert.ok(names.includes("add_motion_text_shader_animator")); // high-energy's preset
  assert.ok(names.includes("insert_motion_into_editor"));
  const insertStep = steps.find((s) => s.tool === "insert_motion_into_editor")!;
  assert.equal((insertStep.args as { startTime: number }).startTime, 1);
  assert.equal((insertStep.args as { duration: number }).duration, 1.5);
});

test("multiple kineticPopups each get their own composition/layer tokens, not a shared one", () => {
  const spec = specWith({
    kineticPopups: [
      { text: "A", startTime: 0, duration: 1, position: "center", color: "#FFE600", strokeColor: "#000000", fontSize: 76 },
      { text: "B", startTime: 2, duration: 1, position: "center", color: "#FFE600", strokeColor: "#000000", fontSize: 76 },
    ],
  });
  const steps = composeReelPlan(spec, assetsWith(), { projectName: "t" });
  const compositionSteps = steps.filter((s) => s.tool === "create_motion_composition");
  assert.equal(compositionSteps.length, 2);
  assert.notEqual(compositionSteps[0].captureAs, compositionSteps[1].captureAs);
  const layerSteps = steps.filter((s) => s.tool === "add_motion_layer");
  assert.equal((layerSteps[0].args as { compositionId: string }).compositionId, compositionSteps[0].captureAs);
  assert.equal((layerSteps[1].args as { compositionId: string }).compositionId, compositionSteps[1].captureAs);
});

test("no kineticPopups means no motion-composition steps", () => {
  const steps = composeReelPlan(specWith({ kineticPopups: [] }), assetsWith(), { projectName: "t" });
  assert.ok(!steps.some((s) => s.tool === "create_motion_composition"));
});

test("when spec.cta is set, the end card's templateId is resolved via list_graphic_templates, not a literal category name (Final review #5: 'end-card' is a list_graphic_templates category filter, not a templateId)", () => {
  const steps = composeReelPlan(specWith({ cta: "Follow for more", durationSeconds: 30 }), assetsWith(), { projectName: "t" });
  const lookupStep = steps.find((s) => s.tool === "list_graphic_templates");
  assert.ok(lookupStep, "expected a list_graphic_templates lookup step");
  assert.equal((lookupStep!.args as { category: string }).category, "end-card");
  assert.ok(lookupStep!.captureAs, "lookup step must captureAs a token");
  const endCard = steps.find((s) => s.tool === "insert_graphic_template");
  assert.ok(endCard, "expected an insert_graphic_template step");
  assert.equal((endCard!.args as { templateId: string }).templateId, lookupStep!.captureAs);
  assert.notEqual((endCard!.args as { templateId: string }).templateId, "end-card");
  assert.equal((endCard!.args as { values: { text?: string } }).values?.text, "Follow for more");
  assert.equal((endCard!.args as { startTime: number }).startTime, 24);
  assert.ok(!steps.some((s) => s.tool === "add_subtitle" && (s.args as { text?: string }).text === "Follow for more"));
});

test("when spec.cta is not set, there is no insert_graphic_template step", () => {
  const steps = composeReelPlan(specWith({ cta: undefined }), assetsWith(), { projectName: "t" });
  assert.ok(!steps.some((s) => s.tool === "insert_graphic_template"));
});

test("captions are added via import_captions with word-level timing instead of per-sentence add_subtitle", () => {
  const steps = composeReelPlan(specWith({ narration: "Hi there. This works great for testing.", durationSeconds: 30 }), assetsWith(), { projectName: "t" });
  const importStep = steps.find((s) => s.tool === "import_captions");
  assert.ok(importStep, "expected an import_captions step");
  const content = JSON.parse((importStep!.args as { content: string }).content);
  assert.ok(Array.isArray(content.segments) && content.segments.length >= 1);
  assert.ok(content.segments[0].words.length > 0);
  assert.ok(!steps.some((s) => s.tool === "add_subtitle"));
});

test("caption style includes a highlightColor for the word-by-word pop", () => {
  const steps = composeReelPlan(specWith(), assetsWith(), { projectName: "t" });
  const styleStep = steps.find((s) => s.tool === "set_caption_style")!;
  assert.ok((styleStep.args as { style: { highlightColor?: string } }).style.highlightColor);
});

test("word-timed captions follow the actual post-speed-fit voice end, not just the aspirational target (Final review #9)", () => {
  // target = 15 - 0.5 = 14.5s; naive speed = 30/14.5 = ~2.07, clamped to VOICE_SPEED_MAX 1.5
  // => actual speech end = 30 / 1.5 = 20s, well past the naive 14.5s target.
  const steps = composeReelPlan(
    specWith({ durationSeconds: 15, narration: "This is a very long narration that cannot be sped up enough to fit." }),
    assetsWith({ voiceSeconds: 30 }),
    { projectName: "t" },
  );
  const importStep = steps.find((s) => s.tool === "import_captions")!;
  const content = JSON.parse((importStep.args as { content: string }).content);
  const lastWord = content.segments.at(-1).words.at(-1);
  assert.ok(Math.abs(lastWord.end - 20) < 0.1, `expected captions to end near 20s (actual post-clamp speech end), got ${lastWord.end}`);
});

test("popup composition carries the project's frame size, and the layer carries the popup's color/strokeColor/fontSize (Final review #6)", () => {
  const steps = composeReelPlan(
    specWith({ kineticPopups: [{ text: "GO", startTime: 1, duration: 1, position: "center", color: "#FFE600", strokeColor: "#111111", fontSize: 88 }] }),
    assetsWith(),
    { projectName: "t" },
  );
  const compStep = steps.find((s) => s.tool === "create_motion_composition")!;
  assert.equal((compStep.args as { width: number }).width, 1080);
  assert.equal((compStep.args as { height: number }).height, 1920);
  assert.equal((compStep.args as { frameRate: number }).frameRate, 30);
  const layerStep = steps.find((s) => s.tool === "add_motion_layer")!;
  assert.equal((layerStep.args as { color: string }).color, "#FFE600");
  assert.equal((layerStep.args as { strokeColor: string }).strokeColor, "#111111");
  assert.equal((layerStep.args as { fontSize: number }).fontSize, 88);
});

test("pacing cleanup keeps the read-only caption_qc but not the ripple-cutting filler/pause removers (Final review #1: they'd desync the already-computed word-timed captions, popups, and CTA against a shortened timeline)", () => {
  const steps = composeReelPlan(specWith(), assetsWith({ musicSeconds: 0 }), { projectName: "t" });
  assert.ok(!steps.some((s) => s.tool === "remove_filler_words"));
  assert.ok(!steps.some((s) => s.tool === "remove_pauses"));
  assert.ok(steps.some((s) => s.tool === "caption_qc"));
  assert.ok(!steps.some((s) => s.tool === "sync_motion_to_audio"));
});

test("beat-sync is skipped when there's music but no kinetic popup to pulse", () => {
  const steps = composeReelPlan(specWith({ kineticPopups: [] }), assetsWith({ musicSeconds: 15 }), { projectName: "t" });
  assert.ok(!steps.some((s) => s.tool === "sync_motion_to_audio"));
});

test("beat-sync pulses the first kinetic popup's layer when both music and a popup exist", () => {
  const steps = composeReelPlan(
    specWith({ kineticPopups: [{ text: "GO", startTime: 1, duration: 1, position: "center", color: "#FFE600", strokeColor: "#000000", fontSize: 76 }] }),
    assetsWith({ musicSeconds: 15 }),
    { projectName: "t" },
  );
  const syncStep = steps.find((s) => s.tool === "sync_motion_to_audio");
  assert.ok(syncStep);
  const beatStep = steps.find((s) => s.tool === "apply_motion_preset_to_beats");
  assert.ok(beatStep);
  assert.equal((beatStep!.args as { compositionId: string }).compositionId, "__composition:popup0__");
  assert.equal((beatStep!.args as { layerId: string }).layerId, "__layer:popup0__");
});
