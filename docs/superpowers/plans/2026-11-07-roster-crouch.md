# Roster articulated crouch transitions

Goal: six dedicated crouch strips (6 stored frames each) with articulated lowering/held guard/reversed rise. Continue authorized image-generation and roster builder workflow. Preserve game rules and existing four-character fallback.

- [x] Add real Fighter/Canvas regression; observe missing crouch after long idle failure before implementation.
- [x] Add visual-only -1..5 crouch clock after hit-stop guard, duel down entry/release/reversal, held-clock crouching attack recovery and air/locked interruption. Mapper prioritizes actual attacks and preserves old-character idle/fallback.
- [x] Add six-frame crouch registration/loading/cache v114 and builder standing-reference scale/two-foot anchor, progressive compression QA, reversible standing-endpoint handoffs.
- [x] Generate six four-pose sheets/prompts, pass gates/install, verify entry/hold/exit, rapid toggles, hit stop, jump and belt depth movement. Reject static/shrunken/sliding/floating substitutes.
- [x] Fresh clean build/33 JS checks, 15 runtime kinds, isolated rollback/30 corrupt-peer directions and previous attack semantic regressions.
- [x] Inspect actual Fighter composite and read-only review, commit/update existing PR without merging.

Review focus: no shared-stateFrame drift; release/repress must not pop; crouch clock cannot replace attacks/hit/air; existing four character fallback stays intact; source compression is joint articulation at one scale, not sprite shrink; reverse exit validates the correct endpoint; gameplay movement/timing/hitboxes stay unchanged.

Verification: TypeScript and clean production build, 33 JS checks including belt/AI/boss/fidelity, 15 runtime kinds, isolated ingest with 30 corrupt-peer directions, crouch and existing LK/MK/HK semantic negatives passed. 9,078 movement + 1,676 standing-normal + 72 crouch Canvas draws. Read-only code/asset/preview review found no P1/P2 issue. Actual Fighter entry/hold/reversal/rapid-toggle/hit-stop composite inspected; no new manual browser playthrough.
