# Application Audit Checklist — Social Studio (mmsi)

**Companion to:** `APPLICATION_EXPERIENCE_AUDIT.md`
**Date:** 2026-11-22 · **Legend:** `[x]` verified pass · `[!]` verified defect · `[ ]` open / to re-verify

Legend keys: **A** accessibility · **C** copy · **N** navigation · **V** visual · **I** interaction/feedback · **R** responsive · **S** SEO/perf.

---

## A · Landing — `/`

- [x] C — H1 "Social Studio", value prop visible above fold
- [x] C — no emoji anywhere on page
- [x] N — CTA map verified: "Open Studio" → `/projects`, "Dashboard" → `/dashboard`
- [!] N — CTA label "Open Studio" lands on brand list, not a studio (UX-011 → IMP-12)
- [x] C — 4 feature pillars explained (Brand AI, Images, Voice, Sound)
- [!] C — hardcoded stats "15 / 25 / 5+ / 100%" risk drift (UX-013 → IMP-14)
- [x] V — pipeline section (CAPTION / IMAGE / AUDIO) consistent
- [x] A — 1 h1; links have text
- [ ] R — verify at 360 / 768 / 1280 px (no viewport tooling during audit)

## B · Command Dashboard — `/dashboard`

- [x] C — H1 + explainer subline; stats "2 BRANDS / 0 APPROVED"
- [x] N — Approved Posts → `/approved`, New Brand → `/projects/new`
- [x] N — brand cards link to `/brand/[id]`
- [!] S — `document.title` = "Social Studio" (UX-004 → IMP-02)
- [!] A — "New Brand" `.btn-primary` fails WCAG contrast (UX-001 → IMP-01)
- [!] A — no `aria-current` on active nav (UX-005 → IMP-03)
- [x] A — 1 h1, 0 unlabeled inputs, 0 unnamed buttons
- [ ] C — 0-brand empty state not exercised (needs brands deleted — out of scope)
- [ ] R — grid collapse `sm:` / `lg:` verified in code only

## C · Your Brands — `/projects`

- [x] C — empty guidance: "Select a brand to open its Studio…"
- [x] N — card → `/studio/[id]`, "Brand page" → `/brand/[id]`, Dashboard/New Brand CTAs
- [x] I — created date shown per card
- [!] A — two identical "Delete" buttons, no object name (UX-008 → IMP-06)
- [x] I — delete flows into solid-panel DeleteBrandDialog (verified computed bg `rgb(21,26,38)`)
- [ ] R — card grid at 360 px

## D · New Brand — `/projects/new`

- [x] I — URL / text / file method tabs present (`🌐 ✏️ 📄` labels)
- [!] V — emoji tabs inconsistent with SVG icon system (UX-002 → IMP-08)
- [x] A — tag inputs have `aria-label={`Remove ${item}`}`
- [x] C — brand-brain flow copy present
- [x] N — back pill present
- [ ] I — full extraction flow not run (mutates data — out of read-only scope)
- [ ] R — form width at 360 px

## E · Brand page — `/brand/[brainId]`

- [x] N — sections for drafts/approved; gear + back present
- [x] A — gear `aria-label="Settings"`
- [!] C — "Approved Insta Posts" heading (UX-003 → IMP-07)
- [x] V — responsive classes `sm:px-8`, grid `sm:grid-cols-2`
- [ ] I — approved-post cards not populated (0 approved in data)
- [ ] R — verify long brand names truncate gracefully

## F · Studio template picker — `/studio/[brainId]`

- [x] C — 15 templates, each with platform + one-line description
- [x] N — back to brands, Brand page link, Delete Brand
- [!] C — "Draft Insta Posts" heading (UX-003 → IMP-07)
- [!] V — "HOW IT WORKS" all-caps breaks heading rule (UX-014 → IMP-13)
- [!] A — Delete Brand accessible name lacks entity name (UX-008 → IMP-06)
- [x] I — template click → `/studio/[id]/[templateId]`
- [ ] R — 15-card grid at 360 px

## G · Template generator — `/studio/[brainId]/[templateId]`

- [x] I — goal split layout: 25 goal types left, generate strip + cards right
- [x] I — "Create 5 Posts" `disabled:true` before goal selection (verified)
- [x] A — goal button `aria-pressed="true"` after click (verified), ✓ cue visible
- [x] I — Create enables after selection (verified `disabled:false`)
- [!] V — emoji goal icons (`✏️` …) (UX-002 → IMP-08)
- [x] C — goal descriptions shown on selection
- [ ] I — generation run not executed (requires model inference — out of scope)
- [ ] A — keyboard arrow-key traversal of goal grid not manually tested
- [ ] R — two-column split collapses on mobile (code check only)

## H · Workspace / post detail — `/workspace/[id]`

