# Side-Scroll Chronicles v0.0.8 — Combat Expression Pass

## Implemented

### 1. Character technique layer
- Added `TechniqueLibrary.ts` as a data-driven layer independent from the combat engine.
- 8 playable characters now each have one character-specific command normal.
- Added six aerial normals per playable character (48 total).
- Added character-specific target-combo routes, including multi-step chains for Ken, Dudley, Ibuki and Yun.
- Fighter input flow now resolves aerial normals, command normals and target-combo follow-ups without rewriting the combat engine.

### 2. Super Art presentation
- All 24 playable Super Arts now carry individual presentation metadata (motif, accent, freeze timing).
- Super activation emits a dedicated `super-flash` event and applies global combat freeze.
- Super hits emit `super-impact` events separate from ordinary hit sparks.
- Presentation motifs include wave, electric, uppercut, flame, rush, aerial, throw, barrage, spiral, install, kunai, launch and related variants.
- Stage rendering uses motif-specific screen lines/rings/rays and per-art accent colors.

### 3. Combat VFX / character posing
- Added differentiated air-hit, command-normal-hit, target-combo-hit and super-impact effects.
- Added command-normal and target-combo labels to impact feedback.
- Character renderer now has separate attack posing for aerial normals, command normals, target combo follow-ups and any Super Art ID.
- Fixed Super Art pose detection so SA1/SA2/SA3 no longer depend on `_SUPER` suffix naming.

### 4. Procedural combat audio pass
- Expanded Web Audio synthesis for light/heavy hit layers, air hits, command hits, target-combo hits, guard, throw escape, Parry / Red Parry, Super start, Super impact, boss warning/burst and KO.
- Combat events are now individually marked after audio playback, so multiple events created during one simulation tick are not silently dropped.

### 5. Discoverability / HUD
- Combat help panel now displays the selected character's command-normal input and label.
- HUD calls out aerial attacks, target-combo follow-ups and the selected Super Art command.

## Verification

`npm run verify` PASS:
- TypeScript strict typecheck
- Production build
- 34 PWA app-shell files present and cached
- Combat / Guard / Parry / Throw Escape / Projectile / Counter
- BELT multi-enemy combat and environment interaction
- AI archetypes
- 8-character combat identity checks
- Urien / Gill boss patterns
- Continue / Stage Select campaign menu
- Stage 1 → Stage 5 campaign flow
- 24 Super Arts and install supers
- 8 command normals / 48 aerial normals / target combos
- 24 distinct Super presentation variants and Super freeze
- Options and touch layout persistence

## Version state

This remains pre-V0.1. Campaign path reaches Ending, but V0.1 COMPLETE still requires final animation/art/audio/device-quality acceptance work defined by MASTER COMMAND.
