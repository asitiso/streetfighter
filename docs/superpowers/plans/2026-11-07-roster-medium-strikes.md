# Roster standing medium strikes

Goal: six dedicated 5MP sequences, eight stored frames each, that visibly match each character and preserve existing attack timing. Continue the approved roster asset workflow using built-in image generation and the established atlas builder; no new dependency or authoring system.

- [x] Extend actual Fighter/Canvas regression to medium input, all frames, contact, hit stop, both facings and unsupported-move exclusion; observe missing mapping failure first.
- [x] Add stand-medium kind, exact 5MP mapping, grounded-only selection, wide cells, asset loading and cache v110.
- [x] Extend existing builder using light-strike gates verbatim and explicit four-pose recipes. Keep Ken installer coverage unchanged.
- [x] Generate six dedicated sheets and exact prompts, regenerate failing poses, install only when all six pass unchanged quality/handoff checks.
- [x] Verify runtime peers, source provenance, uniform body scale, first-install/replacement rollback and corrupt peer rejection.
- [x] Clean build, regression checks, real Fighter timeline composited preview and read-only review; update existing PR without merging.

Review focus: 5MP cannot borrow LP/HP; kicks/crouch/air/commands stay excluded; every medium art frame is reachable; contact freezes with hit stop; all peer checks and rollback paths include medium; full bodies preserve constant scale and clean alpha.

Verification: clean TypeScript/production build, 28 JS checks, 11 runtime kinds, isolated ingestion with 22 corrupt-peer directions; 9,078 movement and 776 standing-strike Canvas draws. Composite preview inspected; no new manual browser playthrough. Read-only code review found no P1/P2 defects.
