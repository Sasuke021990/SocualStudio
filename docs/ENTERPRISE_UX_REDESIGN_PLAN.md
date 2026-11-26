# Enterprise-Grade UX Redesign — Social Studio (mmsi)

Status: Draft — awaiting approval
Date: 2026-11-26
Scope decision: **Enterprise-grade polish**, not enterprise-grade product. Stays single-user, local-first, desktop. No auth, no multi-tenancy, no server-side accounts — the entire AI pipeline (ComfyUI, LM Studio, Ming-TTS) runs on one machine's GPU, which a multi-tenant model would contradict. "Enterprise grade" here means: looks, behaves, and holds together like a polished commercial SaaS product, with full accessibility and zero rough edges — not that it serves a team.

## 1. Why this doc exists

Two audits already ran on 2026-11-22 (`docs/UI_UX_AUDIT_REPORT.md` + `UI_UX_FIX_CHECKLIST.md`, and `docs/APPLICATION_EXPERIENCE_AUDIT.md` + `APPLICATION_AUDIT_CHECKLIST.md` + `APPLICATION_UX_IMPROVEMENT_PLAN.md`). Neither has been executed against — this doc verifies both against the current codebase (2026-11-26), merges them into one backlog, removes what's already fixed, and adds the new enterprise-polish work (design system, new components, IA cleanup) that neither audit covers.

## 2. Verified current state (re-checked line-by-line against live code — this superseded an earlier draft of this doc that trusted the Nov 22 audits too literally)

**The two Nov 22 audits are almost entirely stale.** Direct code inspection on 2026-11-26 found nearly every cataloged issue already fixed, quietly, sometime in the last 4 days — likely folded into other work. Confirmed fixed, with evidence:
- Primary button contrast — `.btn-primary` uses `#4f46e5`, comment confirms WCAG 2.2 SC 1.4.3 verified.
- Per-route page titles — root `layout.tsx` has a `title.template`.
- Branded 404 — `src/app/not-found.tsx` exists.
- Back pill can't exit the app — `BackPill` always uses a fixed logical-parent `href` (deliberate, per its own comment).
- "Insta" → "Instagram" — zero bare "Insta" strings left in `src`.
- `aria-current` on the Settings gear — present.
- Delete-brand accessible name — `DeleteBrandDialog`'s trigger already renders `aria-label={`Delete ${brandName}`}`. Fully resolved, not partial.
- Save-status live regions — `role="status" aria-live="polite"` already present in `ProviderSettingsForm`, `ComfyUISetup`, `McpSetup`, `VoiceSetup`, `WorkspaceSetup`, and both generation screens.
- "Post not found" recovery — already has an explanation line plus 3 exit links (Dashboard, Your Brands, Approved Posts).
- Landing CTA — already reads "Choose a Brand" → `/projects` (true to destination) with a second "Dashboard" CTA; the stale "Open Studio" wording doesn't exist on landing at all (it exists, correctly, as a Brand-page button that opens *that brand's* studio).
- Landing stats — already computed from `CONTENT_TEMPLATES.length` / `CONTENT_GOALS.length` / `VOICE_PRESETS.length`, not hardcoded.
- Dashboard H1 — plain "Dashboard", no "Command Dashboard" jargon anywhere in `src`.
- `/approved/[id]` sidebar nav — already `router.push`, not `router.replace`.
- Brand card on `/projects` — one clear primary click target (the full card, flex-1, with a trailing chevron) plus one small explicit secondary text link labeled "Brand page". Not a dual-target confusion; this is a reasonable pattern already.
- Skeleton loading — `glass ... animate-pulse` convention already used consistently inside `/dashboard`, `/projects`, `/approved`, `/brand`, `/studio`, `/workspace`.

**Confirmed still open** (the real, narrow remaining list):
- **Decorative emoji in content, not chrome**: voice-preset options (`⚡💼✨🌸🎙️`, `src/app/projects/new/page.tsx:468-472`), video-style options (`⚡🎬💡✨`, `src/app/workspace/[id]/workspace-client.tsx:590-593`), and plain-text `✕` close glyphs (`src/features/mcp/components/McpSetup.tsx:422,556`, `src/app/projects/new/page.tsx:668`). Everywhere else "emoji" showed up in search it was actually a `✓`/`✕` used as a plain status glyph next to `role="status"` text — stylistically fine, not a defect, left alone.
- **`/approved/[id]` is still off-design-system**: confirmed `bg-white`, `text-zinc-900`, `border-zinc-100` in the live file. The one page still on a light theme while everything else is dark glass.
- **5 route-level Suspense/loading fallbacks** (`approved/[id]/page.tsx`, `brand/[brainId]/page.tsx`, `studio/[brainId]/page.tsx`, `studio/[brainId]/[templateId]/page.tsx`, `workspace/[id]/page.tsx`) still render plain `animate-pulse` text ("Loading...") instead of the `glass` skeleton-block convention used one layer down, inside the client components.
- No responsive verification has ever been done at 360/768/1280px — code-only judgment so far.

