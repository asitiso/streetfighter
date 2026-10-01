# V079 — Ken Standing Attacks Authored Promotion

## Result

V078's 68 active Ken frames were preserved and two grounded standing attacks were promoted as genuinely authored runtime sequences:

- `stand-light`: 7F
- `stand-heavy`: 10F

Ken now has **11 active authored sequences / 85 active frames**.

## Art approach

The previous whole-sprite affine attack staging was not promoted. V079 adds a piecewise articulated attack authoring path based on the existing 384x448 HQ Ken source:

- right forearm/glove rotates around an explicit elbow pivot;
- upper body receives localized drive instead of rigid root translation;
- feet remain planted;
- heavy attack adds stronger torso/shoulder drive and body torque;
- residual pixels from the original hanging arm are removed before the articulated limb is composited back;
- start/end frames recover to neutral.

Generator:

- `scripts/generate-ken-articulated-standing-attacks.py`
- npm command: `author:ken:standing-attacks-articulated`

## Runtime QA

### stand-light 7F

- pose authored: PASS
- semantic QA: PASS
- contact IoU: 0.634825
- centroid X range: 12.323887
- reach range: 24.0
- foot center range: 21.858163
- affine residual avg/max: 0.023286 / 0.037180
- SHA-256: `75AF5847172E3B4109166B0AFF24321AEEB556FE9C9C9D350CA9DD36B156CB45`

### stand-heavy 10F

- pose authored: PASS
- semantic QA: PASS
- contact IoU: 0.478069
- centroid X range: 19.998017
- centroid Y range: 2.014802
- reach range: 39.0
- foot center range: 37.833698
- affine residual avg/max: 0.028558 / 0.046564
- SHA-256: `BBDBD54BC01464A5E3E1C41311F5E4CA4A9541F77222AC799AD383731613A660`

## QA infrastructure update

`verify-ken-standing-attacks-semantic-qa.py` is now runtime-state-aware:

- staging/inactive strips must still fail authored semantic QA;
- promoted authored attack strips must pass;
- rigid whole-body translation impostor remains rejected.

## Verification

Passed:

- transactional Ken ingest for `stand-light` + `stand-heavy`
- `npm run verify:ken-pipeline` — 18/18 steps PASS
- `npm run verify` — PASS
- build/release integrity generation — PASS

No V078 locomotion/defense authored motion was rolled back.

## Active Ken authored runtime sequences

`idle 6 + walk 12 + walk-back 10 + dash 7 + jump 8 + landing 6 + hit 8 + stand-light 7 + stand-heavy 10 + guard 5 + parry 6 = 85F`

## Next work

Next authored attack block is `hadoken 12F + shoryuken 12F`. They remain gated staging assets in this build and should only be promoted after real multi-limb authored frames pass their dedicated semantic and handoff checks.
