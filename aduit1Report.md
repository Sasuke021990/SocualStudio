# Comprehensive UI & Frame Architecture Audit Report (Audit 1)

**Date:** 2026-11-23  
**Status:** Audit Completed — Awaiting Implementation Approval  
**Project:** Social Studio (`mysocialmediainfluencer`)  
**Target Files Inspected:**  
- `src/app/workspace/[id]/workspace-client.tsx`
- `src/features/content-dashboard/components/InstagramPostCard.tsx`
- `src/app/approved/[id]/approved-client.tsx`
- `src/features/reel/composer.ts`
- `src/features/reel/schemas.ts`

---

## 1. Executive Summary

A critical visual defect was identified in the Workspace Editor where generated Instagram Reels appear "half shown" or cropped, desktop video controls obstruct on-screen subtitles, and action buttons clash directly over playback scrubbers. 

This audit analyzes the root causes of the defect from the screenshot, audits every content frame type across the platform (**Post**, **Reel**, **Story**, **Carousel**), and defines the exact architectural blueprint to render reels inside an authentic, interactive smartphone frame when played.

---

## 2. Deep-Dive Screenshot Defect Analysis

### Defect 1: Viewport Height Overflow (The "Half-Shown" Reel Bug)
* **Code Location:** `src/app/workspace/[id]/workspace-client.tsx` (Lines 413–426)
* **Root Cause:**
  - The left column sets a static `maxWidth: 420px`.
  - When `cardView === "reel"`, the container switches to `aspect-[9/16]`:
    $$\text{Video Height} = 420\text{px} \times \frac{16}{9} \approx 746.6\text{px}$$
  - The page stacks standard Instagram feed elements above and below this 746px video:
    - Top header with brand avatar & handle: $\approx 50\text{px}$
    - Feed interaction bar (Heart, Comment, Share, Bookmark): $\approx 45\text{px}$
    - Caption text block (`handle + caption`): $\approx 100\text{–}150\text{px}$
    - Hashtags list: $\approx 40\text{px}$
    - Gradient CTA pill button: $\approx 50\text{px}$
  - **Total Card Height:** $\mathbf{\approx 1,030\text{px} - 1,080\text{px}}$.
* **Result on Screen:** On standard 1080p desktop monitors (effective browser viewport height $\approx 850\text{px}$ after OS taskbar and browser chrome), the bottom 30%–45% of the card is cut off below the screen fold. The user only sees the upper half of the reel unless they scroll down.

---

### Defect 2: Desktop Video Controls Obstructing Subtitles
* **Code Location:** `src/app/workspace/[id]/workspace-client.tsx` (Line 446) & `src/features/reel/composer.ts` (Lines 136–150)
* **Root Cause:**
  - The video element is rendered with the native HTML5 `controls` attribute:
    ```tsx
    <video controls src={`/api/reel/file?item=${id}`} className="absolute inset-0 h-full w-full object-cover" />
    ```
  - Browsers (Chrome, Edge) render a thick black translucent media transport bar ($\approx 48\text{px}$ tall) with play/pause, timecode (`0:00 / 0:15`), seek slider, volume control, and full-screen icons.
  - In `composer.ts`, OpenReel subtitle cues are styled with:
    ```typescript
    safeMargin: spec.captions.safeMargin // defaults to 0.06 (6%)
    ```
  - On a $1920\text{px}$ vertical render, a $6\%$ margin places the subtitle text only $\approx 115\text{px}$ from the absolute bottom.
* **Result on Screen:** The browser's native desktop scrub bar sits directly on top of the rendered subtitle (`"Stop paying ₹1 lakh/month for AI"`), rendering it completely unreadable.

---

### Defect 3: Floating Button Superimposition ("Regenerate Image" Collision)
* **Code Location:** `src/app/workspace/[id]/workspace-client.tsx` (Lines 467–474)
* **Root Cause:**
  - The "Generate Image" / "Regenerate Image" button is rendered unconditionally inside the media container:
    ```tsx
    <button className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold ...">
      {generatingImage ? "Generating image..." : image ? "Regenerate Image" : "Generate Image"}
    </button>
    ```
* **Result on Screen:** When `cardView === "reel"`, this white pill button is layered directly over the video scrubber timeline, blocking interaction and creating severe visual clash.

