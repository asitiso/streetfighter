# SIDE-SCROLL CHRONICLES — v0.0.32-rc.7 Progress Report

## Goal
RC7 returns focus from release-management tooling to the game itself: final visual readability, stage set dressing, combat FX density, and audio mix clarity, without changing the 60 Hz combat rules.

## Implemented

### 1. Five-stage Final Visual Profiles
Added `src/render/FinalVisualProfiles.ts` with distinct visual profiles for New York, Hong Kong, Japan, London, and Secret Society.

Each profile controls stage accent/glow, floor reflection, far/mid/foreground detail targets, and atmosphere density. `Stage1Scene` now adds stage-specific set dressing on top of the existing scrolling backgrounds:

- New York: fire-escape structures, basketball/street detail, warm street reflection accents.
- Hong Kong: hanging lantern/sign layers, market silhouettes, wet-neon ground highlights.
- Japan: utility lines, vending-machine detail, restrained warm street reflections.
- London: crowd silhouettes, Fight Club cage/detail reinforcement, cold wet-ground treatment.
- Secret Society: monitor/data panels, structural lines, energy-lit floor/detail layers.

Detail count scales with Runtime Quality so low-end devices lose decorative density before any combat animation or timing is reduced.

### 2. Fighter Readability Pass
Combat fighters now receive a subtle ground contact glow and active-attack arc. Fast movement can add restrained motion silhouettes on quality tiers that allow secondary FX. These accents are presentation-only and do not alter hurtboxes, hitboxes, movement, or combat timing.

### 3. Hit / Parry / Super FX Density
Combat FX now uses quality-aware density:

- HIGH: 18 density units in the RC7 heavy-impact fixture
- BALANCED: 13
- LOW: 8

Parry gained a brighter contact core and tier-scaled radial rays. Super Impact gained quality-scaled radial streaks and an additional ring on HIGH quality.

### 4. Audio Bus and Mix Pass
Added `src/core/AudioMixProfiles.ts` and split Web Audio into:

- Music bus
- Ambience bus
- SFX bus
- Master bus

All five stages now have unique mix profiles for music level, ambience level, SFX emphasis, tonal brightness, and low-end weight.

Combat cues now duck music/ambience briefly so important feedback is not buried:

- Heavy hit: 0.56
- Parry: 0.48
- Super: 0.32
- KO: 0.26

The ducking uses stored stage base gains, so repeated rapid hits do not progressively collapse the background mix.

## Regression Status
Full `npm run verify` passed after the final RC7 audio change.

Core values remain unchanged:

- Ryu Heavy: 92 damage
- Ken SA I: 3 hits / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → Stage 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- 50-minute virtual marathon: PASS
- Save / Offline / Update / Diagnostics / Release Approval: PASS

## RC7 Automated Visual/Audio Acceptance

- 5 unique stage visual profiles: PASS
- Quality-scaled detail count: PASS
- HIGH > BALANCED > LOW combat FX density: PASS
- 5 unique stage audio mixes: PASS
- Heavy/Parry/Super/KO duck priorities: PASS
- New visual/audio modules included in PWA App Shell: PASS
- Service Worker cache: `game-cache-v032`
- Candidate: `0.0.32-rc.7`

## Deployment Check
The built distribution returned HTTP 200 for:

- `/`
- `/assets/main.js`
- `/assets/render/FinalVisualProfiles.js`
- `/assets/core/AudioMixProfiles.js`
- `/assets/core/AudioManager.js`
- `/assets/scenes/Stage1Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

Stage 1–5 and Ending remain dynamic imports.

## Remaining Before V0.1 COMPLETE
RC7 improves the procedural/vector presentation substantially, but V0.1 should still not be declared complete until real-device certification and final production-grade character/background/audio asset quality are verified on target mobile devices.
