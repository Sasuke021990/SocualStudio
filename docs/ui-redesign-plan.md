# Social Studio — UI/UX Redesign

Status: Design confirmed (brainstorming session, 2026-11-22)

## Understanding Summary

- Full UI/UX redesign of the app (renamed **Social Studio**): page-based navigation replaces the 3-step single page
- Driver: full rethink — workflow complexity, visual quality, usability
- User: personal tool, single user, local machine, desktop-only
- Backend features/APIs unchanged — presentation + navigation only

## Page Map

```
Landing → Projects (+ Create Brand) → Studio → Template Detail → Drafts → Workspace → Approved
                                                            ↘ Settings (gear icon, all pages except Landing)
```

| Page | Contents |
|------|----------|
| **Landing** | Animated hero, glowing centered "Open Studio", feature highlights (Brand AI, Images, Voice, Sound) |
| **Projects** | Brand card grid, + New Brand button, gear icon |
| **Create Brand** | Brand name + intake tabs (URL / Paste Text / Upload) → extraction animation → editable profile → Save & Open Studio |
| **Studio** | Brand chip top-center, "Create New Content", 15 template cards |
| **Template Detail** | 25 goal-type grid + back button; preset click → generation strip (topic + Create 5 Posts + tool selectors); Custom → textarea; generated IG cards stream in; Stop button; Save N to Drafts |
| **Drafts** | Post rows (title, brand chip, platform, date) → Workspace |
| **Workspace** | IG preview (left) + media tools/edit (right); Save + Mark as Approved |
| **Approved** | Post rows + 📁 Export Workspace Folder |
| **Settings** | AI Provider, Workspace, Voice Setup, ComfyUI sections |

## Navigation

- **Back pill** (top-left, all pages except Landing): `← {destination}` glass pill
- **Gear** (top-right, all pages except Landing): → Settings
- **Brand chip** (top-center, brand-scoped pages): brand name → Projects
- No nav bar, no sidebar

## Visual System (Command Center + Neo-Glass skin)

- Base `#0B0D12`, surface `#12151D`, border `#232838`
- Accent: electric indigo `#6366F1` (primary actions, active states only)
- Semantic: emerald approved / amber draft / rose destructive
- Typography: geometric sans (Inter/Geist), display 60/40/24, body 14
- Glass (backdrop-blur 12px) ONLY on floating pills, modals, hero panels
- One glow language: soft indigo outer glow on primary buttons + active nav
- Landing alone gets ambient gradient mesh + layered glass spectacle

## Motion (performance-first)

- Page enter: fade + 8px slide, 200ms, stagger 40ms (GPU transforms only)
- Hover: 150ms glow + 2px lift
- Signature: Landing "Open Studio" glow pulse (2.5s loop) — sole showpiece
- `prefers-reduced-motion` respected; CSS-only (no animation libs)

## Tooling

- Implementation via **ui-sdk** (@ui-sdk/core installed) + design skills
- **Qwen 2.1** is the primary image-generation tool (prompt-following fixed)

## AI Provider Behavior (revised)

- **Default: OpenAI** — base URL `https://api.openai.com/v1` pre-filled, API key field (real key required for cloud), models load automatically from the endpoint after saving
- **Also accepts Ollama / LM Studio base URLs** — user enters the URL (e.g. `http://localhost:11434/v1`, `http://127.0.0.1:1235/v1`) with **blank or dummy API key** — no real key needed for local servers
- Model dropdown always auto-populates from the connected endpoint's `/models` API (works for OpenAI, Ollama, LM Studio, custom OpenAI-compatible)
- Preset picker: OpenAI (default) / Ollama / LM Studio / Custom — presets pre-fill base URL and indicate whether a real key is required

## Assumptions

- Local single-user, no auth/multi-tenancy/cloud
- English only, desktop-only
- Existing APIs, GPU management, export flows, persistence all unchanged

## Decision Log

| # | Decision | Alternatives | Why |
|---|----------|-------------|-----|
| 1 | Page-based nav | keep 3-step wizard | Simpler mental model, user flow |
| 2 | Command Center + Neo-Glass skin | A/B/C pure | User pick after mockup review |
| 3 | Performance-first animations | rich animations | User constraint |
| 4 | Back pill + gear + brand chip nav | top bar / sidebar | "Minimal but attractive" |
| 5 | Name: Social Studio | old name | User rename |
| 6 | Qwen 2.1 primary image tool | Z Turbo | User instruction |
| 7 | Template click → dedicated goal page | inline expand | User flow |
| 8 | Separate Drafts + Approved pages | combined feed | User choice |
| 9 | Desktop-only | responsive | Confirmed |
| 10 | ui-sdk implementation | custom CSS | User instruction |
| 11 | AI Provider default = OpenAI URL + real key; Ollama/LM Studio accepted with blank/dummy key; models auto-load | LM Studio default (current) | User requirement change |

## Mockups (Z Turbo)

Saved in `F:\Real\MySocialMediaInfulancer\Posts`:
- `UI-A-Command-Center.png`, `UI-B-Editorial-Light.png`, `UI-C-Neo-Glass.png`
- `Page-1-Landing.png`, `Page-2-Settings.png`, `Page-3-Projects.png`, `Page-4-Studio.png`, `Page-5-InstagramPost-Templates.png`
