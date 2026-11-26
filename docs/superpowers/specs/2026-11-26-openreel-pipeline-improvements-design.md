# OpenReel Pipeline Improvements — Design

**Status:** draft, revised after builder-check → awaiting user sign-off → plan → build
**Date:** 2026-11-26

## 1. Why this doc exists

The reel-generation pipeline (LM Studio → ComfyUI → Ming-TTS → OpenReel MCP) was
audited by direct code reading (`src/features/reel/*`, `src/features/mcp-client/*`,
`src/app/api/reel/generate/route.ts`, `docs/MCP_REEL_PLAN.md`). Four concrete,
verified gaps were found. This doc scopes the fix for each, with what's known,
what's uncertain, and what's explicitly out.

This is backend/pipeline-logic work only — no UI changes.

## 2. Verified findings (source of every task below)

1. **Kinetic popups are dead code.** `reelSpecSchema` (`reel/schemas.ts`) defines
   `kineticPopups` in full (text/position/color/strokeColor/fontSize), and
   `repairKineticPopups()` guarantees the planner always produces at least one.
   Grepped `kineticPopup` across `composer.ts`, `executor.ts`, `route.ts`:
   **zero matches.** The LLM plans this hook-word overlay every single run; it
   never reaches the rendered video.

2. **VFX coverage gap.** `directivesForStyle()` in `composer.ts` hardcodes
   effects at `clipIndex: 0` and `clipIndex: 1` for every style. With the
   default `imageCount: 3`, the **third (last-shown) image never gets any
   visual effect**, regardless of which of the 4 styles is chosen. Confirmed by
   reading all four style branches — none target index 2.

3. **MCP tool schemas are discarded before any LLM can use them.**
   `mcp-client/client.ts`'s `listTools()` keeps only `name`/`description` from
   the real SDK response and drops `inputSchema`. `mcp-client/registry.ts`'s
   `acquireToolset()` then hardcodes `parameters: { type: "object", properties: {} }`
   for every tool it exposes to the ad-generation / competitor-research /
   content-calendar LLM stages. Any of those stages that tries to call an
   OpenReel (or other MCP server) tool is calling blind — no param names, no
   types, nothing. This is the one fix that unblocks OpenReel for every
   consumer beyond the reel flow, not just this plan's own changes.

4. **No current full tool catalog.** The Nov-22 spike (`docs/MCP_REEL_PLAN.md`)
   found OpenReel exposes 453 tools, 64 "relevant" ones, decoded by hand. It
   hasn't been re-run since; the OpenReel desktop app may have added tools.
   There's no repo script to re-run that dump.

## 3. Goals

- G1: Kinetic popups render in the output video.
- G2: Every storyboard image (`imageCount` 1, 2, or 3) gets at least one
  style-appropriate VFX treatment — no index is structurally excluded.
- G3: `listTools()`/`acquireToolset()` pass the MCP server's real JSON-Schema
  `inputSchema` through as `parameters`, so any LLM stage given these tool
  defs can actually call them correctly.
- G4: A script exists in the repo (`scripts/dump-openreel-tools.mjs`) that
  connects to the configured OpenReel server and writes its current
  tool list + full input schemas to a JSON file — rerunnable by the user
  whenever they want a fresh catalog, since this sandbox cannot reach
  OpenReel itself (see §6).
