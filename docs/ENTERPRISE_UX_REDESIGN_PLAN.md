# Enterprise-Grade UX Redesign — Social Studio (mmsi)

Status: Draft — awaiting approval
Date: 2026-11-26
Scope decision: **Enterprise-grade polish**, not enterprise-grade product. Stays single-user, local-first, desktop. No auth, no multi-tenancy, no server-side accounts — the entire AI pipeline (ComfyUI, LM Studio, Ming-TTS) runs on one machine's GPU, which a multi-tenant model would contradict. "Enterprise grade" here means: looks, behaves, and holds together like a polished commercial SaaS product, with full accessibility and zero rough edges — not that it serves a team.

## 1. Why this doc exists

Two audits already ran on 2026-11-22 (`docs/UI_UX_AUDIT_REPORT.md` + `UI_UX_FIX_CHECKLIST.md`, and `docs/APPLICATION_EXPERIENCE_AUDIT.md` + `APPLICATION_AUDIT_CHECKLIST.md` + `APPLICATION_UX_IMPROVEMENT_PLAN.md`). Neither has been executed against — this doc verifies both against the current codebase (2026-11-26), merges them into one backlog, removes what's already fixed, and adds the new enterprise-polish work (design system, new components, IA cleanup) that neither audit covers.

## 2. Verified current state (re-checked against live code, not assumed from the old docs)

**Already fixed since the Nov 22 audits** (no further work needed):
- Primary button contrast — `globals.css` `.btn-primary` now uses `#4f46e5`, documented WCAG 2.2 SC 1.4.3 compliant.
- Per-route page titles — root `layout.tsx` uses a `title.template` (`"%s · Social Studio"`), so routes no longer share one title.
- Branded 404 — `src/app/not-found.tsx` exists.
- Back navigation can't exit the app — `BackPill` always uses a fixed logical-parent `href`, by design (comment in `nav.tsx` confirms this was deliberate).
- "Insta" → "Instagram" rename — no bare "Insta" strings remain in `src`.
- `aria-current` exists on the Settings gear (`nav.tsx`), though nowhere else (see below).

**Confirmed still open** (verified in code just now):
- **Emoji icons** in 11 files (`approved-client.tsx`, `brand-client.tsx`, `projects/new/page.tsx`, `template-client.tsx`, `workspace-client.tsx`, `content-widgets.tsx`, `ProviderSettingsForm.tsx`, `ComfyUISetup.tsx`, `InstagramPostCard.tsx`, `McpSetup.tsx`, `WorkspaceSetup.tsx`). This is the single biggest "doesn't look enterprise" tell — emoji render inconsistently across OSes and break the SVG icon language everywhere else.
- **`/approved/[id]` is still off-design-system**: confirmed `bg-white`, `text-zinc-900`, `border-zinc-100` — a light theme dropped into an otherwise all-dark-glass app. The only page like this.
- **Brand card dual click-target** on `/projects`: the card body links to `/studio/{id}` and a separate inline link goes to `/brand/{id}` — two destinations from one card, no clear primary action.
- **"Workspace" still names three things**: the Settings tab/section, the `WorkspaceSetup` component (export folder path), and the `/workspace/[id]` post-editor route. Nothing routes through this ambiguity today, but the label collision is real and will get worse as the app grows.
- Save-status text ("✓ Saved") isn't in an `aria-live` region anywhere in Settings.
- Delete buttons on brand cards and Studio don't carry the brand's name in their accessible name.
- Landing CTA ("Open Studio") still lands on the brand list (`/projects`), not a studio.
- Landing stats (15/25/5+) are hardcoded, not derived from source.
- No responsive verification has ever been done at 360/768/1280px — code-only judgment so far.

**Not re-verified** (carry forward from the old docs as open, confirm during execution): drafts-destination decision (UI-011), exact heading-case consistency, keyboard traversal of the goal grid, screen-reader pass.

## 3. What "enterprise grade" adds on top of the fix list

The existing docs are a bug/accessibility backlog. None of them touch the thing that actually reads as "enterprise" vs. "solid personal project": consistency of small, high-frequency interactions and a few components the app doesn't have yet.

**New design-system work:**
- Replace all emoji with one SVG icon set (extending the existing nav/gear icon style: 1.8 stroke, `currentColor`, 18–24px box) — this single change does more for perceived quality than any other item here.
- One shared `<Toast>` / inline confirmation system for save, delete, approve, generate actions, replacing silent state changes and the current unannounced "✓ Saved" text.
- One shared skeleton-loading convention (`glass animate-pulse`) everywhere data loads, replacing today's mix of empty-state flashes and plain-text loaders.
- A documented type scale and heading-case rule (sentence case for H1/H2, caps reserved for short eyebrow labels only) applied consistently — today it's ad hoc ("HOW IT WORKS" vs. normal headings elsewhere).
- Consistent destructive-action pattern (confirm dialog + named accessible label) applied everywhere delete appears, not just where the audits happened to sample.

