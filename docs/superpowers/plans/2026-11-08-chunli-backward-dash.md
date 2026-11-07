# Chun-Li backward dash implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-roster authored animation with Chun-Li backward dash.
**Architecture:** Reuse existing six-source/7stored-frame dash-back builder and8tick mapper; retain original Chun-Li manifest/source binding and15prior strips. Existing forward dash gets explicit forward direction. No gameplay timing change.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, Python/Pillow.
**Spec:** Standing user request for all-character motion assets, latest continuation.

## Choices
Reuse the shared pipeline rather than introduce a new importer. Generate distinct backward weight transfer rather than reuse forward-running art;6drawings provide preparation/drive/braking/recovery at modest asset cost. Capture exact prompt and source. Keep existing quality/handoff limits.

## Review focus
Both facings/world directions, no facing flip, exact speed/eight ticks; hit stop and attack/jump interruption; prior manifest/source/art preservation and write rollback; static/forward substitutes; preload movement and combat combined.

## Tasks
- [x] Extend actual input directional tests to Chun-Li and reproduce missing authored sequence.
- [x] Generate six poses, preserve exact prompt/source, pass original gates and handoffs.
- [x] Add CHUNLI dash-back-only selector, preserve original source metadata and align installed sole. Registry/profiles/assets/cache129; extend manifest/source/negative/rollback validation.
- [x] Production, standard suite, runtime gates, actual-input preview and independent review.
- [x] Commit/update existing PR2 without merging.

RED/GREEN: real movement test first failed missing forward direction, then authored backward strip; now passes10032Canvasdraws. Original source gates pass average0.034339/peak0.063748, backwarddrive64.933902 and drive torso-67.15169. Idle reference337px and opaque sole422 at the shared alpha>=32 definition. Source extraction preserves true alpha; backdrop RGB under zero alpha does not render.

Fresh new isolated fixture passes new-file/replacement rollback, byte-stable reinstall, all15prior records/art/bindings, selector/runtime direction rejection and forward/static/translated/source/peer negatives. All8backward-dash runtime gates pass. Stage-entry movement+combat requests11275864bytes including509070new bytes, below existing13MB cap. Independent read-only review found no P1/P2 and confirmed all prior15records/bindings and16installed hashes/bytes. Actual-input preview shows both facings, travel and hit-stop; no manual browser playthrough.

Final fresh evidence: full expanded standard82commands,79pass; existing v025-resilience/v028-rc3/v063-rc38PWA failures unchanged. Clean TypeScript/production build and release integrity407files hash9FB95F8251EDE52B; all11focused build/input/render/combat checks pass. Working artifact reports restored. Existing PR2 is updated only after canonical blob/tree equality; remains open/unmerged.
