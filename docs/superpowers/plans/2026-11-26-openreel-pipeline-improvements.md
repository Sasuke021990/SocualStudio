# OpenReel Pipeline Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four verified bugs in the reel-generation pipeline (dead kinetic
popups, VFX coverage gap, discarded MCP tool schemas, stale tool catalog) and
layer in eight evidence-ranked composition upgrades (word-level animated
captions, real Ken Burns motion, pacing cleanup, per-glyph kinetic hook text,
per-brand color grade, a real end-card, beat-sync pulses, transition variety)
so generated reels are measurably more attractive, better-paced, and more
engaging — using OpenReel's confirmed live tool catalog (453 tools) rather
than guesswork.

**Architecture:** `composeReelPlan()` in `src/features/reel/composer.ts`
stays the single source of truth for the ordered list of OpenReel tool calls
(`ReelToolStep[]`); `executeReelPlan()` in `src/features/reel/executor.ts`
stays the only thing that talks to OpenReel, resolving placeholder tokens
(`__clip:img0__`, `__composition:popup__`, etc.) from each step's real
result. No LLM involvement in composition — every change here is
deterministic, same input → same plan, matching the project's existing R1
decision (see `docs/MCP_REEL_PLAN.md`). New composition/graphic-template/
caption-import tool calls are added as new step kinds inside this same
pattern, not a parallel system.

**Tech Stack:** TypeScript, Next.js API routes, `@modelcontextprotocol/sdk`
(already a dependency), Node's built-in `node:test` + `node:assert` for all
new tests (no new test framework).

**Spec:** `docs/superpowers/specs/2026-11-26-openreel-pipeline-improvements-design.md`
(§1-8 = Phase 1, §9 = Phase 2). Tool names, schemas and enums cited in this
plan are taken from the live catalog dump at `docs/openreel-tool-catalog.json`
(453 tools, pulled 2026-11-26) — not inferred.

## Global Constraints

- Zero LLM calls anywhere in `composer.ts`/`executor.ts` — deterministic plan
  generation only (spec §4 non-goal, Decision Log R1).
- No change to `ReelSpec`/`ReelAssets` public shapes (spec §4) — all new
  inputs are derived from existing `spec`/`assets` fields.
- Every new OpenReel tool call that is "creative polish" (not required for a
  playable reel to exist) is non-fatal: a failure logs a warning and the
  render continues (spec §4a, §7).
- `npx tsc --noEmit` and `npx eslint` must stay clean on every changed file.
- `node --test` must pass for every new/changed test file, every task.
- No live OpenReel/ComfyUI execution testing from this environment (spec
  §4) — all new logic is unit-tested as pure functions; the actual tool
  calls are integration-only and verified by the user's own test render.
- All OpenReel tool names, parameter names, and enum values used below are
  copied verbatim from `docs/openreel-tool-catalog.json`; do not invent or
  "clean up" a name that looks inconsistent (e.g. `create_motion_composition`
  vs `add_motion_layer` vs `insert_motion_into_editor` — three different
  verbs are correct, not a typo).

## Review Focus

- `imageCount: 1` — zero transitions, zero `N-1` loops should run, beat-sync
  and Ken Burns still need to apply to the single image.
- `spec.kineticPopups` with more than one entry — the per-glyph animated
  version must handle a list, not assume exactly one.
- No music (`assets.musicSeconds` near 0, or a silent/very short file) —
  beat-sync (`sync_motion_to_audio`) has nothing to detect; this must not
  throw or block the rest of composition.
- Narration with a single word or no sentence-ending punctuation — word-
  timing split and sentence-grouping for `import_captions` must not divide
  by zero or produce a zero-duration segment.
- A non-fatal step whose result several *later* steps depend on (e.g.
  `create_motion_composition` failing before `add_motion_layer` for the same
  popup) — later dependent steps must also degrade non-fatally, not throw
  a token-substitution error that looks like a different bug.

---

## File Structure

- **Modify** `src/features/mcp-client/client.ts` — `listTools()` keeps
  `inputSchema` from the SDK response (Task 1).
- **Modify** `src/features/mcp-client/registry.ts` — `acquireToolset()`
  passes the real `inputSchema` through as `parameters` (Task 1).
- **Modify** `src/features/reel/executor.ts` — non-fatal step set becomes a
  `Set<string>` covering all new creative tool names; id-capture becomes
  data-driven via a new `captureAs` field instead of only `add_track`/
  `add_clip` special-casing (Task 2).
- **Modify** `src/features/reel/composer.ts` — `ReelToolStep` gains
  `captureAs?: string`; `directivesForStyle` and `composeReelPlan` gain the
  VFX-coverage fix, transition-pool rotation, Ken Burns keyframes, color
  grade, kinetic-popup-as-motion-layer steps, beat-sync steps, end-card
  template step, and the `import_captions`-based caption rewrite (Tasks
  3-10).
