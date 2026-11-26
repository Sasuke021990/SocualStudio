# Reel Effects, Image Count & UX Improvements — Design

> **Status:** approved (naming decision made 2026-11-26) → plan → build

## 1. Intent & why

Three problems surfaced in production use of the reel pipeline built in
`openreel-pipeline-improvements`:

1. A reel generation job can report success (or fail with a raw Node error)
   while `reel.mp4` was never actually written by OpenReel, because the
   pipeline doesn't verify `export_video` actually produced a file before
   handing it to the copy-to-export step.
2. The current default visual style (`high-energy`: VHS-glitch,
   chromatic-aberration, whip-pan/glitch/flash transitions) does not fit a
   premium-feeling reel and the user wants it replaced, not just avoided via
   the dropdown.
3. Image count is hard-capped at 1–3 storyboard images; the user wants
   3–10, selectable per reel.

Alongside fixing those three, the user asked "what else should we build" and
"how do we improve the experience" — this doc also inventories concrete,
tool-verified opportunities so a priority order can be picked instead of
guessing.

## 2. Goals

- A reel export that never silently produces a missing file — a failure is
  reported as a failure, immediately, with an actionable message.
- Three new named style presets (Cinematic, Clean Editorial, Modern Social),
  built from OpenReel tool values verified against the live tool catalog,
  replacing `high-energy` as the default.
- Image count selectable 3–10 (user-facing control, not just internal cap).
- A short, prioritized list of next features and UX improvements, each
  tied to a concrete OpenReel tool or codebase location, so follow-on plans
  don't need fresh research.

## 3. Non-goals (this round)

- Rewriting the kinetic-popup or caption systems (shipped and working).
- Duration options beyond today's 15s/30s union.
- Any change to voice/TTS, music selection, or the brand-brain extraction
  pipeline.
- A visual style-preview UI (swatch/thumbnail picker) — flagged as a UX
  idea below, not committed to this round's scope.

## 4. Anti-goals

- Don't reintroduce the VHS/glitch look as a *default* even disguised under
  a new name — if it stays available at all, it must be an explicit,
  clearly-labeled opt-in, not the first thing a new user sees.
- Don't make image count silently change narration pacing in a way that
  breaks voice-to-duration fitting — `imageBriefs` count must track
  `imageCount` exactly, as it does today.
- Don't expand scope into a generic "effects marketplace" — every new tool
  adopted here must have a verified schema and a concrete trigger condition
  in the composer, not be exposed as raw freeform OpenReel API access.

## 5. Constraints

- Every effect/transition/shader id used in code must be checked against
  the real catalog (`docs/openreel-tool-catalog.json`) or a live
  `list_pro_effects` / `list_motion_shaders` / `get_capabilities` call —
  no more inventing plausible-sounding ids.
- `export_video` stays a fatal step; the new verification step must not
  turn it into a silently-swallowed non-fatal one.
- TDD per `superpowers:test-driven-development`, same as the prior branch.
- Backward compatibility: existing saved `ReelSpec` JSON with
  `style: "high-energy"` must still render (keep the style as a selectable,
  non-default option) rather than erroring on old content items.

## 6. Sub-projects (independently shippable)

### A. Export verification (bug fix) — small

**Problem (verified):**
- `src/features/mcp-client/client.ts` `callTool()` never inspects MCP's
  `res.isError` flag.
- `src/features/reel/executor.ts`'s `ERROR_CODES` regex only matches five
  specific OpenReel error codes; `export_video`'s own catalog description
  calls it `"Expensive: requires confirmation"`, a state this regex does
  not cover.
- Net effect: `copyReelToExport()` (`src/features/reel/assets.ts:62`)
  attempts to copy a file OpenReel never wrote, surfacing as a raw
  `ENOENT` instead of a clear error.

**Fix:**
1. `client.ts`: check `res.isError`; if true, throw with the result's text
   as the message (so existing `ERROR_CODES` / non-fatal handling in
   `executor.ts` still applies downstream, now reliably reached).
2. `assets.ts` or the route handler: after `export_video` returns and
   before `copyReelToExport`, `stat()` `assets.outputPath`; if missing or
   zero bytes, throw `"Export did not produce a file — check OpenReel is
   running and responding to confirmation prompts"` instead of letting the
   raw copy error surface.

**Approaches considered:** retry the export automatically on missing file
vs. fail fast with a clear message. Picked **fail fast** — an automatic
retry of an expensive confirmation-gated render without knowing *why* it
didn't produce a file risks silently retrying into the same stuck state
(e.g. an OpenReel confirmation dialog nobody is clicking).

### B. Style presets — small/medium

Replace the `high-energy` default with three new presets in
`directivesForStyle()` (`src/features/reel/composer.ts`). All values below
were checked against `add_transition.transitionType`'s enum and
`list_pro_effects`' documented effect types — not invented.

| Preset | Transitions | VFX | Grade | Popup animator |
|---|---|---|---|---|
| **Cinematic** | crossfade, dipToBlack, zoom | tilt-shift, lens-flare (low), exposure | warm, low saturation | text-reveal-up |
| **Clean Editorial** | crossfade only | none | near-neutral | text-type-on |
| **Modern Social** | push, radialWipe, circleReveal | vibrance, glow | punchy, controlled saturation | glyph-glow-wave (verify in `list_motion_shaders`) |

