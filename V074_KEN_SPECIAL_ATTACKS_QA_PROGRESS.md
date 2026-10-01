# V074 — KEN HADOKEN / SHORYUKEN AUTHORED QA PROGRESS

## Scope
- Ken Hadoken: 12F authored authoring/dropzone + semantic QA
- Ken Shoryuken: 12F authored authoring/dropzone + semantic QA
- Base ↔ Hadoken / Base ↔ Shoryuken handoff QA
- Runtime timing, hitbox, damage and projectile event data remain unchanged

## Hadoken gate
Current staging strip remains rejected.
- affine residual average: 0.001624
- affine residual max: 0.002149
- hand/reach range: 24.0 px
- extra release reach over gather: 14.0 px
- foot-center range: 152.149873 px
- semantic result: False

The gate requires a real coil → release → follow-through → recovery sequence. Projectile art is not baked into the character strip; projectile spawning remains a runtime event.

## Shoryuken gate
Current staging strip remains rejected.
- affine residual average: 0.001604
- affine residual max: 0.002252
- vertical centroid arc: 52.310772 px
- silhouette top rise: 50.0 px
- semantic result: False

The gate requires real compression → launch → rising contact → full extension/apex → descent/recovery pose changes. Affine-only vertical scaling/translation is rejected by the pose-authored gate.

## Authoring workflow
- `npm run prepare:ken:hadoken`
- drop `01.png ... 12.png` into `art-source/ken/inbox/hadoken/`
- `npm run ingest:ken:hadoken`
- `npm run prepare:ken:shoryuken`
- drop `01.png ... 12.png` into `art-source/ken/inbox/shoryuken/`
- `npm run ingest:ken:shoryuken`

Each ingest still runs source resolution, pose variance, semantic and runtime promotion gates.

## QA / runtime
- Animation QA now shows `BASE↔HADOKEN` and `BASE↔SHORYUKEN` handoff state.
- Runtime semantic audit includes both specials.
- Ken remains 0/137F active until real HQ authored frames pass.

## Verification
- TYPECHECK PASS
- BUILD PASS
- KEN_AUTHORING_PACKET PASS (13 packets)
- KEN_SPECIAL_ATTACKS_SEMANTIC_QA_PASS
- KEN_HANDOFF_QA_PASS
- KEN_SOURCE_GATES_PASS
- KEN_AUTHORED_PIPELINE_VERIFY_PASS
- ANIMATION_SEQUENCE_VERIFY_PASS
- V063_RC38_PASS

## Verdict
`KEN_SPECIAL_ATTACKS_AUTHORING_QA_PASS`
