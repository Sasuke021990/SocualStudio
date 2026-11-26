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
