# UI/UX Audit Report — Social Studio (mmsi)

Audit date: 2026-11-22
Scope: user-facing experience only (no backend/API/logic review)
Method: source inspection of every page + live DOM inspection on http://localhost:3000

---

## 1. Executive Summary

- **Overall:** The app has a coherent dark "glass" design system, clear page purposes, and a sensible core journey (create brand → generate → approve → export). It reads as a modern product, not a prototype — but consistency breaks sharply on the approved-post detail page, and naming is the single biggest source of confusion.
- **Usability:** Good. Main flows are reachable and mostly self-explanatory. Biggest friction: the Projects brand card has two competing click targets (user-reported), and "drafts" have a weak, buried home.
- **Visual quality:** Good baseline (consistent glass cards, gradient accents, animated entrances). One outlier page (`/approved/[id]`) uses a completely different light zinc/white styling.
- **Navigation:** Functional but inconsistent labeling ("Landing", "Projects" vs "Your Brands", "Approved" vs "Approved Posts") and fixed back targets that don't match where the user came from.
- **Responsive:** Reasonable breakpoint usage across pages; a few fixed-padding and untruncated-chip risks on mobile. Not physically verified at all viewports (see limitations).
- **Accessibility:** Decent foundations (`:focus-visible`, `aria-hidden` icons, labeled dialog fields). Main gap: selection state on goal buttons conveyed by color/shadow alone (no `aria-pressed`).
- **Total issues: 29** — 0 Critical, 5 High, 10 Medium, 13 Low, 1 Enhancement-class note folded into roadmap.
- **Top recommendation:** unify terminology (workspace/brands/approved), re-skin `/approved/[id]` to the design system, and resolve where "drafts" live before the planned brand-page change removes their only listing.

## 2. Project UI Inventory

| Module / Page | Route | Status |
|---|---|---|
| Landing | `/` | Inspected (source + live) |
| Command Dashboard | `/dashboard` | Inspected (source + live) |
| Your Brands (Projects) | `/projects` | Inspected (source + live) |
| Create New Brand | `/projects/new` | Inspected (source) |
| Brand Workspace (brand page) | `/brand/[brainId]` | Inspected (source + live) |
| Studio (template picker) | `/studio/[brainId]` | Inspected (source) |
| Template generation | `/studio/[brainId]/[templateId]` | Inspected (source) |
| Approved hub | `/approved` | Inspected (source + live) |
| Approved post detail | `/approved/[id]` | Inspected (source) |
| Post Workspace | `/workspace/[id]` | Partially Inspected (source, first 120 lines) |
| Settings | `/settings` | Inspected (source) |

Shared components: `PageChrome/BackPill/GearButton/BrandChip` (nav.tsx), `StatCard/DraftCard/ApprovedCard/EmptyState/MetaChips` (content-widgets.tsx), `DeleteBrandDialog`, `InstagramPostCard`, settings setup forms (Provider/Workspace/Voice/ComfyUI).
Navigation sections: back pill (top-left), brand chip + gear (top-right), page-header action buttons. No sidebar, no global nav bar, no breadcrumbs.

## 3. Page-by-Page Audit (condensed)

