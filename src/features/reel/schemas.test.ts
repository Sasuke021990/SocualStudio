import { test } from "node:test";
import assert from "node:assert/strict";
import { reelSpecSchema } from "./schemas";

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
