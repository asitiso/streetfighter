# Six-character backward dash implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Replace fallback backward dash with dedicated guarded retreat-dash art for Alex, Dudley, Makoto, Yun, Urien and Gill.
**Architecture:** Extend existing dash atlas/clock and facing-relative metadata with dash-back, preserving the original generic dash behavior of the other four characters. Reuse existing pose, dash semantic and idle handoff numeric limits; add signed backward torso-drive validation.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python/Pillow/NumPy/OpenCV pipeline.
**Spec:** Continuing user-authorized all-character motion work and smoother base transitions; current Fighter eight-tick dash and roster source README.

## Choices and constraints
- New six-pose source per character rather than reverse/mirror forward dash: keep facing opponent while pushing away with the front leg and braking on the rear leg.
- Kind dash-back, seven640x448 frames, source2x3/order[1,2,3,3,4,5,6]. Existing ease-out sampling reaches[0,1,3,4,5,6] over8ticks, including every distinct drawing.
- Uniform scale references final recovered guard versus installed idle. World travel remains Fighter-owned, no changes to movement, facing, invulnerability or duration.
- Direction metadata backward, existing forward-only metadata unchanged. Missing/disabled backward strip preserves prior dash behavior.
- Idle/backward-dash handoffs validated in both directions, with existing DASH_START/END limits. Atomic install and rollback/order preservation remain.
- Reuse dash pose/semantic limits unchanged, renaming misleading unsigned forwardLeanPresent check for new kind; signed torso-to-foot backward drive must be8..100px.
- Expected191F/23records each,138strips1146storedF;22installation kinds44corrupt-peer directions/cache121.
- Save exact built-in generation prompts and selected sources; update existing PR2, never merge.

## Tasks
- [x] Extend actual double-tap input test and observe missing authored directional dash fail.
- [x] Generate6 sheets with built-in imagegen and save exact prompts.
- [x] Extend builder/semantic/handoffs and registry/mapper/loading/cache, install only after all6 pass.
- [x] Extend ingestion rollback, metadata rejection and peer corruption; add backward semantic negatives for all6; preserve existing4 generic dash behavior.
- [x] Fresh build,34JS,22runtime kinds,ingestion44directions and Python semantic checks.
- [x] Inspect actual-input composited preview; request read-only review and fix findings.
- [x] Commit verified changes, update existing PR2 and verify identical local/remote tree.

## Review focus
World direction versus facing, skipped stored duplicate versus distinct poses, hit-stop freeze and attack/jump interruption, stable anatomical scale/end guard, valid backward direction and forward-source rejection, parent replacement/rollback.

Verification ledger: the real double-tap test failed on missing ALEX backward-dash registry before implementation. A narrow grounded-sole direction probe incorrectly accepted existing Makoto/Gill forward drive because a lifted foot changed the measured support center. Replacing only the directional basis with the midpoint of both lower-leg extents (bottom30% guard height, including lifted feet) separates all6 forward and backward sources without changing the8..100px backward gate or any shared dash limits. Global translation leaves this relative posture measure unchanged.

Source ledger: initial Alex/Yun/Gill sheets passed. Existing dash gates rejected Dudley peak articulation, Makoto duplicate recovery/peak articulation, and Urien oversized entry handoff. Targeted built-in edits preserve exact source references in dash-back-edit-reference.png and refine only the affected poses; numeric thresholds remain unchanged.

Source/preview final ledger: all six installed after unchanged source/pose/dash/idle-handoff gates passed. Dudley/Makoto add an articulated leading-foot gathering step; Makoto final counterbalance moderation and alpha cleanup preserve complete source gutters and pass the same frame-jump/articulation gates. Exact final edit targets and prompts are retained for Dudley/Makoto/Urien. The100tick actual-Fighter preview reaches every distinct source drawing in both facings with world travel and ends all6 in idle. Read-only code/source/hash/static-preview review found no remaining P1/P2; no manual browser playthrough.

Fresh final verification: TypeScript noEmit, clean production build/release integrity392files, all34 relevant JavaScript checks, all22 runtime kinds across six characters, ingestion rollback/source/profile/direction/order checks and44 corrupt-peer directions, all8 Python ingestion/semantic scripts passed. Backward semantic suite verifies42stored frames and rejects forward/static/translated substitutes for all6. Movement suite validates9,174Canvas draws. Additional gathering-step static preview shows complete planted/gathered feet and hands. No quality thresholds were relaxed.
