# Six-character crouching medium attacks

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Replace fallback 2MP presentation for Alex, Dudley, Makoto, Yun, Urien and Gill with authored articulated low attacks.
**Architecture:** Extend the existing crouch-light source/normalization/handoff pipeline and its real-Fighter checks. Use six source drawings and eight stored frames, preserving actual combat timing. Reuse the existing low guard as scale and both-foot reference; no new framework or dependency.
**Tech Stack:** TypeScript/Canvas; built-in image generation; existing Python/Pillow/NumPy/OpenCV atlas QA.
**Spec:** The user's continuing all-character animation request; established crouch/2LP conventions in art-source/roster-idle/README.md.

## Global constraints
- Exact grounded 2MP only; retain existing 2LP mapping and unsupported/air fallback.
- No damage, duration, movement or hitbox changes. Phase 0–2 startup, 3 contact, 4–7 recovery.
- Six source poses: low guard, chamber, half extension, contact, half retraction, recovered low guard. Order [1,2,3,4,5,5,6,6].
- Match current move labels: Alex ELBOW, Dudley STRAIGHT, Makoto KARATE THRUST, Yun CHAIN PALM; Urien/Gill medium punches.
- Existing light-strike numeric thresholds, stable low height, both-foot root and reciprocal crouch handoffs. 2MP uses a fixed shoulder/forearm contact-reach band; 2LP stays unchanged.
- Existing PR2 only, no merge.

## Approaches
Continue the established atlas authoring/QA pipeline. It directly improves frequent attacks with the existing loading/rendering system. Reusing 2LP art would save asset work but provide no new medium motion; a new skeletal system adds migration and maintenance cost outside this increment.

## Review focus
1. Exact 2MP, including airborne and other normal exclusions.
2. Both facings, all eight frames and actual contact/hit-stop/duration.
3. Down released during attack: recover low before reverse-rise.
4. Replacing crouch validates both installed 2LP and 2MP; corrupt peers must prevent writes.
5. Source/body scale, full limb framing and actual elbow/palm identity.

## Task: authored crouching medium set
- [x] Extend current input/semantic tests to 2MP; observe missing mapping/sequence fail before implementation.
- [x] Generate six source sheets and save exact prompts; preserve complete true-alpha bodies.
- [x] Extend builder, exact runtime mapping, registry and loading; cache v116. Install only after all six pass.
- [x] Verify runtime kinds, ingestion rollback/corrupt peers, meaningful semantic negatives, fresh build and relevant JS checks.
- [x] Inspect actual-Fighter preview, request read-only review, fix findings, commit and update PR2 with matching tree.

Ruling: For 2MP only, measure actual guard-to-contact reach in the fixed 30–62% guard-height shoulder/forearm band — wide crouch feet dominated the old full-body edge and rejected real elbow/palm reach. Keep the 24..105 range and all other gates; include head-only and whole-body displacement negatives. Read-only review agreed with this distinction.

Verification: the missing 2MP sequence failed before implementation. Fresh TypeScript checks and clean build (362 release files), 34 JavaScript checks, 17 runtime installation kinds, 34 corrupt-peer directions, rollback/missing-source repair and all existing/new semantic negatives passed. Shared LP/MP checks cover 90 stored frames and 788 Canvas draws. The actual-input 120-tick preview reaches all eight MP frames and ends in idle for every character. Read-only code/source/preview review found no P1/P2 issues. Original combat timing and 2LP assets remain unchanged; cache is v116. Delivery targets existing PR #2 only, without merging.
