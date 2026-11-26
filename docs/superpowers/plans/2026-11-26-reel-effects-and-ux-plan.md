# Reel Effects, Export Verification & Image Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop silent export failures, replace the default reel visual style with two tasteful presets, and let users pick 3–10 storyboard images instead of being capped at 3.

**Architecture:** Three independent, additive changes to the existing reel pipeline (`src/features/reel/*`, `src/features/mcp-client/client.ts`, `src/app/workspace/[id]/workspace-client.tsx`). No new files beyond tests; no new OpenReel tools beyond what the live catalog already documents. One prerequisite fix (Task 0) unblocks the test runner itself on this machine.

**Tech Stack:** TypeScript, Next.js API routes, Zod schemas, Node's native `node:test` runner via this project's `scripts/test-loader.mjs` loader, OpenReel MCP tools.

**Spec:** `docs/superpowers/specs/2026-11-26-reel-effects-and-ux-design.md`

**Verified test command (discovered during pre-flight, not previously documented in this repo):**
```
node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"
```
`npm test` does not exist as a package.json script; `--import` alone does not register the loader's `resolve` hook on this Node version (v22.23.5) — `--experimental-loader` is required.

## Global Constraints

- Every effect/transition/shader id introduced or changed must be a value verified against `docs/openreel-tool-catalog.json`'s `add_transition.transitionType` enum, `list_pro_effects`' effectType enum, `add_video_effect`'s documented standard types, or `add_motion_text_shader_animator`'s documented shader ids — never invented.
- `imageCount`/`imageBriefs` schema bounds widen to **min(1).max(10)**, not min(3) — a saved `ReelSpec` with `imageCount: 1` or `2` from before this change must keep validating. The **UI** control is what limits new plans to 3–10; the schema stays permissive for backward compatibility. (Decision made during planning, overriding the design doc's literal "min 3" framing — see design doc §5's backward-compatibility constraint.)
- `style: "cinematic"` and `style: "tech-explainer"` keep their existing string values in `ReelStyle`/`reelStyleSchema` — only the *directive values* `directivesForStyle()` returns for those keys change. No new enum members, no schema change for styles.
- `export_video` stays a fatal step (not added to `NON_FATAL_TOOLS`). The new verification added in Task 1/2 must make failures *louder and earlier*, never swallow them.
- TDD per `superpowers:test-driven-development` for every task that has a test file in its Files block. Tasks 5 and 7 are UI-only with no existing component-test harness in this repo (no `.test.tsx` files exist anywhere) — verified manually via the dev server instead; this is stated per-task, not silently skipped.

## Review Focus

