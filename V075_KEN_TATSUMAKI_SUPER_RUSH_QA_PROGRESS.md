# V075 — Ken Tatsumaki / Super Rush Authored QA Progress

## Scope

This batch extends Ken's existing RC39 authored-only pipeline to the final two attack slots: **Tatsumaki 12F** and **Super Rush 16F**. The structural target remains **137F**; no gameplay frame counts, hitboxes, damage, cancel windows, projectile timing, or Super Art timing were changed.

## Implemented

- Added `TATSUMAKI_SEMANTIC_LIMITS` and `tatsumaki_semantic_qa`.
  - Requires real quarter-turn and opposite-turn silhouettes.
  - Requires visible kick-extension width change and controlled horizontal/vertical spin travel.
  - Rejects whole-sprite rotate/translate derivatives through the authored affine-residual gate.
- Added `SUPER_RUSH_SEMANTIC_LIMITS` and `super_rush_semantic_qa`.
  - Verifies five contact beats at frames 4/6/8/10/12 (zero-based indices 3/5/7/9/11).
  - Requires contact-to-contact variety, meaningful reach change, controlled root/foot travel, and recovery toward neutral.
- Added authoring packets/dropzones for Tatsumaki 12F and Super Rush 16F.
- Removed the old 12-frame authoring-board cap so 16F sequences receive a full authoring board too.
- Added `BASE↔TATSUMAKI` and `BASE↔SUPER RUSH` handoff gates.
- Added both sequences to runtime semantic audit and Animation QA handoff display.
- Added `verify:ken-advanced-specials`, prepare/ingest commands, and integrated the new verifier into the Ken pipeline.
- Optimized runtime semantic audit to reuse the fresh `RC39_KEN_POSE_VARIANCE.json` instead of recalculating affine ECC for all 15 sequences a second time.

## Current staging diagnosis

### Tatsumaki
- affine residual average: **0.001773**
- affine residual max: **0.002313**
- start/end IoU: **1.000000**
- kick width variation: **13.0px**
- verdict: **rejected / not authored**

The current strip visually spins, but the start and end silhouette are identical and the kick-extension width changes only slightly. It remains transform-derived staging art.

### Super Rush
- affine residual average: **0.001669**
- affine residual max: **0.002114**
- reach variation: **29.0px**
- foot-center travel: **108.4px**
- contact pair minimum IoU: **0.684353**
- verdict: **rejected / not authored**

The current rush has timing/translation changes but not enough genuinely redrawn strike silhouettes.

## Validation

PASS:
- `npm run typecheck`
- `npm run build`
- `npm run verify:ken-advanced-specials`
- `npm run verify:ken-authoring` — now **15 packets**
- `npm run verify:ken-handoff`
- `npm run verify:ken-gates`
- `node scripts/verify-animation-sequences.mjs`
- `node scripts/verify-ken-authored-pipeline.mjs` — **137F target / 0F active / authored-only gate preserved**
- `node scripts/verify-v063-rc38.mjs`

The monolithic `npm run verify:ken-pipeline` progressed through authoring, ingest, idle and walk successfully, then hit the execution time limit during the pre-existing locomotion ECC verifier. No new advanced-special assertion failed. Runtime semantic audit has already been optimized to remove one major duplicate ECC pass; further verifier-cache cleanup can continue in the next batch.

## Runtime state

- Ken target frame total: **137F**
- Ken enabled frame total: **0F**
- Tatsumaki: **12F staging, gated**
- Super Rush: **16F staging, gated**
- Rule remains: only genuinely authored transparent HQ frames may set `poseAuthored:true` and `enabled:true`.