| Page | Route | Visual | Layout | Typography | UI Elements | Text | Navigation | Responsive | A11y | Key recommendations |
|---|---|---|---|---|---|---|---|---|---|---|
| Landing | `/` | Good | Good | Good | Two identical primary CTAs (by user request) | Good | No nav to app pages other than CTAs | OK | OK | Keep; later revisit CTA hierarchy |
| Dashboard | `/dashboard` | Good | Good | Good | Quick actions duplicate header buttons | "one click to the full picture" vague | Back label "Landing" | OK | OK | UI-012/013/016 |
| Your Brands | `/projects` | Good | Good | Good | **Dual click targets on brand card** | "Projects" vs "Your Brands" naming | "Approved" button naming | OK | OK | UI-002/003/016 |
| Create Brand | `/projects/new` | Good | Good | Small text ok | Emoji button labels; Enter-only chip input | "← Re-extract" misleading | OK | File input claims PDF/DOCX support that can't work | OK | UI-009/010/023/024 |
| Brand Workspace | `/brand/[brainId]` | Good | Stats overlap logic | 10px labels | No loading state (empty-state flash) | "approve in Approved" wrong | Heading-as-link undiscoverable | Chip overflow risk | Heading lost h1 semantics | UI-005/007/022 |
| Studio | `/studio/[brainId]` | Good | Good | Good | OK | "25 post types" = goals, misleading | OK | OK | OK | UI-008 |
| Template generation | `/studio/[brainId]/[templateId]` | Good | Dense goal grid OK | h1 lacks explicit color | Selection by color only | "Save N to Drafts" destination unclear | OK | OK | No aria-pressed | UI-011/017/029 |
| Approved hub | `/approved` | Good | Good | Good | "Section X of Y" noise | "brand workspace" term collision | OK | OK | OK | UI-004/020/027 |
| Approved detail | `/approved/[id]` | **Off-system (light zinc theme)** | OK | Mixed systems | Custom back link, no gear/settings access | "248 likes" fake | Back link style inconsistent | Stacks OK | alt="post" generic | UI-006/015/025 |
| Post Workspace | `/workspace/[id]` | Partial | Partial | Partial | Partial | Partial | Partial | Partial | Partial | See limitations |
| Settings | `/settings` | Good | Good | Good | Tabs pattern good | Good | Back to "Projects" naming | OK | OK | UI-016 |

## 4. Detailed UI Issue Register

**UI-001** — Metadata / all pages — Text — **High**
Element: browser tab title + meta description. Current: "Create Next App" / "Generated by create next app" (`layout.tsx:15-18`); verified in live browser tab list on /dashboard, /projects, /approved. Problem: boilerplate branding on every page except the landing override. Impact: unprofessional, confusing with multiple tabs open. Fix: set global metadata `title: "Social Studio"`, `description: "AI-powered social media content studio — local & private."`, keep landing override. Expected: every tab reads "Social Studio". Evidence: layout.tsx:15-18; browser tabs list.

**UI-002** — Your Brands / `/projects` — UX Flow — **High**
Element: brand card. Current: whole card body links to `/brand/[brainId]` (chevron implies "open"), plus a separate small "Studio" text link and "Delete" link (`projects/page.tsx:106-141`). Problem: two competing navigation targets on one card; user reported clicking the card should open Studio. Impact: users land on brand page when they expect Studio. Fix: card body → `/studio/[brainId]`; keep explicit entry to brand page elsewhere (or drop the duplicate side link). Expected: one clear click target per card. Evidence: projects/page.tsx:106-133; user screenshot 2026-11-22.

**UI-003** — Your Brands / `/projects` — Navigation — **Medium**
Element: header buttons. Current: "Dashboard | Approved | + New Brand" (`projects/page.tsx:62-69`), while /dashboard calls the same destination "Approved Posts". Problem: inconsistent label + user wants the button removed (HotFIX item 2). Impact: label mismatch across pages; extra nav noise. Fix: remove "Approved" button (per HotFIX); keep Dashboard + New Brand. Evidence: projects/page.tsx:63.

**UI-004** — Cross-app — Text — **High**
Element: the word "workspace". Current: three meanings — "Brand Workspace" button → `/brand/[id]` (studio-client.tsx:73), "Open in Workspace →" → `/workspace/[id]` post editor (content-widgets.tsx:172-173), and "Export Workspace Folder" (approved-client.tsx:109). Problem: one term, three destinations. Impact: users can't predict what "workspace" opens. Fix: rename consistently — e.g. "Brand page" / "Post editor" / "Export folder". Expected: each destination has a unique name. Evidence: cited lines; approved/page.tsx:110 "brand workspace".

