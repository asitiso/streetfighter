# V078 — KEN LOCOMOTION / REACTION / DEFENSE AUTHORED RUNTIME

## Scope
This batch continues directly from V077. Ken's approved HQ neutral source is reused; no base-character regeneration was performed.

Promoted to authored-active runtime in this batch:
- `walk-back` — 10F
- `dash` — 7F
- `jump` — 8F
- `landing` — 6F
- `hit` — 8F
- `guard` — 5F
- `parry` — 6F

Existing authored-active sequences retained:
- `idle` — 6F
- `walk` — 12F

Current authored-active Ken total: **68 frames / 9 sequences**.

## Runtime state
Active:
- idle 6F
- walk 12F
- walk-back 10F
- dash 7F
- jump 8F
- landing 6F
- hit 8F
- guard 5F
- parry 6F

Still intentionally gated as staging/reference art:
- stand-light 7F
- stand-heavy 10F
- hadoken 12F
- shoryuken 12F
- tatsumaki 12F
- super-rush 16F

The attack staging sequences were not promoted just to increase the active-frame count. A local-warp standing-attack experiment was rejected because the arm silhouette bent unnaturally; the rejected frames were removed and the original gated attack dropzones/runtime were preserved.

## Authored QA highlights
### walk-back 10F
- pose residual avg/max: `0.039826 / 0.060584`
- opposite-contact IoU: `0.759454`
- centroid X/Y range: `33.770024 / 24.910682`
- foot-center range: `144.492740`
- semantic QA: PASS

### dash 7F
- pose residual avg/max: `0.040075 / 0.076672`
- drive midpoint IoU: `0.520401`
- centroid X/Y range: `20.812873 / 19.720993`
- semantic QA: PASS

### jump 8F
- pose residual avg/max: `0.047137 / 0.061149`
- apex IoU: `0.481011`
- vertical range: `47.152537`
- semantic QA: PASS

### landing 6F
- pose residual avg/max: `0.041413 / 0.051009`
- squash IoU: `0.394523`
- vertical range: `54.683140`
- semantic QA: PASS

### hit 8F
- pose residual avg/max: `0.046188 / 0.086152`
- peak recoil IoU: `0.408025`
- centroid X/Y range: `27.628337 / 13.560811`
- foot-center range: `23.969128`
- semantic QA: PASS

### guard 5F
- pose residual avg/max: `0.030994 / 0.051929`
- peak guard IoU: `0.755590`
- centroid X/Y range: `8.560950 / 13.205333`
- foot-center range: `1.965770`
- semantic QA: PASS

### parry 6F
- pose residual avg/max: `0.023846 / 0.040504`
- peak parry IoU: `0.755313`
- centroid X/Y range: `13.129268 / 1.777561`
- foot-center range: `3.909358`
- semantic QA: PASS

## Handoff / regression behavior
- BASE ↔ walk-back: PASS
- BASE ↔ dash: PASS
- BASE → jump → landing → BASE: PASS
- BASE ↔ hit: PASS
- BASE ↔ guard: PASS
- BASE ↔ parry: PASS
- idle ↔ walk authored pair: PASS

`verify-ken-locomotion-semantic-qa.py`, `verify-ken-walkback-hit-semantic-qa.py`, and `verify-ken-defense-semantic-qa.py` now understand both `pilot-gated` and `authored-active` runtime states while retaining negative static fixtures. Promotion therefore does not weaken rejection of transform/static impostor motion.

## Authoring commands added
- `npm run author:ken:walk-back-articulated`
- `npm run author:ken:dash-articulated`
- `npm run author:ken:jump-articulated`
- `npm run author:ken:landing-articulated`
- `npm run author:ken:hit-articulated`
- `npm run author:ken:guard-articulated`
- `npm run author:ken:parry-articulated`
- `npm run author:ken:defense-core`

## Verification
Final verification passed:
- `npm run typecheck`
- `npm run verify:ken-pipeline` — 18/18 steps PASS
- `npm run verify` — full project regression PASS
- production release integrity: `0.0.63-rc.38`, 226 files, manifest root prefix `30CB840676557336`

## Next target
Standing attacks should be produced as genuine per-frame attack artwork rather than forcing large motion out of the single neutral master. Priority:
1. stand-light 7F
2. stand-heavy 10F
3. hadoken 12F
4. shoryuken 12F
5. tatsumaki 12F
6. super-rush 16F

The 68F locomotion/reaction/defense set is the stable base for that work.
