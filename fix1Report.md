# Fix 1 Report: Standardized ComfyUI Multi-Aspect Ratio Framework & Voice Duration Calibration (Solution C)

**Project:** My Social Media Influencer (MMSI)  
**Date:** November 23, 2026  
**Status:** Audit & Architecture Completed — Awaiting Implementation Approval  
**Target Files:**  
- `src/features/comfyui/generate.ts`
- `src/features/reel/planner.ts`
- `src/features/reel/composer.ts`
- `scripts/spike-openreel.js`

---

## 1. Executive Summary & Defect Diagnosis

During spike testing of the 15-second and 30-second Reels via OpenReel MCP, two critical visual and audio defects were identified from player screenshots:

1. **Horizontal Image Cropping ("images croper"):**
   - In Screenshot 1 (`00:00:07`), the glowing green badge (`huggingface_hub i / AutoModel`) was cut off on the right.
   - In Screenshot 2 (`00:00:15`), the woman was pointing into empty space with her head sliced in half on the right margin.
   - In Screenshot 3 (`00:00:23`), only her hands and cheek were visible on the far-right border, leaving 85% of the frame as empty beige wall.
2. **Voice Duration Mismatch:**
   - In the 15-second reel, the voiceover was 16.30s, causing the final sentence to be abruptly cut off at 15.0s.
   - In the 30-second reel, the voiceover was only 19.20s, resulting in **10.8 seconds of complete speech silence** from 19.2s to 30.0s where only background music played.

---

## 2. Root Cause Analysis

### A. The 68.4% Horizontal Image Crop
Inspection of the storyboard images in `C:\Users\Administrator\Videos\SocialStudio\spike-test` revealed:
```
img0.png -> 2560 x 1440 (16:9 Landscape Horizontal)
img1.png -> 2560 x 1440 (16:9 Landscape Horizontal)
img2.png -> 2560 x 1440 (16:9 Landscape Horizontal)
```

- Target Reel Frame: **9:16 Vertical ($1080 \times 1920$)**
- Provided Image: **16:9 Horizontal ($2560 \times 1440$)**
- When OpenReel applied `fitMode: "cover"`, it scaled the 1440px height to 1920px. That stretched the width to **$3,413\text{px}$** to fit a **$1,080\text{px}$** window.
- **Result:** **$2,333\text{px}$ ($68.4\%$ of the image!) was chopped off horizontally.** Only the center 31.6% was shown, slicing off anyone or anything positioned on the rule-of-thirds.

### B. Why Did ComfyUI Generate 2560×1440 Instead of 9:16 Vertical?
In `src/features/comfyui/generate.ts`, the `injectPrompt` function only checked for standard SDXL latent nodes:
```typescript
if (size && (ct.includes("EmptyLatentImage") || ct.includes("EmptySD3LatentImage"))) {
  if ("width" in node.inputs) node.inputs.width = size.width;
  if ("height" in node.inputs) node.inputs.height = size.height;
}
```
The active image generation tool **`Qwen2.1 Turbo`** does not use `EmptyLatentImage`. It uses a custom node called:
```json
Node 5: "AUSBOSS_NODES_Resolution" {"width": 2560, "height": 1440, "latent": "16ch", "batch_size": 1}
```
Because `AUSBOSS_NODES_Resolution` was not recognized, the pipeline defaulted to 2560×1440 landscape for every generation, causing severe horizontal cropping.

Furthermore, `Qwen2.1 Turbo` feeds prompt text through `Node 3: "AUSBOSS_NODES_Text"`, which was also not handled by `generate.ts`.

---

## 3. Forensic Node Graph Audit of All 4 ComfyUI Workflows

A forensic analysis of all 4 connections in `data/comfyui/connections.json` revealed their exact node structures:

| Tool Name | Prompt Injection Node | Size / Resolution Node | Output Save Node | Required Adapter Handling |
| :--- | :--- | :--- | :--- | :--- |
| **1. Z Image Turbo**<br>`ce10ebc0-...` | `Node 57:27`<br>`CLIPTextEncode` (`inputs.text`) | `Node 57:13`<br>`EmptySD3LatentImage`<br>(`width: 1024, height: 1024`) | `Node 9`<br>`SaveImage` | Override `inputs.width` and `inputs.height` directly. |
| **2. Kera 2**<br>`d137c4d6-...` | `Node 30:6` (`CLIPTextEncode`) & `Node 30:16` (`TextGenerate`) | `Node 49`<br>`ResolutionSelector`<br>(`aspect_ratio: "..."`) $\rightarrow$<br>`Node 30:5` `EmptyLatentImage` | `Node 29`<br>`SaveImage` | Update `inputs.aspect_ratio` on `ResolutionSelector` with the target string AND override `EmptyLatentImage`. |
| **3. Simple Qwen 2.1**<br>`dbee4427-...` | `Node 459:471` (`TextGenerate`) & `Node 459:452` (`TextEncodeQwenImage21`) | `Node 13`<br>`ResolutionSelector`<br>(`aspect_ratio: "1:1 (Square)"`) $\rightarrow$<br>`Node 459:456` `EmptyLatentImage` | `Node 461`<br>`SaveImageAdvanced` | Update `inputs.aspect_ratio` on `ResolutionSelector` with the target string. |
| **4. Qwen2.1 Turbo**<br>`9edec9db-...` | `Node 3`<br>`AUSBOSS_NODES_Text` (`inputs.text`) & `Node 39:24` (`TextEncodeQwenImage21`) | `Node 5`<br>`AUSBOSS_NODES_Resolution`<br>(`width: 2560, height: 1440`) | `Node 13`<br>`AUSBOSS_NODES_SaveImage` | Override `inputs.width` and `inputs.height` on `AUSBOSS_NODES_Resolution` AND inject prompt into `AUSBOSS_NODES_Text`. |