**UI-005** — Brand Workspace — Text — **Medium**
Element: workflow strip. Current: "Generate in Studio → finish in Workspace → approve in Approved → publish manually." (brand-client.tsx:120). Problem: approval happens in the post Workspace (markApproved) or via DraftCard "Approve" — not "in Approved"; Approved is where approved posts collect. Impact: users look for an approve button on the Approved page. Fix: "Generate in Studio → finish & approve in Workspace → collect on Approved → publish manually." Evidence: workspace-client.tsx:119; content-widgets.tsx:89.

**UI-006** — Approved detail `/approved/[id]` — Visual Design — **High**
Element: entire page chrome. Current: light-theme zinc/white Tailwind classes (`text-zinc-500`, `border-zinc-200`, `bg-white/60`, `dark:` variants) and a custom back pill (approved-client.tsx:85-116, 130-143) instead of the dark glass system + PageChrome used everywhere else. Problem: page looks like a different app; also no gear button → Settings unreachable from here. Impact: breaks visual continuity and nav consistency. Fix: restyle with `glass`, `var(--muted)`, `BackPill`/`PageChrome` conventions. Expected: matches Approved hub styling. Evidence: approved-client.tsx:85-116 vs nav.tsx:33-51.

**UI-007** — Brand Workspace, Approved detail — UX Flow — **Medium**
Element: loading states. Current: projects/dashboard/approved hub show skeleton `glass animate-pulse` cards; approved detail shows plain text "Loading approved posts..." (approved-client.tsx:60-66); brand page has **no** loading state — briefly shows "No drafts yet" empty state before data arrives (brand-client.tsx:39-42, 132-137). Problem: three different loading patterns; false empty state on brand page. Impact: users think data is gone. Fix: unify on skeleton pattern; add loading gate on brand page before rendering empty state. Evidence: cited lines.

**UI-008** — Studio — Text — **Medium**
Element: tips strip. Current: "Pick a goal first: 25 post types from Launch to Meme." (studio-client.tsx:12). Problem: these are **goal types** (landing says "25 Goal types"; landing-sections.tsx:5), and "post types" already means templates (CONTENT_TEMPLATES). Impact: users confuse goals with templates. Fix: "Pick a goal first: 25 goal types from Launch to Meme." Evidence: studio-client.tsx:12 vs landing-sections.tsx:4-5.

**UI-009** — Create Brand review view — Text — **Medium**
Element: secondary button. Current: "← Re-extract" (projects/new/page.tsx:241) but it only returns to the intake view. Problem: label promises re-extraction. Impact: users expect a new extraction to run. Fix: "← Back to source". Evidence: projects/new/page.tsx:241 vs setView("intake") behavior.

**UI-010** — Create Brand file upload — UX Flow — **Medium**
Element: upload control. Current: accepts `.txt,.md,.docx,.doc,.pdf` (projects/new/page.tsx:171) but reads with `f.text()` (line 176) — binary PDF/DOCX produce garbage. Problem: advertised formats can't work through this path. Impact: user uploads a PDF, extraction output is corrupted; blamed on AI. Fix: accept `.txt,.md` only, or add real PDF/DOCX parsing server-side. Expected: only formats that actually work are offered. Evidence: projects/new/page.tsx:171,176.

**UI-011** — Template page → drafts — UX Flow — **High**
Element: "💾 Save N to Drafts" (template-client.tsx:281). Current: drafts are only listed on the brand page ("Draft Insta Posts"). Planned HotFIX item 3 removes that section ("drafts live in Studio") — but the Studio page has no drafts list (studio-client.tsx shows only template grid + tips). Problem: after the planned change, saved drafts have **no visible destination anywhere**. Impact: users save posts and can't find them. Fix (decision needed): add a "Drafts" section to Studio, or keep drafts on the brand page, or route "save" differently. Expected: every saved draft has an obvious home. Evidence: template-client.tsx:281; studio-client.tsx:95-134; HotFIX.md item 3.

