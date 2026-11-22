# Social Studio Redesign — Build Plan

Per docs/ui-redesign-plan.md. Phased; gates (lint/tsc/build) after each.

- [x] Phase 0: @ui-sdk/react installed, docs read
- [x] Phase 1: design system CSS (Command Center + Neo-Glass tokens)
- [x] Phase 2: shared nav (back pill, gear, brand chip) + landing page /
- [x] Phase 3: /projects + /projects/new (Create Brand, extraction flow)
- [x] Phase 4: /studio/[brainId] (templates) + /studio/[brainId]/[templateId] (goals + generation)
- [x] Phase 5: /drafts, /settings (workspace + approved routes kept, restyle pending)
- [x] Phase 6: AI provider default = OpenAI + auto models + local dummy key
- [ ] Phase 7: restyle workspace/approved to new system, remove /classic, final polish + browser verify

Conventions (ui-sdk skill):
- imports from entries (@ui-sdk/react/button etc)
- @layer ui-sdk; at top of global css
- style via data-slot/state attrs, name all controls
- key lists by id

Verified 2026-11-22: all routes 200 (/, /projects, /projects/new, /classic, /drafts, /settings, /studio/*, /studio/*/*).
