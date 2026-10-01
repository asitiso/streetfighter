# Side-Scroll Chronicles — v0.0.28-rc.3 Progress Report

## Scope
RC2 → RC3 release-device validation pass. This build does not change combat balance. It adds on-device certification, touch latency measurement, explicit PWA update/apply/rollback controls, and persistence of the latest acceptance matrix.

## Implemented

### Device Certification
- Added `DEVICE CERT` to the title menu.
- Added device-local certification storage (`ssc-device-cert-v1`), separate from campaign save data.
- Manual certification rows:
  - Landscape / safe-area
  - 6-button touch controls
  - Audio unlock
  - PWA install / standalone launch
  - Airplane-mode launch
  - Background / resume
  - Offline stage transition
  - 10-minute sustained play
- Status can be recorded as PASS / CHECK / FAIL / UNTESTED.
- Latest acceptance matrix is stored with the device certification record.

### Touch Latency Probe
- Added 8-tap touch latency measurement.
- Measures pointer-event timestamp → next rendered frame.
- Uses average and P95 latency.
- P95 <= 80 ms = PASS, <= 120 ms = CHECK, > 120 ms = FAIL.
- Touch controls are temporarily hidden during the probe so taps reach the canvas directly, then restored automatically.

### PWA Update / Rollback
- Added `PWA UPDATE` title-menu screen.
- Can check the service-worker registration for an update.
- Waiting update can be applied deliberately with `SKIP_WAITING`.
- The current release keeps one previous game cache as a rollback source.
- Rollback does not delete or migrate IndexedDB save data.
- Rollback mode is reversible with `RESTORE CURRENT`.
- The current launcher/update UI remains pinned to the active release; rollback mode only prefers previous cached deferred campaign content. This avoids trapping the user in an older launcher with no restore control.

### Release Check / Acceptance
- Acceptance Matrix now optionally includes:
  - DEVICE CERTIFICATION
  - TOUCH LATENCY
- Exporting a Release Report also stores the exact matrix in the device-local certification record.
- Release report includes a snapshot of the device certification record.

## Version / Cache
- package version: `0.0.28-rc.3`
- release candidate: `0.0.28-rc.3`
- PWA game cache: `game-cache-v028`
- save database remains: `ssc-save-data-v1`

## Automated Verification
`npm run verify` — PASS.

Important regression values remain unchanged:
- Ryu Heavy: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → Stage 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / 8 Endings / Battle Record: PASS
- 50-minute virtual marathon: PASS

RC3-specific automated fixture:
- Device certification: 9/9 PASS (8 manual-test fixtures + touch latency fixture)
- Touch latency fixture: P95 18 ms
- Acceptance Matrix: 18/18 PASS
- Previous cache selection: `game-cache-v027`
- Update protocol: CHECK / APPLY / ROLLBACK / RESTORE CURRENT present
- Service worker does not access IndexedDB
- Stage 1–5 and Ending remain dynamic imports

## HTTP Deployment Check
HTTP 200 confirmed for:
- `/`
- `/assets/main.js`
- `/assets/core/DeviceCertification.js`
- `/assets/core/TouchLatencyProbe.js`
- `/assets/core/PwaUpdateManager.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/scenes/PwaUpdateScene.js`
- `/assets/scenes/Stage5Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

## Not Yet Certified
The 18/18 matrix above is an automated fixture, not a physical-phone certification. A real phone still needs to run the in-app `DEVICE CERT` flow for PWA installation, airplane-mode launch, touch latency, background/resume, sustained play, thermal behavior, and real input latency.

Therefore this build remains an RC and does not declare V0.1 COMPLETE.
