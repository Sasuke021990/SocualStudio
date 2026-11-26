# Audit 2 Report: OpenReel MCP Creative Tool Pipeline & Local AI Specification

**Project:** My Social Media Influencer (MMSI)  
**Date:** November 23, 2026  
**Target:** OpenReel MCP Server Integration, Local AI (64k Context), Zod Verification Layer, Viral Video Aesthetics  
**Status:** Audit Complete — Specification Ready for Review  

---

## 1. Executive Summary & Root Cause

The MMSI platform currently generates Instagram/TikTok Reels using an OpenReel MCP server instance. However, generated reels only consist of static image cutaways, a voiceover WAV, background audio, and bottom subtitles. 

An inspection of the local OpenReel MCP server at `C:\Users\Administrator\AppData\Local\Programs\@openreeldesktop\resources\app.asar.unpacked\dist\mcp-shim\index.js` reveals **453 tools**, including **189 creative video editing tools** (transitions, VFX, keyframed camera motion, kinetic typography, sticker overlays, and audio ducking).

### The Technical Root Cause

The root cause is a hard decoupled pipeline split across two files in `src/features/reel/`:

```
┌────────────────────────────────┐
│  src/features/reel/planner.ts   │
│  (Local LLM Prompt)            │
└───────────────┬────────────────┘
                │ Output: ReelSpec (JSON)
                │ • Only asks for: hookScore, narration, imageBriefs, cta, musicMood
                │ • Has ZERO knowledge of OpenReel MCP tools or video effects.
                ▼
┌────────────────────────────────┐
│  src/features/reel/composer.ts  │
│  (Static Timeline Builder)     │
└───────────────┬────────────────┘
                │ Output: Array of 12 Hardcoded Steps:
                │ • create_project, import_media_from_path, add_track, add_clip
                │ • trim_clip, set_clip_speed, normalize_clip_loudness
                │ • add_subtitle, set_caption_style, export_video
                │ • 189 OpenReel creative tools are NEVER called!
                ▼
┌────────────────────────────────┐
│  src/features/reel/executor.ts  │
│  (MCP Tool Invoker)            │
└────────────────────────────────┘
                │ Executes only primitive clips & tracks.
                │ Cannot resolve clipAId/clipBId joint IDs needed for transitions.
```

1. **Planner LLM Blindness:** `planner.ts` only asks the LLM to output a `ReelSpec` JSON with basic narration and image descriptions. The LLM is given no tool definitions or styling parameters.
2. **Composer Static Stacking:** `composeReelPlan` in `composer.ts` deterministically produces an assembly cut of raw media slices without any visual transitions (`add_transition`), visual effects (`add_video_effect`), camera keyframes (`animate_clip_scale`), or overlay text (`create_text_clip`).
3. **Executor ID Limitation:** `executor.ts` only resolves `__videoTrack__`, `__audioTrack1__`, `__audioTrack2__`, and `__clip:imgX__`. It does not support mapping transitions between adjacent clips or graphics overlay tracks.

---

## 2. OpenReel MCP Creative Tool Catalog (189 High-Impact Tools)

Querying the live OpenReel MCP server identified the creative capabilities available on the host:

| Capability Group | Key OpenReel MCP Tools | Impact & Viral Utility |
| :--- | :--- | :--- |
| **Transitions (10 styles)** | `add_transition`, `update_transition` | Seamless scene changes: `whipPan`, `glitch`, `zoom`, `crossfade`, `filmBurn`, `push`, `radialWipe`, `mosaic`, `blur`. |
| **Video Effects (VFX)** | `add_video_effect`, `set_video_effect_params` | Post-processing overlays: `motion-blur`, `vignette`, `vhs-glitch`, `lens-flare`, `camera-blur`, `glow`, `halftone`, `chromatic-aberration`. |
| **Dynamic Camera (Ken Burns)** | `animate_clip_scale`, `animate_clip_position`, `set_clip_keyframe` | Replaces static images with rapid crash-zooms (1.0 $\rightarrow$ 1.25) or subtle cinematic drifts. |
| **Kinetic Typography** | `create_text_clip`, `animate_text_clip` | MrBeast-style large punchy keyword popups (e.g., *"STOP PAYING ₹1 LAKH"*, *"10x FASTER"*) centered or in upper frame. |
| **Graphic Overlays & Badges** | `create_sticker_clip`, `add_clip` (overlay track) | Contextual callouts, arrows, verified badges, alert boxes. |
| **Audio Processing** | `add_audio_effect`, `duck_audio_track`, `set_clip_volume` | Dynamic audio ducking (music volume automatically dips 70% during speech), audio compression, reverb, and fade curves. |
| **Color Grading & LUTs** | `apply_lut`, `adjust_exposure`, `adjust_saturation`, `adjust_contrast` | Cinematic color profiles (high-contrast tech noir, warm golden hour, teal & orange). |

---

## 3. Architecture: The 2-Tier "Director & Engine" Model

Rather than raw, slow, and error-prone LLM agentic tool-calling (where an LLM attempts 30+ separate tool roundtrips), MMSI utilizes a **2-Tier "Director & Engine" Architecture**:

