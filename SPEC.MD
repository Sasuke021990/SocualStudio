# SPEC.MD: Production HotFix 2 & Sub-10s Image Optimization

## 1. ✅ Confirmed Requirements & Scope

1. **Post Generation Latency Optimization (HotFix 2)**:
   - Collapse Phase 1 (Caption) and Phase 2 (Image Concept + Sound Prompt) into 1 unified single-pass streaming call (`unifiedVariationSystemPrompt`).
   - Reduce LLM calls from 10 down to 5 (50% reduction in roundtrips).
   - Eliminate Coder model (`qwen2.5-coder-32b`) TypeScript syntax trap (`"caption": string`) with concrete mock JSON templates.
   - Target latency: ~60–65s (down from 144s).

2. **Strict No-Text / No-Logo Visual Policy**:
   - Eliminate in-image AI text boxes (e.g. `"Velivier CCT"`, `"Canmente"`) and fake branding logos (e.g. GitHub Octocat badge) as seen in user-reported screenshots.
   - Forbid text/logo instructions in LLM prompts.
   - Enforce `DEFAULT_NO_TEXT_NEGATIVE_PROMPT` across all ComfyUI generation endpoints and UI components.
   - Append `"clean composition, pure photography, no text, no watermark, no logo"` in `assembleImagePrompt`.

3. **Multi-Post Batch "Save Draft" Persistence**:
   - Fix bug in `template-client.tsx` where selecting multiple posts and clicking "Save" drops posts due to concurrent race conditions and non-string hashtag errors.
   - Implement `createManyContentItems` in `store.ts` for atomic single-transaction disk persistence.
   - Update `POST /api/content-dashboard` with resilient batch payload handling (`{ items: [...] }`).

4. **Authentic Indian Accent Voice Synthesis**:
   - Fix `getVoiceById(id)` in `src/features/voice/store.ts` to search `VOICE_PRESETS` first (previously only searched `s.cloned` and returned `null`).
   - Update all 5 Ming-TTS presets in `src/features/voice/types.ts` with explicit Indian English instructions (`印度英语口音 / Indian English accent`).
   - Automatically resolve Brand Brain `recommendedVoiceId` in `reel/generate/route.ts` when no voiceId is selected.

5. **Finalized ComfyUI Speed & Resolution Calibration Across All 4 Tools**:
   - **Z Image Turbo (`Zturbo`)**: 🏆 **High-Res Sweet Spot** — 8 steps, CFG 1, 1152×1152 (1.33 MP). Measured benchmark: **12.10s** (37% faster, high visual fidelity).
   - **Simple Qwen 2.1 (`Simple-qwen21`)**: ⚡ **Optimized (Sub-10s)** — 8 steps, CFG 1, 1024×1024 (1.00 MP). Measured benchmark: **9.08s** (75% faster / 4x speedup).
   - **Kera 2 (`keera2`)**: ⚡ **Optimized** — 8 steps, CFG 1, 1.00 MP (768×1360 / 1024×1024). Measured benchmark: **27.27s** (60% faster).
   - All configurations verified via live dry-run spike testing on AMD Radeon AI PRO R9700.

6. **Smart Reel Asset Reuse & Video Cache-Busting**:
   - When regenerating reels, check `data/reel/${itemId}` for existing storyboard images (`img0.png`, `img1.png`, etc.) and reuse them directly without re-triggering ComfyUI.
   - Append revision timestamps (`?item=${id}&t=${Date.now()}`) to video URLs and enforce `Cache-Control: no-cache, no-store, must-revalidate` in `/api/reel/file`.
   - Add `video.load()` on `src` change in `ReelPlayer.tsx`.

7. **Universal Mobile Device Frame Housing**:
   - House all generation previews (both Image Feed Post and Reel Video, before and after reel generation) inside `MobileDeviceFrame` in `/workspace/[id]` and `/approved/[id]`.
   - Provide seamless `Image | Reel` segmented toggle pill in the smartphone top bar.

8. **AI Provider & Schema Resilience**:
   - Upgrade `parseJsonObject` in `openai-compatible.ts` to strip `<think>`, `//` comments, and trailing commas.
   - Replace brittle `.refine` / `.superRefine` in `reel/schemas.ts` with `cleanCaption`.

---

## 2. 🛠 Tech Stack & Dependencies

