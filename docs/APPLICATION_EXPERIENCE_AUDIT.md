# Application Experience Audit — Social Studio (mmsi)

**Date:** 2026-11-22
**Mode:** Read-only audit — no application source files were modified.
**Method:** Live browser inspection of 11 routes (DOM text, headings, accessibility tree, computed states), source greps for emoji/aria/responsive/focus rules, Lighthouse (accessibility / best-practices / SEO) on `/dashboard`.
**Environment:** Production server on `localhost:3000`; 2 brands ("The Souled Store", "Try Mutual Funds"); 0 drafts; 0 approved posts; local LM Studio provider configured.

---

## 1. Scope

All user-visible surfaces of Social Studio: landing, dashboard, brand management, brand creation, brand page, post studio, template generator, workspace/post detail, approved posts (list + detail), settings (4 tabs), global navigation chrome, error/404 states.

**Out of scope:** server internals, API behavior, generation quality, build tooling.

## 2. Audit Method & Phases (9)

| # | Phase | What was done |
|---|-------|---------------|
| 1 | Discovery | Route inventory: 11 `page.tsx` routes + 404 |
| 2 | Content & copy | Full `innerText` extraction per route; heading hierarchy capture |
| 3 | Navigation | Link/href map, BackPill behavior, nav snapshot, deep-link/404 checks |
| 4 | Visual & design | Emoji-vs-SVG audit, panel/dialog styling, template split layout |
| 5 | Interaction & feedback | Tab switching (settings), goal selection gate, disabled-state checks |
| 6 | Accessibility | A11y tree snapshots, DOM counts (alt/labels/names/h1), aria usage grep, Lighthouse |
| 7 | Responsive | Breakpoint usage in pages, `@media` rules in globals.css (viewport emulation unavailable — see §21) |
| 8 | Performance & SEO | Lighthouse scores, document titles, meta presence |
| 9 | Recommendations | Findings → improvement plan → checklist → product recommendations |

## 3. Inventory — Modules (14) and Pages (11 + 404)

| Module | Surface | Route |
|--------|---------|-------|
| A | Landing | `/` |
| B | Command Dashboard | `/dashboard` |
| C | Your Brands list | `/projects` |
| D | New Brand flow | `/projects/new` |
| E | Brand page | `/brand/[brainId]` |
| F | Studio template picker | `/studio/[brainId]` |
| G | Template generator | `/studio/[brainId]/[templateId]` |
| H | Workspace / post detail | `/workspace/[id]` |
| I | Approved Posts list | `/approved` |
| J | Approved post detail | `/approved/[id]` |
| K | Settings — AI Provider | `/settings` (tab 1) |
| L | Settings — Workspace & Voice Setup | `/settings` (tabs 2–3) |
| M | Settings — Image Generation | `/settings` (tab 4) |
| N | Global chrome: nav, back, gear, 404/errors | all routes |

## 4. Findings — UX-001 Register

Severity classes: **Critical / High / Medium / Low / Info**.
Format: **ID · Title · Severity · Module · Route · Evidence · Impact · Recommendation**

---

**UX-001 · Primary button fails WCAG AA color contrast · High · B, D · `/dashboard` (and `.btn-primary` wherever rendered)**
- Evidence: Lighthouse accessibility = 0.95; sole failure `color-contrast` on `section.relative > div.flex > div.flex > a.btn-primary` — the "New Brand" link (`lighthouse.json`, axe rule color-contrast).
- Impact: Low-vision users cannot reliably read the most important call-to-action on the dashboard. Fails WCAG 2.2 SC 1.4.3 (Minimum Contrast).
- Recommendation: Raise the text/background ratio of `.btn-primary` to ≥ 4.5:1 (darken the label or lighten the fill); re-run Lighthouse to reach 1.00.

**UX-002 · Emoji used as UI iconography · Medium · D, G, J, K, L, M, N · `/projects/new`, template page, `/approved/[id]`, settings**
- Evidence: source greps — `📁` (WorkspaceSetup), `🎨` (ComfyUISetup ×2), `🎙️` (VoiceSetup ×3), `💾 Save` (WorkspaceSetup, ComfyUISetup), `📸` (approved-client empty state), `✏️` goal icons (goals.ts), `🌐 ✏️ 📄` method tabs on `/projects/new`.
- Impact: Renders inconsistently across OS/breaks the SVG icon system used in the nav (gear, back chevron); screen readers may announce emoji names ("camera with flash"); visual style incoherence between polished glass UI and playful emoji.
- Recommendation: Replace with the existing inline-SVG icon set (or a single icon library); mark any retained decorative emoji `aria-hidden="true"`.

