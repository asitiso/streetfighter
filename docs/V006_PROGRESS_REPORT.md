# v0.0.6 Progress Report

## Implemented

### Character combat identity
- Added `CharacterCombatProfiles.ts` with per-character movement, depth movement, jump arc, gravity, health, normal damage/reach/frame tuning, throw tuning, mobility speed, anti-air drift and chain routes.
- Ryu: balanced mid-range baseline.
- Ken: faster startup/recovery, rush chains, faster mobility.
- Chun-Li: long normal reach, faster footsie movement, lighter damage.
- Alex: higher health, heavy normals, significantly stronger/longer throw.
- Dudley: boxing target-combo chains and fast recovery.
- Makoto: high burst damage and fast forward special movement.
- Ibuki: higher/floatier jump, fast chains, multi-kunai EX/Super.
- Yun: widest normal chain routes and fast rush movement.

### Character-specific specials
- Replaced generic shared special tuning with dedicated special sets for all 8 playable characters.
- Added dedicated Urien and Gill boss move sets.
- Urien Aegis Reflector is a slow persistent piercing wall projectile.
- Gill Seraphic Storm uses a multi-projectile piercing volley.

### Character visual separation
- Added distinct torso/head/accessory rendering for the playable roster and bosses.
- Added Dudley glove sizing, Chun-Li hair buns, Yun cap, Ibuki mask/ponytail silhouette, Alex bandana/suspenders, Ken hair, Ryu headband, Urien/Gill boss silhouettes.
- Added special projectile rendering for Aegis Reflector, Gill fire/ice shots and Ibuki kunai.

### Boss patterns
- Stage 5 Urien periodically deploys Aegis Reflector with a visible warning telegraph.
- Gill Phase I/II/III now adds scripted elemental projectile pressure.
- Phase II fires two-lane volleys.
- Final Segment fires three-lane piercing Seraphic volleys at higher frequency.
- Boss warning and burst VFX events added.

### Campaign usability
- Title screen now has NEW GAME / CONTINUE / STAGE SELECT.
- Continue resumes from `currentStage` using saved fighter and Super Art.
- Stage Select unlock remains tied to clearing Stage 5 / Ending.
- Added dedicated Stage Select screen for replaying Stage 1–5.
- Added `hasCampaignStarted` save flag.

### Offline/PWA
- Service worker cache bumped to `game-cache-v006`.
- Added CharacterCombatProfiles and StageSelectScene to offline app shell.

## Verification
- TypeScript strict typecheck: PASS
- Production build: PASS
- PWA required files/cache list: PASS (32 required files)
- Combat regression: PASS
- BELT multi-enemy regression: PASS
- AI archetype regression: PASS
- Character fidelity verification: PASS
- Urien/Gill boss pattern verification: PASS
- Campaign menu / Continue / Stage Select verification: PASS
- Full Stage 1→5 flow regression: PASS

## Not V0.1 Complete Yet
Remaining high-impact acceptance work:
- real audio content/mix beyond current synthesis hooks
- Options screen and full touch layout editing UI
- deeper per-character animation frame/key-pose set
- Super Art I/II/III mechanical differences, not label-only selection
- richer story/ending presentation
- real-device browser/PWA visual and latency validation
- final mobile performance/polish pass
