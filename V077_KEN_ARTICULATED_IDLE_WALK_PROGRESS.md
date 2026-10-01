# V077 — Ken articulated Idle + Walk runtime promotion

## Completed

- Promoted Ken `idle` 6F to authored HQ runtime.
  - Independent chest/head/hair/left-arm/right-arm/hip/knee controls.
  - Feet remain planted; left/right arm timing is intentionally different.
  - Pose QA: residual average `0.010095`, max `0.013061`.
  - Idle semantic QA: PASS; loop IoU `0.985410`.
- Promoted Ken `walk` 12F to authored HQ runtime.
  - Full contact/compression/toe-off/lift/passing/reach cycle.
  - Alternating lifted foot, reciprocal arm swing, torso/head/hair follow-through.
  - Pose QA: residual average `0.055605`, max `0.086796`.
  - Walk semantic QA: PASS; opposite-contact IoU `0.798580`, foot-center range `139.958634`.
- Ken authored runtime is now `18F` total (`idle` + `walk`).
- Added reproducible authoring scripts:
  - `scripts/generate-ken-articulated-idle.py`
  - `scripts/generate-ken-articulated-walk.py`
  - npm: `author:ken:idle-articulated`, `author:ken:walk-articulated`, `author:ken:motion-core`

## Pipeline fixes discovered during real promotion

- `verify-ken-authoring-packet.py` no longer assumes the real inbox must stay guide-only forever.
  It tests underscore-guide filtering in an isolated fixture, allowing active authoring sources to coexist with guides.
- `verify-ken-walk-semantic-qa.py` now supports both legitimate rollout states:
  - transform pilot still gated, or
  - authored walk promoted and active.
  A static negative fixture remains mandatory so the gate is not weakened.

## Verification

- `npm run verify:ken-pipeline` — PASS, ~14.7 s after walk promotion.
- `npm run typecheck` — PASS.
- `node scripts/verify-animation-sequences.mjs` — PASS.
- `node scripts/verify-ken-authored-pipeline.mjs` — PASS.
- `node scripts/verify-v063-rc38.mjs` — PASS.
- Active Ken sequences: `idle`, `walk`.
- Enabled Ken authored frames: `18 / 137`.
- Remaining staging/non-authored Ken sequences stay gated.

## Next development order

1. `walk-back` 10F — defensive retreat with alternate contacts and upper-body guard bias.
2. `dash` 7F — load/launch/max-drive/brake/recovery.
3. `jump` 8F + `landing` 6F — compression/rise/apex/fall/contact/squash/rebound.
4. Then `hit`, `guard`, `parry` before standing/special attacks.

The next batch should continue using localized articulated controls rather than whole-sprite affine transforms.
