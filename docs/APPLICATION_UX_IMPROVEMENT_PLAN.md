# Application UX Improvement Plan — Social Studio (mmsi)

**Companion to:** `APPLICATION_EXPERIENCE_AUDIT.md`
**Date:** 2026-11-22
**Principle:** this is a plan, not a patch — no source files were modified during the audit.

Each improvement carries: **ID · title · issue ref · severity · modules · effort · impact · implementation steps · acceptance criteria · dependencies**.

Effort: **XS** (<1 h) · **S** (≤½ day) · **M** (1–2 days) · **L** (3–5 days).

---

## Phase 1 — Quick wins (Week 1, zero-risk polish)

### IMP-01 · Fix primary button contrast
- **Issue:** UX-001 (High) · **Modules:** B, D (any `.btn-primary`) · **Effort:** XS · **Impact:** removes the only WCAG failure; Lighthouse a11y → 1.00
- **Steps:**
  1. In `globals.css`, measure current `.btn-primary` text vs background ratio.
  2. Adjust label color (lighten) or fill (darken) until ≥ 4.5:1.
  3. Re-run Lighthouse on `/dashboard` and spot-check landing CTA + New Brand buttons.
- **Acceptance:** Lighthouse accessibility = 1.00; `color-contrast` audit passes; visual hierarchy of hero CTA unchanged.
- **Deps:** none.

### IMP-02 · Per-route document titles
- **Issue:** UX-004 (Medium) · **Modules:** A–N · **Effort:** S · **Impact:** tab/history orientation, share previews, SEO depth
- **Steps:**
  1. Add `export const metadata = { title: "… · Social Studio", description: "…" }` (or `generateMetadata` for dynamic routes) to each `page.tsx`.
  2. Dynamic routes: brand/studio/workspace titles from the loaded entity name.
  3. Verify `document.title` per route in browser.
- **Acceptance:** every route reports a distinct title containing "Social Studio"; 404 has its own title.
- **Deps:** none.

### IMP-03 · Active nav state (`aria-current`)
- **Issue:** UX-005 (Medium) · **Modules:** N · **Effort:** XS · **Impact:** orientation for all users
- **Steps:**
  1. In `nav.tsx`, compare `usePathname()` to each link's target.
  2. Set `aria-current="page"` and a visible active style on match.
  3. Exclude the Settings gear from visual change if style demands, but keep `aria-current`.
- **Acceptance:** accessibility tree shows `aria-current=page` on exactly one nav item per route; visible active treatment present.
- **Deps:** none.

### IMP-04 · Branded 404 page
- **Issue:** UX-006 (Medium) · **Modules:** N · **Effort:** S · **Impact:** stranded-user recovery
- **Steps:**
  1. Create `src/app/not-found.tsx` using PageChrome.
  2. Copy: "404 — This page could not be found." + explanation line + links to Home and Dashboard.
  3. Match glass-panel styling of the rest of the app.
- **Acceptance:** unknown URL renders branded page with ≥2 working exit links; distinct title.
- **Deps:** IMP-02 (title).

### IMP-05 · Accessible save status announcements
- **Issue:** UX-007 (Medium) · **Modules:** K, L, M · **Effort:** S · **Impact:** status messages perceivable (WCAG 4.1.3)
- **Steps:**
  1. Add a shared `<SaveStatus>` wrapper with `role="status"` + `aria-live="polite"`.
  2. Use it in WorkspaceSetup, ComfyUISetup, VoiceSetup, provider form for the "Saved / Saving / Save" state.
  3. Keep text non-emoji (ties to IMP-08).
- **Acceptance:** saving triggers a polite announcement; visible "✓ Saved" text retained.
- **Deps:** none (coordinate with IMP-08).

## Phase 2 — Consistency & semantics (Weeks 1–2)

### IMP-06 · Ambiguous destructive-action labels
- **Issue:** UX-008 (Medium) · **Modules:** C, E, F · **Effort:** XS · **Impact:** safe use of delete by AT users
- **Steps:**
  1. `/projects` card Delete → `aria-label={`Delete ${brand.name}`}`.
  2. Brand page + studio "Delete Brand" → include entity name likewise.
  3. Confirm DeleteBrandDialog heading repeats the brand name (already does — verify).
- **Acceptance:** each Delete control's accessible name includes the target brand name; visible label unchanged.
- **Deps:** none.

### IMP-07 · Terminology pass: "Insta" → "Instagram"
- **Issue:** UX-003 (Medium) · **Modules:** E, F · **Effort:** XS · **Impact:** consistent mental model
- **Steps:**
  1. Rename "Draft Insta Posts" → "Draft Instagram Posts" (or "Draft Posts").
  2. Rename "Approved Insta Posts" → "Approved Instagram Posts".
  3. Grep `Insta\b` in `src` for stragglers.
- **Acceptance:** zero user-visible occurrences of standalone "Insta"; template names unchanged.
- **Deps:** none.

### IMP-08 · Replace emoji iconography with SVG set
- **Issue:** UX-002 (Medium) · **Modules:** D, G, J, K, L, M · **Effort:** M · **Impact:** visual coherence, deterministic AT output
- **Steps:**
  1. Inventory: `📁 🎨 🎙️ 💾 📸 🌐 ✏️ 📄` + goal-card icons in `goals.ts` / `types.ts`.
  2. Map each to an inline SVG (reuse nav chevron/gear style: 1.8 stroke, currentColor).
  3. Settings feature headers: replace leading emoji with SVG or drop icon entirely.
  4. `/projects/new` method tabs: SVG globe/pencil/doc icons; add `aria-hidden`.
  5. Goal cards: SVG icon per goal type, or a neutral single glyph.
  6. Keep ✓ as text or convert to SVG check.
