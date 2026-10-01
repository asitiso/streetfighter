# Side-Scroll Chronicles — v0.0.36-rc.11 Progress Report

## Focus
RC11 reduces the amount of manual work required for the remaining real-device V0.1 certification. Combat, stage flow, boss logic, timing, and RC10 presentation profiles are intentionally unchanged.

## Implemented

### Real-touch certification audit
- `InputManager` now tracks touch-origin pressed/released state separately from keyboard/gamepad state.
- Device Certification can run a dedicated real-touch audit from the `6-BUTTON TOUCH` row.
- The audit requires all 10 relevant controls: LEFT / RIGHT / UP / DOWN + LP / MP / HP / LK / MK / HK.
- Keyboard and gamepad input cannot satisfy this audit.
- Passing the audit automatically records `touch-controls = PASS` with evidence in the certification record.

### Automatic certification evidence
- Added automatic evidence evaluation to `DeviceCertificationStore`.
- Standalone display mode can automatically confirm `PWA INSTALL / LAUNCH`.
- A standalone boot that begins while `navigator.onLine === false` can automatically confirm `AIRPLANE MODE LAUNCH`.
- A running Web Audio context after user interaction can automatically confirm `AUDIO UNLOCK`.
- Automatic evidence is synchronized when returning to Title, entering Device Certification, opening Release Check, and resuming from background.
- Manual `FAIL` and existing manual `PASS` are never overwritten by automatic evidence.

### Background / resume evidence
- Visibility transitions now record the time spent in background.
- Touch input is force-released both when entering background and when resuming.
- A resume after at least 30 seconds automatically records `BACKGROUND / RESUME = PASS`.
- This directly targets stuck-touch and time-jump certification risk without changing the fixed 60 Hz combat clock.

### 10-minute runtime assistance
- After 10 minutes of measured runtime, Device Certification automatically records a `CHECK` evidence note.
- FPS/memory telemetry is included in the decision note.
- It intentionally does **not** auto-PASS because physical-device heat still requires a human check.

### Certification UI
- Automatic evidence notes are shown directly under the relevant certification row.
- The real-touch audit displays live 0/10 → 10/10 progress.
- Existing 8-tap touch latency measurement remains intact.
- Certification export/import remains compatible with earlier RC records.

## Release identifiers
- Candidate: `0.0.36-rc.11`
- PWA cache: `game-cache-v036`
- Title footer updated to `V0.0.36-RC11`.

## Verification
Final `npm run verify`: **PASS**.

RC11-specific checks:
- automatic standalone/offline/audio evidence: PASS
- 10-minute runtime evidence remains CHECK pending heat confirmation: PASS
- 30-second background resume auto-certification: PASS
- manual failure priority over automatic evidence: PASS
- touch-origin input tracking: PASS
- real-touch-only 10-control audit wiring: PASS
- RC11 cache / candidate identifiers: PASS

All prior regression suites continue to pass, including:
- Ryu heavy: 92 damage
- Ken SA I: 3 hit / 327 damage
- Juggle: 2 hit
- BELT active attackers: 2
- Stage 1→5 progression
- Urien / Gill patterns
- 24 Super Arts
- 48 Air Normals
- save / offline / update / diagnostics
- 50-minute virtual marathon
- Gill 3-phase HUD
- 5-stage parallax
- Super / Red Parry FX timing
- BELT→DUEL→FINAL audio crossfade

## HTTP deployment smoke check
HTTP 200 confirmed for:
- `/`
- `/assets/main.js`
- `/assets/core/DeviceCertification.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/input/InputManager.js`
- `/assets/core/AudioManager.js`
- `/sw.js`
- `/manifest.webmanifest`

## Remaining before V0.1 COMPLETE
V0.1 COMPLETE is still **not declared**.

The remaining certification still requires a physical smartphone for items that software cannot honestly prove by itself, especially:
- notch / rounded-corner safe-area visual confirmation
- actual offline Stage transition play on the installed PWA
- 10-minute heat / throttling feel confirmation
- final production visual/audio judgment on the target device

RC11 makes the device pass faster: PWA launch, offline boot, audio unlock, 30-second resume, real-touch controls, and touch latency now produce reusable evidence instead of relying only on memory/manual checkbox entry.
