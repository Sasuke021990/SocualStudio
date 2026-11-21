# MySocialMediaInfluencer — Implementation Plan

**Created:** 2026-11-21
**Status:** In progress — Phase 0

## Phase 0 — Foundation (current)

- Scaffold Next.js 16 full-stack project (App Router, React 19, TS, Tailwind, ESLint, Prettier).
- Structure: `src/app/` (pages, api routes), `src/features/<feature>/`, `src/lib/`, `prisma/`.
- Base layout, navigation shell, health check.

## Phase 1 — AI content generation core

- `ai-provider` module: OpenAI-compatible client factory (LM Studio / Ollama / OpenAI / custom), presets, streaming, retries, zod validation, settings API.
- `brand-brain`: URL intake → extraction → structured fields → version history → clients.
- `ad-generation`: Meta FB+IG angle variants (pain/desire/social proof) + char limits; Content Calendar; Competitor research/"Steal & Beat"; Approval workflow.

## Phase 2 — Publishing & MCP

- Scheduling module (postiz-cheap port), publishing orchestration (MuAPI-style), bandit/funnel (promotion-assistant port).
- MCP server (`/mcp` Streamable HTTP) exposing `generate_ad_variant`, `generate_content_calendar`, `research_competitor`, `score_creative`.

## Phase 3 — Platform expansion

- LinkedIn ads, Google (deferred), TikTok/X/YouTube as needed.

## Quality gates

- `lint`, `build` must pass after each phase.
- Mandatory validation after every code change (lint-and-validate skill).