- **Create** `src/features/reel/wordTiming.ts` — pure function estimating
  per-word start/end times from narration text and a total speech duration
  (character-weighted split), grouped back into sentence segments for
  `import_captions` (Task 9).
- **Create** `src/features/mcp-client/registry.test.ts` (Task 1),
  `src/features/reel/executor.test.ts` (Task 2),
  `src/features/reel/composer.test.ts` (Tasks 3-8, 10),
  `src/features/reel/wordTiming.test.ts` (Task 9) — all `node:test`.

---

### Task 1: MCP tool schema passthrough (G3)

**Files:**
- Modify: `src/features/mcp-client/client.ts:10-14,50-57`
- Modify: `src/features/mcp-client/registry.ts` (the `acquireToolset()`
  function and the `McpToolSchema` interface it builds)
- Test: `src/features/mcp-client/registry.test.ts`

**Interfaces:**
- Produces: `McpConnection.listTools()` resolves to
  `Array<{ name: string; description: string; inputSchema: unknown }>`
  (the `inputSchema` field is new; `unknown` because the SDK's `Tool` type
  may change — callers that only read `name`/`description` are unaffected).
- Consumes: nothing new from earlier tasks (this task has no dependencies).

- [ ] **Step 1: Write the failing test**

```ts
// src/features/mcp-client/registry.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { acquireToolset } from "./registry";

test("acquireToolset passes through a tool's real inputSchema as parameters", async () => {
  const fakeConn = {
    listTools: async () => [
      { name: "create_text_clip", description: "...", inputSchema: { type: "object", properties: { clip: { type: "object" } }, required: ["clip"] } },
    ],
    callTool: async () => "",
    close: async () => {},
  };
  const toolset = await acquireToolset(fakeConn as never);
  const tool = toolset.tools.find((t) => t.name === "create_text_clip");
  assert.deepEqual(tool?.parameters, { type: "object", properties: { clip: { type: "object" } }, required: ["clip"] });
});
```