---

## 4. Standardized Universal Multi-Aspect Ratio Framework

We are standardizing a universal format mapping in `src/features/comfyui/generate.ts`:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             STANDARDIZED ASPECT RATIO MATRIX                                │
├───────────────┬──────────────┬──────────────────────────────┬───────────────────────────────┤
│ Format Target │ Pixel Size   │ ResolutionSelector String    │ Target Output Media           │
├───────────────┼──────────────┼──────────────────────────────┼───────────────────────────────┤
│ 1. Reel/Story │ 720 × 1280   │ "9:16 (Portrait Widescreen)" │ Vertical Reels, Shorts, Story │
│ 2. Feed Post  │ 1024 × 1024  │ "1:1 (Square)"               │ Standard Instagram Feed Post  │
│ 3. Portrait   │ 1024 × 1280  │ "4:5 (Portrait)"             │ High-Engagement Feed Post     │
│ 4. Landscape  │ 1280 × 720   │ "16:9 (Widescreen)"          │ Landscape Banner / YouTube    │
└───────────────┴──────────────┴──────────────────────────────┴───────────────────────────────┘
```

### Universal ComfyUI Adapter Logic:
1. **ResolutionSelector Detection:** Matches any node with `class_type === "ResolutionSelector"` or containing `aspect_ratio` in `inputs` and assigns the exact preset string (`"9:16 (Portrait Widescreen)"`, etc.).
2. **Custom Resolution Nodes:** Matches `AUSBOSS_NODES_Resolution` or any node with numeric `width` and `height` in `inputs` and updates them to the target pixel resolution.
3. **EmptyLatentImage Nodes:** Matches `EmptyLatentImage`, `EmptySD3LatentImage`, or any `*LatentImage*` node and overrides `width` and `height`.
4. **Universal Prompt Injection:** Matches `CLIPTextEncode*`, `TextEncodeQwen*`, `TextGenerate`, and `AUSBOSS_NODES_Text`, ensuring all 4 image generators receive the creative visual prompt.
5. **Seed Randomization:** Randomizes all seeds across all node types so every generated storyboard image is unique.

---

## 5. Solution C: Precise Voice Duration Calibration (15s & 30s)

To guarantee that spoken voice matches the exact video duration:

### A. Word Count & Cadence Calibration (`planner.ts`):
Speech synthesis naturally clocks at $\approx 2.6\text{ words/second}$.
- **15-Second Reel:** Script target calibrated to **38–42 words** ($\approx 14.5\text{s}$ spoken duration).
- **30-Second Reel:** Script target calibrated to **82–92 words** ($\approx 28.5\text{s}$ spoken duration).

### B. Dynamic Speed-Fitting Engine (`composer.ts`):
- Instead of hard-clipping audio at 15s or leaving 11s of silence at 30s, `composer.ts` computes:
  $$\text{Target Voice Duration } T_v = D - 0.5\text{s}$$
  $$\text{Speed Multiplier } S = \frac{\text{voiceSeconds}}{T_v}$$
- If $S$ is within $[0.85, 1.15]$, it applies `set_clip_speed: S` via OpenReel MCP.
- The voiceover naturally concludes **exactly 0.5 seconds before the reel ends**, followed by a clean emotional CTA and sound riser with zero cut-offs.

---

## 6. SPEC.MD (Implementation Specification)

### ✅ Confirmed Requirements & Scope
1. **ComfyUI Universal Adapter (`src/features/comfyui/generate.ts`):**
   - Handle all 4 tools (`Z Image Turbo`, `Kera 2`, `Simple Qwen 2.1`, `Qwen2.1 Turbo`).
   - Dynamic aspect ratio override for `9:16`, `1:1`, `4:5`, `16:9`.
   - Prompt injection into `AUSBOSS_NODES_Text`, `CLIPTextEncode`, `TextEncodeQwen`, `TextGenerate`.
2. **Solution C Voice Duration Calibration:**
   - Calibrate script word boundaries in `src/features/reel/planner.ts` (15s: 38–42 words, 30s: 82–92 words).
   - Speed-fit voiceover to finish at $D - 0.5\text{s}$ in `src/features/reel/composer.ts`.
3. **Spike Verification:**
   - Re-run spike generation to output 15s and 30s vertical reels with 0% horizontal cropping and complete speech coverage.

---

### 🛠 Tech Stack & Dependencies
- **ComfyUI:** Local API on `http://127.0.0.1:8188`.
- **Ming-TTS:** Local Vulkan CLI on AMD Radeon AI PRO R9700.
- **MOSS SFX:** Local Vulkan CLI for high-energy sound beds.
- **OpenReel MCP:** Local Node stdio server (`dist\mcp-shim\index.js`).

---

### 📁 File Structure & Implementation Sequence

| Step | Target File | Action |
| :---: | :--- | :--- |
| **1** | `src/features/comfyui/generate.ts` | Update `injectPrompt` to support `ResolutionSelector`, `AUSBOSS_NODES_Resolution`, and `AUSBOSS_NODES_Text`. |
| **2** | `src/features/reel/planner.ts` | Update narration word limits: 15s $\rightarrow$ 38–42 words; 30s $\rightarrow$ 82–92 words. |
| **3** | `src/features/reel/composer.ts` | Implement Solution C speed-fit and $D - 0.5\text{s}$ speech finish margin. |
| **4** | `scripts/spike-openreel.js` | Re-run spike test with native 9:16 vertical images and calibrated voice tracks. |

---

🔹 SPEC.MD READY. Review the document above. Reply 'APPROVE' to proceed with implementation, or 'REVISE: [specific feedback]' for updates.

