# HotFIX Plan — Brand/Studio/Approved flow cleanup

Status: **awaiting confirmation**
Date: 2026-11-22

## Understanding Summary

- `/projects` (Your Brands) brand cards must open **Studio**, not the brand workspace page.
- `/projects` header must drop the **Approved** button (Dashboard + New Brand only).
- Brand page becomes an **approved-posts view** for that brand: Posts + Approved stats, Approved Insta Posts cards. No drafts anything — drafts live in Studio.
- **Wipe all posts** (every draft + approved, all brands) so the whole app is clean and synced.
- Template pages get a **split view** feature: left = pre-template picker, right = generation section.

## Items

### 1. Projects page: brand click → Studio
File: `src/app/projects/page.tsx`

- Change brand card link from `/brand/{brainId}` to `/studio/{brainId}`.
- Dashboard brand cards stay unchanged (→ `/brand/{brainId}`).

### 2. Projects page: header cleanup
File: `src/app/projects/page.tsx`

- Remove the **Approved** button from the header.
- Keep: **Dashboard** and **+ New Brand**.

### 3. Brand page → approved view
File: `src/app/brand/[brainId]/brand-client.tsx`

- Stats row: **Posts + Approved**. Remove the Drafts stat card.
- Remove the entire "Draft Insta Posts" section and its drafts filtering/list logic.
- Add "Approved Insta Posts" section: one `ApprovedCard` per approved post of this brand.

### 3b. Drafts section moves to Studio (audit UI-011 resolution)
File: `src/app/studio/[brainId]/studio-client.tsx`

- Add "Draft Insta Posts" section to Studio (below template grid): draft cards for this
  brand with Approve / Edit / Delete / Open in Workspace actions (reuse DraftCard).
- Empty state: "No drafts yet — generate with a template above."
- Template page "Save N to Drafts" now lands here. Drafts are never invisible.
  - Click card → `/approved/{id}` (same detail as the Approved hub).
  - Empty state: "No approved posts yet — approve in Studio."
- Keep: heading → Studio link, Open Studio button, Delete Brand dialog.
- Delete Brand semantics unchanged: deletes brand profile + drafts; approved posts survive
  (manual "Remove brand & posts" deletes everything).

### 4. Wipe all posts (data reset)
File: `data/content/items.json`

- Clear all content items (every draft + approved, all brands) → empty store.
- Brand profiles/brains are **not** touched — brands stay.
- Verify sync everywhere:
  - Dashboard: Posts 0, Approved 0
  - Brand page: Approved section empty state
  - `/approved` hub: empty state
  - Studio: no leftover items

### 5. Template page split view (feature)
File: `src/app/studio/[brainId]/[templateId]/…`

- When a template (e.g. Launch) is opened from the Instagram Post flow, the page splits in two:
  - **Left**: all pre-templates (picker stays visible/selectable).
  - **Right**: generation section for the selected template.
- Mobile/narrow screens: columns stack vertically.
- Applies to all template pages in the flow.

## Implementation Order

1. Item 1 + 2 (projects page)
2. Item 3 (brand page)
3. Item 5 (template split view)
4. Item 4 (wipe data last — after UI verified against existing data, then verify empty states)

## Verification

- `npm run lint` + `npm run build` green.
- Browser DOM checks:
  - `/projects`: brand card href = `/studio/{id}`; no Approved button.
  - Brand page: Posts + Approved stats; Approved Insta Posts cards; no Drafts anything.
  - Template page: two-column split (picker left, generation right).
  - After wipe: dashboard 0/0, brand page empty, `/approved` empty.
- Commit per logical batch.

## Assumptions

- Wipe = posts only; brands/brand profiles survive.
- Item 5 split view applies to every template page in the Instagram Post flow.
- Approved card on brand page navigates to `/approved/{id}`.
- Back-button behavior stays as-is (fixed back targets) — still open for later decision.

## Decision Log

| # | Decision | Alternatives considered | Why |
|---|----------|------------------------|-----|
| 1 | Projects brand card → Studio | Keep → brand page; change everywhere | User: change only Your Brands page |
| 2 | Remove Approved button on /projects | Keep for quick access | User instruction; Approved reachable via Dashboard/brand page |
| 3 | Brand page shows Approved, not Drafts | Keep both; keep drafts only | User: drafts live in Studio; approved per-brand view wanted |
| 4 | Full wipe of all posts | Delete only test/junk items | User: "delete all" |
| 5 | Split view = picker + generation | Separate picker page; modal picker | User feature request: two horizontal columns |

## Open Questions

- None blocking. Back-navigation accuracy (dynamic back vs fixed targets) deferred.