(Match `acquireToolset`'s actual current signature from `registry.ts` — it
may take a server config and connect internally rather than a connection
object; adapt the test's fake to whatever that signature is, keeping the
assertion the same: the real `inputSchema` ends up as `parameters`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/mcp-client/registry.test.ts`
Expected: FAIL — `tool.parameters` is `{ type: "object", properties: {} }`
(the current hardcoded value), not the fake's real schema.

- [ ] **Step 3: Add `inputSchema` to `McpConnection.listTools()` in `client.ts`**

Change the return type of `listTools()` to include `inputSchema: unknown`,
and change the `.map()` at line ~53 to copy `t.inputSchema` through
(default to `undefined`, not `{}`, when the SDK omits it — Step 4 decides
the final fallback).

- [ ] **Step 4: Update `acquireToolset()` in `registry.ts`**

Use `tool.inputSchema ?? { type: "object", properties: {} }` as the
`parameters` value instead of the hardcoded object (keep the same fallback
for a tool that genuinely has no schema, so existing callers see no
behavior change for those).

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test src/features/mcp-client/registry.test.ts`
Expected: PASS

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/mcp-client`
Expected: all green

- [ ] **Step 7: Commit**

```bash
git add src/features/mcp-client/client.ts src/features/mcp-client/registry.ts src/features/mcp-client/registry.test.ts
git commit -m "fix: pass real MCP tool inputSchema through instead of discarding it"
```

---

### Task 2: Executor non-fatal step handling + generic id capture

**Files:**
- Modify: `src/features/reel/executor.ts:5-13,49-117`
- Modify: `src/features/reel/composer.ts` (add `captureAs?: string` to the
  `ReelToolStep` interface only — no behavior change to existing steps)
- Test: `src/features/reel/executor.test.ts`

**Interfaces:**
- Produces: `ReelToolStep.captureAs?: string` — when a step's result carries
  an id (via the existing `actionId()` helper) and `captureAs` is set, the
  executor stores it in the token map under that exact key (e.g.
  `"__composition:popup0__"`), the same map `substitute()` already reads.
  Tasks 3-10 use this instead of adding more hardcoded `step.tool === "..."`
  branches.
- Produces: a single exported `NON_FATAL_TOOLS: Set<string>` (or equivalent
  internal constant) in `executor.ts`, seeded with the three existing names
  (`add_transition`, `add_video_effect`, `set_clip_transform`) so Tasks
  3-10 can each add their own tool names to one place rather than editing
  the `if` condition directly.
- Consumes: nothing from other tasks; this is pure infrastructure other
  tasks build on.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/reel/executor.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { executeReelPlan } from "./executor";

test("a step in the non-fatal set logs a warning and continues instead of throwing", async (t) => {
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => { warnings.push(String(args[0])); });
  // fake withMcpConnection / callTool returning an ERROR_CODES-matching string
  // for one step and a normal success for the rest — mock at whatever seam
  // executor.ts already exposes for testing (check how existing tests, if
  // any, stub withMcpConnection; otherwise inject a fake McpServerConfig
  // whose connection is monkey-patched via the same mechanism).
  // Assert: no throw, warnings.length === 1, and execution reached export_video.
});

test("captureAs stores a step's returned id in the token map for later substitution", async () => {
  // A step with tool: "create_motion_composition", captureAs: "__composition:x__"
  // followed by a step whose args reference "__composition:x__" — assert the
  // second step's actual call args had the placeholder replaced with the id
  // the first step's fake response returned.
});
```

Adapt both to however `executor.ts` is actually testable today (it calls
`withMcpConnection` directly, which pools real connections — this task may
need a small seam, e.g. accepting an injected `McpConnection` for tests
rather than always calling `withMcpConnection`; keep the production call
site using `withMcpConnection` unchanged, add an optional parameter only
tests use).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/features/reel/executor.test.ts`
Expected: FAIL (no `captureAs` handling exists yet; whatever test seam was
added doesn't yet route through the real logic correctly) — or a clear
compile error if the seam itself doesn't exist yet, which is also an
acceptable RED state to then fix in Step 3.

- [ ] **Step 3: Implement `captureAs` and the `NON_FATAL_TOOLS` set**

Replace the three-way `||` at `executor.ts:63` with a `NON_FATAL_TOOLS.has(step.tool)`
check. After the existing `actionId(text)` call (~line 81), add: if
`step.captureAs` and `id`, `map.set(step.captureAs, id)` — do this
unconditionally, before or alongside the existing `add_track`/`add_clip`
special-casing (which stays as-is for backward compatibility with how
those two are already addressed elsewhere).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/features/reel/executor.test.ts`
Expected: PASS

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/executor.ts src/features/reel/composer.ts src/features/reel/executor.test.ts
git commit -m "feat: generic non-fatal tool set and captureAs id resolution in reel executor"
```

---

### Task 3: VFX coverage fix (G2)

**Files:**
- Modify: `src/features/reel/composer.ts:34-85,173-186`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: `StyleDirectives.effects` changes shape from
  `Array<{ clipIndex: number; type: string; params: object }>` to
  `Array<{ type: string; params: object }>` (no `clipIndex` — it's now
  assigned by the caller, not the style).
- Consumes: nothing from Tasks 1-2.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/reel/composer.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { composeReelPlan } from "./composer";
// ...minimal valid ReelSpec/ReelAssets fixtures reused across this file's tests

for (const style of ["cinematic", "tech-explainer", "minimalist", "high-energy"] as const) {
  for (const imageCount of [1, 2, 3] as const) {
    test(`${style} with imageCount=${imageCount}: every image gets a VFX effect`, () => {
      const steps = composeReelPlan(specWith({ style, imageCount }), assets, { projectName: "t" });
      const vfxSteps = steps.filter((s) => s.tool === "add_video_effect");
      assert.equal(vfxSteps.length, style === "minimalist" ? 0 : imageCount);
    });
  }
}
```

(`minimalist`'s current `effects: []` is intentional per the existing
switch — keep it empty; the fix is about every style that DOES define
effects reaching every image, not forcing minimalist to have any.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL for `imageCount: 3` on every non-minimalist style (today's
code only emits effects for indices present in the hardcoded array, never
index 2).

- [ ] **Step 3: Implement the round-robin assignment**

In `directivesForStyle`, drop `clipIndex` from each style's `effects`
entries. In `composeReelPlan`'s effects loop (~line 173), replace the
`styleDirectives.effects` iteration with one that runs for `i` from `0` to
`N-1` and picks `styleDirectives.effects[i % styleDirectives.effects.length]`
(skip entirely, as today, when the style's `effects` array is empty, to
preserve `minimalist`'s no-VFX behavior).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "fix: every storyboard image gets a VFX effect, not just the first two"
```

---

### Task 4: Transition variety (Phase 2, item 8)

**Files:**
- Modify: `src/features/reel/composer.ts:34-85,158-171`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: `StyleDirectives.transitions` becomes a per-style pool of 3-4
  transition types (instead of a fixed 2-entry array), still each
  `{ type: string; duration: number }`.
- Consumes: Task 3's `StyleDirectives` shape change (effects), unrelated
  field — no conflict.

- [ ] **Step 1: Write the failing test**

```ts
test("imageCount=3 (2 transitions) on high-energy uses two different transition types from its pool", () => {
  const steps = composeReelPlan(specWith({ style: "high-energy", imageCount: 3 }), assets, { projectName: "t" });
  const types = steps.filter((s) => s.tool === "add_transition").map((s) => s.args.transitionType);
  assert.equal(types.length, 2);
  assert.deepEqual(new Set(types).size, 2); // not using the same type twice back-to-back for N-1=2
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: current behavior already differs transitions at index 0/1 by
coincidence for `high-energy`/`cinematic`/`tech-explainer` (their 2-entry
arrays already have 2 distinct types) — so this specific assertion may
already pass. Replace it with one that exercises the *pool rotation* for
`N-1 > 2` once `imageCount`'s cap changes, OR assert the pool itself has
≥3 entries per non-minimalist style via a direct unit test on
`directivesForStyle` if it's exported, to make the test meaningfully RED
first: add 1-2 more pool entries per style and assert all are reachable
via `pool[i % pool.length]` for `i` up to, say, 5 (future-proofing beyond
today's cap of 2 transitions, consistent with Task 3's round-robin
pattern).

- [ ] **Step 3: Expand each style's transition pool and apply round-robin**

Add 1-2 more `{ type, duration }` entries per style's `transitions` array
(stay within the confirmed 23-value `add_transition` enum:
`crossfade, dipToBlack, dipToWhite, wipe, slide, zoom, push, circleReveal,
blur, whipPan, radialWipe, pixelate, glitch, blinds, diamondReveal, spin,
flip, splitReveal, flash, filmBurn, mosaic, ripple, pageTurn, colorSplit`).
Suggested additions matching each style's existing mood (builder's final
call, not prescribed further): `cinematic` → add `dipToBlack`;
`tech-explainer` → add `blinds`; `high-energy` → add `flash`; leave
`minimalist` at its 2 `crossfade` entries (no variety wanted there). In
`composeReelPlan`'s transition loop (~line 159), replace
`styleDirectives.transitions[i] ?? { type: "whipPan", duration: 0.4 }`
with `styleDirectives.transitions[i % styleDirectives.transitions.length]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "feat: rotate through a wider transition pool per style instead of two fixed types"
```

---

### Task 5: Real keyframed Ken Burns motion (Phase 2, item 2)

**Files:**
- Modify: `src/features/reel/composer.ts:144-156`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: one `set_clip_keyframes` step per image clip (in addition to
  the existing `trim_clip` + `set_clip_transform` cover-fit steps, which
  stay — cover-fit establishes the static base, keyframes animate on top
  of it).
- Consumes: nothing from Tasks 1-4.

- [ ] **Step 1: Write the failing test**

```ts
test("every image clip gets a set_clip_keyframes step animating scale over its full slice duration", () => {
  const steps = composeReelPlan(specWith({ imageCount: 2, durationSeconds: 10 }), assets, { projectName: "t" });
  const kf = steps.filter((s) => s.tool === "set_clip_keyframes");
  assert.equal(kf.length, 2);
  const firstKeyframes = (kf[0].args as { keyframes: Array<{ time: number; property: string; value: number }> }).keyframes;
  assert.ok(firstKeyframes.some((k) => k.property === "scale.x" && k.time === 0));
  assert.ok(firstKeyframes.some((k) => k.property === "scale.x" && k.time === 5)); // slice = 10/2
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — no `set_clip_keyframes` step exists today.

- [ ] **Step 3: Add a Ken Burns keyframe step per image in the cover-fit loop**

In the loop at `composer.ts:145-156`, after the existing `set_clip_transform`
cover-fit step for each image, push one `set_clip_keyframes` step for the
same `clipId` with two keyframes on `scale.x` and two on `scale.y`: value
`1.0` at `time: 0`, value `1.08` at `time: slice` (an 8% zoom over the
clip's full on-screen duration — alternate zoom-in/zoom-out by image index,
e.g. even indices zoom in, odd indices zoom out from `1.08` to `1.0`, for
visual variety across a multi-image reel; exact percentage and alternation
is the builder's call within the design doc's "slow continuous zoom"
intent). Use the `set_clip_keyframes` schema's `keyframes: Array<{ time,
property, value }>` shape confirmed in the live catalog — `id` and
`easing` are optional and default automatically.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "feat: real keyframed Ken Burns zoom on every storyboard image"
```

---

### Task 6: Per-brand color grade (Phase 2, item 5)

**Files:**
- Modify: `src/features/reel/composer.ts:34-85,144-156`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: `StyleDirectives` gains a `colorGrade: Record<string, unknown>`
  field (a `set_color_grading`-shaped payload, not a LUT lookup — see
  rationale below); one `set_color_grading` step per image clip.
- Consumes: Task 5's cover-fit/keyframe loop location (same loop, appended
  step) — no interface conflict, purely additive within that loop.

Design note carried over from the design doc's §9e "what's left to
builder": `apply_library_lut` requires a LUT already present in the user's
*local* library (`list_color_library`), which is both unverifiable at
plan-time and empty on a fresh install. This task uses `set_color_grading`
with a small built-from-scratch grade per style instead, so it always
works with zero external dependency; swapping in a named LUT later (once
one is confirmed present via `list_color_library`) is a follow-up, not a
blocker for this task.

- [ ] **Step 1: Write the failing test**

```ts
test("every image clip gets a set_color_grading step matching its style's grade", () => {
  const steps = composeReelPlan(specWith({ style: "cinematic", imageCount: 2 }), assets, { projectName: "t" });
  const grades = steps.filter((s) => s.tool === "set_color_grading");
  assert.equal(grades.length, 2);
  assert.ok((grades[0].args as { colorGrading: object }).colorGrading);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — no `set_color_grading` step exists today.

- [ ] **Step 3: Add a `colorGrade` field per style and a step per image**

Add a `colorGrade` object to each `directivesForStyle` branch — a small,
tasteful `set_color_grading`-shaped payload per the tool's documented
`wheels/curves/lut/hsl/temp/tint` shape (e.g. `cinematic` → slightly
lifted shadows + cool temperature; `high-energy` → boosted saturation +
warm temperature; `minimalist` → a very light, near-neutral grade;
`tech-explainer` → slightly cooler/cleaner). Exact numeric values are the
builder's call — the design doc does not prescribe a specific look, only
that one consistent grade is applied per style. In the same per-image
loop as Task 5, push `{ tool: "set_color_grading", args: { clipId:
clipToken(\`img${i}\`), colorGrading: styleDirectives.colorGrade } }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 6: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/composer.test.ts
git commit -m "feat: apply one consistent color grade per style to every image clip"
```

---

### Task 7: Kinetic popup as real per-glyph animated text (G1 + Phase 2, item 4)

This task replaces the originally-scoped plain `create_text_clip` fix (G1)
directly with the richer version the design doc's §9c decided on — no
intermediate plain-text version is built first (see spec §9a).

**Files:**
- Modify: `src/features/reel/composer.ts:34-85,106-261`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: for each entry in `spec.kineticPopups`, four steps:
  `create_motion_composition` (`captureAs: "__composition:popup<N>__"`),
  `add_motion_layer` (type `text`, consumes the composition token,
  `captureAs: "__layer:popup<N>__"`), `add_motion_text_animator` or
  `add_motion_text_shader_animator` (consumes both tokens), and
  `insert_motion_into_editor` (consumes the composition token, places it
  on the main timeline at the popup's `startTime`/`duration`).
- Consumes: Task 2's `captureAs` mechanism and expanded `NON_FATAL_TOOLS`
  set — add `create_motion_composition`, `add_motion_layer`,
  `add_motion_text_animator`, `add_motion_text_shader_animator`,
  `insert_motion_into_editor` to that set.
- Consumes: `StyleDirectives` gains a `popupAnimator: { tool:
  "add_motion_text_animator" | "add_motion_text_shader_animator"; presetOrShaderId: string }`
  field (per-style choice, e.g. `high-energy` → `add_motion_text_shader_animator`
  with `glyph-dissolve`; `cinematic` → `add_motion_text_animator` with
  `text-reveal-up`; `tech-explainer` → `add_motion_text_shader_animator`
  with `scanline-materialize`; `minimalist` → `add_motion_text_animator`
  with `text-type-on`).

- [ ] **Step 1: Write the failing test**

```ts
test("each kineticPopup produces a 4-step motion-composition chain wired by captureAs tokens", () => {
  const spec = specWith({ style: "high-energy", kineticPopups: [{ text: "WAIT FOR IT", startTime: 1, duration: 1.5, position: "center" }] });
  const steps = composeReelPlan(spec, assets, { projectName: "t" });
  const names = steps.map((s) => s.tool);
  assert.ok(names.includes("create_motion_composition"));
  assert.ok(names.includes("add_motion_layer"));
  assert.ok(names.includes("add_motion_text_shader_animator")); // high-energy's preset
  assert.ok(names.includes("insert_motion_into_editor"));
  const insertStep = steps.find((s) => s.tool === "insert_motion_into_editor")!;
  assert.equal((insertStep.args as { startTime: number }).startTime, 1);
});

test("multiple kineticPopups each get their own composition/layer tokens, not a shared one", () => {
  const spec = specWith({ kineticPopups: [{ text: "A", startTime: 0, duration: 1, position: "center" }, { text: "B", startTime: 2, duration: 1, position: "center" }] });
  const steps = composeReelPlan(spec, assets, { projectName: "t" });
  const compositionSteps = steps.filter((s) => s.tool === "create_motion_composition");
  assert.equal(compositionSteps.length, 2);
  assert.notEqual(compositionSteps[0].captureAs, compositionSteps[1].captureAs);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — `kineticPopups` produces zero steps today (the dead-code
finding from spec §2.1).

- [ ] **Step 3: Add `popupAnimator` per style and the 4-step chain per popup**

Add the `popupAnimator` field to each `directivesForStyle` branch as
described above. In `composeReelPlan`, after the VFX loop, iterate
`spec.kineticPopups` with index `n`:
1. `create_motion_composition` step, `captureAs: \`__composition:popup${n}__\``,
   args per the tool's schema (name, duration — use the popup's `duration`).
2. `add_motion_layer` step, args `{ compositionId: "__composition:popup" + n + "__", layerType: "text", text: popup.text }`, `captureAs: \`__layer:popup${n}__\``.
3. The style's `popupAnimator.tool` step, args `{ compositionId: "__composition:popup"+n+"__", layerId: "__layer:popup"+n+"__", presetId: popupAnimator.presetOrShaderId }`
   for `add_motion_text_animator`, or `{ compositionId, layerId, shaderId: popupAnimator.presetOrShaderId }`
   for `add_motion_text_shader_animator` (branch on `popupAnimator.tool`).
4. `insert_motion_into_editor` step, args `{ compositionId: "__composition:popup"+n+"__", startTime: popup.startTime, duration: popup.duration }`.

Carry forward the known limitation from spec §9c item 4 / original G1: no
code-side handling of `popup.position` is attempted (OpenReel's own
positioning behavior for Motion Creator layers is out of scope for this
task to re-verify; leave `position` unused in the args, matching the
design doc's documented limitation, and note this in a code comment).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Extend `NON_FATAL_TOOLS` (Task 2's set) with the five new tool names**

Edit `executor.ts`'s `NON_FATAL_TOOLS` set to add `create_motion_composition`,
`add_motion_layer`, `add_motion_text_animator`,
`add_motion_text_shader_animator`, `insert_motion_into_editor`.

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/executor.ts src/features/reel/composer.test.ts
git commit -m "feat: wire kineticPopups as real per-glyph animated motion-graphics text"
```

---

### Task 8: End-card from a built-in graphic template (Phase 2, item 6)

**Files:**
- Modify: `src/features/reel/composer.ts:220-226`
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: when `spec.cta` is set, replaces the current plain
  `add_subtitle`-as-CTA step with `insert_graphic_template` (category
  `end-card`).
- Consumes: Task 2's `NON_FATAL_TOOLS` set — add `insert_graphic_template`.

This task does not call `list_graphic_templates` at plan-build time (that
would make `composeReelPlan` async / require a live connection, breaking
its pure-function contract per Global Constraints). Instead it passes a
template *name* string (e.g. `"end-card"`) as `templateId` — per the tool's
own description, `templateId` accepts "an id or name from
list_graphic_templates" — and leaves it to OpenReel to resolve the name
against whatever end-card template the user's install actually has (built-
in or saved). If no such template exists, this step is in the non-fatal
set, so the reel still completes without a CTA card rather than failing.

- [ ] **Step 1: Write the failing test**

```ts
test("when spec.cta is set, an insert_graphic_template end-card step replaces the plain CTA subtitle", () => {
  const steps = composeReelPlan(specWith({ cta: "Follow for more", durationSeconds: 10 }), assets, { projectName: "t" });
  const endCard = steps.find((s) => s.tool === "insert_graphic_template");
  assert.ok(endCard);
  assert.equal((endCard!.args as { values: { text?: string } }).values?.text, "Follow for more");
  assert.ok(!steps.some((s) => s.tool === "add_subtitle" && (s.args as { text?: string }).text === "Follow for more"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — today's CTA is a plain `add_subtitle` step (composer.ts
~220-226), no `insert_graphic_template` step exists.

- [ ] **Step 3: Replace the CTA `add_subtitle` block with `insert_graphic_template`**

Remove the `if (spec.cta) { ... add_subtitle ... }` block at ~220-226.
Replace with: `if (spec.cta) steps.push({ label: "CTA end card", tool:
"insert_graphic_template", args: { templateId: "end-card", startTime:
+(D * 0.8).toFixed(2), duration: +(D * 0.2).toFixed(2), values: { text:
spec.cta } } })`. The exact `values` key the template expects for its
headline text (`text` vs `name` vs `title`) is the builder's call — it
varies per template and is only knowable by running `list_graphic_templates`
live; default to `text` and leave a code comment noting it may need
adjustment once the user confirms the actual control id from a live run.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 5: Extend `NON_FATAL_TOOLS` with `insert_graphic_template`**

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/executor.ts src/features/reel/composer.test.ts
git commit -m "feat: real end-card graphic template instead of a plain CTA subtitle"
```

---

### Task 9: Word-level animated captions (Phase 2, item 1)

**Files:**
- Create: `src/features/reel/wordTiming.ts`
- Modify: `src/features/reel/composer.ts:87-104,215-242`
- Test: `src/features/reel/wordTiming.test.ts`, `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces (new file): `estimateWordTimings(narration: string, speechEndSeconds: number): Array<{ start: number; end: number; speaker?: string; words: Array<{ word: string; start: number; end: number }> }>`
  — one array entry per sentence (reusing the same sentence-split regex
  `captionCues` already uses), each with its words' individual
  character-weighted start/end times nested inside, covering `[0,
  speechEndSeconds]` with no gaps and no zero-duration words.
- Consumes: nothing from other tasks for the pure function itself.
- `composer.ts` consumes `estimateWordTimings` to build the `content`
  string for a new `import_captions` step, replacing the current per-
  sentence `add_subtitle` loop (`captionCues` stays exported and used
  elsewhere if anything else depends on it — check before removing;
  otherwise it may become dead code this task should also remove).

- [ ] **Step 1: Write the failing test for `wordTiming.ts`**

```ts
// src/features/reel/wordTiming.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateWordTimings } from "./wordTiming";

test("splits a two-sentence narration into word-timed segments covering the full duration with no gaps", () => {
  const segments = estimateWordTimings("Hi there. This is a test.", 6);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].words[0].start, 0);
  const lastWord = segments.at(-1)!.words.at(-1)!;
  assert.ok(Math.abs(lastWord.end - 6) < 0.01);
  // no gap between the end of one word and the start of the next
  const allWords = segments.flatMap((s) => s.words);
  for (let i = 1; i < allWords.length; i++) {
    assert.ok(Math.abs(allWords[i].start - allWords[i - 1].end) < 0.001);
  }
});

test("a single word never produces a zero-duration segment", () => {
  const segments = estimateWordTimings("Wow.", 2);
  assert.equal(segments.length, 1);
  assert.ok(segments[0].words[0].end > segments[0].words[0].start);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/wordTiming.test.ts`
Expected: FAIL — `wordTiming.ts` does not exist yet.

- [ ] **Step 3: Implement `estimateWordTimings` in `src/features/reel/wordTiming.ts`**

Split narration into sentences the same way `captionCues` does
(`/(?<=[.!?])\s+/`), compute each sentence's `[start, end]` exactly as
`captionCues` currently does (proportional to character count over
`speechEndSeconds`), then within each sentence split into words
(whitespace split) and sub-divide that sentence's duration across its
words proportional to each word's character count (reuse the same
proportional-split math at word granularity). Guarantee every word gets at
least a small minimum duration (builder's call, e.g. 0.05s floor) so a
single-character word never rounds to zero.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/reel/wordTiming.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing composer test**

```ts
test("captions are added via import_captions with word-level timing instead of per-sentence add_subtitle", () => {
  const steps = composeReelPlan(specWith({ narration: "Hi there. This works.", durationSeconds: 10 }), assets, { projectName: "t" });
  const importStep = steps.find((s) => s.tool === "import_captions");
  assert.ok(importStep);
  const content = JSON.parse((importStep!.args as { content: string }).content);
  assert.ok(content.segments.length >= 1);
  assert.ok(content.segments[0].words.length > 0);
  assert.ok(!steps.some((s) => s.tool === "add_subtitle"));
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — today's captions are `add_subtitle` steps, no
`import_captions` step exists.

- [ ] **Step 7: Replace the caption loop in `composer.ts` with `import_captions`**

Remove the `for (const cue of cues) { ... add_subtitle ... }` loop
(~217-219). Keep the CTA handling as Task 8 already changed it (separate
concern). Build the word-timed `content` JSON via `estimateWordTimings`
from `wordTiming.ts` (using the same `speechEnd` value `captionCues`
computed, or inline that same calculation if `captionCues` is removed —
builder's call whether to keep `captionCues` as a shared helper both
functions call into, or fold its duration-math into `wordTiming.ts`
directly; avoid duplicating the sentence/duration math in two places).
Push one step: `{ label: "Import word-timed captions", tool:
"import_captions", args: { content: JSON.stringify({ segments }) } }`.
Extend the existing `set_caption_style` step's `style` object (composer.ts
~227-242) with a `highlightColor` field (a sensible accent color, e.g. the
brand/style's existing palette if one is already threaded through
`spec`/`styleDirectives`, otherwise a fixed bright accent — builder's
call) so the word-by-word pop is visible.

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 9: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 10: Commit**

```bash
git add src/features/reel/wordTiming.ts src/features/reel/composer.ts src/features/reel/wordTiming.test.ts src/features/reel/composer.test.ts
git commit -m "feat: word-level animated captions via import_captions instead of per-sentence subtitles"
```

---

### Task 10: Pacing cleanup + beat-sync pulse (Phase 2, items 3 and 7)

Combined into one task: both are small, both are narration/music-track
cleanup steps added at the same point in the plan (right after the
captions/audio setup, before export), and both are independently non-fatal
with no shared state — splitting them into two tasks would not let a
reviewer meaningfully approve one without the other.

**Files:**
- Modify: `src/features/reel/composer.ts` (new steps near the end, before
  `export_video`)
- Test: `src/features/reel/composer.test.ts`

**Interfaces:**
- Produces: `remove_filler_words`, `remove_pauses`, `caption_qc` steps
  (narration pacing); `sync_motion_to_audio` + `apply_motion_preset_to_beats`
  steps (beat-sync), only when `assets.musicSeconds` is above a small
  floor (e.g. `> 1`) — otherwise these two are skipped entirely (Review
  Focus: no-music case).
- Consumes: Task 7's kinetic-popup composition tokens — `apply_motion_preset_to_beats`
  targets the FIRST popup's layer token if one exists (`__layer:popup0__`),
  else is skipped (no popup to pulse).

- [ ] **Step 1: Write the failing test**

```ts
test("pacing cleanup steps run before export, and beat-sync is skipped when there's no music", () => {
  const steps = composeReelPlan(specWith({ musicSeconds: 0 }), assets, { projectName: "t" });
  assert.ok(steps.some((s) => s.tool === "remove_filler_words"));
  assert.ok(steps.some((s) => s.tool === "remove_pauses"));
  assert.ok(steps.some((s) => s.tool === "caption_qc"));
  assert.ok(!steps.some((s) => s.tool === "sync_motion_to_audio"));
});

test("beat-sync pulses the first kinetic popup's layer when both music and a popup exist", () => {
  const steps = composeReelPlan(specWith({ musicSeconds: 15, kineticPopups: [{ text: "GO", startTime: 1, duration: 1, position: "center" }] }), assets, { projectName: "t" });
  assert.ok(steps.some((s) => s.tool === "sync_motion_to_audio"));
  const beatStep = steps.find((s) => s.tool === "apply_motion_preset_to_beats");
  assert.ok(beatStep);
});
```

(`specWith`/`assets` fixtures need a `musicSeconds` override hook — check
how the existing fixtures in this file construct `ReelAssets` and extend
consistently.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/reel/composer.test.ts`
Expected: FAIL — none of these five tool names appear in today's output.

- [ ] **Step 3: Add the pacing-cleanup steps**

Near the end of `composeReelPlan`, after the caption import step (Task 9)
and before `export_video`, unconditionally push: `remove_filler_words`
(no args needed — defaults cover the standard filler list),
`remove_pauses` (defaults), `caption_qc` (defaults). All three go in
`NON_FATAL_TOOLS`.

- [ ] **Step 4: Add the beat-sync steps, gated on music presence and a popup existing**

`if (assets.musicSeconds > 1 && spec.kineticPopups.length > 0)`, push
`sync_motion_to_audio` (args: `{ mediaId: mediaToken("music") }`) then
`apply_motion_preset_to_beats` (args: `{ compositionId:
"__composition:popup0__", layerId: "__layer:popup0__", presetId: "pulse"
}` — only ever targets popup index 0, per this task's scope; more popups
pulsing independently is a future enhancement, not required here). Both
go in `NON_FATAL_TOOLS`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test src/features/reel/composer.test.ts`
Expected: PASS

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `node --test && npx tsc --noEmit && npx eslint src/features/reel`
Expected: all green

- [ ] **Step 7: Commit**

```bash
git add src/features/reel/composer.ts src/features/reel/executor.ts src/features/reel/composer.test.ts
git commit -m "feat: filler-word/pause pacing cleanup and music beat-sync pulse on the hook popup"
```

---

## Self-Review Notes

- **Spec coverage:** G1 (Task 7, upgraded), G2 (Task 3), G3 (Task 1), G4
  (already done, no task needed), G5 (every task's own `node:test` step).
  Phase 2 items 1 (Task 9), 2 (Task 5), 3 (Task 10), 4 (Task 7), 5 (Task
  6), 6 (Task 8), 7 (Task 10), 8 (Task 4) — all eight covered.
- **Type consistency:** `ReelToolStep.captureAs` (Task 2) is used
  identically in Tasks 7, 8, 10 — same field name, same string-token
  convention as the existing `clipToken`/`mediaToken` helpers.
  `StyleDirectives` grows across Tasks 3, 4, 6, 7 (`effects` shape change,
  `colorGrade`, `popupAnimator` additions) — each task's step only adds a
  field, never renames one from an earlier task.
- **Review Focus coverage:** `imageCount: 1` is exercised by Task 3's test
  loop; multiple `kineticPopups` by Task 7's second test; no-music by Task
  10's first test; single-word narration by Task 9's second test; the
  cascading-non-fatal-dependency case (Task 7's four-step chain) is
  covered structurally by Task 2's generic `captureAs`/non-fatal design
  rather than a dedicated test — each of the four steps independently logs
  and continues if its tokens don't resolve, which is the existing
  `substitute()` behavior (an unresolved token is passed through literally,
  which OpenReel then rejects as an ordinary non-fatal `INVALID_PARAMS`).
- **Proportion:** this plan is long because the spec (§9) has eight
  distinct composition changes plus four Phase-1 fixes — each task's
  steps are signatures/assertions/exact-values, not full function bodies,
  except where the spec itself left no decision for the builder to make
  (e.g. Task 1's fallback value, copied verbatim from the existing code).
