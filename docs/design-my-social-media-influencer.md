# MySocialMediaInfluencer — Design Document

**Created:** 2026-11-21
**Status:** Design validated → handoff to implementation
**Source repos referenced:** OpenAdKit (`IamRamgarhia/OpenAdKit-Open-Source-AI-Marketing-Tool`), promotion-assistant (`DaizeDong/promotion-assistant`), postiz-cheap (`SamurAIGPT/postiz-cheap`)

---

## 1. Understanding Summary (locked)

1. **Purpose:** Web app that generates and manages AI-driven social media marketing content for brands/influencers.
2. **Phase 1 scope (agreed):**
   - Content generation (A) + Research→Create→Approve workflow (C).
   - Features: Brand Brain, Meta ad copy generation (angle variants), Content Calendar, Competitor "Steal & Beat" research.
3. **Phase 2 (future):** Publishing/scheduling (B) — planned ports from postiz-cheap & promotion-assistant.
4. **Phase 1 platforms:** Meta (Facebook + Instagram) + LinkedIn; Google deferred.
5. **AI architecture:** Bring-your-own OpenAI-compatible endpoint — local LM Studio (`http://localhost:1234/v1`) or Ollama (`http://localhost:11434/v1`) or any OpenAI-compatible URL; user supplies base URL + optional key + model.
6. **Approach:** Greenfield codebase + selective ports; custom tools + MCP support from day one.

## 2. Assumptions

- Phase order: Phase 1 content-gen → Phase 2 scheduling/publishing.
- OpenAdKit is the primary source of Phase 1 feature ports.
- Local-AI-first for Phase 1; OpenAI endpoint integrated as BYOK.
- Google platform deferred.

## 3. Decision Log

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Phase 1 = content gen + research/create/approve; Phase 2 = publishing | All-in-one | User-staged choice |
| 2 | Platforms Phase 1 = Meta + LinkedIn (Google deferred) | Meta only / all | User choice |
| 3 | AI = BYOK OpenAI-compatible (LM Studio / Ollama / custom) | Native Ollama/LM Studio SDKs only | Flexibility, single code path |
| 4 | Forking = greenfield + selective ports | Start from OpenAdKit | User choice, lower risk |
| 5 | MCP + custom tools from day one | Phase 2 | User choice (option C) |

## 4. Final Design

### 4.1 Architecture
- **Next.js 16 full-stack** (App Router + React 19 + TS + Tailwind), confirmed.
- **Modular monolith** with feature modules under `src/features/<name>/`:
  - `ai-provider/` — OpenAI-compatible client factory (baseURL, key, model, streaming, retries, validation).
  - `brand-brain/` — URL intake → extraction → structured fields → version history → multi-client.
  - `ad-generation/` — Meta FB+IG angle variants (pain/desire/social proof) + char-limit validation; LinkedIn later.
  - `content-calendar/` — AI calendar, edit, approval states.
  - `research/` — competitor teardown + "Steal & Beat".
  - `approval/` — research→create→approve workflow.
- Phase 2 modules (later): scheduling (postiz-cheap), publishing + bandit (promotion-assistant).

### 4.2 AI Provider & MCP Design (confirmed)
- `AIProvider` interface; `OpenAICompatibleProvider` (baseURL + optional key + model); presets for LM Studio, Ollama, OpenAI, custom.
- Server-side execution; user supplies endpoint config in settings.
- Streaming completions (SSE), zod validation, retries, capability checks.
- MCP server via `@modelcontextprotocol/sdk` Streamable HTTP at `/mcp`; tools: `generate_ad_variant`, `generate_content_calendar`, `research_competitor`, `score_creative` (Phase 1.5). Custom tool registry as source of truth.

### 4.3 Data Model & Workflow (confirmed)
- Entities: `BrandBrain`, `AdVariant`, `CalendarItem`, `ResearchItem`.
- Workflow: `draft → approved` (Phase 1); Phase 2 adds scheduling/publishing state.
- Storage: Prisma + PostgreSQL (Postgres optional for local-first).

### 4.4 Error Handling (agreed)
- Local AI endpoint down → actionable error; API/auth failures; streaming aborts; validation retry.

### 4.5 Phase Roadmap
- **Phase 1:** scaffold + AI provider + Brand Brain + Meta ad gen + Content Calendar + Competitor research + approval + basic UI.
- **Phase 2:** publishing/scheduling, MCP polish, bandit/funnel (promotion-assistant), additional platforms (LinkedIn ads, Google).

### 4.6 Non-Functional Requirements (proposed defaults)
- Performance: streaming from local LLM (latency-tolerant UI).
- Scale: single-user/local-first Phase 1; small teams later.
- Security: user-side local endpoints; server-held remote keys; secrets out of source.

### 4.7 Risks
- Local LLM quality/compat; MCP SDK integration; porting effort; licensing (all MIT).

## 5. Implementation Handoff

Ready to set up for implementation — next step: scaffold the Next.js full-stack project with feature module structure, AI provider, and Phase 1 feature set.