**UI-012** — Dashboard — UI Component — **Low**
Element: "Quick actions" panel (dashboard/page.tsx:164-172). Problem: duplicates the header buttons (Your Brands / Approved Posts / New Brand) plus Settings. Impact: clutter. Fix: remove panel or keep only Settings. Evidence: dashboard/page.tsx:81-83 vs 168-171.

**UI-013** — Dashboard — Text — **Low**
Element: subtitle. Current: "Every brand at a glance — approved posts ready to publish, and one click to the full picture." Problem: "the full picture" is vague. Fix: "Every brand at a glance — approved posts ready to publish, and quick access to each workspace." Evidence: dashboard/page.tsx:75-77.

**UI-014** — Cross-app — Typography — **Low**
Element: `text-[10px]` labels (MetaChips content-widgets.tsx:43-46; StatCard label :33; stat labels dashboard/page.tsx:147-151). Problem: 10px text below readability minimum, especially uppercase + wide tracking. Fix: 11–12px minimum. Evidence: cited lines.

**UI-015** — Approved detail — Text — **Low**
Element: Instagram mock. Current: hardcoded "248 likes" (approved-client.tsx:178). Problem: fake data presented as post preview. Fix: "0 likes" or omit the likes line in the mock. Evidence: approved-client.tsx:178.

**UI-016** — Cross-app — Navigation — **Medium**
Element: back pills + page names. Current: back labels "Landing" (/projects:51, /dashboard), "Projects" (/projects/new:103, /settings:22, /studio:55) while that page's h1 is "Your Brands", "Dashboard" (/brand:62, /approved:85), "Back to Approved" (/approved/[id]:90). Problem: same destination named differently ("Landing" is dev jargon; "Projects" vs "Your Brands"); back targets are fixed, not origin-based (user-reported). Fix: standardize names (e.g. "Home", "Brands", "Dashboard", "Approved") and decide fixed vs dynamic back. Evidence: cited lines; nav.tsx:3-12.

**UI-017** — Template page — Visual Design — **Low**
Element: h1 (template-client.tsx:206). Problem: missing explicit `style={{ color: "#fff" }}` used by every other h1. Currently inherits correctly but is one theme change away from breaking. Fix: match the pattern. Evidence: template-client.tsx:206 vs page.tsx:96.

**UI-018** — PageChrome — Responsive — **Low**
Element: BrandChip (nav.tsx:25-31). Problem: brand name not truncated; long names + back pill + gear can crowd 390px width; sections use fixed `px-8`. Fix: `max-w-[10rem] truncate` on chip; responsive padding. Evidence: nav.tsx:25-31, 41.

**UI-019** — Brand Workspace cards — UI Component — **Low**
Element: MetaChips brand chip (content-widgets.tsx:39-53). Problem: shows brand name on every card inside that brand's own page — redundant. Fix: hide `brandName` chip when the page context is the brand. Evidence: content-widgets.tsx:46.

**UI-020** — Approved hub — UI Component — **Low**
Element: "Section 1 of 2" footer (approved/page.tsx:163-165). Problem: noise, no user value. Fix: remove. Evidence: approved/page.tsx:163-165.

**UI-021** — DeleteBrandDialog — UI Component — **Low**
Element: confirmation input (DeleteBrandDialog.tsx:92-98). Problem: placeholder equals the brand name (shows the answer); exact, case-sensitive match with no hint about case. Fix: placeholder "Type brand name"; hint "Must match exactly". Evidence: DeleteBrandDialog.tsx:96-97, 37.

**UI-022** — Brand Workspace stats — UI Component — **Medium**
Element: stat cards (brand-client.tsx:92-104). Problem: "Posts" = total = Drafts + Approved; three overlapping numbers confuse hierarchy (user screenshot shows 1 POSTS / 0 DRAFTS). Fix (per HotFIX item 3): show Posts + Approved only. Evidence: brand-client.tsx:93-103; user screenshot 2026-11-22.

