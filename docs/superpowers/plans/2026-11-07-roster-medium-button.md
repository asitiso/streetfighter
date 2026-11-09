# Roster standing medium-button actions

Goal: six new grounded 5MK strips (10 stored frames each). Respect existing labels: Alex knee, Dudley sway hook, four medium kicks. Continue existing image generation, builder, renderer and tests; no new dependencies or gameplay changes.

- [x] Extend actual Fighter/Canvas regression to exact 5MK mapping, both facings, all frames, contact/hit-stop and other-move exclusion; observe missing mapping failure first.
- [x] Add stand-medium-kick kind, 0–3 startup/4–5 contact/6–9 recovery, 640px cells, asset group and cache v112.
- [x] Add explicit knee/hook/kick semantic profiles, source recipes and manifest profile validation. Reuse anatomical scale and appropriate foot anchor; preserve old low-kick defaults.
- [x] Generate all six dedicated source sheets/prompts, regenerate failures, install after every gate passes.
- [x] Verify wrong-action/static/slide/float rejection, 13 runtime kinds, isolated rollback/26 corrupt-peer directions, fresh clean build and 28 JS checks.
- [x] Inspect actual Fighter composite and read-only code/asset review, commit and update existing PR without merging.

Review focus: a medium button does not imply the same leg pose for all characters; two-foot hook cannot borrow kick art; knee need not extend toes but must lift/fold leg; planted root and full-body scale remain stable; new profile metadata and idle-peer rollback paths are validated; old normal mapping/timing remains unchanged.

Verification: clean TypeScript/production build, 28 JS checks, 13 runtime installation kinds, isolated ingest with 26 corrupt-peer directions, existing LK and new MK semantic negative cases passed. 9,078 movement and 1,224 standing-normal Canvas draws. Read-only code/asset/preview review found no P1/P2 issue; actual Fighter composite inspected, no new manual browser playthrough.
