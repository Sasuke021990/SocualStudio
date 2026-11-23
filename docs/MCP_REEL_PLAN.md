# Plan — 15s Reel Builder (OpenReel MCP)

**Status:** plan approved-in-principle → live spike pending → feature implementation gated on user approval
**Date:** 2026-11-22

## Goal
From the workspace editor, turn a post's assets (image + caption + sound + voice) into a 15-second vertical reel via the connected **OpenReel** MCP server: an LLM plans the edit as a tool flow, the user reviews it, then **Generate Reel** executes it and the video plays inline.

## UX (user decisions locked)
1. **"15sec reel prompt" section** below *Sound description* in Edit Post: editable textarea (prefilled) + **Generate Reel Plan** button → **popup asks "How many images? 1 / 2 / 3"** first; the Viral Director plans from that N.
2. **Planning** (Viral Director): LLM writes narration via hook library + self-scoring (auto-picks best hook — no variant picker) + N storyboard image briefs (one per slice, following narration beats); caption text = narration verbatim. Output = strict **ReelSpec** (zod `z.strictObject`, unknown keys rejected). Plan is duration-specific — flipping the 15/30 s toggle after planning marks the plan stale ("Regenerate plan").
3. **Plan shown** to user: script (editable) + captions/music summary + **Regenerate** / **Use Plan**.
4. **Generate Reel** button in Media Tools **beside the image tool section**, with a **15 s / 30 s duration toggle** (default 15 s) **and an image-count selector 1–3** (default 3). N images are **generated fresh** via the selected image tool (Z Image Turbo / Kera 2 / Simple Qwen 2.1 chips), storyboarded by the planner (one brief per slice, following narration beats). Button **blocked with message** when voice/sound missing — no auto-generation (images are generated as part of the run).
5. During generation: **modal overlay** ("Generating your reel…" + progress phases), app frozen behind it.
6. Result: **Image / Reel toggle replaces the image area — only after successful generation**; `<video controls>`, saved with post, `reel.mp4` in export folder; button becomes "Regenerate Reel".

## Lifecycle (user decision)
- Reel generation is available **only on posts in Draft/Saved state** (workspace editor of a persisted post) **and Approved** posts show the reel **read-only**.
- **Once approved: not editable** — no plan/generate/regenerate, no caption edits; the reel remains visible and playable.
- **All images and assets persist as-is** (reel video, staged images, voice, sound) across reloads/restarts **until the user deletes the post** — deletion is the only cleanup trigger.

## Framework: ReelSpec + Composer (LLM never does math)
- `durationSeconds: 15 | 30` (z.literal union) — reels are always exactly D seconds.
- `imageCount: 1 | 2 | 3` + `imageBriefs[]` (length === imageCount, strict superRefine) — images generated fresh per run from a storyboard (one brief per slice, following narration beats).
- Narration word gate scales: 15 s ≈ 25–70 words, 30 s ≈ 50–140.
- Voice-locked timing: voice clip speed-fitted to exactly D (clamped 0.85–1.18×); images = D/N equal slices 0→D; captions ∝ word count across 0→D (CTA cue 0.8D→D if present); music stretched (`set_clip_speed = M/D`) or trimmed to D, 25% volume, fade 1/2 s; export 1080×1920/30/H.264/6000k/stereo.
- **Composer** (pure, zero-LLM) compiles ReelSpec + assets → OpenReel tool-call plan; plan preview = exactly what renders.

## Architecture
```
features/reel/
  types.ts       ReelFlow { steps: [{ tool, args, note }] }
  schemas.ts     zod (flow validation)
  planner.ts     two-phase LLM planning via OpenAICompatibleProvider
                   phase 1: all tool names+descriptions → pick tools
                   phase 2: picked tools' input schemas + context → flow JSON
  executor.ts    withMcpConnection(server) → callTool per step, in order;
                 placeholder substitution in args:
                   ${imagePath} ${voicePath} ${soundPath} ${caption}
                   ${hashtags} ${cta} ${reelPrompt} ${reelOutput}
                 stops at first failing step, returns per-step results
src/app/api/reel/plan/route.ts       POST → flow (persisted on item)
src/app/api/reel/generate/route.ts   POST → execute flow → poll export → video URL
src/app/api/reel/file/route.ts       GET  → serve exported reel.mp4
UI (workspace-client.tsx):
  - reel prompt section under Sound description (textarea + Generate + plan list)
  - Generate Reel button next to Image tool chips (disabled logic above)
  - <video controls> in post card; variation.reelVideo + variation.reelFlow persisted
```