- [x] V — dark glass panels, IG preview card faithful (white)
- [x] A — `aria-label` on "Select voice", "Regenerate voice", tag removals
- [x] C — invalid id → "Post not found." + "Back to Dashboard"
- [!] C — minimal recovery, no cause/exits (UX-010 → IMP-11)
- [x] S — real post route renders title per data
- [ ] I — voice/tag editing flows not run (mutates data)
- [ ] R — `lg:grid-cols-2` collapse verified in code only

## I · Approved Posts — `/approved`

- [x] C — retention explanation: "Nothing here is ever removed automatically…"
- [x] N — Dashboard + brand grouping present
- [x] A — 1 h1; gear labeled
- [x] C — count badge "0 approved" shown
- [ ] I — populated list / delete-approved flow (0 rows in data)
- [ ] R — group layout at 360 px

## J · Approved post detail — `/approved/[id]`

- [x] N — gear `aria-label="Settings"` (approved-client.tsx:109)
- [!] V — 📸 emoji in empty/preview block (UX-002 → IMP-08)
- [x] A — labeled controls present
- [ ] I — populated approved post not available (0 approved)
- [ ] R — content column at 360 px

## K · Settings — AI Provider tab

- [x] A — TabsList `aria-label="Settings sections"`; tab roles + `selected` states correct
- [x] I — provider select, base URL, API key, model dropdown populated (LM Studio models listed)
- [!] V — feature header emoji (UX-002 → IMP-08)
- [!] A — save status not in live region (UX-007 → IMP-05)
- [x] C — quick tips present and accurate
- [ ] I — save/provider-switch not run (writes config)

## L · Settings — Workspace & Voice Setup tabs

- [x] N — tab switching verified in browser
- [x] I — workspace folder picker present
- [x] I — voice clone upload flow present ("5–30 seconds" guidance)
- [!] V — 📁 / 🎙️ / 💾 emoji in headers and save button (UX-002/009 → IMP-08/09)
- [!] A — "✓ Saved" not announced (UX-007 → IMP-05)
- [x] C — clear helper copy
- [ ] I — folder selection + clone run not executed

## M · Settings — Image Generation tab

- [x] I — connection list with ACTIVE badge, Set Active / Edit / Delete per row
- [x] C — "+ Add Connection" + quick tips
- [!] V — 🎨 emoji header ×2 (UX-002 → IMP-08)
- [!] A — save status not announced (UX-007 → IMP-05)
- [x] A — connection rows readable as text (URL + workflow file)
- [ ] I — add/edit/delete connection not run (writes config)

## N · Global chrome, back navigation, errors

- [x] N — nav: Home `/`, Settings `/settings` (gear, `aria-label`), Approved Posts `/approved`, New Brand `/projects/new`
- [x] A — gear has accessible name; back chevron `aria-hidden`
- [x] A — `:focus-visible` outline defined globally; inputs show focus via border+glow
- [!] A — no `aria-current="page"` anywhere (UX-005 → IMP-03)
- [x] V — `prefers-reduced-motion` media query present
- [!] N — BackPill `history.length > 1` can exit app from external referrer (UX-009 → IMP-10)
- [!] N — 404 is default Next page, dead end (UX-006 → IMP-04)
- [!] S — all routes share one `document.title` (UX-004 → IMP-02)
- [ ] R — nav wrapping at 360 px

---

## Cross-cutting checks

- [x] A — 0 images missing alt (0 raster images; SVGs `aria-hidden`)
- [x] A — 0 buttons without accessible name (dashboard sample)
- [x] A — 1 h1 per audited route
- [x] A — 0 unlabeled form controls (dashboard sample)
- [x] S — Lighthouse best-practices 1.00, SEO 1.00
- [!] S — Lighthouse a11y 0.95 (contrast only)
- [x] V — emoji sweep completed (27 source matches catalogued)
- [x] C — empty states documented for `/projects`, `/approved`, `/workspace`
- [ ] A — full keyboard tab-order walkthrough (not performed)
- [ ] A — screen-reader output capture (no SR available)
- [ ] R — device-width pass (no viewport tooling) → IMP-15

## Post-fix regression gate (re-run after improvements)

- [ ] Lighthouse a11y = 1.00 on `/dashboard`
- [ ] `grep` emoji ranges in `src/**/*.tsx` → only intentional `aria-hidden` uses
- [ ] `grep aria-current` → non-zero, correct per route
- [ ] Every route `document.title` distinct
- [ ] 404 renders branded page with working exits
- [ ] Re-execute this checklist end-to-end

---

**Totals:** 14 modules · 12 surfaces (11 routes + 404) · **116 checks** — **60 pass `[x]` · 25 defect `[!]` · 31 open `[ ]`** *(open items = data-dependent flows, device testing, and post-fix re-verification)*.