---

### Defect 4: Horizontal Slicing & Edge Clipping (`object-cover`)
* **Code Location:** `src/app/workspace/[id]/workspace-client.tsx` (Line 448)
* **Root Cause:**
  - `<video ... className="... object-cover" />` forces the video to zoom and crop if container aspect ratio deviates from the video stream aspect ratio.
* **Result on Screen:** In the attached screenshot, the right edge of the green neon graphic (`huggingface_hub i / AutoModel`) is visibly sliced off on the right margin.

---

### Defect 5: Architectural Category Error (Feed Post Card vs Reel Player)
* **Root Cause:**
  - A vertical 9:16 Reel is being forced into a **Feed Post card container** (white rectangular box with feed post icons underneath).
  - In real mobile applications, Instagram Reels and Stories are **full-bleed immersive mobile experiences**, not white feed cards with bookmark buttons underneath.

---

## 3. Platform-Wide Frame Audit (All Types)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FRAME TYPE ARCHITECTURE MATRIX                           │
├────────────────────┬──────────────┬──────────────┬─────────────────────────────────────┤
│ Format Type        │ Target Ratio │ Native Media │ Framing Shell                       │
├────────────────────┼──────────────┼──────────────┼─────────────────────────────────────┤
│ 1. Feed Post       │ 1:1 or 4:5   │ Still Image  │ Instagram Feed Card (Header+Actions)│
│ 2. Reel / Short    │ 9:16         │ MP4 Video    │ Smartphone Shell (Bezel + Overlays) │
│ 3. Story           │ 9:16         │ Image/Video  │ Smartphone Shell (Segmented Bars)   │
│ 4. Carousel        │ 1:1 or 4:5   │ Multi-Image  │ Feed Card with Pagination Dots      │
└────────────────────┴──────────────┴──────────────┴─────────────────────────────────────┘
```

### 1. Instagram Feed Post (`instagram-post`, `facebook-post`, `linkedin-post`)
* **Current State:** Implemented as a square white card in `workspace-client.tsx` and `InstagramPostCard.tsx`.
* **Missing Features:**
  - Currently hardcoded to `aspect-square` (1:1, $1024 \times 1024$).
  - Does not support portrait 4:5 ($1080 \times 1350$), which is the highest-engagement format on modern Instagram.

### 2. Instagram Reel (`instagram-reel`, `facebook-reel`, `youtube-short`, `tiktok-video`)
* **Current State:** Broken. Rendered as a stretched 9:16 video stuffed into a white feed card, using desktop browser controls.
* **Requirements for Realistic Mobile Playback:**
  - Must render inside a **curved smartphone chassis** (iPhone / Android bezel).
  - Must auto-scale responsively so the entire phone fits in the desktop viewport without vertical scrolling ($max\text{-}h \le 720\text{px}$).
  - Must use **Instagram-native overlays** (Right action rail: Like, Comment, Share, More, Audio vinyl disc).
  - Must have **tap-to-play/pause** with centered animated play/pause indicator.
  - Zero desktop browser controls (`controls={false}`).

### 3. Instagram Story (`instagram-story`, `facebook-story`)
* **Current State:** Completely missing. The app categorizes stories under `types.ts`, but renders them as standard feed posts with feed heart/comment bars.
* **Requirements for Story Framing:**
  - Smartphone frame with **top segmented progress bars** (3 segments for 3-part stories).
  - Top header: Account avatar, handle, time indicator (`"2h"`), and close button (`✕`).
  - Bottom bar: Rounded `"Send message..."` input pill with heart and direct message paper airplane.

### 4. Approved Hub Detail (`src/app/approved/[id]/approved-client.tsx`)
* **Current State:** Lines 162–172 only check `v?.generatedImage` in an `aspect-square` container.
* **Defect:** If an approved post contains a generated Reel, the video is **100% invisible** in the Approved Posts view.

---

## 4. Real Mobile Device Playback Blueprint

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTPHONE MOCKUP FRAME                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [···]                Dynamic Island             🔋 98%  │   │
│   │                                                         │   │
│   │  Reels ▾                              🔊 Sound Toggle   │   │
│   │                                                         │   │
│   │                                                         │   │
│   │                         [ ▶ ]                           │   │
│   │                (Tap-to-Play Indicator)                  │   │
│   │                                                         │   │
│   │                                          🤍 24.8K       │   │
│   │                                             Like        │   │
│   │                                          💬 842         │   │
│   │                                             Comment     │   │
│   │                                          ✈️ 1.9K        │   │
│   │                                             Share       │   │
│   │                                          ⋮  More        │   │
│   │                                                         │   │
│   │                                          💿 Rotating    │   │
│   │                                             Audio Vinyl │   │
│   │                                                         │   │
│   │   [SUBTITLE SAFE ZONE: 20% From Bottom]                 │   │
│   │   "Stop paying ₹1 lakh/month for AI"                    │   │
│   │                                                         │   │
│   │   @huggingface · Follow                                 │   │
│   │   POV: your startup finally ships AI without the bill…  │   │
│   │   🎵 Original Audio - huggingface                       │   │
│   │   ───────────────────────────────────────────────────   │   │
│   │   ━━━●────────────────────────── (2px Micro Scrubber)   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                     [ Home Indicator Bar ]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Essential Interactive Behaviors:
1. **Interactive Tap-to-Play/Pause:**
   - Clicking anywhere on the video toggles playback smoothly.
   - Triggers an animated glass play/pause icon in the center that fades out in $250\text{ms}$.
2. **Audio State Control:**
   - Small floating sound badge in top-right corner (`🔊` / `🔇`) toggles mute/unmute with a single click.
3. **Rotating Audio Disc:**
   - Bottom-right vinyl record graphic spins continuously while video plays, and pauses when playback is paused.
4. **Micro Scrubber:**
   - Replaces the ugly desktop browser transport with an ultra-thin $2\text{px}$ progress line at the very bottom.
5. **Subtitle Safe Zone Elevation:**
   - In `composer.ts`, `safeMargin` must be adjusted from `0.06` to `0.20`.
   - On a $1080 \times 1920$ video, this raises subtitles to $\approx 384\text{px}$ above the bottom, ensuring they float cleanly above the `@username`, caption, and audio marquee.

---

## 5. Proposed Implementation Roadmap (For Approval)

### Phase 1: Reusable `MobileDeviceFrame` & `ReelPlayer` Component
* **New File:** `src/components/preview/MobileDeviceFrame.tsx`
  - Encapsulates realistic smartphone bezel (outer shell, camera notch / dynamic island, home bar).
  - Constrains height via `max-h-[min(720px,78vh)]` and `aspect-[9/16]` so the full phone and all controls fit on screen without vertical scrolling.
* **New File:** `src/components/preview/ReelPlayer.tsx`
  - Replaces native `<video controls>` with custom tap-to-play, volume pill, micro-scrubber, right-side interaction rail, and rotating vinyl disc.

### Phase 2: Refactor Workspace Editor (`workspace-client.tsx`)
* **File:** `src/app/workspace/[id]/workspace-client.tsx`
  - When viewing **Image/Post**: Render standard Instagram Feed Card.
  - When viewing **Reel**: Switch left column to the new `MobileDeviceFrame` + `ReelPlayer`.
  - Remove "Regenerate Image" floating button from inside the video frame. Move image/reel regeneration buttons to the right-hand **Media Tools** sidebar panel where they belong.

### Phase 3: Elevate Subtitle Safe Margin (`composer.ts`)
* **File:** `src/features/reel/composer.ts`
  - Update `spec.captions.safeMargin` default to `0.20` ($20\%$).
  - Subtitles generated by OpenReel will render in the clear lower-middle zone, completely avoiding overlap with phone overlays.

### Phase 4: Support Video in Approved Hub (`approved-client.tsx`)
* **File:** `src/app/approved/[id]/approved-client.tsx`
  - Add video detection: if `current.variation?.reel`, render the `MobileDeviceFrame` with the `ReelPlayer` in read-only mode instead of the blank square image placeholder.

---

## 6. Audit Conclusion & Sign-Off

The issues identified in the screenshot are fully diagnosed. The combination of viewport height overflow, desktop controls obstruction, button overlay clashing, and feed-card vs reel-shell mismatch can be solved with a clean, modular mobile preview architecture.

**As requested, no application code has been modified.** Review this audit report and reply with your feedback or instructions to begin implementation.

