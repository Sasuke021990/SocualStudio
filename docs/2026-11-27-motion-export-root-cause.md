# Root Cause — Reel Export Fails "Relink the original media" (motion popups)

**Date:** 2026-11-27 · **Status:** fixed · **Commit:** `d93548a`

## Symptom
Reel generation failed at the final export step:

```
OpenReel step failed — Export 15s reel: Relink the original media before exporting:
motion-motion-instance-… (JOB_FAILED: Relink the original media before exporting: …)
```

Two ids, one per kinetic hook-text popup.

## Root cause
The kinetic popups were built with OpenReel's **Motion Creator path**:
`create_motion_composition` → `add_motion_layer` → `add_motion_text_animator` → `insert_motion_into_editor`.

`insert_motion_into_editor` places a clip whose `mediaId` is a synthetic
`motion-motion-instance-*` item. That item **never enters the media library**
(`list_media` returns `[]` for it) — so the exporter treats it as **offline
media** and refuses every render with "Relink the original media".

Proved app-side (all failed with the identical error):

- `export_video` with an inserted motion instance
- `run_motion_render_queue` on the composition itself
- `export_motion_video` on a **fresh, never-inserted** composition
- `save_project` / `save_project_as` before export (no Media-folder home created)
- `queue_motion_render` (produces an item, render fails with the same message)

Conclusion: the motion-composition media never materializes as linkable media in
this OpenReel build — the gap is on the app side of the MCP boundary.

## Fix
Kinetic popups now use the **Essential Graphics** path instead:

`insert_graphic_template({ templateId: "builtin-title-hero", startTime, duration, values })`

- Graphic templates are first-class rendered scenes: verified **export succeeds**
  (9.5 MB MP4 probe) with popups in place.
- Built-in animated intro/outro (≈1.3 s in / 0.5 s out) preserves the kinetic feel.
- Controls used: `title`, `showSubtitle: false`, `titleColor`, `lineColor`.
- Duration clamped to the template floor: min 1.9 s, max 6 s.
- Removed the dependent beat-sync steps (`sync_motion_to_audio`,
  `apply_motion_preset_to_beats`) — they targeted motion-composition tokens
  that no longer exist.

## Trade-offs
- Popup styling is now template-driven (Hero Title look) instead of per-style
  shader animators (`text-reveal-up`, `glyph-dissolve`, …). Those style
  directives remain in the spec but are unused while the motion path is broken.
- If OpenReel later materializes motion-instance media correctly, the
  composition path can be restored behind a capability check.
