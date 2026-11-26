import { test } from "node:test";
import assert from "node:assert/strict";
import { planRequestSchema, reelSpecSchema } from "./schemas";

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