**UI-023** — Cross-app — Text — **Low**
Element: button voice. Current: emoji-prefixed labels ("✨ Extract Brand Intelligence", "💾 Save & Open Studio", "📁 Export Workspace Folder", "💾 Save N to Drafts") mixed with clean labels ("New Brand", "Open Studio", "Dashboard"). Problem: inconsistent voice. Fix: pick one policy (recommend: no emoji in button labels). Evidence: projects/new/page.tsx:196,239; approved-client.tsx:109; template-client.tsx:281.

**UI-024** — Create Brand ArrayField — UI Component — **Low**
Element: chip input (projects/new/page.tsx:263-276). Problem: Enter-only add, no visible add button; mobile keyboards may not submit. Fix: add explicit "+" button. Evidence: projects/new/page.tsx:263-276.

**UI-025** — Approved detail — Navigation — **Low**
Element: back link (approved-client.tsx:86-91). Problem: custom-styled link instead of shared `BackPill`; inconsistent with every other page. Fix: use `BackPill`/`PageChrome`. Evidence: approved-client.tsx:86-91 vs nav.tsx:3-12.

**UI-026** — Approved detail — UX Flow — **Low**
Element: sidebar post switch (approved-client.tsx:34-37). Current: `router.replace` — switching posts replaces history so browser-back skips previously viewed posts. Problem: minor history confusion. Fix: use `router.push` if per-post history is desired. Evidence: approved-client.tsx:36.

**UI-027** — Approved hub empty state — Text — **Low**
Element: hint text. Current: "Approve drafts from a brand workspace and they will collect here." Problem: "brand workspace" term collision (UI-004). Fix: "Approve drafts from a brand's post editor and they collect here." Evidence: approved/page.tsx:110.

**UI-028** — Approved detail — Visual Design — **Low**
Element: post preview `alt="post"` (approved-client.tsx:161). Problem: generic alt text; screen readers hear "post". Fix: `alt={current.title}` or empty alt + visible title. Evidence: approved-client.tsx:161.

**UI-029** — Template page goal grid — Accessibility — **Medium**
Element: goal buttons (template-client.tsx:216-236). Problem: selected state conveyed only via border/shadow color (`style={goal?.id === g.id …}`); no `aria-pressed`, no non-color cue. Impact: color-blind and screen-reader users can't tell which goal is selected. Fix: add `aria-pressed={goal?.id === g.id}` and a checkmark/badge for selection. Evidence: template-client.tsx:220-221.

## 5. Visual Text Correction Report

| Page | Existing Text | Problem | Recommended Text |
|---|---|---|---|
| All (metadata) | "Create Next App" | Boilerplate app name in tab | "Social Studio" |
| All (metadata) | "Generated by create next app" | Boilerplate | "AI-powered social media content studio — local & private." |
| /projects, /dashboard back pill | "Landing" | Dev jargon | "Home" |
| /projects/new, /settings, /studio back pill | "Projects" | Page h1 says "Your Brands" | Match chosen name (see UI-016) |
| BrandChip title | "Back to projects" | Name mismatch | "Back to Your Brands" |
| /brand workflow | "Generate in Studio → finish in Workspace → approve in Approved → publish manually." | Approval isn't done "in Approved" | "Generate in Studio → finish & approve in Workspace → collect on Approved → publish manually." |
| /studio tip | "Pick a goal first: 25 post types from Launch to Meme." | They're goal types | "Pick a goal first: 25 goal types from Launch to Meme." |
| /projects/new | "← Re-extract" | Doesn't re-extract | "← Back to source" |
| /approved empty | "Approve drafts from a brand workspace and they will collect here." | Term collision | "Approve drafts from a brand's post editor and they collect here." |
| /approved/[id] empty | "No approved posts." | Terse, off-pattern | "No approved posts yet." + hint matching EmptyState style |
| /approved/[id] mock | "248 likes" | Fake data | "0 likes" or remove line |
| /dashboard subtitle | "…and one click to the full picture." | Vague | "…and quick access to each brand." |
| /approved section footer | "Section 1 of 2" | Noise | Remove |

