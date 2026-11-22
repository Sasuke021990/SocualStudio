# UI/UX Fix Checklist — Social Studio (mmsi)

Source: `docs/UI_UX_AUDIT_REPORT.md` (29 issues). Status: unchecked = pending.
Ordered by module/page. Priority: H = High, M = Medium, L = Low.

## Cross-app (global)

- [ ] **UI-001** (H) — Fix metadata in `src/app/layout.tsx`: title "Social Studio", real description. Kill "Create Next App" tab title everywhere.
- [ ] **UI-004** (H) — Rename "workspace" ×3 meanings: Brand Workspace → "Brand page", post Workspace → "Post editor", Export Workspace Folder → "Export folder". One name per destination.
- [ ] **UI-016** (M) — Standardize back-pill/nav names: "Landing"→"Home", "Projects"→ chosen brand-list name, consistent "Approved". Decide fixed vs dynamic back (user decision open).
- [ ] **UI-014** (L) — Raise `text-[10px]` meta labels to ≥11–12px (content-widgets StatCard/MetaChips, dashboard stat labels).
- [ ] **UI-023** (L) — One button-voice policy: remove emoji from button labels (✨ 💾 📁) or apply consistently.

## `/projects` (Your Brands)

- [ ] **UI-002** (H) — Brand card: single click target → `/studio/{brainId}` (HotFIX item 1). Remove or repurpose side "Studio" duplicate link.
- [ ] **UI-003** (M) — Remove "Approved" header button (HotFIX item 2). Keep Dashboard + New Brand.

## `/brand/[brainId]` (Brand Workspace)

- [ ] **UI-022** (M) — Stats = Posts + Approved only; drop Drafts stat (HotFIX item 3).
- [ ] **UI-011** (H) — RESOLVED: drafts list moves to Studio (new "Draft Insta Posts" section, HotFIX item 3b). Implement together with brand page cleanup so drafts are never invisible.
- [ ] **UI-005** (M) — Fix workflow copy: "Generate in Studio → finish & approve in Workspace → collect on Approved → publish manually."
- [ ] **UI-007** (M) — Add loading state (skeleton) before empty state renders; avoid "No drafts yet" flash.
- [ ] **UI-019** (L) — Hide brand-name chip in MetaChips on brand's own page.

## `/projects/new` (Create Brand)

- [ ] **UI-010** (M) — File upload: restrict accept to `.txt,.md` (f.text() can't read PDF/DOCX) or add real parsing.
- [ ] **UI-009** (M) — Rename "← Re-extract" → "← Back to source".
- [ ] **UI-024** (L) — ArrayField: add explicit "+" add button alongside Enter.

## `/studio/[brainId]` + template page

- [ ] **UI-008** (M) — Tip copy: "25 post types" → "25 goal types".
- [ ] **UI-029** (M) — Goal buttons: add `aria-pressed` + non-color selected cue (checkmark).
- [ ] **UI-017** (L) — Template h1: add explicit `color:#fff` like other pages.
- [ ] **UI-011** (H) — Template "Save N to Drafts" label must match final drafts destination decision.

## `/approved` (hub)

- [ ] **UI-020** (L) — Remove "Section 1 of 2" footer.
- [ ] **UI-027** (L) — Empty-state hint: replace "brand workspace" term.

## `/approved/[id]` (detail)

- [ ] **UI-006** (H) — Restyle to dark glass system (drop zinc/white light classes); use PageChrome/BackPill so Settings (gear) is reachable.
- [ ] **UI-015** (L) — Remove fake "248 likes" (or "0 likes").
- [ ] **UI-025** (L) — Replace custom back link with BackPill.
- [ ] **UI-026** (L) — Sidebar switch: router.replace → router.push (keep per-post history).
- [ ] **UI-028** (L) — Image alt: `alt={current.title}` or empty + visible title.

## `/dashboard`

- [ ] **UI-012** (L) — Remove "Quick actions" panel (duplicates header) or keep Settings-only.
- [ ] **UI-013** (L) — Subtitle: replace vague "one click to the full picture".

## Components / dialogs

- [ ] **UI-021** (L) — DeleteBrandDialog: neutral placeholder ("Type brand name") + exact-match case hint.
- [ ] **UI-007** (M) — Unify all loading states to `glass animate-pulse` skeletons (approved detail text loader).

## Sequencing with HotFIX.md

1. Resolve UI-011 drafts decision → then HotFIX items 1–3.
2. UI-001/002/003/022 fold into the same edit batch (same files).
3. UI-006/015/025/026/028 = `/approved/[id]` restyle batch.
4. Copy fixes (UI-005/008/009/013/027) quick batch.
5. HotFIX item 4 (data wipe) last, then verify empty states incl. UI-007 loading behavior.