**Dropped from scope** (investigated and found to be non-issues, not just "already fixed"): brand-card dual click-target, "workspace" naming collision (no user-visible string actually collides — it's one Settings tab label, nothing else), landing-CTA truthfulness, dynamic stats, heading-case/jargon pass. Carrying these forward as tasks would be manufactured work against a codebase that already resolved them.

## 3. What "enterprise grade" adds on top of the fix list

The real correction list is now 3 small items (above). "Enterprise grade" mostly has to come from new value, not bug fixing — this codebase was already clean. What's actually missing:

**New design-system work:**
- Replace the ~4 files of decorative emoji with inline SVG (extend the existing nav/gear stroke style: 1.8 stroke, `currentColor`, 18–24px box).
- `/approved/[id]` dark-glass restyle so there's no visual seam in the app.
- Unify the 5 stray route-loader fallbacks to the `glass animate-pulse` skeleton convention already used everywhere else.

**New product-polish additions** (the ones with real leverage for a single-user tool, kept small):
- First-run onboarding checklist (connect AI provider → create brand → generate first post → approve & export) on the empty `/dashboard` / `/projects` state.
- Brand-card metadata on `/projects`: draft/approved counts + relative "updated 2 days ago" time, replacing the bare absolute date.
- A `⌘K` command palette, toast-notification system, and light/dark theme audit are explicitly **not** done this pass — the app already has working `role="status"` feedback everywhere a toast would go, and a command palette is real effort for an ~11-route single-user app with no search problem. Logged as deferred ideas, not built.

## 4. IA / naming fixes

None required. The dual-click-target and "workspace" naming concerns from the old audits don't hold up against the current code (see §2) — no task here.

## 5. Page-by-page batch plan

1. **Emoji → SVG**: `projects/new/page.tsx` (voice presets + ✕), `workspace-client.tsx` (style presets), `McpSetup.tsx` (✕ ×2).
2. **`/approved/[id]` restyle** — swap `bg-white`/`text-zinc-900`/`border-zinc-100` for the dark-glass tokens every other route uses.
3. **Loading-fallback unification** — 5 `page.tsx` Suspense fallbacks → `glass animate-pulse` skeleton blocks.
4. **Onboarding checklist** (new) — Dashboard/Projects empty state.
5. **Brand-card metadata** (new) — draft/approved counts + relative time on `/projects` cards.
6. **Responsive verification pass** — 360/768/1280px across all 11 routes, fix what's found.

## 6. Explicitly out of scope

- Auth, roles, teams, multi-tenancy, cloud sync.
- Any change to the AI pipeline, ComfyUI/LM Studio/TTS integration, or the in-flight `SPEC.MD` (HotFix 2) performance work — that's a parallel backend track and isn't touched here.
- Command palette, OG images, light/dark theme toggle — logged as deferred, not built.

## 7. Acceptance criteria

- Zero decorative emoji in the 4 named files; `grep -rnP "[\x{1F300}-\x{1FAFF}]" src` returns nothing.
- `/approved/[id]` uses only dark-glass tokens (`var(--surface)`, `var(--border)`, etc.) — no `bg-white`/`text-zinc-*`/`border-zinc-*` left.
- All 5 route-level loaders use the `glass ... animate-pulse` block pattern.
- Onboarding checklist appears on first run (0 brands) and tracks real state (provider connected / brand created / post generated / post approved).
- Brand cards show draft/approved counts and relative last-updated time.
- Manual responsive pass signed off at 360/768/1280px for all 11 routes.
- `npx tsc --noEmit` and `npm run lint` clean after every task.

## 8. Approaches considered

- **A. Patch in place, page by page, as issues are found** — lowest effort, but repeats the mistake that produced three overlapping naming schemes already; rejected.
- **B. Full visual rewrite (new component library, new tokens) from scratch** — most "enterprise," but the existing dark-glass system already tests well (the Nov 22 audit called it "solid modern design... reads professional") and a from-scratch rewrite would re-risk everything that already works; rejected.
- **C. (chosen) Build shared components/fixes first, then cascade page by page, bundling each page's correctness fixes with its visual pass in one batch** — matches the sequencing the original UI_UX audit itself recommended, reuses token work already in `globals.css`, and keeps risk scoped to one page at a time.

## 9. What's left to the builder

- Exact SVG icon choices per emoji (any consistent line-icon set is acceptable; reuse the nav/gear stroke style).
- Exact copy for onboarding checklist steps and toast messages (follow the UX-copy voice already in the app: plain, active, no filler).
- File-level implementation detail for each fix — the old `APPLICATION_UX_IMPROVEMENT_PLAN.md` already has step-by-step instructions for the items it covers (IMP-01 through IMP-15); reuse those verbatim where still applicable, skip the ones marked fixed above.