## 6. Navigation & Information Architecture Report

Current structure:
```
Landing (/) ─ Open Studio → /projects … Dashboard → /dashboard
/dashboard ─ brand card → /brand/[id] · Approved Posts → /approved · New Brand → /projects/new
/projects ─ brand card → /brand/[id] (+ side "Studio" link → /studio/[id]) · Dashboard · Approved · New Brand
/brand/[id] ─ heading/CTA → /studio/[id] · back → /dashboard · Delete
/studio/[id] ─ template → /studio/[id]/[tpl] · Brand Workspace → /brand/[id] · back → /projects
/studio/[id]/[tpl] ─ back → /studio/[id] · Save → drafts
/approved ─ card → /approved/[id] · back → /dashboard · Open brand → /brand/[id]
/approved/[id] ─ back → /approved · sidebar switch
/workspace/[id] (from DraftCard) · /settings (gear, everywhere except /approved/[id])
```

Problems: duplicate destination names (UI-004/016); competing card targets (UI-002); "Approved" vs "Approved Posts" (UI-003); Settings unreachable from `/approved/[id]` (UI-006); fixed back targets vs user expectation (UI-016, user-reported); drafts destination gap after planned change (UI-011).
Recommended hierarchy: Home → Brands → (Brand page | Studio → Template) → Approved → Approved detail; Settings via gear on every page. Names: **Home / Brands / Dashboard / Studio / Approved / Post editor** — one name per destination.

## 7. End-to-End User Journey Report

| Journey | Current Steps | Problem | Missing Step | Recommended Flow |
|---|---|---|---|---|
| Create brand | /projects/new → source → extract → review → save → Studio | "← Re-extract" misleads (UI-009); PDF/DOCX garbage (UI-010) | — | Fix labels; restrict or implement formats |
| Generate → publish | Studio → template → goal → generate → select → Save to Drafts → brand page drafts → Approve/Workspace → /approved → export | Drafts home is buried; disappears after planned change (UI-011); "approve in Approved" copy misleads (UI-005) | Visible drafts destination | Decide drafts home; fix workflow copy |
| Pick existing brand | /projects → click card | Card opens brand page, users expect Studio (UI-002) | — | Card → Studio (HotFIX item 1) |
| Delete brand | trigger → type name → confirm → dashboard | OK (good gated dialog) | — | Keep |
| Configure settings | gear → tabs → save | OK; unreachable from /approved/[id] (UI-006) | gear on every page | Restyle approved detail with PageChrome |
| Switch approved posts | /approved/[id] sidebar | replace() drops history (UI-026) | — | push() if history desired |

## 8. UI Component Correction Report

| Existing | Problem | Recommended | Location |
|---|---|---|---|
| Dual-target brand card | Competing links | Single link body + one action row | projects/page.tsx:105-143 |
| Plain-text loading on approved detail | Off-pattern | Skeleton glass cards | approved-client.tsx:60-66 |
| No loading gate on brand page | False empty state | Skeleton before empty state | brand-client.tsx:39-42 |
| Custom zinc back pill | Off-system | BackPill/PageChrome | approved-client.tsx:85-91 |
| "Section X of Y" footer | Noise | Remove | approved/page.tsx:163-165 |
| Quick actions panel | Duplicates header | Remove or Settings-only | dashboard/page.tsx:164-172 |
| Goal button selection color-only | A11y | aria-pressed + badge | template-client.tsx:220-221 |
| Enter-only chip input | Hidden affordance | Explicit add button | projects/new/page.tsx:263-276 |
| Delete dialog placeholder = answer | Reveals answer | Neutral placeholder + case hint | DeleteBrandDialog.tsx:96-97 |
| `text-[10px]` meta labels | Readability | ≥ 11–12px | content-widgets.tsx:33,43-46 |

## 9. Responsive Design Report