- **Acceptance:** `grep` for emoji ranges in `src/**/*.tsx` returns only intentional, `aria-hidden` cases; visual regression review on settings + template page.
- **Deps:** none; do after IMP-05 to avoid double-editing save buttons.

### IMP-09 · Save-button / status copy cleanup
- **Issue:** UX-002 support · **Modules:** L, M · **Effort:** XS · **Impact:** consistent verbs
- **Steps:** unify "💾 Save" / "Save Connection" / "Save Changes" → verb + object pattern ("Save settings", "Save connection").
- **Acceptance:** one label pattern per settings tab.
- **Deps:** IMP-05, IMP-08.

## Phase 3 — Navigation & recovery (Weeks 2–3)

### IMP-10 · Back pill never leaves the app
- **Issue:** UX-009 (Low) · **Modules:** N · **Effort:** S · **Impact:** predictable back behavior
- **Steps:**
  1. Change BackPill default to its explicit `href` (logical parent).
  2. Optionally use `router.back()` only when `document.referrer` is same-origin.
  3. Keep label generic ("Back") or name the target ("Back to Dashboard").
- **Acceptance:** deep-linking into any route and pressing Back stays on localhost:3000; from internal navigation, behavior feels unchanged.
- **Deps:** none.

### IMP-11 · Richer "Post not found" recovery
- **Issue:** UX-010 (Low) · **Modules:** H · **Effort:** XS · **Impact:** user confidence on stale links
- **Steps:** add explanation line + secondary links (Brand page, Dashboard) to the workspace not-found state; mirror pattern for approved-detail if it shares state.
- **Acceptance:** state offers ≥2 exits and explains likely cause.
- **Deps:** none.

### IMP-12 · Landing CTA truthfulness
- **Issue:** UX-011 (Low) · **Modules:** A · **Effort:** XS · **Impact:** expectation alignment
- **Steps:** either rename CTA to "Choose a brand" or route `Open Studio` to `/dashboard`; A/B not needed — pick one and align nav language.
- **Acceptance:** CTA label matches destination content in user testing walkthrough.
- **Deps:** IMP-03 (nav active state makes destination clearer).

## Phase 4 — Voice, structure & maintainability (Week 3–4)

### IMP-13 · Copy pass: jargon + heading system
- **Issue:** UX-012, UX-014 (Low/Info) · **Modules:** B, F · **Effort:** S · **Impact:** comprehension, visual rhythm
- **Steps:**
  1. "Command Dashboard" → "Dashboard" (or define the term in the subline).
  2. Define heading rule: sentence case H1/H2; all-caps only for eyebrow labels — apply to "HOW IT WORKS".
  3. Sweep other section labels for the same rule.
- **Acceptance:** documented heading rule in design notes; no unexplained jargon in H1s.
- **Deps:** none.

### IMP-14 · Derive landing stats from source
- **Issue:** UX-013 (Info) · **Modules:** A · **Effort:** S · **impact:** no stat drift
- **Steps:** import template/goal counts from `features/content-dashboard` constants (or a small `stats.ts`), render dynamically; voice count from voice presets source.
- **Acceptance:** changing the goals array updates the landing stat without editing `landing-sections.tsx`.
- **Deps:** none.

### IMP-15 · Responsive verification pass (test, not code)
- **Issue:** audit limitation §21 · **Modules:** A–N · **Effort:** M · **Impact:** confidence in mobile
- **Steps:**
  1. Run manual pass at 360 / 768 / 1280 px on all 11 routes.
  2. Record overflow, tap-target <44 px, and grid-collapse issues.
  3. File follow-up issues only if defects found.
- **Acceptance:** checklist §Responsive signed for every route with evidence notes.
- **Deps:** viewport tooling or manual browser resizing.

## Phase 5 — Continuous (post-fix)

- Re-run Lighthouse on `/dashboard`, `/settings`, `/studio/[id]/[templateId]`.
- Re-run emoji + `aria-current` + title greps as regression gates.
- Re-execute `APPLICATION_AUDIT_CHECKLIST.md` end-to-end.

---

## Summary table

| ID | Title | Issue | Sev | Phase | Effort |
|----|-------|-------|-----|-------|--------|
| IMP-01 | Button contrast | UX-001 | High | 1 | XS |
| IMP-02 | Per-route titles | UX-004 | Med | 1 | S |
| IMP-03 | aria-current nav | UX-005 | Med | 1 | XS |
| IMP-04 | Branded 404 | UX-006 | Med | 1 | S |
| IMP-05 | Save status live region | UX-007 | Med | 1 | S |
| IMP-06 | Delete labels | UX-008 | Med | 2 | XS |
| IMP-07 | Insta → Instagram | UX-003 | Med | 2 | XS |
| IMP-08 | Emoji → SVG | UX-002 | Med | 2 | M |
| IMP-09 | Save copy pattern | UX-002 | Med | 2 | XS |
| IMP-10 | Back stays in-app | UX-009 | Low | 3 | S |
| IMP-11 | Not-found recovery | UX-010 | Low | 3 | XS |
| IMP-12 | CTA label/destination | UX-011 | Low | 3 | XS |
| IMP-13 | Jargon + headings | UX-012/014 | Low | 4 | S |
| IMP-14 | Dynamic landing stats | UX-013 | Info | 4 | S |
| IMP-15 | Responsive verification | limitation | — | 4 | M |

**Totals: 15 improvements covering all 14 audit issues (UX-001–UX-014) + 1 structural verification task.**
By severity: 1 High (IMP-01) · 8 covering Medium issues (IMP-02–09) · 4 covering Low issues (IMP-10–13) · 2 covering Info issues (IMP-13/14) · 1 limitation (IMP-15). (IMP-13 covers two issues.)
