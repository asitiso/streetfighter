# PHASE 3–4 IMPLEMENTATION REPORT — v0.0.3

## Implemented

### PHASE 3 — fighter quality template
- Expanded procedural fighter animation from one generic pose into state-specific poses.
- Idle breathing and weight shift.
- Walk stride and vertical bounce.
- Jump leg compression / airborne tilt.
- Guard-specific arm pose.
- Parry-specific arm pose and glow.
- Hit / knockdown / KO body reactions.
- Primary special, anti-air, mobility special, throw and Super-specific attack poses.
- Mobility afterimages and Super aura.
- Existing MoveData-driven timing remains the animation timing source.

### PHASE 4 — belt battle architecture
- CombatWorld now owns `enemies[]`; the previous `enemy` API remains as a compatibility getter for duel/tests.
- EnemyDirector introduced with attack / wait / flank / ranged / recovery roles.
- Active threat slots are capped so normal belt combat does not turn into every enemy attacking at once.
- Soft Lane Alignment nudges only a few pixels near attack startup/active frames; no teleport or hard snap.
- One melee move can damage multiple enemies once each.
- Throwing an enemy can collide with and knock down a second enemy.
- Wall-impact reaction event added.
- Destructible stage props added with collision, HP, break event and rendering.
- Stage 1 now uses three belt encounters: 3 enemies -> 5 enemies -> 2 elite enemies (10 enemies total) before the boss duel.
- Enemy HP / threat count HUD and wave transition cards added.
- Belt fighters are depth-sorted by Y for more coherent belt-scrolling presentation.

## Changed / Added Files
- `src/combat/CombatTypes.ts`
- `src/combat/EnemyDirector.ts` (new)
- `src/combat/Fighter.ts`
- `src/combat/CombatWorld.ts`
- `src/render/Visuals.ts`
- `src/scenes/Stage1Scene.ts`
- `scripts/verify-belt-mode.mjs` (new)
- `scripts/verify-stage-flow.mjs`
- `scripts/verify-build.mjs`
- `public/sw.js`
- `package.json`

## Automated Verification
- TypeScript strict typecheck: PASS
- PWA build/file/cache verification: PASS
- Base combat verification: PASS
- Enemy Director active attack slots: PASS (2)
- Multi-enemy melee hit: PASS (3 enemies damaged by one attack)
- Soft Lane Alignment: PASS (6.75px nudge in test, no snap)
- Destructible prop path: PASS
- Throw enemy into enemy collision path: PASS
- Stage 1 three-wave belt flow: PASS
- Belt -> Duel transition: PASS
- Duel -> Stage Clear transition: PASS

## Remaining before PHASE 4 can be considered fully polished
- True scrolling stage camera / arena-lock sections instead of one fixed screen composition.
- More environment object types and wall/vehicle reactions.
- Enemy archetype-specific behavior beyond the current character-profile AI basis.
- Touch-device performance profiling with a real mobile browser.
- Final art/sprite pipeline; current fighter rendering remains original procedural/vector-style development art rather than extracted original game assets.

## Next work
1. Add horizontal stage progression and arena-lock gates to Stage 1.
2. Build reusable enemy archetypes (Brawler / Boxer / Grappler / Agile / Heavy / Kick Fighter).
3. Add Stage 1 elite entrance and stronger environment interaction.
4. Then continue into the full 8-character roster compatibility pass and Stage 2 foundation.
