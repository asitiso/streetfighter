# PHASE 1–2 DEVELOPMENT REPORT — 2026-09-24

## Status

This is not V0.1 COMPLETE. The project now has a working vertical slice from Title → Character Select → Super Art Select → Stage 1 BELT combat → cinematic BELT-to-DUEL transition → DUEL → Stage Clear, plus the reusable combat foundation required by later phases.

## Implemented

### Front-end flow / visual master foundation
- Title scene remains the entry screen and now advances into the game flow.
- 8-character Character Select screen with character-specific palettes, stats, styles, animated procedural portraits, and touch/keyboard navigation.
- Super Art Select screen with 3 arts per character, stock/gauge presentation, and save integration.
- Stage 1 New York visual scene with sunset skyline, subway entrance, street signage, depth floor, BELT HUD, DUEL HUD label change, command hints, combat FX, projectile FX, and Stage Clear presentation.
- Character rendering is generated as layered animated figure art rather than gray-box placeholders.
- BELT → DUEL transition has a timed cinematic presentation and preserves player HP / gauge.

### Combat core
- Fixed 60Hz simulation remains independent from rendering.
- Data-driven MoveData and character definitions.
- 30-frame input history / command recognition.
- Standing normals LP/MP/HP/LK/MK/HK.
- Crouching normals including 2MK / sweep family.
- Character movement, belt depth movement, duel jump/crouch, body collision.
- Character speed/power/reach variation.
- Guard / block stun.
- Hit stun / hit stop / pushback.
- Knockdown / launch state.
- Counter hit detection and extra damage/stun.
- High Parry / Low Parry windows.
- Red-Parry-capable window while in block state.
- LP+LK Throw and Throw Escape.
- Normal → special cancel path after confirmed hit.
- EX gauge cost.
- Super gauge cost.
- Selected Super Art name is used by the player's Super move.
- Real moving projectiles for projectile-type specials.
- Special movement for anti-air launch and mobility moves.
- KO event / Stage Clear path.

### Character move-data split
Each playable fighter now owns a separate special-move set instead of inheriting Ryu's moves:
- Ryu: Hadoken / Shoryuken / Tatsumaki profile
- Ken: faster rush-oriented profile
- Chun-Li: Kikoken / kick-oriented profile
- Alex: power / close-range profile
- Dudley: boxing / fast pressure profile
- Makoto: high-power karate profile
- Ibuki: fast projectile / mobility profile
- Yun: fast rush profile

This is still an early data pass. PHASE 6 will require full frame-authored normals, command normals, throws, hit reactions, victories, and all Super Arts for all 8 fighters.

## Verification

`npm run verify` currently performs:
1. TypeScript strict typecheck.
2. Full build.
3. Required PWA output / service-worker cache verification.
4. Combat verification:
   - raw heavy hit
   - guard
   - parry with zero damage
   - D,DF,F+P command recognition
   - projectile travel + hit
   - counter hit
   - throw escape
   - duel jump
   - crouching 2MK
5. Stage-flow verification:
   - BELT KO → transition
   - transition → DUEL rules
   - DUEL KO → Stage Clear

Latest result: all automated checks PASS.

## Environment limitation

Automated Chromium visual capture cannot open localhost or file URLs in this execution environment because Chromium returns `ERR_BLOCKED_BY_ADMINISTRATOR`. This is an environment restriction rather than a compile/runtime test failure. Browser visual verification should be repeated in an unrestricted local browser when available.

## Main changed / added files

- src/core/GameApp.ts
- src/core/AudioManager.ts
- src/scenes/TitleScene.ts
- src/scenes/CharacterSelectScene.ts
- src/scenes/SuperArtSelectScene.ts
- src/scenes/Stage1Scene.ts
- src/game/characters.ts
- src/combat/CombatTypes.ts
- src/combat/InputBuffer.ts
- src/combat/MoveLibrary.ts
- src/combat/Fighter.ts
- src/combat/CombatWorld.ts
- src/render/Visuals.ts
- public/sw.js
- scripts/verify-build.mjs
- scripts/verify-combat.mjs
- scripts/verify-stage-flow.mjs
- package.json

## Remaining before PHASE 2 can be considered fully production-quality

- Multi-hit move definitions and robust Red Parry test case.
- Throw animation / positional choreography rather than event-only knockdown.
- Per-move hurtboxes and frame-varying hitboxes.
- Air normals / air-to-air collision detail.
- More exact cancel tables per character.
- Stun system if retained by final design.
- Input leniency tuning on real touch devices.
- Hitbox / hurtbox debug overlay and frame-step Fidelity Lab.

## Next implementation target

Continue with PHASE 3 Ryu Quality Template and PHASE 4 BELT foundations:
- Ryu move-by-move authored timings and animation poses.
- projectile ownership / clash rules.
- 3–6 enemy architecture instead of one enemy.
- Enemy Director attack/wait/flank slots.
- soft lane alignment.
- multi-enemy hit and throw-enemy-into-enemy.
- environment objects and wall reactions.