- **Frontend**: Next.js 16.4.6 (App Router, Turbopack), React 19, Tailwind CSS, Lucide React icons.
- **Backend**: Node.js Next Route Handlers, Zod 3.x schema validation, Server-Sent Events (SSE).
- **AI Inference**:
  - LLM: LM Studio local endpoint (`http://127.0.0.1:1235/v1`, model `qwen2.5-coder-32b`).
  - Image Diffusion: ComfyUI local server (`http://127.0.0.1:8188`), WebSocket execution monitoring.
  - Video Composition: OpenReel CLI (`openreel-cli`).
  - TTS: Ming-TTS server (`http://127.0.0.1:8000`).
- **Hardware Profile**: AMD Radeon AI PRO R9700 (32GB VRAM, ROCm 7.1).

---

## 3. 📐 Architecture & Data Flow

```
[ Studio / Template Client ]
             │
             ▼
[ POST /api/content-dashboard/generate ] (Unified 5-Pass Streaming)
             │
   ┌─────────┴───────────────────────────────────────────────────────┐
   │ For Each Variation i (1 to 5):                                  │
   │  1. Prompt: Single-Pass Prompt with Concrete JSON Example       │
   │     - Strict rule: ZERO TEXT, NO LOGOS, NO COMPANY NAMES        │
   │     - Generates Caption, Hashtags, CTA, and Visual Brief        │
   │  2. Provider: parseJsonObject with relaxed cleaner              │
   │     - Strips <think>, // comments, trailing commas              │
   │  3. Stream Event: Immediately emits { variation: v }            │
   └─────────────────────────┬───────────────────────────────────────┘
                             │
     ┌───────────────────────┼────────────────────────┐
     │                       │                        │
     ▼                       ▼                        ▼
[ ComfyUI Image Gen ]   [ Batch Save Drafts ]   [ Generate / Regenerate Reel ]
(8 Steps, CFG 1, 1MP)        │                        │
     │                       ▼                        ▼
  < 10s Execution      [ Atomic Disk Write ]   [ Check Staging Images ]
  Pure Visual          Items saved in 1 shot    - Exists: REUSE (0s ComfyUI)
  No Text/Logos              │                  - Missing: generate fresh
     │                       ▼                  - Resolve Indian Voice Preset
     │             [ "Saved N drafts!" ]        - OpenReel composite (reel.mp4)
     │                                                │
     └───────────────────────┬────────────────────────┘
                             │
                             ▼
             [ Universal MobileDeviceFrame ]
               - View 1: Instagram Feed Post (Clean Photo + Caption)
               - View 2: 9:16 Video Reel (Synced Indian Audio + Subtitles)
               - Toggle: "Image | Reel" pill
```

---

## 4. 📁 File Structure & Module Breakdown

| Target File | Primary Responsibility |
| :--- | :--- |
| `data/comfyui/connections.json` | Calibrate finalized params: Zturbo (8 steps, 1152×1152 @ 1.33 MP), Simple Qwen (8 steps, 1024×1024 @ 1.0 MP), Kera 2 (8 steps, 1.0 MP). |
| `src/features/voice/store.ts` | Fix `getVoiceById(id)` to resolve from `VOICE_PRESETS` first. |
| `src/features/voice/types.ts` | Add authentic Indian English instructions (`印度英语口音`) to all 5 Ming-TTS presets. |
| `src/features/content-dashboard/variations.ts` | Export `DEFAULT_NO_TEXT_NEGATIVE_PROMPT`; sanitize prompt assembly. |
| `src/app/api/comfyui/generate/route.ts` | Enforce negative prompt blocking all text, watermarks, badges, and logos. |
| `src/features/content-dashboard/components/InstagramPostCard.tsx` | Pass negative prompt when calling ComfyUI generation. |
| `src/features/content-dashboard/store.ts` | Add `createManyContentItems` for atomic multi-item persistence. |
| `src/app/api/content-dashboard/route.ts` | Accept batch payload `{ items: [...] }` with resilient Zod schema. |
| `src/app/studio/[brainId]/[templateId]/template-client.tsx` | Replace sequential loop with single batch save call; handle `res.ok`. |
| `src/app/api/content-dashboard/generate/route.ts` | Implement unified single-pass streaming prompt (5 calls instead of 10) with strict no-text rule. |
| `src/features/ai-provider/openai-compatible.ts` | Add `<think>`, `//` comments, and trailing comma cleaner to `parseJsonObject`. |
| `src/features/reel/schemas.ts` | Replace fragile `.refine()` / `.superRefine()` bounds with `cleanCaption`. |
| `src/app/api/reel/generate/route.ts` | Storyboard image reuse logic; cache-busted video URL; auto-resolve Indian voice ID. |
| `src/app/api/reel/file/route.ts` | Set `Cache-Control: no-cache, no-store, must-revalidate`. |
| `src/components/preview/ReelPlayer.tsx` | Add `video.load()` on `src` change. |
| `src/app/workspace/[id]/workspace-client.tsx` | Wrap both Image and Reel views in `MobileDeviceFrame` with toggle pill. |
| `src/app/approved/[id]/approved-client.tsx` | Wrap both Image and Reel views in `MobileDeviceFrame` with toggle pill. |