**UX-003 · Inconsistent terminology: "Insta" vs "Instagram" · Medium · F, E · `/studio/[brainId]`, `/brand/[brainId]`**
- Evidence: "Draft Insta Posts" (studio heading), "Approved Insta Posts" (brand-client.tsx:138) vs full "Instagram Post / Instagram Reel / Instagram Story" templates and "Approved Posts" nav label.
- Impact: Two names for the same object confuse users and break mental-model consistency; "Insta" reads informal next to the otherwise professional copy.
- Recommendation: Standardize on "Instagram" everywhere (or "Instagram posts" section labels); reserve abbreviations for character-limited contexts only.

**UX-004 · No per-route document titles · Medium · A–N · all routes**
- Evidence: every open tab reports `document.title = "Social Studio"` (landing, dashboard, settings, studio, template).
- Impact: Browser history/tab switching cannot distinguish pages; hurts SEO deep-linking and social-share previews despite Lighthouse SEO = 1.00 (which only scores the single audited page).
- Recommendation: Set `title` + `description` metadata per route (e.g. "Dashboard · Social Studio", "Settings · Social Studio").

**UX-005 · Active nav state not exposed · Medium · N · all routes**
- Evidence: grep for `aria-current` across `src` → 0 matches; nav links (Home, Settings, Approved Posts, New Brand) have no current-page indication in the accessibility tree.
- Impact: Sighted users rely on chance color differences; screen-reader users cannot tell where they are. Fails WCAG 2.2 SC 2.4.8 (Focus Location) best practice / SC 1.3.1 for state.
- Recommendation: Add `aria-current="page"` plus a visible active style to the matching nav link.

**UX-006 · Unbranded, dead-end 404 · Medium · N · `/nonexistent-page`**
- Evidence: page text = "404 / This page could not be found." (default Next.js error page).
- Impact: No brand identity, no navigation out — users reaching a broken/stale link are stranded; no search or link home.
- Recommendation: Custom `not-found.tsx` with Social Studio styling, "Back to Dashboard" / "Home" links, and the standard PageChrome.

**UX-007 · Save confirmations are not announced · Medium · K, L, M · `/settings` tabs**
- Evidence: `WorkspaceSetup` renders `{saved ? "✓ Saved" : "💾 Save"}`; same inline pattern in ComfyUI (`Save Changes` / `Save Connection`) — no `aria-live` region found anywhere in `src`.
- Impact: Screen-reader and keyboard users get no confirmation a save succeeded; risk of repeated submissions. WCAG 4.1.3 (Status Messages).
- Recommendation: Wrap status text in `role="status"` / `aria-live="polite"` container shared across settings tabs.

**UX-008 · Ambiguous "Delete" button names · Medium · C, E, F · `/projects`, brand page, studio**
- Evidence: `/projects` exposes two buttons both named exactly "Delete"; studio header has a separate "Delete Brand" button; DeleteBrandDialog follows up with solid-panel confirmation (good).
- Impact: Screen-reader users hear "Delete, Delete" with no object context — high-risk destructive action with ambiguous target. WCAG 2.5.3 (Label in Name) / 4.1.2 (Name, Role, Value).
- Recommendation: `aria-label={"Delete " + brand.name}` (visible text can stay "Delete").

**UX-009 · Back pill can leave the application · Low · N · any deep-linked route**
- Evidence: `nav.tsx` BackPill calls `router.back()` whenever `window.history.length > 1` — true when the user arrived from an external site or a restored session, sending them out of the app instead of to the logical parent.
- Impact: Unexpected navigation loss of app context; back label promises in-app return.
- Recommendation: Prefer explicit parent `href` (Dashboard/brand/studio); only use `router.back()` when the previous entry is same-origin (e.g. track referrer or drop back-to-history entirely).

**UX-010 · "Post not found." is a minimal dead end · Low · H · `/workspace/[id]`**
- Evidence: invalid id → text "Post not found." + single "Back to Dashboard" link; no brand context, no retry, no explanation of why.
- Impact: Users hitting a stale/expired link get no recovery path beyond one exit.
- Recommendation: Add cause copy ("This post may have been deleted"), link to the brand page and Approved/Draft lists.

