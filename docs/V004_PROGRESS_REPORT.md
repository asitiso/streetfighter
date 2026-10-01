# v0.0.4 Progress Report

## Implemented

- Stage 1 converted from a single-screen arena into a 3-area side-scrolling route.
- Camera follows world-space player movement and unlocks travel after arena clear.
- Arena gates re-lock when the player reaches the next fight area.
- Stage 1 clear now advances into Stage 2 through GameApp and updates campaign save state.
- Added Stage 2: Hong Kong — Night Market as a playable 3-area BELT → DUEL stage slice.
- Stage 2 includes neon market scenery, narrower lanes, destructible food/market stalls and props, mixed-direction pressure, and a Yun boss duel (Chun-Li fallback for Yun player).
- Added reusable enemy AI archetype profiles: Brawler, Boxer, Karate, Kick, Grappler, Agile, Heavy, Ranged.
- Enemy Director now uses preferred distance, pressure, flank bias, ranged bias and recovery state instead of treating enemies identically.
- Fighter AI now uses archetype-specific movement speed, attack cooldown, throw bias and preferred distance.
- Enemy guard behavior is driven by archetype guard tendency.
- Service Worker cache bumped to game-cache-v004 and now includes Stage2Scene and EnemyArchetypes modules.

## Main changed files

- src/combat/EnemyArchetypes.ts
- src/combat/EnemyDirector.ts
- src/combat/Fighter.ts
- src/combat/CombatWorld.ts
- src/scenes/Stage1Scene.ts
- src/scenes/Stage2Scene.ts
- src/core/GameApp.ts
- public/sw.js
- scripts/verify-ai-archetypes.mjs
- scripts/verify-stage-flow.mjs
- scripts/verify-build.mjs
- scripts/verify-combat.mjs
- package.json

## Automated verification

PASS:

- TypeScript strict typecheck
- Production build
- PWA required-file/cache manifest verification
- Normal hit / Guard / Parry / command input / projectile / Counter / Throw Escape / jump / crouch normal
- Enemy Director 1–2 active attacker rule
- Multi-enemy hit
- Soft Lane Alignment
- Breakable prop
- Throw enemy into enemy collision
- AI archetype profile separation
- Stage 1 three scrolling areas → DUEL → CLEAR
- Stage 1 clear callback → Stage 2 campaign advance
- Stage 2 three areas → Yun DUEL → CLEAR

## Not complete yet

- Stage 3–5 campaign content
- Full visual-bible sprite/animation asset production for all 8 characters
- Dedicated Stage 2 music/ambient audio
- Full Stage 2 bespoke props and crowd animation
- Urien / Gill
- Ending / Result / Stage Select
- Final mobile-device visual comparison and latency/performance pass

V0.1 COMPLETE is not declared.
