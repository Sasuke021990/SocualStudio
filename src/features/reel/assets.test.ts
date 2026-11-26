import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertRenderedFileExists } from "./assets";

test("throws when the file does not exist", async () => {
  await assert.rejects(() => assertRenderedFileExists(join(tmpdir(), "does-not-exist-12345.mp4")));
});

test("throws when the file exists but is empty", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reel-export-test-"));
  const path = join(dir, "reel.mp4");
  await writeFile(path, Buffer.alloc(0));
  try {
    await assert.rejects(() => assertRenderedFileExists(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolves when the file exists and has content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "reel-export-test-"));
  const path = join(dir, "reel.mp4");
  await writeFile(path, Buffer.from("not actually a video but non-empty"));
  try {
    await assert.doesNotReject(() => assertRenderedFileExists(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