1. **Tier 1 — Creative Director (Local AI on LM Studio with 64k Context):**
   - The local model (`http://127.0.0.1:1235/v1`) receives the brand context, reel prompt, and selected **Reel Style**.
   - It outputs high-level creative directives:
     - 1–3 Storyboard visual briefs.
     - Spoken narration script.
     - 2–4 MrBeast-style **Kinetic Accent Popups** (high-impact uppercase words with timestamps).
     - Transition rhythm and visual VFX choices.
2. **Tier 2 — Smart Timeline Compiler (`composer.ts` & `executor.ts`):**
   - Takes the LLM's creative directives and machine-computes exact millisecond timestamps, keyframe coordinates, and track layouts.
   - Emits mathematically valid OpenReel MCP tool calls:
     - Track 0 (Video): Storyboard stills with `animate_clip_scale` (crash zoom) and `add_transition` (whipPan/glitch) between clips.
     - Track 1 (Graphics/Overlay): `create_text_clip` for kinetic popups.
     - Track 2 (Subtitles): Auto-synced spoken captions on bottom.
     - Track 3 (Voice): Ming-TTS voice-over.
     - Track 4 (Music): Hyped MOSS-generated beat with ducking.

---

## 4. Multi-Layer Zod Validation & Auto-Repair Strategy

To ensure **0% runtime failures** when executing with local AI models:

```
[ Local AI Output (LM Studio 64k) ]
                 │
                 ▼
┌───────────────────────────────────────────────┐
│     Zod Pre-Parsing & Fence Normalizer        │
│  • Strips Markdown code blocks (```json)      │
│  • Fixes unescaped control chars / trailing   │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│           Zod Strict Schema Validation        │
│  • Enforces word counts (25–70 for 15s)       │
│  • Validates transition enums & effect types  │
│  • Bounds timestamp numbers                   │
└───────────────────────┬───────────────────────┘
                        │
                        ├─► Success ───────────► To Composer
                        │
                        ▼ Failure / Missing Fields
┌───────────────────────────────────────────────┐
│     Deterministic Zod Auto-Repair Layer       │
│  • Missing kineticPopups? Extracts first 3    │
│    uppercase words from hook line.            │
│  • Invalid transition name? Clamps to         │
│    style default ("whipPan" / "glitch").      │
│  • Timestamp out of bounds? Clamps to [0, D]. │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│      Guaranteed Valid ReelSpec Payload        │
└───────────────────────────────────────────────┘
```

---

## 5. SPEC.MD (Implementation Specification)

### ✅ Confirmed Requirements & Scope
1. **Reel Style UI Control:**
   - Dropdown selector in Studio UI (`src/app/workspace/[id]/workspace-client.tsx`):
     - `high-energy` (*High Energy / Viral Hype - Default*)
     - `cinematic` (*Cinematic / Film Burn*)
     - `tech-explainer` (*Tech Explainer / Clean Cuts*)
     - `minimalist` (*Minimalist / Slow Motion*)
2. **Local AI Execution (64k Context):**
   - Planner uses local provider (`LM Studio` on `http://127.0.0.1:1235/v1`) with 64k context support.
   - LLM loads for planning and unloads before GPU ComfyUI/MOSS generation to preserve VRAM.
3. **High-Energy Viral Video Aesthetics:**
   - **Transitions:** Fast whip-pan (`whipPan`, 0.4s) and digital glitch (`glitch`, 0.35s) between storyboard clips.
   - **Visual Effects:** Chromatic aberration on hook intro, vignette, and subtle motion blur.
   - **Dynamic Camera:** Keyframed Ken Burns crash-zoom (`animate_clip_scale` 1.0 $\rightarrow$ 1.25 over 2.5s).
   - **Kinetic Hook Popups:** Large centered/upper text cards (MrBeast style, `#FFE600` yellow, thick black stroke, drop shadow) for punchy emphasis.
   - **Subtitles:** Spoken word subtitles preserved at bottom with safe-margin padding.
4. **Top-Trending Hyped Audio:**
   - MOSS SoundEffect Vulkan prompt tuned for fast-tempo trending short-form beats (808 bass, phonk/drill groove, riser drops).
   - Background music ducked to 25% volume during speech.

---

### 🛠 Tech Stack & Dependencies
- **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS.
- **Backend:** Node.js 22, TypeScript, Zod 3.24+.
- **Local AI Provider:** LM Studio (`http://127.0.0.1:1235/v1`, 64k context).
- **Video Engine:** OpenReel Desktop MCP Server (`mcp-shim/index.js`, 453 tools).
- **TTS Engine:** Ming TTS Vulkan CLI (`audiocpp_cli.exe`).
- **SFX Engine:** MOSS SoundEffect Vulkan CLI (`moss-soundeffect-v2-q8_0.gguf`).
- **Image Engine:** ComfyUI local connection (9:16 vertical 720x1280 stills).

---

### 📁 File Structure & Module Breakdown

