# Six-character crouching light kicks

> **For agentic workers:** Use superpowers:executing-plans for inline work.

**Goal:** Author exact grounded 2LK for Alex, Dudley, Makoto, Yun, Urien and Gill.
**Architecture:** Reuse atlas ingestion, phase mapping, low-guard normalization, support-sole anchoring and shared real-Fighter tests. Add six source drawings/eight stored frames per character without changing combat.
**Tech Stack:** TypeScript/Canvas, built-in image generation and existing Python atlas QA.
**Spec:** Continuing all-character motion request and art-source/roster-idle/README.md.

## Global constraints
- Exact grounded 2LK only; preserve crouching punches and air/other kick fallback.
- Source order [1,2,3,4,5,5,6,6], startup 0–2, contact 3, recovery 4–7.
- Full low guard, knee chamber, half extension, low contact, half retraction and recovered low guard.
- Uniform anatomical scale references installed crouch frame 5; anchor rear support sole, not average of the moving front foot.
- Reuse standing light-kick semantic/root/articulation limits with a dedicated crouching contact-foot envelope 0..80px and low-height ratio .85..1.10. Existing standing-kick defaults remain unchanged.
- Both crouch/2LK handoffs validated, including when crouch is replaced. No new dependency.
- Cache v118; six characters each 162F/20 records; 120 strips/972 stored frames.
- Existing PR #2 only, no merge.

## Approaches
Reuse the established atlas/QA workflow for a frequent missing low attack. Reversing standing kick art would retain a standing body. A new skeletal renderer adds migration/maintenance cost and does not help this asset increment.

## Review focus
1. True leg extension, low height and natural limb length.
2. Moving front foot must not drag the rear support foot or body root.
3. Actual contact, all eight frames, hit-stop freeze and unchanged duration.
4. Down held/released recovers low before reverse-rise; belt down stays depth movement.
5. Corrupt crouch peers, missing source and failed writes cannot leave partial assets.

## Task
- [x] Extend shared input test; observe missing 2LK fail before implementation.
- [x] Generate six transparent source sheets and save exact prompts.
- [x] Extend builder/registry/mapping/loading and rear-support normalization; install only after all six pass.
- [x] Fresh build, 34 relevant JS checks, 19 runtime kinds, 38 corrupt-peer directions and meaningful semantic negatives.
- [x] Inspect actual-input preview, request read-only review, fix findings, commit and update PR #2 with matching tree.

Source result: all six first-pass source sheets passed low-kick semantic, support-root, framing and handoff QA. Existing standing-kick and crouching-punch thresholds were not changed.

Verification: missing 2LK failed before implementation. Fresh TypeScript and clean production build (374 release files), 34 relevant JavaScript checks, 19 runtime installation kinds, 38 corrupt-peer directions, write rollback and existing/new semantic negatives passed. Shared crouching attacks cover 198 stored frames and 1,876 Canvas draws. The 120-tick actual-input preview reaches all eight low-kick frames and ends in idle for every character. Read-only code/source/preview review found no P1/P2 issues. Delivery updates existing PR #2 without merging.
