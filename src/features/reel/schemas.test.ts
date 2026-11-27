import { test } from "node:test";
import assert from "node:assert/strict";
import { planRequestSchema, reelSpecSchema, resolveStoredReelSpec } from "./schemas";

function baseSpec(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    durationSeconds: 15,
    style: "high-energy",
    imageCount: 3,
    narration: "Hi there. This is a short test narration for the reel.",
    imageBriefs: ["brief one", "brief two", "brief three"],
    kineticPopups: [],
    ...overrides,
  };
}

test("accepts imageCount 1 (pre-existing saved content keeps validating)", () => {
  const parsed = reelSpecSchema.parse(baseSpec({ imageCount: 1, imageBriefs: ["only one brief"] }));
  assert.equal(parsed.imageBriefs.length, 1);
});

test("accepts imageCount 10 and pads imageBriefs up to exactly 10", () => {
  const parsed = reelSpecSchema.parse(
    baseSpec({ imageCount: 10, imageBriefs: ["brief one", "brief two", "brief three"] }),
  );
  assert.equal(parsed.imageBriefs.length, 10);
});

test("rejects imageCount 11", () => {
  assert.throws(() => reelSpecSchema.parse(baseSpec({ imageCount: 11, imageBriefs: Array(11).fill("a brief") })));
});

test("rejects imageCount 0", () => {
  assert.throws(() => reelSpecSchema.parse(baseSpec({ imageCount: 0, imageBriefs: [] })));
});

function basePlanRequest(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "item-1",
    prompt: "A quick product demo",
    durationSeconds: 15,
    imageCount: 3,
    ...overrides,
  };
}

test("planRequestSchema accepts imageCount up to 10 (the new picker range)", () => {
  const parsed = planRequestSchema.parse(basePlanRequest({ imageCount: 10 }));
  assert.equal(parsed.imageCount, 10);
});

test("planRequestSchema accepts imageCount 4 through 9 (previously rejected by the 1|2|3 union)", () => {
  for (const n of [4, 5, 6, 7, 8, 9]) {
    const parsed = planRequestSchema.parse(basePlanRequest({ imageCount: n }));
    assert.equal(parsed.imageCount, n);
  }
});

test("planRequestSchema rejects imageCount 11", () => {
  assert.throws(() => planRequestSchema.parse(basePlanRequest({ imageCount: 11 })));
});

test("resolveStoredReelSpec backfills kineticPopups on a legacy spec saved before that field existed", () => {
  const legacy = baseSpec();
  delete (legacy as Record<string, unknown>).kineticPopups;
  const spec = resolveStoredReelSpec(legacy);
  assert.ok(spec);
  assert.deepEqual(spec!.kineticPopups, []);
});

test("resolveStoredReelSpec backfills format/audio/captions on a legacy spec missing those blocks", () => {
  const legacy = baseSpec();
  delete (legacy as Record<string, unknown>).kineticPopups;
  const spec = resolveStoredReelSpec(legacy);
  assert.ok(spec);
  assert.deepEqual(spec!.format, { width: 1080, height: 1920, fps: 30, bitrateKbps: 6000 });
  assert.deepEqual(spec!.audio, { musicVolume: 0.3, fadeInSec: 1, fadeOutSec: 2 });
});

test("resolveStoredReelSpec returns null for undefined (no plan saved yet)", () => {
  assert.equal(resolveStoredReelSpec(undefined), null);
});

test("resolveStoredReelSpec returns null for a genuinely malformed stored spec instead of throwing", () => {
  const broken = baseSpec();
  delete (broken as Record<string, unknown>).narration;
  assert.equal(resolveStoredReelSpec(broken), null);
});