| File Path | Changes Required |
| :--- | :--- |
| `src/features/reel/schemas.ts` | Define `reelStyleSchema`, `kineticPopupSchema`, `transitionTypeSchema`, `videoEffectSchema`, and resilient auto-repair functions. |
| `src/features/reel/planner.ts` | Update prompt for 64k local LLM to output viral style directives, kinetic popups, and Zod repair integration. |
| `src/features/reel/composer.ts` | Emit OpenReel tool steps for `add_transition`, `add_video_effect`, `create_text_clip`, `animate_clip_scale`, and audio ducking. |
| `src/features/reel/executor.ts` | Enhance ID placeholder resolver to map adjacent clip joints (`clipAId`, `clipBId`) and graphics overlay tracks. |
| `src/features/voice/sfx.ts` | Add high-energy trending beat presets to MOSS sound generation. |
| `src/app/api/content-dashboard/sfx/route.ts` | Tune prompt generation to support high-energy reel music. |
| `src/app/api/reel/plan/route.ts` | Accept `reelStyle` in request body and forward to planner. |
| `src/app/api/reel/generate/route.ts` | Pass `reelStyle` and asset parameters to updated composer. |
| `src/app/workspace/[id]/workspace-client.tsx` | Add "Reel Style" dropdown UI selector and connect state to plan/generate calls. |

---

### 🔌 API / Schema Definitions

```typescript
// src/features/reel/schemas.ts

export const reelStyleSchema = z.enum([
  "high-energy",
  "cinematic",
  "tech-explainer",
  "minimalist",
]);
export type ReelStyle = z.infer<typeof reelStyleSchema>;

export const kineticPopupSchema = z.object({
  text: z.string().min(1).max(30),
  startTime: z.number().min(0),
  duration: z.number().min(0.4).max(3.0),
  position: z.enum(["center", "upper-center"]).default("center"),
  color: z.string().default("#FFE600"),
  strokeColor: z.string().default("#000000"),
  fontSize: z.number().min(40).max(120).default(76),
});
export type KineticPopup = z.infer<typeof kineticPopupSchema>;

export const transitionTypeSchema = z.enum([
  "whipPan", "glitch", "zoom", "crossfade", "filmBurn", "push", "radialWipe", "blur"
]);

export const videoEffectSchema = z.enum([
  "chromatic-aberration", "vhs-glitch", "vignette", "lens-flare", "motion-blur", "glow"
]);
```

---

### 🧪 Testing Strategy
1. **Zod Resiliency Unit Tests:** Verify schema parsing against malformed JSON, out-of-order timestamps, and missing fields; verify auto-repair fallback succeeds without errors.
2. **Composer Timeline Step Audit:** Verify generated steps contain correct track order (Video, Graphics, Voice, Music), valid clip joint IDs, non-colliding timestamps, and valid parameters for `add_transition` and `add_video_effect`.
3. **Local AI Execution Verification:** Trigger `planReelSpec` with LM Studio on `http://127.0.0.1:1235/v1` and ensure valid output in under 5 seconds.
4. **End-to-End Render Test:** Run full generation through OpenReel MCP and verify rendered MP4 in `data/reels/{itemId}/reel.mp4` displays transitions, kinetic text popups, and ducked audio.

---

### ⚠️ Risks, Edge Cases & Mitigations
- **Risk 1: Local AI JSON Truncation or Markdown Fencing:**  
  *Mitigation:* Pre-parser handles markdown code blocks, preambles, and unclosed brackets before Zod validation.
- **Risk 2: Transition duration exceeding clip slice length:**  
  *Mitigation:* Clamp transition duration to `min(slice * 0.25, 0.45s)`.
- **Risk 3: Graphics Layer Track Collision:**  
  *Mitigation:* Explicit OpenReel track indexing: Track 0 = Video, Track 1 = Graphics Overlay, Track 2 = Voice, Track 3 = Music.

---

### 💡 Step-by-Step Implementation Sequence
1. **Step 1:** Update `src/features/reel/schemas.ts` (Zod schemas, style presets, auto-repair functions).
2. **Step 2:** Update `src/features/reel/planner.ts` & `src/app/api/reel/plan/route.ts` (prompt tuning, 64k context, Zod validation).
3. **Step 3:** Update `src/features/voice/sfx.ts` & `src/app/api/content-dashboard/sfx/route.ts` (hyped trending audio generation).
4. **Step 4:** Update `src/features/reel/composer.ts` (compile transitions, effects, Ken Burns motion, kinetic text).
5. **Step 5:** Update `src/features/reel/executor.ts` (handle dynamic clip joint IDs and overlay tracks).
6. **Step 6:** Update `src/app/api/reel/generate/route.ts` (pass style and assets to composer).
7. **Step 7:** Update `src/app/workspace/[id]/workspace-client.tsx` (add Reel Style dropdown UI).
8. **Step 8:** End-to-end verification and MP4 render check.

---

🔹 SPEC.MD READY. Review the document above. Reply 'APPROVE' to proceed with implementation, or 'REVISE: [specific feedback]' for updates.

