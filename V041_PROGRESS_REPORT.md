# Side-Scroll Chronicles — v0.0.41-rc.16 Progress Report

## Goal
RC16 closes a release-process gap left after RC15's evidence seal: an operator could seal correct device evidence while a deployment accidentally served a mixed set of files from different release candidates. RC16 binds release approval to the deployed runtime build itself.

## Release identity
- Candidate: `0.0.41-rc.16`
- PWA cache: `game-cache-v041`
- Deploy integrity manifest: `/release-integrity.json`
- Runtime files covered: **88** (source maps excluded)
- Build root SHA-256: `A11F4C7178B833C55FAB92E0B0365AFCD016BC6382CD8E7FA293CEE1C89D1F05`

## 1. Build-time deploy manifest
The build now runs `scripts/generate-release-integrity.mjs` after TypeScript compilation and public asset copy.

It walks the actual `dist` output, excludes only source maps and the manifest itself, and records for every runtime file:
- public URL path
- exact byte length
- SHA-256 digest

The manifest also records the release candidate, expected PWA cache name, and a deterministic aggregate root SHA-256 derived from the sorted file records.

The manifest covers the app shell, combat/render/input code, Stage 1–5, Ending, `sw.js`, `manifest.webmanifest`, icons and all other runtime output.

## 2. Runtime SHA-256 verification
New `ReleaseIntegrityVerifier` fetches `/release-integrity.json` and verifies the files the running PWA actually receives.

Checks include:
- manifest candidate == current candidate
- manifest cache == current cache
- HTTP success for every runtime file
- exact byte length
- SHA-256 match

Verification runs with bounded concurrency and produces a snapshot with:
- `pass / fail / checking / untested`
- checked / total files
- manifest root
- mismatch list
- checked time

The timestamp is intentionally **not** part of the release evidence fingerprint, so re-running the same valid integrity check does not invalidate an existing seal.

## 3. Release Check integration
Entering RELEASE CHECK starts deploy integrity verification automatically. MP refresh now refreshes both release state and SHA-256 integrity.

The Acceptance Matrix contains a new mandatory row:
`DEPLOY SHA-256 INTEGRITY`

A failed integrity check is a BLOCK, not a warning. This prevents RC READY when deployed bytes do not match the build manifest.

## 4. Final approval + stale guard integration
RC15's evidence fingerprint now optionally includes deployment integrity evidence:
- integrity status
- candidate
- cache name
- manifest root
- checked / total
- mismatch list

Therefore:
- re-checking the exact same build keeps the same evidence fingerprint
- a changed deployed file changes the fingerprint
- a candidate/cache mismatch changes the fingerprint
- any deploy mismatch blocks approval
- an old approval cannot remain sealed against different deployed bytes

Diagnostics FINAL APPROVAL shows both the evidence fingerprint and the deploy root.

## 5. Final Proof integration
`FINAL RELEASE PROOF` now carries the deploy integrity snapshot. When runtime integration supplies integrity evidence, `complete=true` requires deploy integrity PASS.

A sealed proof therefore binds together:
- real-device certification
- touch latency
- Acceptance Matrix
- runtime errors
- telemetry / endurance evidence
- Safe Area evidence
- recovery history
- environment
- operator approval
- **deployed build SHA-256 root**

## 6. Service worker / offline support
The v041 app shell now includes:
- `/release-integrity.json`
- `/assets/core/ReleaseIntegrity.js`

This lets the installed PWA retain the exact integrity manifest associated with the current cached build. Mixed old/new Service Worker states are detected through candidate/cache/hash mismatches instead of being silently approved.

## Automated verification
Final `npm run verify` passes all existing regression suites plus RC16.

RC16 acceptance specifically verifies:
- all 88 manifest entries match the built files byte-for-byte
- aggregate root recomputes exactly
- Stage 1–5 and Ending are represented in the manifest
- `ReleaseIntegrity.js`, `GameApp.js`, `main.js`, `sw.js` and manifest are covered
- re-check timestamp does not invalidate the seal
- a deploy mismatch changes the evidence fingerprint
- untested integrity blocks approval
- failed integrity blocks approval
- matching integrity can remain sealed
- Final Proof carries the deploy root

## HTTP deployment verification
A clean server on a dedicated port returned HTTP 200 for:
- `/`
- `/assets/main.js`
- `/assets/core/ReleaseIntegrity.js`
- `/assets/core/GameApp.js`
- `/release-integrity.json`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

Independent HTTP SHA-256 rechecks for `main.js`, `GameApp.js`, `ReleaseIntegrity.js`, `Stage5Scene.js` and `sw.js` all matched the manifest.

## V0.1 status
`V0.1 COMPLETE` is still not declared. RC16 removes the mixed-deployment / wrong-build approval gap. The remaining blockers are physical target-device evidence: actual installed-PWA offline audit, final notch/corner visual inspection, 10-minute physical heat confirmation, and final production visual/audio review.
