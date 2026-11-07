# Six-character crouching heavy kicks implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Complete exact grounded 2HK for Alex, Dudley, Makoto, Yun, Urien and Gill with low heavy-kick drawings.
**Architecture:** Extend the established shared atlas/phase/crouch-support pipeline; no new dependency or importer. Six source poses produce twelve stored frames per character.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python image/pose QA.
**Spec:** Continuing user authorization for all-character authored motion and smoother transitions; existing MoveLibrary 2HK low knockdown and art-source/roster-idle/README.md.

## Choices and constraints
- Use six new low-guard/windup/half-extension/contact/retraction/recovered drawings. Reusing MK contact would not add the requested authored action; a new skeletal system adds maintenance with little benefit here.
- All six 2HK moves are foot kicks under current labels, including Dudley. Keep move timing, knockdown, hitboxes, movement and damage unchanged.
- Kind crouch-heavy-kick, 12 frames of 640x448, source 2x3 and order [1,1,2,3,3,4,4,5,5,6,6,6].
- Startup0–4, contact5–6, recovery7–11; exact grounded 2HK only.
- Reference held crouch5 for one anatomical scale; rear-support horizontal anchor and ground baseline.
- Reuse existing low-kick semantics at contact5, low foot-height0..80 and body-height .85..1.10. Heavy-specific limits reuse existing standing-heavy kick reach38..190, distinct contact .22..75, residual average .014..18/peak .030..24. Retain crouching support8px/4px and body-root62px/35px.
- Every character must pass full framing, pose, semantics and reciprocal crouch handoffs before any install writes.
- Expected184F/22 records each;132 strips/1104 stored frames;21 installation kinds/42 corrupt-peer directions; cache120.
- Shared crouching input330 stored frames; LK/MK/HK semantic180 stored frames.
- Update existing PR2, never merge.

## Work and verification
- [x] Extend shared actual-input test; run and observe missing authored 2HK failure before implementation.
- [x] Generate six sources with built-in imagegen; save selected sheets and exact prompts.
- [x] Extend builder/semantics, registry/mapping/loader/cache and install all six.
- [x] Extend existing ingestion/semantic/coverage tests for heavy contact, wrong-action/static/standing/support drift, peer rejection and rollback.
- [x] Fresh TypeScript/build,34 JS,21 runtime kinds,ingestion42 directions and all7 Python checks.
- [x] Inspect actual-input composited preview and read-only review; fix findings.
- [x] Commit verified changes and update PR2, verifying identical local/remote tree.

## Review focus
Both contact frames and all twelve frames; low recovery even after down release; heavy source differs from existing low kicks; stable support feet/complete toes; parent replacement and rollback cover new kind; old four fallback remains unchanged.

Verification ledger: actual-input test failed on missing ALEX authored crouching HK. After registry/mapping extension, the same test caught an omitted airborne exclusion; adding the new kind fixed it. Shared actual-input checks then reached all330 crouching frames /3,356 Canvas draws, with all12 HK frames, both contact frames, low knockdown metadata and released-down recovery.

Source ledger: all six first-generation sheets passed complete framing, articulated-pose, low-heavy-kick semantic and reciprocal handoff gates; no thresholds were relaxed and no contact pose was borrowed from MK. Actual-input preview uses175 simulation ticks with held-down and released-down attacks, reaches all12 frames for each character and ends in idle. Read-only code/source/hash/preview review reported no remaining P1/P2.

Fresh final verification: TypeScript noEmit, clean production/release build386files, all34 relevant JS checks, all21 runtime kinds across six characters, ingestion rollback/source/profile/order rejection and42 corrupt-peer directions, all7 Python checks passed. Shared crouching input330stored frames/3,356Canvas draws; LK/MK/HK semantic180stored frames. Validation uses automated input/Canvas and composited previews, with no manual browser playthrough.
