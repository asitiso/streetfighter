# V076 — Ken Pipeline ECC Cache / Fast QA Progress

## Scope

This batch continues RC39 after Tatsumaki 12F / Super Rush 16F semantic QA. The goal is to remove repeated affine-ECC work from Ken authored-animation verification without weakening the authored-only gate or changing gameplay/runtime frame counts.

## Implemented

- Added a SHA-256 alpha-sequence ECC result cache (`scripts/pose_ecc_cache.py`, `RC39_POSE_ECC_CACHE.json`).
  - Cache key includes exact frame alpha bytes, thresholds, dimensions, and ECC algorithm version.
  - A changed sequence automatically misses the cache and is recalculated.
  - Cache entries are capped to avoid unbounded growth.
- Added `scripts/seed-pose-ecc-cache.py` and `npm run cache:pose-ecc`.
  - Seeds the unchanged Ken 15-sequence evidence plus known-good Ryu walk/dash/jump/landing controls already proven in the RC39 package.
- `install-authored-ken-sequence.py` and `measure-animation-pose-variance.py` now share the same cache.
- Semantic fixture QA no longer recomputes expensive affine ECC when the test is specifically about motion semantics. Exact fixture pose evidence is supplied directly while runtime assets still use the real pose gate.
- Source-gate QA now uses a production-resolution static transparent fixture for the affine rejection test and restores preview/candidate files after the test.
- Added a single-process Ken QA orchestrator (`scripts/verify-ken-pipeline-fast.py`).
  - Python QA scripts run in one process so OpenCV/NumPy/SciPy initialization is paid once.
  - Build behavior remains equivalent to the existing `npm run build` command.
  - `npm run verify:ken-pipeline` now points to the fast orchestrator.

## Performance

- `verify:ken-locomotion`: previously exceeded 120 seconds in this environment; now about 2 seconds as a standalone npm step.
- `verify:ken-pipeline`: about 15 seconds in the optimized test run, including source gates, build, release integrity, and the final authored-pipeline verifier.

## Validation / invariants

Preserved:
- Ken structural target: 137F.
- Ken enabled authored frames: 0F until genuine authored transparent HQ frames pass both pose and semantic QA.
- Tatsumaki: 12F staging, gated.
- Super Rush: 16F staging, gated.
- Gameplay frame counts, hitboxes, damage, cancel windows, projectile timing, Super Art timing: unchanged.
- Authored-only promotion rule: unchanged.

Required regression checks for this batch:
- `npm run verify:ken-pipeline`
- `node scripts/verify-animation-sequences.mjs`
- `node scripts/verify-v063-rc38.mjs`
