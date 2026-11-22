# UI/UX Audit — Management Summary (Social Studio / mmsi)

Date: 2026-11-22 · Full report: `docs/UI_UX_AUDIT_REPORT.md` · Checklist: `docs/UI_UX_FIX_CHECKLIST.md`

## Overall Assessment

Solid modern dark-glass design with clear core journey (brand → generate → approve → export). The product reads professional and consistent **except** one page that looks like a different app, and terminology that names one thing three different ways. No critical blockers; 5 high-priority issues.

## Major Findings

1. **Every app page's browser tab says "Create Next App"** (boilerplate metadata) — cheap fix, big professionalism win.
2. **`/projects` brand card has two competing click targets** — user-reported; card should open Studio (matches HotFIX item 1).
3. **"Workspace" means three different destinations** (brand page / post editor / export folder) — biggest source of user confusion.
4. **`/approved/[id]` is off-design-system** — light zinc/white theme vs dark glass everywhere; also the only page without a Settings gear.
5. **Drafts have a weak home — and the planned brand-page change would leave them nowhere.** BLOCKER: HotFIX item 3 ("remove Draft Insta Posts section") must not ship until drafts destination is decided (Studio section? keep on brand page?).
6. **Loading patterns inconsistent** — brand page flashes "No drafts yet" before data loads; approved detail uses plain text loader.

## Critical Problems

None blocking. Highest risks: UI-011 (drafts limbo after planned change) and UI-002 (wrong navigation target, actively confusing users today).

## High-Priority Recommendations (do first)

1. UI-011 — decide drafts destination → unblocks HotFIX item 3.
2. UI-002 — brand card → Studio (HotFIX item 1, same file batch as UI-003).
3. UI-001 — metadata fix (10 minutes, global effect).
4. UI-006 — re-skin `/approved/[id]` + add gear/PageChrome.
5. UI-004 + UI-016 — one name per destination; standardize back labels.

## Suggested Implementation Order

1. Naming decision (UI-004/016) — cheap, unblocks copy everywhere.
2. HotFIX items 1–3 + UI-001/002/003/022 in one batch (same 3 files).
3. UI-011 drafts resolution + UI-007 loading states.
4. `/approved/[id]` restyle batch (UI-006/015/025/026/028).
5. Copy + low-priority polish (UI-005/008/009/010/012/013/…).
6. HotFIX item 4 (data wipe) last; verify empty states.

## Numbers

29 issues total: 5 High · 10 Medium · 14 Low. Pages: 11 discovered, 10 fully inspected, 1 partial (`/workspace/[id]`).
Limitations: no screenshot analysis this session (evidence = live DOM + source); responsive judged from source breakpoints; generation flows not exercised live.