`high-energy`, `tech-explainer`, `minimalist` stay in the `ReelStyle`
union and `directivesForStyle()` switch unchanged, so existing saved reels
with those styles keep working. The old `"cinematic"` key's definition
(filmBurn/zoom/dipToBlack transitions, vignette/glow VFX) is **replaced
in place** by the new Cinematic preset values from the table above — one
key, one name, no `legacy-cinematic` split. A saved `ReelSpec` with
`style: "cinematic"` still renders (the key exists), it just looks like
the new Cinematic preset if that reel is ever regenerated. New default
in the dropdown: **Modern Social**.

**Decided (2026-11-26):** replace the old `cinematic` definition outright
— simplest option, accepted that a regenerated old-cinematic reel will
look different going forward.

**Stretch (flagged, not committed):** pull real saved looks via
`list_color_library` when available, falling back to the hand-tuned grade
numbers above when the user has no saved LUTs in OpenReel.

### C. Image count 3–10 — small

- `src/features/reel/schemas.ts`: `imageCount` → `z.number().int().min(3).max(10)`;
  `imageBriefs` bounds → `.min(3).max(10)` (currently `.min(1).max(3)`).
- `src/features/reel/planner.ts`: widen the `1 | 2 | 3` type to
  `number` (3–10), no other change needed — the prompt already asks for
  "exactly `${input.imageCount}` briefs."
- `src/app/workspace/[id]/workspace-client.tsx`: widen the button-row
  source array (currently implicitly `[1,2,3]`) to `[3,4,5,6,7,8,9,10]`,
  and `imageCountPick` state type from `1|2|3` to `number`.
- `src/features/reel/composer.ts` and `.../generate/route.ts` already loop
  `for (let i = 0; i < spec.imageCount; i++)` / `for (let i = 0; i < N; i++)`
  — no changes needed there.

**Flag, not a blocker:** at `durationSeconds: 15` with `imageCount: 10`,
slice length is 1.5s per image — a very fast cut rate. Worth a soft UI
hint ("more than 6 images at 15s will cut fast") rather than a hard limit.

## 7. Additional features (priority-ordered, independent of A–C)

Each verified against the real tool catalog; none require new OpenReel
server capabilities.

1. **Speed ramp on the hook image** — `set_speed_ramp` on image 0's first
   1–2s for a punch-in feel. Small, high visual impact, no dependency on
   anything else in this doc.
2. **Per-image regenerate** — let the user redo one storyboard image
   without re-running narration/voice/music. UX win; touches
   `workspace-client.tsx` and the `/api/reel/generate` flow's image loop
   (`src/app/api/reel/generate/route.ts:140-165` already supports reusing
   existing images by path — a single-image regenerate is a small
   extension of that existing reuse logic).
3. **Hook-score gate** — `hookScore` is already computed at plan time
   (`workspace-client.tsx` `generatePlan`) but only displayed, never acted
   on. Add a confirm step before committing to a full render when it's
   low (e.g. below 6/10).
4. **Sticker badge overlays** — `create_sticker_clip`, independent of the
   kinetic-popup system, for "NEW"/price-tag/arrow style call-outs.
5. **Reusable effect presets** — `save_effect_preset` / `apply_effect_preset`
   so a tuned look can be saved once (in OpenReel's own UI) and referenced
   by id from code, instead of hardcoded parameter numbers per style.
6. **Keep previous render on regenerate** — don't overwrite `reel.mp4`
   until the new render succeeds; lets the user compare old vs. new style
   output side by side. Small change to `copyReelToExport`'s destination
   naming (e.g. timestamp or `-prev` suffix) plus a UI affordance to view
   the previous version.
7. **Brand-default style** — store a default `ReelStyle` on the brand
   profile (`src/features/brand-brain/*`) so `reelStyle` initializes from
   it instead of always starting on one hardcoded value.
8. **Finer-grained progress text** — `job.phase` is a handful of generic
   strings today; the composer's `ReelToolStep[]` already carries a
   `label` per step, which could be surfaced to the UI as the render
   progresses instead of being internal-only.
9. **Caption QC acted on, not just logged** — `caption_qc`
   (`composer.ts:378`) runs today but its result is swallowed as a
   non-fatal warning. Surface actual QC findings (e.g. caption overlaps,
   too-fast reading speed) to the user before export.
10. **Style preview swatch in the picker** — replace the plain `<select>`
    with a small visual card per style showing its transition/grade
    character. Larger UI effort; lowest priority of this list.

## 8. Approaches considered (style presets vs. alternatives)

- **Option 1 (picked): three new named presets, old styles retained but
  demoted from default.** Minimal risk to existing saved content; gives
  the user exactly the three looks requested.
- **Option 2: single new configurable style with sliders (grade
  intensity, transition speed, VFX on/off).** More flexible long-term but
  a much bigger UI and composer change for this round; deferred.
- **Option 3: replace `high-energy`'s definition in place instead of
  adding new keys.** Rejected — silently changes the meaning of existing
  saved `ReelSpec.style: "high-energy"` content, violating the backward
  compatibility constraint in §5.

## 9. What's left to the builder (plan-writing stage)

- Exact threshold for the hook-score gate (§7.3) and the "too many images
  at short duration" hint copy (§6.C) — reasonable defaults proposed,
  confirm before implementing.
- Whether sub-projects A, B, C ship together in one plan/branch or as
  separate plans — recommend one branch covering A+B+C (all touch
  `composer.ts`/`schemas.ts` together) with the §7 feature list as
  separate follow-on plans, to keep review sizes manageable.