## Decision Log
| # | Decision |
|---|----------|
| R1 | Hybrid: LLM plans, deterministic execution (not LLM-called tools during render) |
| R2 | Two-phase tool exposure (all names → schemas on demand) — cost/quality |
| R3 | Flow visible to user before execution; regenerate allowed |
| R4 | Gate: ≥2 assets incl. image (image + caption/sound/voice) |
| R5 | Video in post card + saved with post + export folder |
| R6 | OpenReel server only (name match) |
| R7 | Placeholders in flow args; executor substitutes real paths at run time |

## Spike (before any feature code) — live end-to-end
- [x] S1 image via **Z Image Turbo** (real ComfyUI generation — `spike-image.png`, 1024²)
- [x] S2 dummy caption (text) + dummy sound (real sfx generation — `spike-sound.wav`, 10s)
- [x] S3 inspect OpenReel tool schemas (453 tools; 64 relevant; arg shapes decoded)
- [x] S4 handcraft a 15s reel flow from real schemas (the shape the planner will emit)
- [x] S5 execute flow via MCP: project → import → tracks → clips → trim → 3 text overlays → **export 15s MP4 (22.2 MB, H.264, 1080×1920)**
- [x] S6 show the reel (`C:\Users\Administrator\Videos\spike-reel\spike-reel.mp4`, opened in Review pane)
→ **User approval gate → then implement slices** (planner → routes → UI → persistence).

## Spike discoveries (feed the implementation)
1. `import_media_from_url` **refuses loopback hosts** → assets must be staged as **files inside OpenReel's allowed roots** (`mcp.allowedRoots`: Videos/Music/Pictures/Documents/Downloads/Desktop) → feature must copy image+audio into e.g. `Videos\SocialStudio\<post>\` before import.
2. Result shapes: `import_media_from_path` → `{imported:[{mediaId,kind,...}]}`; `list_tracks`/`list_clips` → **top-level arrays**; `add_track`/`add_clip` return only `actionId` → resolve real ids via `list_tracks`/`list_clips`.
3. Image clips default to **5s** → `trim_clip({clipId, inPoint, outPoint})` extends to 15s.
4. `export_video` accepts `outputPath` inside allowed roots (+`overwrite:true`); errors come back as text `INVALID_PARAMS/TOOL_ERROR/OUTSIDE_ALLOWED_ROOTS` **not** `isError`.
5. `dismiss_onboarding` first; projects: `create_project({name,width:1080,height:1920,frameRate:30})`.
6. **Text position:** `create_text_clip` `style.position` is **ignored** (renders center). Bottom text = **`add_subtitle` cues + `set_caption_style({style:{position:"bottom", fontSize, color, strokeColor/Width, shadow*, safeMargin}})`** — verified by frame render (`export_image_sequence` → PNG).
7. Visual self-check loop: `export_image_sequence` (2-frame range → zip → PNG) then read the PNG — no ffmpeg needed.

## Runtime fixes (post-implementation hardening)
- **Format-matched image sizes:** `injectPrompt` now injects target dimensions into the workflow's latent nodes — reel/story images **720×1280 (9:16, full-frame, no letterbox)**, post images **1024×1024 (1:1)**. `/api/comfyui/generate` accepts optional `width`/`height`.
- **LLM warm-back:** generation unloads the LLM from VRAM first (policy preserved) and **preloads it again afterwards** (`features/ai-provider/preload.ts`) so planning stays instant instead of hitting a cold model.
- **Render timeout:** MCP tool calls allow up to 10 min (exports take minutes).
- **max_tokens cap (4096)** on structured LLM outputs — prevents truncated JSON.
- **Planner output clamping:** imageBriefs/musicMood/cta clamped to schema limits; empty briefs sanitized with fallbacks (models vary in verbosity).
- **Hook gate:** ≥ 7/10, 3 attempts, retry feedback carries the real score.
- **Silent-failure guards:** voice/sound generation surfaces "engine returned no audio" instead of doing nothing.
