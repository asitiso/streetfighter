# Ken authored animation pipeline — coding progress

Base: `0.0.63-rc.38`

## Implemented
- Extended high-frame sequence kinds with `tatsumaki` and `super-rush`.
- Added Ken attack sequence slots:
  - stand-light 7F
  - stand-heavy 10F
  - hadoken 12F
  - shoryuken 12F
  - tatsumaki 12F
  - super-rush 16F
- Ken total registry target is now 126F = 57 movement/hit + 69 attack/special/super.
- Generalized attack-to-animation mapping for Ken move IDs.
- Added Ken-specific per-frame timing and anchor profiles emphasizing faster forward inertia and recovery.
- Preserved authored-only gate: all current Ken pilot strips remain disabled until real authored pose strips pass QA.
- Added `verify:ken-pipeline` regression check.
- Preserved full existing regression suite.

## Validation
- `npm run typecheck` PASS
- `npm run verify:ken-pipeline` PASS
- `npm run verify` PASS
- Existing Ryu/Stage/PWA/Offline/Save/Combat regressions remain PASS.

## Next coding step
Install actual Ken authored transparent per-motion strips one at a time, starting with Idle/Walk or Stand Light, run pose-variance QA, then flip only passing sequences to `poseAuthored:true` + `enabled:true`.
