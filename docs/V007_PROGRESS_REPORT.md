# Side-Scroll Chronicles — v0.0.7 Progress Report

## Scope completed

### 1. Super Art system is now gameplay-real, not label-only
- Added 24 distinct player Super Art MoveData definitions: 8 characters × SA I/II/III.
- Selected Super Art now determines the actual move used by the double-QCF + Punch command.
- Super Art gauge length and stock count now affect live combat:
  - per-stock cost = selected SuperArtDef.gauge
  - max meter = gauge × stocks
  - HUD is segmented by stock count
  - using a Super consumes one stock rather than always consuming a hard-coded 100.
- Ryu SA III Denjin Hadoken has guard-break behavior.
- Alex/Ibuki grab Super Arts use throw rules rather than normal guard rules.
- Makoto SA III Tanden Renki is an install Super that temporarily increases damage/movement performance.
- Yun SA III Genei Jin is an install Super that temporarily speeds attack frames/movement and changes damage scaling.
- Install state has a live combat aura and countdown label.

### 2. Mobile Options screen
- Added OPTIONS to the title menu.
- Audio ON/OFF.
- Vibration ON/OFF.
- D-pad size: 70–140%.
- Six-button cluster size: 70–140%.
- Control opacity: 30–100%.
- Reset touch layout.
- All values persist in IndexedDB save data.

### 3. Direct touch-layout editing
- Added an EDIT CONTROL POSITIONS mode.
- Player drags the D-pad group directly on screen.
- Player drags the six-button group directly on screen.
- Layout is saved on pointer release.
- START exits layout-edit mode.
- Touch button feedback respects the vibration setting.

### 4. PWA / cache update
- Cache version bumped to `game-cache-v007`.
- `OptionsScene.js` added to the offline app shell.
- Production build now includes 33 verified required files.

## Verification

`npm run verify` PASS:
- strict TypeScript typecheck
- production build
- PWA shell/cache validation
- core combat
- Guard / Parry / command recognition
- BELT multi-enemy combat
- Enemy Director / AI archetypes
- character combat fidelity
- Urien/Gill boss patterns
- Continue / Stage Select flow
- Stage 1 → Stage 5 campaign flow
- 24 distinct Super Arts
- Super stock/gauge behavior
- Makoto/Yun install Supers
- Options screen integration
- touch layout persistence hooks
- drag editor presence
- haptic toggle wiring

Local HTTP artifact verification PASS (HTTP 200):
- `/`
- `/assets/main.js`
- `/assets/scenes/OptionsScene.js`
- `/assets/combat/MoveLibrary.js`
- `/sw.js`
- `/manifest.webmanifest`

## Known limitation in this environment
Automated Chromium visual capture could not be completed reliably in the current container; Chromium remained hung in headless mode. Compile/build/unit/static integration checks and direct HTTP artifact checks pass. A real-device visual/touch pass remains required before declaring release quality.

## Still required before V0.1 COMPLETE
- richer frame-by-frame character animation/key poses for all 8 fighters
- more character-specific command normals / air normals / target combos
- stronger Super-specific cinematics/VFX/audio treatment
- complete music/ambient/audio pass
- real-device touch latency and safe-area test
- real PWA install/offline test on target phones
- final visual comparison/polish for all five stages and ending

V0.1 COMPLETE is not declared yet.
