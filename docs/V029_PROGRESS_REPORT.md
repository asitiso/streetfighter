# SIDE-SCROLL CHRONICLES — V0.0.29-RC4 PROGRESS REPORT

## Scope
RC3 → RC4 release-resilience pass. Combat balance, campaign flow, 60Hz simulation, Stage 1–5, bosses, endings, save schema, and offline campaign structure remain intact.

## Implemented

### 1. Candidate-scoped Crash / Error Journal
- Added `RuntimeErrorJournal`.
- Captures global `error` and `unhandledrejection` events.
- Boot, stage-load, and service-worker/update failures can be recorded with severity.
- Keeps a bounded local diagnostic history and only grades the current release candidate for the final gate.
- Release Report now includes the current candidate error snapshot.

### 2. Interrupted Session Recovery
- Added `SessionRecoveryStore` with active/clean session markers.
- Stage 1–5 and Ending checkpoints record stage, character, and Super Art.
- Normal `pagehide` marks the session clean.
- If the previous session was left active unexpectedly, Title exposes `RECOVER SESSION`.
- Recovery intentionally restarts the interrupted Stage from its start rather than attempting unsafe mid-frame combat serialization.

### 3. Device Certification Export
- Device Certification now has a dedicated `EXPORT CERTIFICATION` row.
- Export contains release candidate, device label, checklist results, touch-latency measurements, summary, and saved Acceptance Matrix.
- JSON export is independent from the gameplay save.

### 4. PWA Update Failure Auto-Recovery
- Applying a waiting Service Worker now writes an update-attempt marker before activation.
- Successful boot clears the marker.
- If boot fails while an update attempt is still armed, the boot error handler requests `ROLLBACK_PREVIOUS` and reloads once.
- Recovery is bounded with a `recoveryTried` flag to avoid reload loops.
- Save DB remains isolated from all cache rollback operations.

### 5. Final Release Candidate Decision
- Added `FinalCandidateDecision`.
- Combines automated Release Gate, Acceptance Matrix, real Device Certification status, current-candidate crash journal, Session Recovery readiness, and Update Auto-Recovery readiness.
- Verdicts: `RC READY`, `DEVICE CERT REQUIRED`, `RC BLOCKED`.
- Release Report now persists this final decision.

### 6. Release Check Expansion
- Added rows for Crash/Error Journal, Session Recovery, and Update Auto-Recovery.
- Acceptance Matrix includes the three new reliability checks.
- Release Check layout expanded to fit the larger matrix without overlap.
- Automated fixture currently reports 21/21 PASS and `rc-ready`.

### 7. Title / Release UI
- Added `RECOVER SESSION` entry when an interrupted checkpoint exists.
- Title layout was compacted for the larger menu count.
- Version string updated to `V0.0.29-RC4`.

## Validation
`npm run verify` — PASS.

Regression values retained:
- Ryu heavy attack: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → Stage 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / Endings / Battle Record: PASS
- 50-minute virtual marathon: PASS

RC4 checks:
- Candidate-scoped error journal: PASS
- Interrupted Stage recovery: PASS
- Clean session suppression: PASS
- Device Certification JSON export: PASS
- Cache v028 → v029 update plan: PASS
- Update auto-recovery protocol present: PASS
- Final automated RC verdict: `rc-ready`
- Acceptance Matrix automated fixture: 21/21 PASS

## Deployment Verification
HTTP 200 confirmed for:
- `/`
- `/assets/main.js`
- `/assets/core/RuntimeErrorJournal.js`
- `/assets/core/SessionRecovery.js`
- `/assets/core/FinalCandidateDecision.js`
- `/assets/core/PwaUpdateManager.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/scenes/ReleaseCheckScene.js`
- `/assets/scenes/Stage5Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

Stage 1–5 and Ending remain dynamic imports.
Service Worker cache: `game-cache-v029`.
Save database remains: `ssc-save-data-v1`.

## Release Status
Automated RC4 gate: **RC READY** in the fully-certified automated fixture.

This does **not** declare V0.1 COMPLETE. A real phone can still produce `DEVICE CERT REQUIRED` until the in-app Device Certification is completed on actual hardware. Final art/audio quality and real-device install/offline/thermal/touch testing remain outside the container's direct validation.