**UX-011 · "Open Studio" lands on the brand list · Low · A · `/`**
- Evidence: landing CTA "Open Studio" → `/projects` ("Your Brands"); the actual studio is a nested brand route.
- Impact: Label/destination mismatch — users expecting to start creating land on a selection step without expectation set.
- Recommendation: Rename to "Open Studio — choose a brand" or route to dashboard; consistent CTA language with nav.

**UX-012 · Jargon heading "Command Dashboard" · Low · B · `/dashboard`**
- Evidence: H1 "Command Dashboard" over otherwise plain-language copy ("Every brand at a glance…").
- Impact: Unexplained internal jargon; mild comprehension friction for first-time users.
- Recommendation: "Dashboard" or "Command center" with supporting line, keeping brand voice consistent.

**UX-013 · Hardcoded marketing statistics · Info · A · `/`**
- Evidence: landing stats "15 Content templates / 25 Goal types / 5+ Voices / 100% Local & private" hardcoded in markup (currently accurate: 15 templates, 25 goals confirmed).
- Impact: Silent drift if templates/goals change — a wrong stat is a trust failure.
- Recommendation: Derive counts from the same source files (`templates.ts`, `goals.ts`) at build time.

**UX-014 · "HOW IT WORKS" all-caps section label · Info · F · `/studio/[brainId]`**
- Evidence: section header "HOW IT WORKS" in caps while all other section headers are title case ("Create New Content", "Draft Insta Posts").
- Impact: Minor visual-style inconsistency in heading system.
- Recommendation: Pick one heading treatment (sentence case + eyebrow style for section labels) and apply globally.

## 5. Passes (verified — no action needed)

- **Template goal gate:** "Create 5 Posts" is `disabled:true` pre-selection; after clicking a goal → `aria-pressed="true"`, ✓ cue visible, button `disabled:false`. Selection state is both visual and semantic.
- **Focus indicators:** `:focus-visible { outline: 2px solid var(--accent-bright) }` present; `.field-input:focus` replaces outline with `border-color + box-shadow` glow (visible, compliant).
- **Settings tabs:** proper `[tab]` role, `selected=true/false`, `aria-label="Settings sections"` on TabsList.
- **Icon-only controls:** gear link has `aria-label="Settings"` (both nav.tsx and approved-client).
- **Form labeling:** 0 unlabeled inputs on dashboard; tag-remove buttons carry `aria-label={`Remove ${item}`}`; workspace selects carry `aria-label` (Select voice / Regenerate voice).
- **Images:** 0 images without alt (0 raster images — icons are inline SVG with `aria-hidden`).
- **Heading structure:** exactly 1 `h1` per audited route.
- **Delete confirmation:** DeleteBrandDialog uses solid `#151a26` panel over `rgba(2,4,10,0.85)` backdrop — verified computed styles, strong contrast, focus trapped by modal pattern.
- **Empty states:** `/approved` explains retention policy ("Nothing here is ever removed automatically…"); `/projects` explains next action ("Select a brand to open its Studio…").
- **Landing:** no emoji; clear dual CTA (Open Studio / Dashboard); 4 feature pillars + pipeline explainer.
- **Lighthouse:** best-practices 1.00, SEO 1.00, accessibility 0.95 (only UX-001).

## 6. Scorecard (0–10, decimals allowed)

| Module | Score | Rationale |
|--------|------:|-----------|
| A · Landing | 8.5 | Clear hierarchy & copy; hardcoded stats (UX-013), CTA label mismatch (UX-011) |
| B · Dashboard | 7.0 | Good at-a-glance cards; contrast failure on primary CTA (UX-001), jargon H1 (UX-012), no aria-current |
| C · Brands list | 8.0 | Clean cards with dates + brand page links; ambiguous Delete labels (UX-008) |
| D · New Brand flow | 7.0 | Full URL/text methods; emoji tabs (UX-002) |
| E · Brand page | 7.5 | Strong structure; "Approved Insta Posts" naming (UX-003) |
| F · Studio picker | 7.0 | 15 well-described templates; "Insta" heading, caps label (UX-003/014), Delete naming |
| G · Template generator | 8.5 | Excellent goal split + disabled gate + aria-pressed; emoji goal icons (UX-002) |
| H · Workspace / post | 7.5 | Dark glass panels, labeled controls; weak not-found recovery (UX-010) |
| I · Approved list | 8.5 | Best empty-state copy in the app; nav/aria-current gap |
| J · Approved detail | 7.0 | Functional; 📸 emoji empty state (UX-002) |
| K · Settings — AI Provider | 7.5 | Tabs, provider/model UX good; emoji headers, no aria-live on save (UX-002/007) |
| L · Settings — Workspace & Voice | 8.0 | Quick tips + clear upload flow; 💾/🎙️ emoji, save announcement |
| M · Settings — Image Generation | 8.0 | Multi-connection list with active state + set-active; 🎨 emoji, save announcement |
| N · Global chrome & errors | 6.5 | Back/gear solid; 404 dead-end (UX-006), back-leaves-app edge (UX-009), titles (UX-004) |

