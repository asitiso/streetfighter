# Side-Scroll Chronicles — v0.0.37-rc.12 Progress Report

## RC12 focus

RC12 intentionally does not add new combat mechanics. It reduces the remaining V0.1 real-device certification burden in two areas that RC11 could not prove strongly enough: display safe-area containment and real offline dynamic-module loading.

## 1. Safe-area rendering is now structural, not checklist-only

A new `SafeAreaProbe.ts` reads the browser's CSS `env(safe-area-inset-*)` values at runtime. `GameApp.resize()` now constrains the actual game canvas to the safe viewport rather than drawing the HUD under notch / rounded-corner exclusion zones and merely asking the tester to inspect it.

- Reads top/right/bottom/left safe-area insets.
- Computes a safe drawable viewport.
- Moves and sizes the canvas to that safe viewport.
- Keeps the touch overlay independently safe-area aware through its existing CSS variables.
- Device Certification automatically marks `LANDSCAPE / SAFE AREA` PASS when the device is landscape and the measured canvas bounds are inside the reported safe area.
- The certification note records the measured inset values for later export / evidence review.

This changes the workflow from “visually inspect every time” to “the layout is constrained by construction, then automatically prove the measured bounds”. A final physical-device visual glance is still useful for unusual vendor/browser behavior.

## 2. Offline transition certification now executes deferred modules

The previous offline checks proved that Stage 2–5 and Ending bytes were present in CacheStorage. RC12 adds a stronger `auditOfflineDynamicImports()` path.

The audit only runs as a real certification when:

- the browser reports offline,
- the app is controlled by the service worker,
- the prepared offline transition cache is complete.

It then creates a fresh **module Worker realm** and performs dynamic imports for:

1. Stage 2
2. Stage 3
3. Stage 4
4. Stage 5
5. Ending

Each import validates the expected scene export and records its duration. Running in a fresh worker realm avoids treating an already-imported main-window module as sufficient proof.

In `DEVICE CERT`, select `OFFLINE STAGE TRANSITION` and press HP while offline. A 5-step audit panel shows the result. `5/5 PASS` automatically records the certification item as PASS; incomplete/unsupported conditions are recorded as CHECK rather than silently passing.

## 3. Initial PWA weight remains deferred

RC12 keeps Stage 2–5 and Ending outside the initial service-worker App Shell. Only the new small `SafeAreaProbe.js` joins the initial shell because `GameApp.js` depends on it at boot.

The campaign remains prepared on demand and the later stages remain dynamic imports.

## 4. Regression behavior preserved

No combat timing, damage, AI, boss behavior, stage flow, VFX timing, audio transition, save schema, or fixed-step combat-clock values were intentionally changed.

Full `npm run verify` passed after the RC12 changes, including the existing combat and release suites.

Key preserved checks include:

- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1 → 5 flow PASS
- Urien / Gill PASS
- 24 Super Arts PASS
- 48 Air Normals PASS
- 50-minute virtual marathon PASS
- Gill 3 Phase HUD PASS
- 5-stage parallax PASS
- Super / Red-Parry FX timing PASS
- BELT → DUEL → FINAL audio layering PASS
- RC11 real-touch audit / background-resume certification logic PASS

## 5. Deployment validation

Candidate: `0.0.37-rc.12`

PWA cache: `game-cache-v037`

Title footer: `V0.0.37-RC12 • SAFE-AREA + OFFLINE IMPORT AUDIT`

The following built HTTP routes returned 200 in the final check:

- `/`
- `/assets/main.js`
- `/assets/core/SafeAreaProbe.js`
- `/assets/core/AssetManager.js`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage3Scene.js`
- `/assets/scenes/Stage4Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

## V0.1 status

V0.1 COMPLETE is still not declared.

The remaining high-value physical-device work is now narrower:

- Run the new offline module-worker audit on at least one installed smartphone PWA while actually offline.
- Confirm the constrained canvas / touch layout visually on a notched or rounded-corner device.
- Complete a real 10+ minute play session and manually confirm thermal behavior because web APIs cannot certify device heat reliably.
- Perform the final production-quality visual/audio review on the target phone speaker/display.

RC12 reduces repeated manual checking, but it does not fake evidence that requires a physical device.
