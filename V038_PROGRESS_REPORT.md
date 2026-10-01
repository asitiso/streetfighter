# Side-Scroll Chronicles — v0.0.38-rc.13 Progress Report

## RC13 focus

RC13 does not expand the combat roster or campaign feature set. It tightens the final real-device certification path by turning the 10-minute play check into a sustained-performance audit with a single remaining physical-device confirmation for heat.

## 1. Sustained runtime telemetry

`RuntimeTelemetry` now keeps a lightweight per-second FPS timeline (up to 15 minutes) in addition to the existing short-window frame statistics.

For sessions that reach 10 active minutes, it compares:

- baseline window: approximately 60–180 seconds
- recent window: final 120 seconds

New runtime evidence:

- `baselineFps`
- `recentFps`
- `sustainedDegradationPct`
- `sustainedStability`

Classification:

- GOOD: recent FPS >= 50 and slowdown <= 12%
- WATCH: recent FPS >= 43 and slowdown <= 25%
- POOR: otherwise

Background time is not counted because the fixed-step loop is stopped while the document is hidden.

## 2. 10-minute certification flow

The `10 MINUTE PLAY` row now has a dedicated endurance panel showing:

- active play time
- recent FPS
- baseline → recent FPS
- slowdown percentage
- sustained stability
- memory stability

At 10 minutes, automatic evidence remains `CHECK` rather than claiming a false thermal PASS. Browser APIs do not expose reliable device temperature.

When runtime evidence is not poor, pressing HP once records:

`MANUAL HEAT OK + AUTO 10m`

This is the only remaining human confirmation for the 10-minute endurance row.

If frame, memory, or sustained-performance evidence is POOR, the heat-confirm shortcut is blocked and the row remains CHECK for inspection.

## 3. Automatic evidence note quality

The automatic 10-minute note now records actual performance trend values instead of only saying that ten minutes elapsed.

Example stable evidence:

- baseline: 60.0 FPS
- recent: 56.0 FPS
- degradation: 6.6%
- sustained classification: GOOD

A forced 38 FPS late-session regression is classified POOR by the RC13 acceptance test.

## 4. Regression status

Full `npm run verify` PASS.

Existing acceptance baselines remain intact, including:

- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1→5 flow
- Urien / Gill boss flow
- 24 Super Arts
- 48 Air Normals
- 50-minute Virtual Marathon
- Gill 3 Phase HUD
- 5-stage Parallax
- VFX timing differentiation
- BELT→DUEL→FINAL audio crossfade
- RC11 real-touch/background certification assist
- RC12 Safe Area + real offline dynamic-import audit

## 5. Deployment verification

HTTP 200 confirmed for:

- `/`
- `/assets/main.js`
- `/assets/core/RuntimeTelemetry.js`
- `/assets/core/DeviceCertification.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/core/SafeAreaProbe.js`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

## Candidate

Candidate: `0.0.38-rc.13`

PWA cache: `game-cache-v038`

Title footer: `V0.0.38-RC13 • 10-MIN ENDURANCE AUDIT`

## V0.1 COMPLETE status

Not declared yet.

Remaining real-device work is now narrowly focused on:

1. one physical heat confirmation after the automated 10-minute endurance audit,
2. final visual inspection on at least one notched/rounded-corner phone,
3. installed-PWA offline Stage 2→5→Ending audit on a physical phone,
4. final production-level visual/audio sign-off.

The important change in RC13 is that the 10-minute test no longer requires a person to remember FPS behavior across the whole session. The app records the early-vs-late performance trend automatically; the person only confirms what software cannot measure reliably: physical heat.
