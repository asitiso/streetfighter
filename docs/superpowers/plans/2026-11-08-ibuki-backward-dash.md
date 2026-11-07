# Ibuki backward dash implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-roster authored motions with Ibuki backward dash.
**Architecture:** Reuse gated6source/7stored-frame builder and8tick directional mapper, preserve14prior records/art and approved source binding/pipeline. Profile has zero offsets; Fighter owns travel.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python/Pillow pipeline.
**Spec:** Standing all-character motion asset request and latest continuation.

## Choices
Reuse shared importer, semantics and rollback tests to avoid extra maintenance. New backward weight transfer gives a visible improvement over generic forward art. Preserve speed/duration/hit stop/interruptions. Keep all numeric art limits.

## Review focus
Both world directions/facings; source scale/opaque sole and idle handoffs; preservation and atomic write failures; wrong direction/static/translated/forward negatives; combined movement/combat preload.

## Tasks
- [x] Real directional input test RED for missing Ibuki authored backdash.
- [x] Built-in six-pose source and exact prompts, original gates/handoffs.
- [x] IBUKI dash-back-only selector, approved metadata retained, original idle sole alignment; registry/profile/assets/cache130 and isolated validation.
- [x] Fresh build/full standard suite/runtime/preview and independent review.
- [x] Commit/update PR2 with identical local/remote tree; no merge.

RED/GREEN: real directional test first failed missing forward direction, then passes with authored backward strip10380Canvasdraws. Original numeric limits unchanged; residual average0.039942/peak0.059651, backwarddrive53.392699 and drive torso-57.430454. Idle reference342px/opaque sole429px. All14prior records/art and source bindings preserved. Source passed first generation; exact prompt saved. Shared ingest fixture parameterized rather than duplicated.

Nine installed backward-dash runtime gates pass; actual-input both-facing preview reaches [0,1,3,4,5,6], keeps facing, includes hit stop and ends idle. Combined movement/combat requests7317686bytes for Ibuki including499778newbytes, under existing13MB cap. No manual browser playthrough.

Independent read-only review: no P1/P2; source/actual-input preview,14prior records and source bindings, pipeline, direction/profile, fixture parameterization and preload accounting checked. Baseline PWA network policy untouched.

Final evidence: full83commands80pass, existing v025-resilience/v028-rc3/v063-rc38PWA failures unchanged. Clean TypeScript/production build and release integrity408files hash13E5545CCD28C744. Final render-sizing test exposed implicit world-right direction in an old left-facing fixture; specify forward direction then capture backward separately, check384/640px cell dimensions with fresh draw calls. RED observed before fixture update, then GREEN; all11focused checks now pass. No production fix was required for this old fixture assumption. Standard-produced reports restored; PR2 publication uses exact canonical blob/tree equality, remains open/unmerged.