**Overall experience score: 7.6 / 10**

## 7. Final tallies

- **Modules audited:** 14 (A–N)
- **Routes inspected:** 11 + 404 = 12
- **Issues total:** 14
  - Critical: **0**
  - High: **1** (UX-001)
  - Medium: **7** (UX-002, UX-003, UX-004, UX-005, UX-006, UX-007, UX-008)
  - Low: **4** (UX-009, UX-010, UX-011, UX-012)
  - Info: **2** (UX-013, UX-014)
- **Passes recorded:** 11
- **WCAG 2.2 failures:** 1 (SC 1.4.3 contrast)
- **Lighthouse:** a11y 0.95 · best-practices 1.00 · seo 1.00 (on `/dashboard`)

## 8. Severity rubric

- **Critical:** blocks core task or severe a11y barrier with no workaround.
- **High:** WCAG failure or primary-action impairment.
- **Medium:** consistency/semantic gaps that degrade trust or comprehension for a user group.
- **Low:** edge-case or polish issues with a workaround.
- **Info:** maintainability/observation, no user harm today.

## 9–19. Phase evidence summaries

- **Phase 1 (Discovery):** 11 routes globbed from `src/app/**/page.tsx`; components inventory (nav, DeleteBrandDialog, content-widgets).
- **Phase 2 (Content):** full text captured per route; copy quality generally strong (empty states, quick tips); findings UX-003, UX-011, UX-012, UX-014.
- **Phase 3 (Navigation):** href maps captured on dashboard/projects/landing; nav = Home, Settings, Approved Posts, New Brand; back pill + gear verified; findings UX-005, UX-006, UX-009.
- **Phase 4 (Visual):** emoji grep (27 matches) vs SVG nav icons; delete dialog computed background confirmed; template split layout confirmed; findings UX-002.
- **Phase 5 (Interaction):** settings tabs switch correctly; goal click → aria-pressed + enabled CTA verified; disabled-state gate verified; workspace invalid-id state captured.
- **Phase 6 (Accessibility):** DOM counts clean (0 missing alt/names/labels, 1 h1); aria grep (17 hits — good coverage but no `aria-current`); Lighthouse → UX-001, UX-005, UX-007, UX-008.
- **Phase 7 (Responsive):** Tailwind `sm:/lg:` breakpoints present in all major pages; only `@media` in globals.css is `prefers-reduced-motion`; no viewport-emulation tool available — mobile behavior verified in code only.
- **Phase 8 (Performance/SEO):** Lighthouse scores above; titles uniform → UX-004.
- **Phase 9 (Recommendations):** see companion documents.

## 20. Evidence artifacts

- Lighthouse JSON: `C:\Users\ADMINI~1\AppData\Local\Temp\opencode-browser-pPOGlZ\0\lighthouse.json`
- Lighthouse HTML: `...\opencode-browser-pPOGlZ\1\lighthouse.html`
- Live probes: localhost:3000, routes per §3.

## 21. Limitations

1. **No viewport emulation tool** — responsive behavior assessed from Tailwind breakpoint usage in source, not live device rendering.
2. **Empty-state rendering for 0-brand dashboard and post-generation flows** not exercised (2 brands exist; generation requires a full model run — out of read-only scope).
3. **Lighthouse run once** on `/dashboard` only; other routes sampled via DOM checks.
4. **Keyboard-only walkthrough** approximated via a11y-tree/focus-style inspection, not a full tab-order session.
5. **Screen-reader output** not captured directly (no SR available); aria semantics inferred from DOM.
