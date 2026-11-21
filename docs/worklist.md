# Worklist — MySocialMediaInfluencer

## Phase 1 (current)

- [x] AI provider module (types, schemas, presets, OpenAICompatibleProvider, in-memory store)
- [x] Settings API (GET/PUT)
- [x] Brand Brain panel + API
- [x] Ad Generation Panel (manual + AI via `/api/ad-variants/generate`)
- [x] Content Calendar Panel + API
- [x] Competitor "Steal & Beat" research module (research → create → approve)
- [x] Beat → ad variant route (`POST /api/research/[id]/beats`)
- [x] Remove stray `docs-design.md` (duplicate of `docs/design-my-social-media-influencer.md`)
- [x] Angle-variant batch generation: `/api/ad-variants/generate` accepts `angles[]`, one variant per angle per request (verified against LM Studio `ornith-1.5-9b`)
- [x] Provider structured output: `json_schema` → `text` fallback chain (LM Studio rejects `json_object`); defaults → `http://127.0.0.1:1235/v1` + `ornith-1.5-9b`
- [x] MCP server (`@modelcontextprotocol/sdk`, Streamable HTTP at `/mcp`) with tools: `generate_ad_variant`, `generate_content_calendar`, `research_competitor`, `score_creative` (verified: initialize, tools/list, tools/call with live model)
- [x] UI redesign: animated hero (gradient shimmer, glow orbs, staggered rise), glass cards, `prefers-reduced-motion` safe; removed Brand Brain / Meta Ad Generation / Generate with AI / Steal & Beat / Content Calendar panels from UI (APIs + MCP kept). Verified 390/1024/1440: 0 horizontal overflow, 0 clipped elements.

## Phase 2 (planning)

- [ ] Scheduling/publishing (port from postiz-cheap)
- [ ] Promotion assistant patterns
- [ ] LinkedIn ads support

## Quality gates (run after every change)

- `npm run lint` ✓
- `npx tsc --noEmit` ✓
- `npm run build` ✓
