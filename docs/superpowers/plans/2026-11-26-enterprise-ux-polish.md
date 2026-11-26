# Enterprise UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the last 3 real UI defects left in Social Studio (mmsi) and add 2 small pieces of new value (onboarding checklist, brand-card metadata), so the app reads as enterprise-grade polish without touching scope, auth, or the AI pipeline.

**Architecture:** No architectural change. Every task edits existing client components in place, reusing existing tokens (`globals.css`), existing icon components (`src/components/icons.tsx`), and existing data-fetch patterns (`/api/brand-brain/projects`, `/api/content-dashboard`) already used by `dashboard/page.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, TypeScript 5. No test runner is configured in this project (no Jest/Vitest/Playwright in `package.json`) — verification is `npx tsc --noEmit`, `npm run lint`, and a manual check in the dev server (`npm run dev`), per the project's own existing convention in `SPEC.MD` §6.

**Spec:** `docs/ENTERPRISE_UX_REDESIGN_PLAN.md`

## Global Constraints

- No new dependencies. Everything ships with what's already in `package.json`.
- Reuse `src/components/icons.tsx` exports before writing any new inline SVG; only add a new `Icon*` export there if genuinely nothing fits.
- Native `<select><option>` elements cannot render SVG or any markup — browsers show option content as plain text only. Where an emoji sits inside an `<option>`, the only valid fix is removing the glyph, not "replacing" it with an icon.
- Match existing dark-glass tokens exactly: `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--border-bright)`, `var(--foreground)`, `var(--muted)` — no new hex colors.
- Every task ends with `npx tsc --noEmit` and `npm run lint` passing clean, then a commit.
- Branch: `enterprise-ux-redesign` (already created and checked out). Commit after every task, not just at the end.

## Review Focus

- **`/approved/[id]` restyle breaks the populated (non-empty) state.** The file has both an empty-state branch and a populated-post branch; a reviewer must check the post-detail view with real approved-post data, not just the empty state, since that's the one most audits skipped (0 approved posts existed at audit time).
- **Onboarding checklist shows "done" when it isn't**, or never clears once satisfied. Since there's no persisted "dismissed" flag, derive every step from real fetched data (brand count, item count, approved count) — a hardcoded `true` or a step that doesn't re-check on data change is the likely bug.
- **Brand-card relative-time helper mishandles very recent or future timestamps** (clock skew, just-created brand) — "in 0 minutes" or "NaN years ago" is the failure mode a naive implementation hits first.
- **Removing emoji from `<option>` text leaves a double space or an orphaned leading space** where the glyph used to be — e.g. `"⚡ Kabir - ..."` → must become `"Kabir - ..."`, not `" Kabir - ..."`.
- **Loading-fallback unification applied to a `page.tsx` that doesn't actually need a skeleton shape** (i.e., copy-pasting a brand-card-shaped skeleton onto a page with a different layout) — each of the 5 files gets a skeleton shaped like what it's loading, not a copy-pasted block.

---

### Task 1: Remove decorative emoji from presets and swap ✕ glyphs for `IconX`

**Files:**
- Modify: `src/app/projects/new/page.tsx:468-472` (voice-preset `<option>` labels), `:668` (remove-chip button)
- Modify: `src/app/workspace/[id]/workspace-client.tsx:590-593` (style-preset `<option>` labels)
- Modify: `src/features/mcp/components/McpSetup.tsx:422,556` (remove-arg/remove-row buttons)

**Interfaces:**
- Consumes: `IconX` from `src/components/icons.tsx` (already exported, signature `IconX({ size, className })`).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Strip the leading emoji + following space from each `<option>` label**

In `projects/new/page.tsx:468-472`, change e.g. `<option value="preset-energetic-host">⚡ Kabir - Energetic Host (Upbeat Tech Founder / Viral)</option>` to `<option value="preset-energetic-host">Kabir - Energetic Host (Upbeat Tech Founder / Viral)</option>`. Repeat for all 5 lines (468-472). Same pattern for `workspace-client.tsx:590-593` (4 lines).

- [ ] **Step 2: Replace the 3 `✕` text glyphs with `<IconX size={12} aria-hidden />`**

In `projects/new/page.tsx:668`, `McpSetup.tsx:422`, `McpSetup.tsx:556`: each is inside a `<button aria-label="Remove ...">✕</button>` — replace the bare `✕` text node with `<IconX size={12} aria-hidden />`, keeping the existing `aria-label` on the button unchanged (the accessible name already comes from the button, not the glyph). Import `IconX` from `@/components/icons` in each file if not already imported.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Run: `grep -rnP "[\x{1F300}-\x{1FAFF}]|✕" src/app/projects/new/page.tsx src/app/workspace/[id]/workspace-client.tsx src/features/mcp/components/McpSetup.tsx`
Expected: no matches.
Manual: `npm run dev`, open `/projects/new` (voice step) and `/workspace/[id]` (style selector) and confirm option text reads cleanly with no leading space; open Settings → MCP tab and confirm the remove-arg/remove-row buttons still show an X and still remove the row on click.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/new/page.tsx src/app/workspace/[id]/workspace-client.tsx src/features/mcp/components/McpSetup.tsx
git commit -m "fix: remove decorative emoji from presets, use IconX for remove buttons"
```

