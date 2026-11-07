# Roster standing heavy kicks

Goal: six dedicated grounded 5HK strips (12 stored frames each), extending the authorized roster art pipeline with six articulated source poses rather than four. Preserve other motions, gameplay and Ken installer coverage.

- [x] Extend real Fighter/Canvas regression to exact 5HK, both facings, all stored frames/contact/hit-stop and other-move exclusion; observe missing mapping failure first.
- [x] Add stand-heavy-kick kind, startup 0–4/contact 5–6/recovery 7–11, 640px cells, asset loading and cache v113.
- [x] Add dedicated high-kick semantic envelope and punch/low-kick/static/sliding/floating negative cases, preserving older kick defaults.
- [x] Generate six source sheets and exact prompts, install only after every source/pose/handoff gate passes.
- [x] Verify 14 runtime kinds, isolated rollback/28 corrupt-peer directions, prior LK/MK and new HK semantic tests, clean build and 28 JS regressions.
- [x] Inspect real Fighter timeline composite/read-only review, commit and update existing PR without merging.

Review focus: all six unique key poses and twelve stored frames are reached; high heel contact differs from low kick; support foot/scale/full framing stay stable; new idle-peer checks and rollback paths include HK; existing six-button mapping never replaces crouch/air/command/target actions.

Verification: TypeScript and clean production build, 28 JS checks, 14 runtime kinds, isolated ingest with 28 corrupt-peer directions and LK/MK/HK semantic negative tests passed. All six source poses/twelve stored HK frames reachable in both facings. 9,078 movement and 1,676 standing-normal Canvas draws. Read-only code/asset/preview review found no P1/P2 issue. Actual Fighter composite inspected; no new manual browser playthrough.