- **Desktop 1920 / Laptop 1366:** layouts max-w-6xl centered; fine.
- **Tablet 768:** grids collapse via sm/lg breakpoints; goal grid 4-col; fine.
- **Mobile 390:** risks — PageChrome row (back pill + brand chip + gear) crowding with untruncated brand names (UI-018); fixed `px-8` page padding; DeleteBrandDialog correctly handles small widths (`width: calc(100vw - 2rem)`).
- Not physically verified at each viewport this session (limitation) — findings above are source-derived.

## 10. Accessibility Report

Good: global `:focus-visible` outline (globals.css:56-60); decorative SVGs `aria-hidden`; GearButton `aria-label`; dialog field labels; chips have `aria-label` for remove buttons.
Gaps: UI-029 (color-only selection, no aria-pressed) **Medium**; UI-028 (generic alt text) Low; heading semantics on brand page — the h1 is a `<Link>` styled as heading (brand-client.tsx:67), so no real `h1` landmark on the page — Low/Medium; emoji-in-buttons read aloud inconsistently (UI-023) Low. Text contrast of `--muted #a3a9bd` on dark background is adequate.

## 11. Design System Recommendations

- **Typography:** one h1 pattern (`text-4xl font-bold`, `color:#fff`); minimum meta text 11–12px; drop 10px uppercase labels.
- **Color:** dark glass only — ban zinc/white light-theme classes (approved detail); statuses: green #34d399 (approved), amber #fbbf24 (archived), red var(--rose) (destructive) — use tokens, not inline hex (#f87171 in DraftCard → var(--rose)).
- **Spacing:** keep 8px rhythm; responsive page padding (px-5 → px-8).
- **Buttons:** btn-primary / btn-ghost only; no emoji in labels; destructive = ghost + rose text + confirm dialog.
- **Cards:** glass + card-hover; one link target per card.
- **Navigation:** BackPill + PageChrome everywhere (including /approved/[id]); one name per destination.
- **Icons:** current inline-SVG style is consistent — keep; always aria-hidden when decorative.
- **Loading:** skeleton `glass animate-pulse` everywhere.

## 12. Priority-Based Fix Roadmap

**Phase 1 — Critical fixes:** none blocking.
**Phase 2 — High priority:** UI-001 (metadata), UI-002 (card targets), UI-004 (workspace naming), UI-006 (approved detail restyle + gear), UI-011 (drafts home decision — gate for HotFIX item 3).
**Phase 3 — Visual consistency:** UI-007 (loading states), UI-014 (text sizes), UI-017, UI-019, UI-022 (stats), UI-025, UI-028.
**Phase 4 — UX improvements:** UI-003, UI-005, UI-008, UI-009, UI-010, UI-012, UI-013, UI-015, UI-016, UI-020, UI-021, UI-023, UI-024, UI-026, UI-027.
**Phase 5 — Accessibility & polish:** UI-029 + remaining Low items.
Dependencies: UI-011 blocks HotFIX item 3; UI-016 naming decision feeds UI-002/003/004 copy.

## 13. Final Assessment

- Pages discovered: 11 · Inspected: 10 · Partially inspected: 1 (`/workspace/[id]`) · Not inspected: 0
- Issues: 29 total — High 5, Medium 10, Low 14 (incl. UI-026/028)
- Most problematic modules: `/approved/[id]` (off-system styling), cross-app naming, brand/projects card navigation
- Most common inconsistency: terminology (workspace/brands/approved/landing) and loading patterns
- **Top 10 fixes:** UI-001, UI-002, UI-011, UI-006, UI-004, UI-016, UI-007, UI-005, UI-010, UI-029
- **Limitations:** screenshot reading unavailable in this session (visual evidence = live DOM + source references); responsive viewports judged from source breakpoints, not physically resized; `/workspace/[id]` read partially; settings tab panels' inner forms (Provider/Workspace/Voice/ComfyUI) inspected at import level only; live interactions (generation flows) not exercised end-to-end.
