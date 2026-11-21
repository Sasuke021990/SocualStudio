# MySocialMediaInfluencer

AI-powered social media content studio. Generate Instagram-ready posts with local AI models — captions, images, voice-overs, and sound — then export everything to a workspace folder for manual publishing.

**Phase 1** covers content generation, brand intelligence, and an approval workflow. Everything runs locally on your machine: your models, your GPU, your data.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Workflow](#core-workflow)
- [Step 1 — AI Provider](#step-1--ai-provider)
- [Step 2 — Project / Brand](#step-2--project--brand)
- [Step 3 — Generate (Content Dashboard)](#step-3--generate-content-dashboard)
- [Workspace Page](#workspace-page)
- [Approved Page](#approved-page)
- [GPU Management](#gpu-management)
- [Data & Persistence](#data--persistence)
- [API Reference](#api-reference)
- [MCP Server](#mcp-server)
- [Architecture](#architecture)
- [Quality Gates](#quality-gates)
- [Tech Stack](#tech-stack)

---

## Quick Start

```bash
cd mmsi
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

**Prerequisites (for full features):**
- **LM Studio** or **Ollama** running locally (AI text generation) — default: `http://127.0.0.1:1235`
- **ComfyUI** running with `--enable-cors-header` (image generation) — default: `http://127.0.0.1:8188`
- **audio.cpp** (`audiocpp_cli.exe`) + Ming-3.0-TTS GGUF (voice & sound) — bundled under `data/`
- **ffmpeg** (optional, was used for video composition)

---

## Core Workflow

```
Step 1: AI Provider + Workspace + Voice + ComfyUI
            ↓
Step 2: Project / Brand (AI extracts brand profile → {BrandName}.md)
            ↓
Step 3: Content Dashboard (pick template & goal → generate 5 posts)
            ↓
Draft Insta Posts (edit in workspace page)
            ↓
Approved (review → export workspace folder)
            ↓
Manual publish to Instagram
```

---

## Step 1 — AI Provider

Configuration sections, in order:

### 1. AI Provider
- **Providers:** LM Studio (local), Ollama (local), OpenAI, Custom (any OpenAI-compatible endpoint)
- **Model dropdown** — lists all models from the connected server live (29+ from LM Studio)
- "Save and continue" advances to Step 2

### 2. Workspace
- Choose the folder where exported posts are saved (default: `exports/` inside the project)
- Each export creates a subfolder with separate media/text files

### 3. Voice Setup
- **Clone your voice** — upload a WAV/MP3 sample → Ming-3.0-TTS clones it (reference audio)
- **5 preset voices** — Warm Narrator, Energetic Host, Professional, Friendly Casual, Storyteller (voice-design mode)
- ▶ Test buttons play samples inline (one audio plays at a time)

### 4. ComfyUI Image Generation
- **Multiple connections** (name + URL + workflow each) — one active at a time
- Upload `API.json` workflow (exported from ComfyUI via "Save (API Format)")
- Test Connection checks `/system_stats`
- Set Active switches which instance generates images

---

## Step 2 — Project / Brand

- **Project list** — existing brands + "New Brand" button
- **Create New Brand** — three intake modes:
  - 🌐 Website URL — scrapes the page content
  - ✏️ Paste Text — marketing copy, about pages, descriptions
  - 📄 Upload File — TXT, MD, DOCX, PDF
- **AI extraction** — animated progress → structured brand profile:
  business, industry, USP, tone/voice, audience pains/desires, benefits, key messages, words to use/avoid, competitors, visual style
- **Editable review** — every field editable (text fields + tag editors for arrays) before saving
- **Saved** as `data/brands/{project-id}/{BrandName}.md` — isolated per project

---

## Step 3 — Generate (Content Dashboard)

### Stats
Total · Drafts · Approved · Published (live counts for selected brand)

### Content Templates (15)
| Platform | Templates |
|----------|-----------|
| Instagram | Post, Reel, Story |
| Facebook | Post, Reel, Story |
| LinkedIn | Post, Article |
| X / Twitter | Post |
| YouTube | Short, Video |
| TikTok | Video |
| Email | Campaign |
| Website | Blog Post |
| Meta / Google | Ad Copy |

### Goal Types (25)
Launch · Reach · Engagement · Sales/Promo · Education · Storytelling · Meme/Humor · UGC · Behind the Scenes · Before/After · Testimonial · Giveaway · Trend/Challenge · Influencer Collab · Seasonal · Carousel/Tips · Poll · Quote/Motivation · Announcement · Hot Take · Caption This · Myth vs Fact · Countdown/Teaser · Would You Rather · **Custom** (manual description)

Preset goals: click → Generate immediately. Custom goal: describe what you want → Generate.

### Generation Pipeline (per variation)
1. **Phase 1 — Caption**: engagement-optimized copy + hashtags + CTA (streamed live via SSE)
2. **Phase 2 — Image concept**: 8-point photo brief derived FROM the caption (subject, setting, lighting, colorPalette, style, composition, mood, technical) — schema-validated with auto-retry, plus **sound description** matched to the caption

Every variation is previewed as a **real Instagram post card** (profile row, square image, like/comment/share bar, caption, hashtags, CTA button).

### Per-post tools
- 🎨 **Generate Image** — sends the 8-point brief to ComfyUI (image tool selector), shows real image in card
- 🎙️ **Voice-over** — Ming TTS speaks the caption (voice dropdown: clones + presets)
- 🎵 **Generate Sound** — MOSS-SoundEffect creates a sound bed from the post's stored sound description
- **Stop** button — aborts generation instantly (completed variations stay visible)
- **Image tool radios** — pick which ComfyUI instance generates

### Saving
Select posts → "Save N Selected Posts" → appear in **Draft Insta Posts** (with all generated media).

---

## Workspace Page

Click any draft post → `/workspace/{id}` — full-page editor:

- **Left:** Instagram post preview (image, caption, hashtags, CTA, audio players)
- **Right:** Media Tools (image tool, generate image, voice-over, generate sound) + Edit Post (caption, hashtags chips, CTA, sound description)
- **💾 Save** persists all changes (text + media references)
- **✓ Mark as Approved** → moves to Approved section, returns to dashboard

Back navigation returns to Step 3.

---

## Approved Page

Click any approved post → `/approved/{id}`:

- **Sidebar** — all approved posts, click to switch
- **Main** — Instagram post preview with saved media
- **📁 Export Workspace Folder** → creates `{workspace}/{Post-Name}/`:
  - `image.png` — post image
  - `voice.wav` — voice-over
  - `sound.wav` — sound bed
  - `caption.txt` — caption + hashtags + CTA (copy-paste ready)
  - `README.md` — file guide + image concept + sound description

Post manually to Instagram from your own app/browser.

---

## GPU Management

Automatic VRAM handoff between AI engines — no manual model unloading needed:

| Action | GPU handoff before running |
|--------|---------------------------|
| Any LLM call (posts, brand extraction, sound descriptions) | Frees **all** ComfyUI instances (`POST /free` on each) |
| Image generation (ComfyUI) | Unloads the local LLM (LM Studio: `POST /api/v1/models/unload` per instance; Ollama: `keep_alive: 0`) |
| Voice / sound generation (audio.cpp) | Frees all ComfyUI + unloads the LLM |

All handoffs are best-effort — a failure never blocks generation.

**Playback:** only one audio plays at a time (global coordinator pauses others).

---

## Data & Persistence

Everything survives server restarts:

| Data | Location |
|------|----------|
| Brand profiles | `data/brands/{project}/{BrandName}.md` |
| Saved posts (draft/approved) | `data/content/items.json` |
| ComfyUI connections | `data/comfyui/connections.json` |
| Workspace setting | `data/workspace.json` |
| Voice profiles | `data/voice/voices.json` + `data/voice/references/` |
| Generated audio | `data/voice/tts/`, `data/voice/sfx/` |
| AI models | `data/models/` (Ming TTS, MOSS) |
| audio.cpp runtime | `data/audiocpp/vulkan/` |

Posts are grouped by **brand name** — stable across sessions and restarts.

---

## API Reference

### Settings & AI
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings` | GET/PUT | AI provider config |
| `/api/ai/models` | GET | List models from provider |
| `/api/ai/generate` | POST | SSE streaming chat |

### Brand
| `/api/brand-brain` | GET/POST | List/create brands |
| `/api/brand-brain/projects` | GET | All saved brand projects |
| `/api/brand-brain/extract` | POST | AI brand extraction (URL/text) |
| `/api/brand-brain/save` | POST | Save brand profile → .md |
| `/api/brand-brain/[id]` | GET | Brand detail |

### Content Dashboard
| `/api/content-dashboard` | GET/POST/PATCH | Posts: list/create/update (content + status) |
| `/api/content-dashboard/generate` | POST | SSE batch generation (5 variations) |
| `/api/content-dashboard/sfx` | POST | Sound generation (MOSS) |
| `/api/content-dashboard/export-folder` | POST | Export workspace folder |

### Voice
| `/api/voice` | GET/POST/DELETE | Voice profiles (presets + clones) |
| `/api/voice/generate` | POST | TTS generation (Ming) |
| `/api/voice/audio` | GET | Serve audio files |

### ComfyUI
| `/api/comfyui` | GET/POST/PUT/PATCH/DELETE | Connections: list/add/test/activate/remove |
| `/api/comfyui/generate` | POST | Image generation |
| `/api/comfyui/image` | GET | Image proxy (CORS fix) |

### Workspace
| `/api/workspace` | GET/POST | Workspace folder config |

### Research & Ads
| `/api/research/*` | GET/POST/PATCH | Competitor research workflow |
| `/api/ad-variants/*` | GET/POST | Ad variant generation |
| `/api/content-calendar/*` | GET/POST | Content calendar |

---

## MCP Server

Streamable HTTP endpoint at `/mcp` — connect MCP clients for external tool access.

**Tools:**
- `generate_ad_variant` — paid-social ad variants per angle
- `generate_content_calendar` — scheduled post drafts
- `research_competitor` — competitor research entries
- `score_creative` — creative quality scoring

All tools accept optional `brandBrainId` for brand context.

---

## Architecture

**Next.js 16 (App Router)** modular monolith — features isolated under `src/features/`:

```
src/
├── app/                      # Routes (pages + API)
│   ├── page.tsx              # Home (3-step studio)
│   ├── workspace/[id]/      # Post editor page
│   ├── approved/[id]/       # Approved review + export page
│   └── api/                  # REST endpoints
├── features/
│   ├── ai-provider/          # OpenAI-compatible client, streaming, structured output
│   ├── brand-brain/          # Brand extraction + .md file storage
│   ├── content-dashboard/    # Templates, goals, generation, posts
│   ├── voice/                # Ming TTS + MOSS sound, voice cloning
│   ├── comfyui/              # Multi-connection image generation
│   ├── workspace-config/     # Export folder settings
│   ├── mcp/                  # MCP server (4 tools)
│   ├── ad-generation/        # Ad variants (API + MCP)
│   ├── competitor-research/  # Research workflow (API + MCP)
│   └── content-calendar/     # Calendar (API + MCP)
```

**Key patterns:**
- SSE streaming for all generation (no long-poll drops)
- Zod schema validation with auto-retry for structured LLM output (`json_schema` → `text` fallback)
- Deterministic prompt assembly (image concepts built field-by-field)
- Two-phase variation generation (caption → image concept + sound from caption)
- Best-effort GPU handoffs everywhere

---

## Quality Gates

Run after every change:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript
npm run build       # Production build
```

All three must pass green.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4.6 (App Router, React 19, Turbopack) |
| Styling | Tailwind CSS 4 (custom design system: glass cards, gradient tokens, motion) |
| Language | TypeScript 5.9 |
| AI text | LM Studio / Ollama / OpenAI-compatible (user's choice) |
| Images | ComfyUI (workflow-based, multi-instance) |
| Voice | Ming-3.0-TTS-0.5B Q8 (audio.cpp, Vulkan — AMD GPU tested) |
| Sound | MOSS-SoundEffect v2 Q8 (audio.cpp, Vulkan) |
| Validation | Zod 4 |
| MCP | @modelcontextprotocol/sdk 1.32 |
| Persistence | File-based (JSON + Markdown + media files) |

---

## License

Private project. Third-party model licenses apply to their respective weights (Ming TTS: MIT, MOSS: Apache-2.0, audio.cpp: MIT).