---

### Task 2: Restyle `/approved/[id]` to the dark-glass system

**Files:**
- Modify: `src/app/approved/[id]/approved-client.tsx` (confirmed light-theme classes at lines 168, 187, 234 — there may be more; grep before editing)

**Interfaces:**
- Consumes: existing CSS vars from `globals.css` (`--surface`, `--surface-2`, `--border`, `--border-bright`, `--foreground`, `--muted`), existing `.glass` / `.card` classes.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Inventory every light-theme class in the file**

Run: `grep -n "zinc\|bg-white\|text-black" src/app/approved/[id]/approved-client.tsx`
Record every line number returned (at least 168, 187, 234, confirmed earlier — there may be siblings not yet greped, e.g. `border-zinc-200`, `text-zinc-500`).

- [ ] **Step 2: Replace each with the dark-glass equivalent**

`bg-white` → `.glass` or inline `style={{ background: "var(--surface)" }}` depending on whether the element already uses a class-based approach elsewhere in the same file (match the file's own existing pattern — check how the file already styles its other panels before choosing class vs. inline style). `text-zinc-900` → `style={{ color: "var(--foreground)" }}` or `text-white`, matching sibling elements in the same component. `border-zinc-100` → `border-[var(--border)]` or the file's existing `style={{ borderColor: "var(--border)" }}` pattern. `bg-white text-zinc-900 shadow-sm` (the toggle-pill active state at line 168) → match the active-state pattern used by any other segmented toggle in the codebase (check `template-client.tsx`'s goal-button active state for the established "selected" treatment: accent background + check cue, not just a color swap).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Run: `grep -n "zinc\|bg-white\|text-black" src/app/approved/[id]/approved-client.tsx`
Expected: no matches.
Manual: `npm run dev`, navigate to `/approved`, click into a populated approved post (create one via Studio → generate → approve if none exist) and visually confirm the detail page matches the dark-glass look of `/workspace/[id]` — no white panels, text readable, image/reel toggle pill visibly shows its active state.

- [ ] **Step 4: Commit**

```bash
git add src/app/approved/[id]/approved-client.tsx
git commit -m "fix: restyle /approved/[id] to the dark-glass design system"
```

---

### Task 3: Unify route-level loading fallbacks to the glass-skeleton convention

**Files:**
- Modify: `src/app/approved/[id]/page.tsx:12`, `src/app/brand/[brainId]/page.tsx:12`, `src/app/studio/[brainId]/page.tsx:12`, `src/app/studio/[brainId]/[templateId]/page.tsx:12`, `src/app/workspace/[id]/page.tsx:12`

**Interfaces:**
- Consumes: the `.glass` CSS class and `animate-pulse` utility already defined in `globals.css` / Tailwind, same pattern as the in-component skeletons (e.g. `workspace-client.tsx:368-369`: `<div className="glass h-24 w-80 animate-pulse" />`).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Replace each plain-text loader with a glass skeleton block**

Each of the 5 files currently renders something like `<div className="animate-pulse text-zinc-500">Loading...</div>` (or `"Loading workspace..."`) inside its Suspense fallback. Replace with 1-2 stacked `<div className="glass h-24 w-80 animate-pulse" />`-style blocks — same shape as the client-side skeletons already used one layer down in the matching client component (e.g. `workspace/[id]/page.tsx`'s fallback should mirror `workspace-client.tsx:368-369` exactly; `approved/[id]/page.tsx` should mirror `approved-client.tsx:68-69`). For `studio/[brainId]/page.tsx` and `studio/[brainId]/[templateId]/page.tsx`, which have no existing in-component skeleton to mirror, use two stacked `h-20 w-full max-w-md` glass blocks centered in the viewport, matching `studio-client.tsx:134`'s block shape.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Manual: `npm run dev`, hard-refresh each of the 5 routes (throttle network in devtools if the loader flashes too fast to see) and confirm a glass skeleton renders instead of plain text before content appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/approved/[id]/page.tsx src/app/brand/[brainId]/page.tsx src/app/studio/[brainId]/page.tsx src/app/studio/[brainId]/[templateId]/page.tsx src/app/workspace/[id]/page.tsx
git commit -m "fix: unify route-level loading fallbacks to glass-skeleton convention"
```

---

### Task 4: First-run onboarding checklist

**Files:**
- Create: `src/components/OnboardingChecklist.tsx`
- Modify: `src/app/dashboard/page.tsx` (render the checklist when `loaded && brands.length === 0`, i.e. the existing empty-state branch)

**Interfaces:**
- Consumes: `brands: BrandRow[]` and `totals: { approved: number; total: number }` already computed in `dashboard/page.tsx`'s `load()` (see existing `BrandRow` interface, lines ~16-19).
- Produces: `OnboardingChecklist({ brandCount, postCount, approvedCount }: { brandCount: number; postCount: number; approvedCount: number })` — a presentational component with no own data fetching, so later tasks (none currently) would import it the same way.

- [ ] **Step 1: Write `OnboardingChecklist`**

`src/components/OnboardingChecklist.tsx`, `"use client"`. Three steps only (not four — there's no reliable signal for "AI provider connected" without adding new persistence, so this checklist tracks only what's already derivable from existing data):
1. "Create a brand" — done when `brandCount > 0`.
2. "Generate your first post" — done when `postCount > 0`.
3. "Approve a post" — done when `approvedCount > 0`.
Each row: a check-circle (`IconCheck` from `src/components/icons.tsx` when done, an empty ring otherwise) + label + one-line description, in a `.glass` panel matching the visual weight of `StatCard` in `src/components/content-widgets.tsx` (read that file's existing panel styling before writing this one, to match radius/padding/type scale exactly — don't invent new spacing values).

- [ ] **Step 2: Render it in the Dashboard empty state**

In `src/app/dashboard/page.tsx`, find the branch that renders when `loaded && brands.length === 0` (the existing empty-state copy). Render `<OnboardingChecklist brandCount={brands.length} postCount={totals.total} approvedCount={totals.approved} />` above or alongside that existing copy — don't remove the existing empty-state explanation, add the checklist as a companion element.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Manual: `npm run dev`, with 0 brands (or a fresh `data/brands/` for a throwaway check — do not delete real brand data), open `/dashboard` and confirm the checklist renders with step 1 unchecked; create a brand and refresh, confirm step 1 flips to checked.

- [ ] **Step 4: Commit**

```bash
git add src/components/OnboardingChecklist.tsx src/app/dashboard/page.tsx
git commit -m "feat: add first-run onboarding checklist to dashboard empty state"
```

---

### Task 5: Brand-card metadata on `/projects` (draft/approved counts + relative time)

**Files:**
- Modify: `src/app/projects/page.tsx`

**Interfaces:**
- Consumes: same two endpoints `dashboard/page.tsx` already calls (`/api/brand-brain/projects`, `/api/content-dashboard`) and the same `ContentItem` type from `@/features/content-dashboard/types`.
- Produces: a local `relativeTime(iso: string): string` helper, scoped to this file (no shared util needed for one call site, per YAGNI).

- [ ] **Step 1: Fetch content items alongside projects and compute per-brand counts**

In `ProjectsPage`'s `load()`, change the single `fetch("/api/brand-brain/projects")` to `Promise.all([fetch("/api/brand-brain/projects"), fetch("/api/content-dashboard")])`, mirroring `dashboard/page.tsx`'s existing `load()` exactly (same `BrandRow`-shaped computation: `total` = items filtered by `brainId`, `approved` = those with `status === "approved"`). Extend the local `ProjectEntry` state to carry `total` and `approved` per entry (reuse the `BrandRow` interface shape — either import it if `dashboard/page.tsx` exports it, or redeclare identically in this file, matching the project's existing per-file duplication pattern rather than introducing a new shared module).

- [ ] **Step 2: Write `relativeTime(iso: string): string`**

Scoped function in `projects/page.tsx`. Signature: `function relativeTime(iso: string): string`. Returns `"just now"` for under 60s, `"N minutes ago"` / `"N hours ago"` / `"N days ago"` / falls back to `toLocaleDateString()` past 30 days. Clamp any negative delta (future timestamp, clock skew) to `"just now"` rather than producing a negative count.

- [ ] **Step 3: Render the counts and relative time on each card**

Below the existing truncated-date line (`{new Date(p.modifiedAt).toLocaleDateString()}`), add a small `text-xs` row showing `"{total} posts · {approved} approved"` in `var(--muted)`, and replace the absolute date with `relativeTime(p.modifiedAt)` (keep the absolute date available via a `title` attribute tooltip for precision).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Manual: `npm run dev`, open `/projects` with at least one brand that has drafts/approved posts, confirm counts match what `/dashboard` reports for the same brand, confirm relative time reads sensibly (not negative, not "NaN").

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/page.tsx
git commit -m "feat: show draft/approved counts and relative time on brand cards"
```

---

### Task 6: Responsive verification pass (360 / 768 / 1280px, all 11 routes)

**Files:**
- No source changes planned up front — this task's deliverable is a findings pass; fix inline whatever it finds, file-by-file, folded into this same task.

**Interfaces:**
- Consumes: the running dev server (`npm run dev`) and a resizable viewport (browser devtools responsive mode, or the built-in browser tool if available in the executing session).

- [ ] **Step 1: Walk all 11 routes at 360px**

Routes: `/`, `/dashboard`, `/projects`, `/projects/new`, `/brand/[brainId]`, `/studio/[brainId]`, `/studio/[brainId]/[templateId]`, `/approved`, `/approved/[id]`, `/workspace/[id]`, `/settings`. At 360px width, check for horizontal scroll, overlapping text, and tap targets under 44px. Record every defect found (file + description) before fixing any of them.

- [ ] **Step 2: Repeat at 768px and 1280px**

Same 11 routes, same checks, append findings to the same list.

- [ ] **Step 3: Fix each recorded defect**

For each finding, make the minimal Tailwind breakpoint-class change in the owning file (`sm:`/`md:`/`lg:` adjustments) that resolves it, matching the responsive pattern already used elsewhere in that same file.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.
Manual: re-walk every route that had a finding, at the width it failed at, confirm resolved.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: responsive defects found in 360/768/1280px verification pass"
```