**New product-polish additions** (pulled from the existing enhancements list, the ones with real leverage for a single-user tool):
- First-run onboarding checklist (connect AI provider → create brand → generate first post → approve & export) — the app's empty states already explain themselves well; this makes activation concrete instead of a wall of text.
- Brand-card metadata (draft/approved counts, last-updated as relative time) so `/projects` stops being purely navigational once there are more than 2–3 brands.
- A `⌘K` command palette is explicitly **not** recommended for this pass — it's real effort for a single-user, ~11-route app with no search problem yet. Flagging it as a deferred idea, not doing it now.

## 4. IA / naming fixes

- Brand card: one click target (`/studio/{id}`), full card. Move the secondary "Brand page" link to a small explicit secondary action inside the card (icon + label), not a second invisible hotzone.
- Rename pass: "Workspace" (Settings tab) → "Export folder"; keep `/workspace/[id]` as "Post editor" in all user-facing copy (route itself doesn't need to change); Brand page keeps its own name. One name, one destination, everywhere in copy.
- Landing CTA → routes to `/dashboard` instead of `/projects`, since "Open Studio" implies picking up where you left off, which the dashboard actually represents; or relabel to "Choose a brand" if `/projects` is kept as the destination. Pick: **relabel**, since `/projects` is the correct first stop for a new or returning user and renaming one button is lower-risk than changing the primary funnel.

## 5. Page-by-page batch plan

1. **Global/shared components first** (everything downstream depends on these): SVG icon set, Toast component, skeleton convention, heading-case rule, Delete-button accessible-name pattern, aria-live save status wrapper.
2. **`/approved/[id]` restyle** — full dark-glass conversion, PageChrome/BackPill, remove fake like-counts if any remain, fix sidebar nav to `router.push`.
3. **`/projects` + `/brand/[brainId]` + `/studio/[brainId]`** — brand-card click-target fix, Delete labels, drafts-destination resolution, loading-skeleton fix, stat accuracy.
4. **`/studio/[brainId]/[templateId]`** — emoji → SVG goal icons, keyboard traversal check.
5. **Settings (all tabs)** — emoji → SVG, save-status live region, button-copy pattern ("Save settings", "Save connection").
6. **Landing + Dashboard** — CTA relabel, dynamic stats, jargon pass ("Command Dashboard" copy).
7. **Onboarding checklist** (new) — lands on Dashboard or Projects empty state.
8. **Responsive verification pass** — 360/768/1280px across all 11 routes, fix what's found.

## 6. Explicitly out of scope

- Auth, roles, teams, multi-tenancy, cloud sync.
- Any change to the AI pipeline, ComfyUI/LM Studio/TTS integration, or the in-flight `SPEC.MD` (HotFix 2) performance work — that's a parallel backend track and isn't touched here.
- Command palette, OG images, light/dark theme toggle — logged as deferred, not built.

## 7. Acceptance criteria

- Zero emoji in `src/**/*.tsx` outside `aria-hidden` SVGs.
- Lighthouse accessibility = 1.00 on `/dashboard`, `/approved/[id]`, `/studio/[brainId]/[templateId]`.
- Every destructive control's accessible name includes the target entity's name.
- `/approved/[id]` passes the same dark-glass visual check as every other route.
- One name per destination in all user-facing copy (Export folder / Post editor / Brand page / Studio).
- All save/delete/approve/generate actions produce a visible + `aria-live` announced confirmation.
- Manual responsive pass signed off at 360/768/1280px for all 11 routes.

## 8. Approaches considered

- **A. Patch in place, page by page, as issues are found** — lowest effort, but repeats the mistake that produced three overlapping naming schemes already; rejected.
- **B. Full visual rewrite (new component library, new tokens) from scratch** — most "enterprise," but the existing dark-glass system already tests well (the Nov 22 audit called it "solid modern design... reads professional") and a from-scratch rewrite would re-risk everything that already works; rejected.
- **C. (chosen) Build shared components/fixes first, then cascade page by page, bundling each page's correctness fixes with its visual pass in one batch** — matches the sequencing the original UI_UX audit itself recommended, reuses token work already in `globals.css`, and keeps risk scoped to one page at a time.

## 9. What's left to the builder

- Exact SVG icon choices per emoji (any consistent line-icon set is acceptable; reuse the nav/gear stroke style).
- Exact copy for onboarding checklist steps and toast messages (follow the UX-copy voice already in the app: plain, active, no filler).
- File-level implementation detail for each fix — the old `APPLICATION_UX_IMPROVEMENT_PLAN.md` already has step-by-step instructions for the items it covers (IMP-01 through IMP-15); reuse those verbatim where still applicable, skip the ones marked fixed above.
