# Ryu backward dash implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-roster authored motion work with a complete Ryu backward dash and prepare it before first input.
**Architecture:** Reuse existing six-pose dash-back builder, signed backward-drive semantics, idle handoffs, eight-tick clock and direction mapping.6new drawings ->7stored frames[1,2,3,3,4,5,6]. Same idle349anatomical scale/opaque433sole,640x448cells; Fighter owns world travel. Exact backwards-relative selection, forward dash retains own strip and gains explicit forward-direction tag. No gameplay changes.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python/Pillow pipeline.
**Spec:** User continuation of all-character motion completion; existing PR2 stays open/unmerged.

## Choices/constraints
Independent launch/compression/backdrive/rear-braking/settling/recovery gives visible weight transfer over generic forward art. Existing dash/8..100px backward-drive/idle gates unchanged. Preserve all previous24records/art and original source binding, stagedspecials24F unchanged. Totals217stored/193enabled/25records(23active), selector18kinds, cache128. Backdash+forward flags prevent wrong-direction playback; disabled backward art falls back safely. Zero additional source/profile offset, physical speed/duration/hitstop/interruptions unchanged.

## Loading evidence/ruling
Loading correction: the previously reported prefetch number was the declared enabled catalog size, not a measurement of entry requests. CharacterTextureManager first prepares movement; Stage1Scene.enter then eagerly prepares combat. Captured Image.src requests across that sequence total 12,490,276 bytes for Ryu, including the new 523,138-byte backward dash; movement alone is 6,533,514 bytes. The stage-entry animation cap is explicitly raised from 12 MB to 13 MB for this addition. The complete stored catalog is 14,344,356 bytes, including 1,854,080 bytes of unchanged disabled specials excluded from requests. The test captures both phases without clearing cached textures between them. This is Ryu animation traffic, not whole-game startup traffic; image quality and existing eager combat loading are preserved. Lossless probes yielded0 on original strips and only2% on newer strips; no optimizer added.

## Review focus
Both world directions/facings, exact8ticktravel and no facing flip; hitstop and LP/jump interruption; all distinct source drawings reachable; signed backwards drive rejects forward/static/translated substitutes; source/peer rejection and rollback preserve old records/art; movement preparation includes backward art; combined movement/combat entry excludes staged art and reports the full enabled payload.

## Tasks
- [x] Extend real directional dash tests and reproduce missing Ryu backdash.
- [x] Generate/save six-pose source/exact prompt; pass unchanged quality/handoff gates.
- [x] Extend selector/registry/profiles/loading and fixture; correct preload budget measurement with an actual-request test.
- [x] Fresh build/full standard suite/asset checks, actual-input preview and independent review.
- [x] Commit/update existing PR2 with identical Git tree, never merge.

Baseline standard78/81 with existing3PWA failures(v025/v028/v063); report unchanged failures explicitly. Correct previous catalog/prefetch terminology in docs/PR.

Source ledger: first source failed idle-start silhouette and nonrigid peak. Three targeted imagegen refinements added guarded launch, stronger backdrive, trailing-knee braking and balancing arm; exact input targets/prompts retained. Final original gates pass: residualavg0.029445/peak0.041241, signed backwarddrive78.483px; original thresholds unchanged. Real directional test first failed missing forward tag then missing Ryu backdash, now passes9684Canvasdraws. Actual-request preload RED caught missing dash-back in MOVEMENT; include it without changing existing loading architecture.

Directional QA RED: installed old Ryu forward runner passed delta-only backward check(43.513px) because it starts leaning forward and later leans forward less as its front leg extends. Add Ryu-only absolute rearward-torso sign at drive(upper torso behind lower-leg-spread midpoint), retaining existing8..100px backward delta and all original thresholds/default six-roster reports. Both direction metadata and body-direction QA are now checked.

Independent review confirmed all24prior records/art hashes, direction and preview. Review P2 found Stage1Scene combat preloading omitted by the first budget test. Corrected to capture movement then combat without releasing textures; explicit cap13MB, full entry12,490,276bytes, movement6,533,514bytes. No loader behavior removed.

Fresh final verification: TypeScript, clean production/static build and release integrity406files, hash62BC538682936FE7; all11focused checks pass after the corrected combined-entry request test. Full standard81commands:78pass, known v025/v028/v063PWA failures unchanged. All22default and18Ryu runtime kinds pass; Ryu ingest rollback/source fixture passes. Actual-input both-facing preview is saved outside the repository as ryu-backdash-preview.gif.

Follow-up independent review: P2 resolved; combined-entry measurement/test and explicit13MB budget accurately documented. Fresh sequence verification passes; no remaining P1/P2 blockers found.