---

## 5. 🔌 API / DB Schema Changes

### `POST /api/content-dashboard`
Support both single and batch creations:
```typescript
const batchSchema = z.object({
  items: z.array(createSchema).min(1),
});
```

### `createSchema` Resilience
```typescript
hashtags: z.array(z.string()).or(
  z.array(z.any()).transform((arr) =>
    arr.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  )
).default([]),
imageConcept: z.record(z.string(), z.any()).optional().default({}),
```

---

## 6. 🧪 Testing Strategy

1. **Dry-Run Spike Verification (Completed)**:
   - Validated ComfyUI execution times on live GPU: Z Image Turbo (9.38s), Simple Qwen 2.1 (9.08s), Kera 2 (27.27s).
2. **Type Safety & Build Verification**:
   - Run `npx tsc --noEmit` across entire repository to ensure 0 TypeScript compilation errors.
3. **End-to-End Workflow Verification**:
   - Generate 5 variations: confirm 5 unified streaming cards arrive under ~65s without syntax parse failures.
   - Verify image generation: confirm zero text, zero badges, zero logos in generated visuals.
   - Batch save: select multiple cards and verify all appear in `items.json` without dropped records.
   - Reel generation & regeneration: verify Indian voice synthesis, storyboard reuse (0s image time on rerun), and immediate playback of newly rendered video.
   - Mobile frame check: verify `/workspace/[id]` and `/approved/[id]` display phone frame in both Image and Reel modes.

---

## 7. ⚠️ Risks, Edge Cases & Mitigations

| Risk / Edge Case | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| LLM ignores no-text rule and still describes text | Low | Med | Dual layer: System prompt forbids text AND `assembleImagePrompt` strips text cues + negative prompt explicitly blocks text/logos. |
| Ming-TTS preset missing on server | Low | High | `getVoiceById` falls back gracefully to `VOICE_PRESETS[0]` with Indian accent instruction attached. |
| OpenReel fails due to missing font/ffmpeg | Low | Med | Staging directory verifies all assets before invoking OpenReel CLI; fallback error logged clearly. |
| Mobile frame layout overflow on small screens | Low | Low | `MobileDeviceFrame` uses responsive scaling (`max-w-[380px] w-full`) with touch-friendly scroll containers. |

---

## 8. 💡 Proposed Implementation Steps

1. Update `data/comfyui/connections.json` (sub-10s calibration).
2. Update voice definitions in `src/features/voice/types.ts` & `src/features/voice/store.ts`.
3. Update negative prompts and image prompt assembly in `src/features/content-dashboard/variations.ts` & `/api/comfyui/generate/route.ts`.
4. Update `InstagramPostCard.tsx` image generation call.
5. Update atomic store persistence & route handling for batch save in `store.ts`, `/api/content-dashboard/route.ts`, and `template-client.tsx`.
6. Implement unified single-pass streaming in `/api/content-dashboard/generate/route.ts` & resilient JSON parsing in `openai-compatible.ts`.
7. Update reel generation routes (`reel/generate/route.ts`, `reel/file/route.ts`, `ReelPlayer.tsx`) for image reuse and cache-busting.
8. Wrap Image & Reel views inside `MobileDeviceFrame` in `workspace-client.tsx` and `approved-client.tsx`.
9. Run TypeScript verification (`npx tsc --noEmit`).

