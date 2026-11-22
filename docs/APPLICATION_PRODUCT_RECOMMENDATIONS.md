# Application Product Recommendations — Social Studio (mmsi)

**Companion to:** `APPLICATION_EXPERIENCE_AUDIT.md`
**Date:** 2026-11-22
**Split:** **Part 1 — Corrections** (restore/attain promised or standard-level behavior) vs **Part 2 — Enhancements** (new value beyond the current spec). No code was changed during this audit.

---

# Part 1 — Corrections

These are gaps against accessibility standards, internal consistency, or the app's own conventions. They are obligations, not options.

| # | Correction | Issue / IMP | Severity | Why it's a correction |
|---|-----------|-------------|----------|----------------------|
| C1 | Fix `.btn-primary` color contrast to ≥ 4.5:1 | UX-001 / IMP-01 | High | Only WCAG 2.2 SC 1.4.3 failure in the product; blocks the primary dashboard CTA for low-vision users |
| C2 | Add distinct `document.title` + description per route | UX-004 / IMP-02 | Medium | Every route currently claims the same title — basic document hygiene the platform expects of any app |
| C3 | Mark the active nav item with `aria-current="page"` + visible state | UX-005 / IMP-03 | Medium | Standard navigation semantics; users currently get no reliable "you are here" signal |
| C4 | Replace default Next 404 with a branded, linked error page | UX-006 / IMP-04 | Medium | A dead-end default page contradicts the product's otherwise complete PageChrome experience |
| C5 | Announce save results via `role="status"` / `aria-live` | UX-007 / IMP-05 | Medium | WCAG 4.1.3 (Status Messages); "✓ Saved" is invisible to screen-reader users |
| C6 | Give every Delete control an object-specific accessible name | UX-008 / IMP-06 | Medium | Two identical "Delete" buttons with destructive effect violate 4.1.2 and are genuinely dangerous to AT users |
| C7 | Standardize "Insta" → "Instagram" in headings | UX-003 / IMP-07 | Medium | The app already uses "Instagram" everywhere else; two names for one object is a correctness bug in copy |
| C8 | Replace UI emoji with the existing SVG icon language (or `aria-hidden` them) | UX-002 / IMP-08 | Medium | Emoji render differently per OS, break the glass/SVG design system, and leak into the accessibility tree |
| C9 | Make Back always land inside the app | UX-009 / IMP-10 | Low | The control's contract ("Back" within the product) is violated when history originates externally |
| C10 | Give "Post not found" a real recovery path | UX-010 / IMP-11 | Low | Current state is a single dead-end link; error states must offer exits per basic error-handling UX |
| C11 | Align landing CTA label with its destination | UX-011 / IMP-12 | Low | "Open Studio" opening a brand list is a label/behavior mismatch — the app keeps its own promises |
| C12 | Remove unexplained jargon from the dashboard H1 | UX-012 / IMP-13 | Low | "Command Dashboard" is internal vocabulary surfaced verbatim to users |
| C13 | Derive landing stats (15/25/5+) from source constants | UX-013 / IMP-14 | Info | Hardcoded numbers that describe the product will drift — a factual error waiting to happen |
| C14 | Unify section-heading treatment (sentence case vs ALL CAPS) | UX-014 / IMP-13 | Info | Internal style consistency — the app already has a de facto rule; enforce it |

**Correction totals: 14** (1 High · 7 Medium · 4 Low · 2 Info) — identical to the audit register UX-001–UX-014.

**Definition of done for corrections:** Lighthouse a11y 1.00 on `/dashboard`; greps for emoji / `aria-current` / per-route titles pass; manual checklist re-run shows zero `[!]`.

---

# Part 2 — Enhancements

Ideas that go beyond fixing what exists — optional product value, prioritized by leverage. Each is deliberately outside the correction mandate.

### E1 · Onboarding checklist on first run (Priority: High)
Empty-state pages explain themselves well already; take the next step — a dismissible 4-step checklist ("Connect AI provider → Create brand → Generate first post → Approve & export") with live completion state. Drives activation for the hardest first session. *Builds on the existing empty-state copy quality.*

### E2 · Command palette (⌘K) (Priority: Medium)
Jump to brands, templates, settings tabs, and approved posts from anywhere. The app already has a "Command Dashboard" — make the command metaphor real. Low visual cost, high power-user leverage.

### E3 · Inline toasts for cross-page confirmations (Priority: Medium)
Save feedback (C5) fixes the accessibility floor; a small toast system gives everyone visible confirmation for delete/approve/generate actions that currently change state silently.

### E4 · Recent-brands pinning on the dashboard (Priority: Medium)
Two brands fit today; at 10+ the grid degrades. Pin/favorite brands and sort by last-updated ("Updated 21/11/2026" is already tracked — surface it as sort + relative time like "2 days ago").

### E5 · Relative timestamps + timezone-safe display (Priority: Low)
Dates render as `21/11/2026` (locale-dependent dd/mm vs mm/dd ambiguity). Ship a single date util with explicit format and relative mode for card metadata.

### E6 · Search/filter on template picker (Priority: Low)
15 templates are fine; the 25-goal grid on the generator page is the real scan burden — add a filter input above the goal list (and later, template search if the count grows).

### E7 · Draft/approved counts on the brand card (Priority: Low)
Dashboard cards already show `0 POSTS / 0 APPROVED` — mirror that on `/projects` cards so the brand list isn't purely navigational.

### E8 · Keyboard shortcut hints (Priority: Low)
Show `⌘K`/`Esc` affordances once E2/E3 exist; also add skip-to-content link as a cheap a11y win alongside.

### E9 · Dark/light theme token audit (Priority: Info)
The app is confidently dark. If light mode is ever planned, the emoji/icons (C8) and contrast work (C1) are prerequisites — note it as roadmap coupling, not a now-item.

### E10 · Share/OG image per brand (Priority: Info)
Once C2 lands (per-route titles), add per-route OG images for brand pages — useful if workspaces are ever shared between users.

---

## Positioning summary

- **Corrections (14)** are the mandate: accessibility, consistency, and honest labeling. Nothing here is discretionary; C1 (contrast) is the single High.
- **Enhancements (10)** are sequenced options: E1 and E3 have the best activation/feedback return for least effort; E2 is the power-user multiplier; the rest are backlog.
- **Suggested sequencing:** Phase 1 corrections (C1–C5) → Phase 2 (C6–C8) → E3 toasts (absorbs C5 UX) → E1 onboarding → remaining corrections + E2.

**Final audit tallies:** 14 modules · 12 surfaces · 14 issues (0 Critical / 1 High / 7 Medium / 4 Low / 2 Info) · 15 improvements · 116 checklist items (60 pass / 25 defect / 31 open) · 10 enhancements · overall experience score **7.6 / 10**.
