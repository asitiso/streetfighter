# Six-character crouching medium attacks on MK

> **For agentic workers:** Use superpowers:executing-plans for inline work.

**Goal:** Author exact grounded 2MK for Alex, Dudley, Makoto, Yun, Urien and Gill.
**Architecture:** Reuse the established atlas/phase/crouch-support pipeline and the existing MK knee/hook/kick profiles, avoiding duplicated profile configuration. Six source poses produce ten stored frames per character.
**Tech Stack:** TypeScript/Canvas, built-in image generation and current Python atlas QA.
**Spec:** Continuing all-character motion request; current MoveLibrary labels and art-source/roster-idle/README.md.

## Global constraints
- Exact 2MK mapping for these six only; preserve other attacks, air fallback and gameplay timing.
- Match existing labels/profiles: Alex knee, Dudley sway hook, four low kicks.
- Order [1,1,2,3,4,4,5,5,6,6]; startup 0–3, contact 4–5, recovery 6–9.
- Uniform scale references held crouch frame 5. Knee/kicks anchor rear sole; planted hook uses both-foot anchor.
- Reuse existing crouch low-kick gates at contact 4, with medium kick forward reach 38..160px. Existing 2LK defaults stay unchanged.
- Knee reuses current MK knee articulation/support checks with added low posture. Hook reuses crouching medium-strike checks at actual contact 4 plus both grounded soles and strict rear-root checks.
- All profiles keep low-height .85..1.10, source framing, reciprocal handoffs and atomic writes.
- Cache v119; 172F/21 records per character,126 strips/1032 stored frames;20 runtime kinds/40 corrupt-peer directions.
- Update existing PR #2 without merging.

## Approaches
Extend the existing atlas workflow with known MK profiles. A single generic kick would conflict with current knee/hook labels. New skeletal animation or a separate importer adds maintenance without helping this increment.

## Review focus
1. Knee/hook/kick identity follows current labels.
2. Support anchor remains stable when front leg moves; hook keeps both feet planted.
3. Both contact frames, all ten frames, hit stop and actual duration.
4. Released down recovers low then rises; unfinished 2HK remains fallback.
5. Corrupt peers, wrong profiles and failed writes are rejected without partial runtime state.

## Task
- [x] Extend real-input test and observe missing 2MK fail.
- [x] Generate six source sheets and save exact prompts.
- [x] Extend shared builder, contact-aware semantics, registry/mapping/loading and normalization; install only after all six pass.
- [x] Fresh build,34 relevant JS,20 runtime kinds,40 corrupt-peer directions and semantic negatives.
- [x] Inspect actual-input preview and request read-only review; no remaining P1/P2 findings.
- [x] Commit verified changes and update existing PR #2 with an identical Git tree.

Verification ledger: source QA caught support drift from a missing new-kind normalization branch; adding non-hook crouching MK to rear-support fixed the root checks. Focused isolated runtime-profile test failed because a mismatched profile was accepted, then passed after extending validation to crouching MK. The committed ingestion test includes the same wrong-profile regression. No quality thresholds were relaxed.

Fresh verification: TypeScript and clean production/release build (380 files); all 34 relevant JS checks; all 20 runtime kinds across six characters; ingestion rollback/order/source/profile rejection and 40 corrupt-peer directions; all seven Python semantic/ingestion checks passed. Shared crouching input covered 258 stored frames / 2,448 Canvas draws; LK/MK semantics covered 108 stored frames. Actual-input composited preview reaches all ten frames and returns all six to idle; no manual browser playthrough was added. Final read-only source/code/preview review found no remaining P1/P2.
