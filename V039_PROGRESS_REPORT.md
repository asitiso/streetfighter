# Side-Scroll Chronicles — v0.0.39-rc.14 Progress Report

## RC14 focus

RC14 does not add combat moves, enemies, stages, or progression systems. The goal is to shorten the last real-device certification pass before V0.1 by making the app tell the operator exactly what remains and by exporting the final evidence as one proof package.

## 1. Final Cert Run

`DEVICE CERTIFICATION` now contains a `FINAL CERT RUN / PROOF` row.

- HP synchronizes automatic evidence and jumps directly to the first device check that is not PASS.
- If the only remaining item is touch latency, HP jumps directly to the 8-tap latency row.
- If every device check is already PASS, HP immediately exports the final proof bundle.
- LP on the Final Cert row exports the proof bundle at any time.

This removes the need to scan the full checklist repeatedly to remember what should be tested next.

## 2. Final visual/audio production review is now a formal release check

A new required certification item was added:

`FINAL VISUAL / AUDIO REVIEW`

The target-device review card shows the exact production items that still require human eyes/ears:

1. Stage parallax depth reads clearly.
2. Hit / Parry / Super VFX hierarchy is obvious.
3. Projectile trails remain visually distinct.
4. Gill Phase I / II / III HUD changes are immediately readable.
5. BELT → DUEL → FINAL → ENDING audio transitions cleanly.

This item is intentionally not auto-PASSed. Software can verify that the profiles and transition logic exist, but final production quality is a perceptual judgment on the actual phone.

## 3. Final Proof Bundle

The old single-purpose certification export path is superseded in the certification UI by one `FINAL RELEASE PROOF` JSON.

The proof bundle includes:

- candidate and generation timestamp
- complete / incomplete result
- device-certification summary
- exact remaining certification actions
- full device certification record
- 10-minute runtime telemetry and sustained-performance evidence
- runtime error journal
- recovery history
- measured safe-area insets and canvas containment
- online/offline, standalone, service-worker-control, user-agent and viewport evidence
- current release-approval record when present

The certification import path remains available.

## 4. Device certification count

RC14 has 9 required device-certification rows plus the touch-latency test, for 10 final device checks total.

The additional required row is the production review. All existing automatic and manual safeguards remain intact, including the rule that an explicit manual FAIL cannot be overwritten by later automatic PASS evidence.

## 5. UI density cleanup

Because the production review adds one required row, Device Certification row spacing was tightened without removing information. The screen still keeps the full checklist, touch latency, Final Cert/Proof, and certification import on one 1280×720 logical screen.

Device History no longer assumes a hard-coded `/9` denominator; it now uses the current certification definition dynamically.

## 6. Regression verification

Final `npm run verify`: PASS.

Preserved acceptance highlights:

- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1 → 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- 50-minute Virtual Marathon: PASS
- Gill 3 Phase HUD: PASS
- 5-stage Parallax: PASS
- Super / Red-Parry timing hierarchy: PASS
- BELT → DUEL → FINAL audio crossfade: PASS
- RC11 real-touch / background-resume certification: PASS
- RC12 Safe Area / offline Module Worker dynamic-import audit: PASS
- RC13 10-minute sustained-performance audit: PASS
- RC14 Final Cert Run / Production Review / Final Proof Bundle: PASS

RC14 acceptance specifically verifies that a pending production review is returned as the next required action and that a fully PASSed certification produces `complete: true` in the final proof bundle.

## 7. PWA / deployment verification

Candidate: `0.0.39-rc.14`

PWA cache: `game-cache-v039`

Title footer: `V0.0.39-RC14 • FINAL CERT RUN + PROOF`

`FinalProofBundle.js` is a boot-time dependency and is therefore included in the initial App Shell. Stage 2–5 and Ending remain deferred and are not moved into the initial shell.

Direct HTTP verification returned 200 for:

- `/`
- `/assets/main.js`
- `/assets/core/FinalProofBundle.js`
- `/assets/core/DeviceCertification.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/core/SafeAreaProbe.js`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

## V0.1 status

V0.1 COMPLETE is still not declared.

What remains is real target-device evidence, not another round of speculative feature work: complete the guided certification run on the installed phone, confirm physical heat after the 10-minute endurance run, execute the real offline transition audit, and mark the final visual/audio review after observing the production presentation on-device.

RC14 makes those remaining actions explicit and exports their evidence in one file, so the next step should be device execution rather than adding another large gameplay subsystem.