- A saved `ReelSpec` with `style: "cinematic"` or `style: "tech-explainer"` from before this change still passes `reelSpecSchema` and still composes a full step plan without throwing — it will just render with the new look if ever regenerated. (Task 3/4's tests must include a composer run against the *old* style keys, not just assertions on `directivesForStyle()`'s return value.)
- A saved `ReelSpec` with `imageCount: 1` or `imageCount: 2` (pre-existing content) still validates under the widened schema. (Task 6's test.)
- `imageCount` at the new boundary values 1 and 10 (not just the middle) still produces exactly that many `imageBriefs` through the schema's padding/truncation `.transform()`. (Task 6's test.)
- An MCP `callTool` result with `isError: true` and text that does **not** match any of `executor.ts`'s five known `ERROR_CODES` tokens must now throw, where today it silently passes through as a success string. (Task 1's test — this is the actual root cause of the reported ENOENT.)
- `export_video` returning without throwing but producing a zero-byte or missing file at `assets.outputPath` must be caught before `copyReelToExport` runs, with a clear message, not a raw `ENOENT`. (Task 2's test — covers both "file missing" and "file exists but empty" since OpenReel could in principle create an empty placeholder.)

---

### Task 0: Fix `executor.ts`'s TypeScript syntax so the native test runner can load it

**Why this is first:** `src/features/reel/executor.ts:37`'s `ReelStepError` constructor uses a TS parameter property (`constructor(readonly stepLabel: string, message: string)`), which Node's `--experimental-strip-types` mode cannot parse (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Today this makes the *entire* `executor.test.ts` file fail to load on this machine — 9 real tests never run, and every full-suite check in every later task would show a false failure unrelated to that task's own change. This is a type-only syntax change; no behavior changes.

**Files:**
- Modify: `src/features/reel/executor.ts:36-40`

**Interfaces:**
- Produces: `ReelStepError` keeps the exact same public shape (`stepLabel: string` readonly property, `message` via `Error`) — no caller anywhere changes.

- [ ] **Step 1: Confirm the current failure**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/executor.test.ts`
Expected: FAIL with `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript parameter property is not supported in strip-only mode`, pointing at `executor.ts:37`.

- [ ] **Step 2: Rewrite the constructor without a parameter property**

Replace:
```ts
export class ReelStepError extends Error {
  constructor(readonly stepLabel: string, message: string) {
    super(`${stepLabel}: ${message}`);
  }
}
```
with:
```ts
export class ReelStepError extends Error {
  readonly stepLabel: string;
  constructor(stepLabel: string, message: string) {
    super(`${stepLabel}: ${message}`);
    this.stepLabel = stepLabel;
  }
}
```

- [ ] **Step 3: Run executor's own suite**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/executor.test.ts`
Expected: PASS, all of executor.test.ts's existing tests (no count change from this task — same tests, now actually running).

- [ ] **Step 4: Run the full suite to confirm the new baseline**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"`
Expected: PASS, all tests across all files (this becomes the clean baseline every later task's full-suite check compares against).

- [ ] **Step 5: Commit**

```bash
git add src/features/reel/executor.ts
git commit -m "fix: avoid TS parameter property so native test runner can load executor.ts"
```

---

### Task 1: Surface MCP `isError` instead of silently treating it as success

**Files:**
- Modify: `src/features/mcp-client/client.ts`
- Test: `src/features/mcp-client/client.test.ts` (new)

**Interfaces:**
- Produces: `export function parseCallToolResult(res: { content?: Array<{ type: string; text?: string }>; isError?: boolean }): string` — pure function, throws `Error` when `res.isError` is true, otherwise returns the same joined-text string `callTool` returns today.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCallToolResult } from "./client";

test("returns joined text content when isError is absent", () => {
  const result = parseCallToolResult({ content: [{ type: "text", text: "ok" }] });
  assert.equal(result, "ok");
});

test("throws using the content text when isError is true", () => {
  assert.throws(
    () => parseCallToolResult({ content: [{ type: "text", text: "needs confirmation" }], isError: true }),
    /needs confirmation/,
  );
});

test("throws with a fallback message when isError is true and content is empty", () => {
  assert.throws(() => parseCallToolResult({ isError: true }), /isError/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/mcp-client/client.test.ts`
Expected: FAIL — `parseCallToolResult` is not exported yet (`SyntaxError`/`TypeError` on the import, or `ERR_MODULE_NOT_FOUND` for the symbol).

- [ ] **Step 3: Implement `parseCallToolResult` in `client.ts` and use it from `callTool`**

Extract the existing text-joining logic (currently inlined in the `callTool` closure, around the lines that build `content`/`text` and `return text || JSON.stringify(res)`) into the exported `parseCallToolResult` function from the Interfaces block above. Add the `isError` check: when true, throw `new Error(text || "MCP tool call returned isError with no message")` using the same joined text. Change `callTool`'s body to `return parseCallToolResult(res);`.

- [ ] **Step 4: Run to verify it passes**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/mcp-client/client.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Run the full suite**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"`
Expected: PASS, no regressions (executor.ts's own `ERROR_CODES` handling now actually receives thrown errors from fatal tool calls that return `isError: true`, which is the intended effect — existing executor tests construct fake `McpConnection.callTool` directly and are unaffected by this change, since they don't go through the real `client.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/features/mcp-client/client.ts src/features/mcp-client/client.test.ts
git commit -m "fix: throw on MCP isError instead of returning it as success text"
```

---

### Task 2: Verify the exported file actually exists before copying it

**Files:**
- Modify: `src/features/reel/assets.ts`
- Modify: `src/app/api/reel/generate/route.ts`
- Test: `src/features/reel/assets.test.ts` (new)

**Interfaces:**
- Produces: `export async function assertRenderedFileExists(path: string): Promise<void>` — resolves silently when `path` exists and is non-empty; throws `Error` with a message naming the path otherwise.
- Consumes: nothing from other tasks (independent of Task 1, though both address the same user-visible bug from different ends — Task 1 stops the false-success from the tool call, Task 2 is the last-resort guard right before the copy that produced the reported `ENOENT`).

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/assets.test.ts`
Expected: FAIL — `assertRenderedFileExists` is not exported yet.

- [ ] **Step 3: Implement `assertRenderedFileExists` in `assets.ts`**

```ts
import { stat } from "node:fs/promises";
// (add to the existing node:fs/promises import line rather than a new import)

export async function assertRenderedFileExists(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || info.size === 0) {
    throw new Error(
      `Export did not produce a file at ${path} — check OpenReel is running and not waiting on a confirmation prompt`,
    );
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/assets.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Wire it into the generate route**

In `src/app/api/reel/generate/route.ts`, in `runReelJob`, between `await executeReelPlan(openreel, steps);` and `await copyReelToExport(itemId, assets.outputPath);`, add:
```ts
job.phase = "Verifying export…";
await assertRenderedFileExists(assets.outputPath);
```
Add `assertRenderedFileExists` to the existing `@/features/reel/assets` import. No test for this wiring — this route has no existing test file and this plan does not introduce API-route testing infrastructure; the unit test on `assertRenderedFileExists` itself is the coverage, same precedent as the rest of this route's untested wiring.

- [ ] **Step 6: Run the full suite**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/assets.ts src/features/reel/assets.test.ts src/app/api/reel/generate/route.ts
git commit -m "fix: fail fast with a clear message when export produces no file"
```

---

### Task 3: Redefine the "cinematic" style's directives (new Cinematic preset)

**Files:**
- Modify: `src/features/reel/composer.ts:50-58` (the `case "cinematic":` block in `directivesForStyle`)
- Modify: `src/features/reel/composer.test.ts`

**Interfaces:**
- Consumes: nothing new — same `directivesForStyle(style, slice)` signature.
- Produces: unchanged signature; only the returned `StyleDirectives` values for `style === "cinematic"` change.

- [ ] **Step 1: Write the failing test**

Add to `composer.test.ts`:
```ts
test("cinematic style uses the new soft-grade preset (crossfade/dipToBlack/zoom, tilt-shift/lens-flare/exposure)", () => {
  const d = directivesForStyle("cinematic", 5);
  assert.deepEqual(d.transitions.map((t) => t.type), ["crossfade", "dipToBlack", "zoom"]);
  assert.deepEqual(d.effects.map((e) => e.type), ["tilt-shift", "lens-flare", "exposure"]);
  assert.equal(d.popupAnimator.presetOrShaderId, "text-reveal-up");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/composer.test.ts`
Expected: FAIL on the new assertion (old `cinematic` returns `filmBurn`/`zoom`/`dipToBlack` transitions and `vignette`/`glow` effects).

- [ ] **Step 3: Replace the `case "cinematic":` block**

```ts
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
```
(`tilt-shift`, `lens-flare`, `exposure` are confirmed members of `list_pro_effects`' `effectType` enum in `docs/openreel-tool-catalog.json`; `crossfade`, `dipToBlack`, `zoom` are confirmed members of `add_transition`'s `transitionType` enum.)

- [ ] **Step 4: Run to verify it passes, and that the pre-existing cross-style distinctness tests still hold**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/composer.test.ts`
Expected: PASS — the new test, and the existing `assert.notDeepEqual(cinematic, highEnergy)` / `assert.notDeepEqual(cinematic, minimalist)` colorGrade comparisons (still true with the new numbers).

- [ ] **Step 5: Confirm a plan built with the old style key still composes without throwing**

Add to `composer.test.ts` (Review Focus item):
```ts
test("a spec with style \"cinematic\" (pre-existing saved content) still composes a full step plan", () => {
  const steps = composeReelPlan(specWith({ style: "cinematic", imageCount: 2 }), assetsWith(), { projectName: "t" });
  assert.ok(steps.some((s) => s.tool === "export_video"));
});
```
Run the same command as Step 4. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "feat: replace cinematic style's effects with a tasteful preset"
```

---

### Task 4: Redefine the "tech-explainer" style's directives (new Modern Social preset)

**Files:**
- Modify: `src/features/reel/composer.ts:60-69` (the `case "tech-explainer":` block)
- Modify: `src/features/reel/composer.test.ts`

**Interfaces:**
- Same as Task 3 — only the `tech-explainer` branch's returned values change.

- [ ] **Step 1: Write the failing test**

```ts
test("tech-explainer style uses the new Modern Social preset (push/radialWipe/circleReveal, vibrance/glow)", () => {
  const d = directivesForStyle("tech-explainer", 5);
  assert.deepEqual(d.transitions.map((t) => t.type), ["push", "radialWipe", "circleReveal"]);
  assert.deepEqual(d.effects.map((e) => e.type), ["vibrance", "glow"]);
  assert.equal(d.popupAnimator.tool, "add_motion_text_shader_animator");
  assert.equal(d.popupAnimator.presetOrShaderId, "glyph-glow-wave");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/composer.test.ts`
Expected: FAIL (old tech-explainer returns `push`/`radialWipe`/`blinds` and `halftone`, `scanline-materialize`).

- [ ] **Step 3: Replace the `case "tech-explainer":` block**

```ts
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
```
(`push`, `radialWipe`, `circleReveal` confirmed in `add_transition`'s enum; `vibrance` confirmed in `list_pro_effects`; `glow` confirmed as a standard `add_video_effect` type in its own description; `glyph-glow-wave` confirmed in `add_motion_text_shader_animator`'s description.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/composer.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm a plan built with the old style key still composes without throwing**

```ts
test("a spec with style \"tech-explainer\" (pre-existing saved content) still composes a full step plan", () => {
  const steps = composeReelPlan(specWith({ style: "tech-explainer", imageCount: 2 }), assetsWith(), { projectName: "t" });
  assert.ok(steps.some((s) => s.tool === "export_video"));
});
```
Run the same command. Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "feat: replace tech-explainer style's effects with the Modern Social preset"
```

---

### Task 5: Update the style picker's default and labels

**Files:**
- Modify: `src/app/workspace/[id]/workspace-client.tsx:72` (default `useState`)
- Modify: `src/app/workspace/[id]/workspace-client.tsx` (the `<select>` block, currently around line 585-592)

**Interfaces:** none — UI-only, no exported symbols change.

**No automated test:** this repo has no `.test.tsx` component-test harness (confirmed: zero `.test.tsx` files exist anywhere in `src/`). Verified manually per Step 3 below instead of TDD, per this plan's Global Constraints note.

- [ ] **Step 1: Change the default style**

Change `const [reelStyle, setReelStyle] = useState<ReelStyle>("high-energy");` to `const [reelStyle, setReelStyle] = useState<ReelStyle>("tech-explainer");` (the key that now holds the Modern Social preset, per Task 4).

- [ ] **Step 2: Reorder and relabel the dropdown options**

Replace:
```tsx
<option value="high-energy">High Energy (Viral / Hype)</option>
<option value="cinematic">Cinematic (Film Burn / Glow)</option>
<option value="tech-explainer">Tech Explainer (Clean Cuts)</option>
<option value="minimalist">Minimalist (Soft Crossfade)</option>
```
with:
```tsx
<option value="tech-explainer">Modern Social (Punchy, Clean)</option>
<option value="cinematic">Cinematic (Warm, Soft Grade)</option>
<option value="minimalist">Clean Editorial (Soft Crossfade)</option>
<option value="high-energy">High Energy (Viral / Hype)</option>
```
`value=` attributes are unchanged (backward compatible with saved `reelSpec.style`); only the visible label text and order change, plus the new default is listed first.

- [ ] **Step 3: Manual verification**

Run the dev server (`npm run dev`), open a content item's workspace, confirm: the Reel Style dropdown shows "Modern Social (Punchy, Clean)" selected by default, all four options are present and selectable, and generating a plan with each one succeeds (no need to render a full video — generating the plan is enough to confirm `composeReelPlan` accepts the selected style, which Tasks 3/4's automated tests already cover at the unit level).

- [ ] **Step 4: Commit**

```bash
git add "src/app/workspace/[id]/workspace-client.tsx"
git commit -m "feat: default reel style to Modern Social, relabel the style picker"
```

---

### Task 6: Widen `imageCount`/`imageBriefs` schema bounds to 1–10

**Files:**
- Modify: `src/features/reel/schemas.ts` (the `imageCount` and `imageBriefs` fields in `reelSpecSchema`, and the `.transform()`'s fallback-brief loop)
- Modify: `src/features/reel/planner.ts:53` (the `imageCount: 1 | 2 | 3;` type in `PlannerInput`)
- Test: `src/features/reel/schemas.test.ts` (new)

**Interfaces:**
- Produces: `reelSpecSchema` now accepts `imageCount` 1–10 (was 1–3) and pads/truncates `imageBriefs` to match, same as before just over a wider range.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing tests**

```ts
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
    imageBriefs: ["a", "b", "c"],
    kineticPopups: [],
    ...overrides,
  };
}

test("accepts imageCount 1 (pre-existing saved content keeps validating)", () => {
  const parsed = reelSpecSchema.parse(baseSpec({ imageCount: 1, imageBriefs: ["only one"] }));
  assert.equal(parsed.imageBriefs.length, 1);
});

test("accepts imageCount 10 and pads imageBriefs up to exactly 10", () => {
  const parsed = reelSpecSchema.parse(baseSpec({ imageCount: 10, imageBriefs: ["a", "b", "c"] }));
  assert.equal(parsed.imageBriefs.length, 10);
});

test("rejects imageCount 11", () => {
  assert.throws(() => reelSpecSchema.parse(baseSpec({ imageCount: 11, imageBriefs: Array(11).fill("x") })));
});

test("rejects imageCount 0", () => {
  assert.throws(() => reelSpecSchema.parse(baseSpec({ imageCount: 0, imageBriefs: [] })));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/schemas.test.ts`
Expected: FAIL — `imageCount: 10` and `imageCount: 1` with more than 3 briefs both rejected by the current `z.union([z.literal(1), z.literal(2), z.literal(3)])` / `.max(3)` bounds.

- [ ] **Step 3: Widen the schema**

Change:
```ts
imageCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
```
to:
```ts
imageCount: z.number().int().min(1).max(10),
```
Change:
```ts
imageBriefs: z.array(z.string().min(5).max(500)).min(1).max(3),
```
to:
```ts
imageBriefs: z.array(z.string().min(5).max(500)).min(1).max(10),
```
The `.transform()`'s padding loop (`while (briefs.length < val.imageCount) { briefs.push(...) }` / `imageBriefs: briefs.slice(0, val.imageCount)`) needs no change — it already works for any `imageCount`.

- [ ] **Step 4: Run to verify it passes**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test src/features/reel/schemas.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Widen the planner's type**

In `src/features/reel/planner.ts:53`, change `imageCount: 1 | 2 | 3;` to `imageCount: number;`. No test file exists for `planner.ts` today (confirmed); this is a type-level change checked by the project's own TypeScript build, not a new test.

- [ ] **Step 6: Run the full suite**

Run: `node --experimental-strip-types --experimental-loader ./scripts/test-loader.mjs --test "src/**/*.test.ts"`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/schemas.ts src/features/reel/schemas.test.ts src/features/reel/planner.ts
git commit -m "feat: widen imageCount/imageBriefs schema bounds to 1-10"
```

---

### Task 7: Widen the image-count picker UI to offer 3–10

**Files:**
- Modify: `src/app/workspace/[id]/workspace-client.tsx:74` (`imageCountPick` state type)
- Modify: `src/app/workspace/[id]/workspace-client.tsx:163` (`generatePlan`'s parameter type)
- Modify: `src/app/workspace/[id]/workspace-client.tsx` (the image-count picker's button row and copy text, currently around lines 830-849)

**Interfaces:**
- Consumes: Task 6's widened `reelSpecSchema`/planner type — the UI can now send any value 3–10 and have it accepted end to end.

**No automated test:** same UI-only caveat as Task 5.

- [ ] **Step 1: Widen the state and handler types**

Change `const [imageCountPick, setImageCountPick] = useState<1 | 2 | 3>(3);` to `useState<number>(3);`.
Change `const generatePlan = async (imageCount: 1 | 2 | 3) => {` to `async (imageCount: number) => {`.

- [ ] **Step 2: Widen the button row and copy**

Replace:
```tsx
<p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
  Generated fresh for the reel — one visual per story beat. You can pick 1 to 3.
</p>
<div className="mt-4 flex gap-2">
  {([1, 2, 3] as const).map((n) => (
```
with:
```tsx
<p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
  Generated fresh for the reel — one visual per story beat. You can pick 3 to 10.
</p>
<div className="mt-4 flex flex-wrap gap-2">
  {([3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
```
(`flex-wrap` added since 8 buttons no longer fit one row at the existing `flex-1` sizing — without it the buttons would compress unreadably thin.)

- [ ] **Step 3: Manual verification**

Run the dev server, open the "How many images?" picker, confirm all 8 values (3–10) are selectable, wrap onto a second row cleanly, and that picking e.g. 10 and generating a plan produces a `ReelSpec` with exactly 10 `imageBriefs` (confirmed at the schema level by Task 6's tests; this step confirms the UI actually sends that value through).

- [ ] **Step 4: Commit**

```bash
git add "src/app/workspace/[id]/workspace-client.tsx"
git commit -m "feat: widen image-count picker to 3-10"
```

---

## Self-Review

1. **Spec coverage:** Design doc §6.A (export verification) → Tasks 1–2. §6.B (presets) → Tasks 3–5. §6.C (image count) → Tasks 6–7. §7 (additional features) and the naming-collision decision from §6.B are explicitly out of scope for this plan (features are a separate follow-on plan per the design doc's own §9 recommendation; naming was resolved in the design doc itself, consumed here as the "replace tech-explainer/cinematic in place" approach).
2. **Step scan:** every step has an exact command/expected-output pair or an exact code block; no "handle edge cases"-style placeholders.
3. **Type consistency:** `directivesForStyle(style: ReelStyle, slice: number): StyleDirectives` signature is untouched across Tasks 3–4; `parseCallToolResult`/`assertRenderedFileExists` signatures in Tasks 1–2 are used identically in their own Steps 3 and the wiring step.
4. **Review Focus:** all five items above are each covered by a specific test in the task that owns the relevant code (Tasks 1, 2, 3/4, 6).
5. **Proportion:** this plan is about as long as the design doc section it implements; code blocks are exact diffs/new files, not prose padding.