- G5: The pure logic touched by G1/G2/G3 gets `node:test` unit coverage
  (Node's built-in runner, zero new dependencies) — real RED→GREEN TDD.

## 4. Non-goals

- No live OpenReel/ComfyUI/Ming-TTS execution testing. Verified: this
  sandbox has no path to the user's Windows machine beyond the synced
  project folder (confirmed by a failed connection attempt — the OpenReel
  stdio command path doesn't exist here). Correctness is established by
  `tsc --noEmit` + `eslint` + `node:test` on the pure logic, not by a real
  render.
- No visual/pixel QA of rendered frames (dropped per user decision this
  session — needs a human or vision model looking at output, not
  scriptable).
- No change to `ReelSpec`/`ReelAssets` shapes — persisted content items
  must stay readable.
- No re-architecture of the composer from deterministic to LLM-orchestrated
  (see Decision Log R1 in `docs/MCP_REEL_PLAN.md` — zero-LLM execution is a
  prior, intentional decision, not a thing this plan reopens).
- Not wiring any of the other ~44 "relevant" OpenReel tools from the Nov-22
  spike into the reel flow itself — G4 only gets the catalog back up to
  date; deciding what (if anything) from it to adopt is a follow-up, after
  the user has run the script and can share the output.
- No regression testing of the ad-generation / competitor-research /
  content-calendar LLM stages for G3. All three are feature-flagged off
  (`data/mcp.json`'s `stages` block) — there is no live path for the
  schema-passthrough change to break today. Validating them is scoped to
  whichever future effort turns those stages on.

## 4a. Resolved after builder-check

A fresh-eyes review of this doc raised three questions. All three are
answered here — none need the user's input:

- **Does the build session have live OpenReel access, unlike this design
  session?** No — same sandbox, same constraint. But the fix doesn't need
  live access *during* coding: G4's dump script writes its JSON output
  into the synced project folder (`docs/openreel-tool-catalog-<date>.json`),
  which the sandbox CAN read once it exists there. So **G4 ships and the
  user runs it first**, before G1 is coded — G1 then reads the real
  `create_text_clip` schema from that file instead of guessing it. This
  reorders the build sequence (§5/§8) and removes the guesswork entirely
  rather than deferring it to "confirm later."
- **How would a wrong G1 guess be caught, given non-fatal failures and no
  visual QA?** With the sequencing fix above, the guess is gone. As a
  remaining safety net, the executor logs a warning (not silent) whenever
  a non-fatal creative step fails, matching the existing pattern for
  `add_transition`/`add_video_effect` — added to acceptance criteria (§7).
- **Does G3 risk the ad-gen/competitor-research/content-calendar stages?**
  No live risk: all three are feature-flagged off in `data/mcp.json`
  (`stages: {brandExtraction: false, research: false, contentGeneration:
  false}`), so there's no running path for a schema change to break today.
  Re-validating tool-calling against real schemas is this plan's job only
  for OpenReel; if those stages are ever turned on, that's its own future
  work. Added explicitly to Non-goals (§4).

## 5. Approaches considered

**G1 — Kinetic popups.**
- *Chosen:* one `create_text_clip` call per popup, placed on the video
  track, using the popup's own `startTime`/`duration`/`text`/styling fields.
  Treated as a **non-fatal creative step** in the executor (same allowlist
  `add_transition`/`add_video_effect`/`set_clip_transform` already use) —
  if the call fails, the reel still completes, and the failure is logged
  as a warning rather than swallowed silently (see §4a, §7).
- **Build order, fixed after builder-check:** G4 ships first. The user
  runs `node scripts/dump-openreel-tools.mjs` once on their machine before
  G1 is coded; its output lands in the synced project folder where this
  session can read it. G1's `create_text_clip` call is then written
  against OpenReel's real current `inputSchema` — not an inferred shape.
  If the user hasn't run it yet when G1's task comes up, that task waits
  rather than guessing.
- *Known limitation, documented not engineered around:* the Nov-22 spike
  found `create_text_clip`'s `style.position` is ignored by OpenReel — it
  always renders center. `KineticPopup.position` defaults to `"center"`
  (fine) but allows `"upper-center"` (will currently render center too).
  No code-side workaround exists without a UI-visible re-spike; this is
  called out in the code and in the user-facing changelog for this work,
  not hidden.
- *Rejected:* skip popups with `position: "upper-center"` entirely — not
  justified; the center-render limitation is cosmetic, not a correctness
  break, and the popup still shows.

**G2 — VFX coverage.**
- *Chosen:* change `directivesForStyle` to return effect *definitions*
  independent of image count (an ordered list of `{type, params}` per
  style, not indexed to specific clips), then have `composeReelPlan`
  assign one to every image via `effects[i % effects.length]`. Guarantees
  coverage for `imageCount` 1, 2, or 3 without special-casing any of them.
- *Rejected:* just add a third hardcoded `clipIndex: 2` entry to each
  style's effects array — works today but breaks again the moment
  `imageCount`'s upper bound ever changes (schema currently caps it at 3,
  but the round-robin approach costs nothing extra and doesn't reintroduce
  the same class of bug).

**G3 — Schema passthrough.**
- *Chosen:* `McpConnection.listTools()` return type gains `inputSchema:
  unknown` (or a loose JSON-Schema type if the SDK exports one), copied
  straight from the SDK's `Tool` response. `acquireToolset()` uses
  `tool.inputSchema ?? { type: "object", properties: {} }` as `parameters`
  instead of the hardcoded empty object. Pure plumbing fix, no behavior
  change for callers that don't inspect `parameters`.
- *Rejected:* leave `client.ts` untouched and patch schemas only in
  `registry.ts` — can't; `registry.ts` only ever sees what `listTools()`
  gives it, so the fix has to start at the source.

**G4 — Dump script.**
- *Chosen:* `scripts/dump-openreel-tools.mjs`, reusing the same
  `@modelcontextprotocol/sdk` client/stdio-transport pattern already in
  `mcp-client/client.ts` (not importing app code directly, to keep it a
  standalone zero-dependency-beyond-the-SDK script matching the existing
  `scripts/*.js` one-off convention in this repo). Reads the OpenReel
  command/args straight from `data/mcp.json` so it stays in sync if that
  ever changes. Writes `docs/openreel-tool-catalog-<YYYY-MM-DD>.json`
  (name + description + full inputSchema, 453-tool-shaped array). The user
  runs it once (`node scripts/dump-openreel-tools.mjs`) on their own
  machine — this sandbox cannot run it against the real OpenReel app (see
  §6).

## 6. Environment constraint (why this shapes the plan)

This chat session's `device_bash` is a cloud sandbox with only the
project's folder synced in — confirmed by Anthropic's own Cowork
documentation ("the agent's work... is processed on Anthropic's servers
rather than staying on the device") and by direct test: attempting to
connect to OpenReel's configured stdio command
(`C:\Users\Administrator\AppData\Local\Programs\@openreeldesktop\...`)
fails with "Cannot find module" because that path doesn't exist in this
sandbox. Computer Use (screen control on the user's real machine) is
available this session, but Terminal is granted at **click-only** tier
(no typing/keystrokes) and Chrome at **read-only** tier under this
account's safety policy — neither permits running a script or driving a
browser form that way. Claude-in-Chrome (full interactive access to the
user's real Chrome) *is* available and would work for live app testing in
a future session, but running a Node script still requires the user's own
terminal. Net effect: every fix in this plan is verified at the
`tsc`/`eslint`/`node:test` level; G4's actual execution against live
OpenReel is the user's to run.

## 7. Acceptance criteria

- `composeReelPlan` includes one `create_text_clip` step per entry in
  `spec.kineticPopups`, each marked non-fatal in the executor.
- For `imageCount` 1, 2, and 3, every image index has exactly one VFX
  effect assigned, for all 4 styles — provable by a `node:test` that
  calls `composeReelPlan` (or the extracted directive function) with each
  combination and asserts effect-step count equals `imageCount`.
- `acquireToolset()`'s returned tool defs carry the real `inputSchema`
  from the connected server when the server provides one.
- `scripts/dump-openreel-tools.mjs` exists, reads `data/mcp.json`, and
  (per its own header comment) is meant to be run by the user on their
  machine, writing to `docs/openreel-tool-catalog-<date>.json`.
- `create_text_clip`'s call args in `composer.ts` match the `inputSchema`
  from that dump file, not an inferred shape (§4a, §5).
- A non-fatal executor step (popups, transitions, effects, transforms)
  that fails logs a warning identifying which step and why, instead of
  failing silently.
- `npx tsc --noEmit` and `npx eslint` on all changed files are clean.
- `node --test` passes for all new test files.

## 8. What's left to the builder

- Build order: **G4 → (user runs it) → G1**, then G2/G3/G5 in any order
  (they don't depend on the dump). If the user hasn't run the dump script
  by the time G1's task comes up, pause and ask rather than falling back
  to a guessed schema.
- Exact TypeScript type for `inputSchema` on `McpConnection.listTools()` —
  use whatever the installed `@modelcontextprotocol/sdk` version's `Tool`
  type already calls it (likely `inputSchema: Tool["inputSchema"]`);
  builder confirms against the actual SDK types in `node_modules`.
- Exact `create_text_clip` args — read straight from the dump file's
  `inputSchema` entry for that tool once it exists; no inference needed.
- Output path/filename convention for the dump script is fixed above
  (`docs/openreel-tool-catalog-<date>.json`); builder may add a `--out`
  flag if trivial, not required.
