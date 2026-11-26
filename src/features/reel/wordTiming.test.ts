import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateWordTimings } from "./wordTiming";

test("splits a two-sentence narration into word-timed segments covering the full duration with no gaps", () => {
  const segments = estimateWordTimings("Hi there. This is a test.", 6);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].words[0].start, 0);
  const lastWord = segments.at(-1)!.words.at(-1)!;
  assert.ok(Math.abs(lastWord.end - 6) < 0.01);
  const allWords = segments.flatMap((s) => s.words);
  for (let i = 1; i < allWords.length; i++) {
    assert.ok(Math.abs(allWords[i].start - allWords[i - 1].end) < 0.001, `gap between word ${i - 1} and ${i}`);
  }
});

test("a single word never produces a zero-duration segment", () => {
  const segments = estimateWordTimings("Wow.", 2);
  assert.equal(segments.length, 1);
  assert.ok(segments[0].words[0].end > segments[0].words[0].start);
});

test("empty narration returns no segments instead of throwing", () => {
  assert.deepEqual(estimateWordTimings("", 5), []);
});
