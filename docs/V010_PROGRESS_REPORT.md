# V0.0.10 Progress Report

## Focus
Combat depth and boss presentation: character-specific victory/KO silhouettes, real multi-hit attacks, aerial juggle tracking, wall/ground bounce, and stronger Urien/Gill boss presentation.

## Implemented
- Added `MoveData.multiHit` with hit count, interval, and per-hit scaling. Intermediate hits use reduced hit-stop/pushback; the final hit retains knockdown/launch behavior.
- Converted selected rush/super techniques to real repeated collision checks instead of one oversized damage event. Examples include Ken Shoryu Reppa/Shinryuken/Shippu Jinrai Kyaku, Chun-Li Houyokusen, Dudley Rolling Thunder, Makoto Seichusen/Abare, Ibuki Hashin Sho, and Yun You Hou/Sourai Rengeki.
- Added airborne juggle tracking and repeat-hit damage scaling. Launch velocity now derives from move launch strength, and landing resets juggle state.
- Added wall-bounce and ground-bounce fighter states/events with rebound motion and follow-up windows.
- Added dedicated JUGGLE / WALL BOUNCE / GROUND BOUNCE VFX and audio routing.
- Expanded character-specific Victory poses for the eight playable characters and varied KO fall silhouettes by fighter.
- Added Urien arena rings and Gill dual fire/ice aura rendering. Gill phase changes now add stronger freeze/burst presentation.
- Bumped PWA cache to `game-cache-v010`.

## Verification
`npm run verify` passes all existing regression suites plus `verify-v010-combat.mjs`.

New fixed checks:
- Ken SA I Shoryu Reppa: 3 real hits / 327 accumulated test damage.
- Launcher follow-up: 2 tracked juggle hits.
- Corner wall bounce: PASS.
- Alex Hyper Bomb ground bounce: PASS.
- Existing Stage 1-5, bosses, 24 Super Arts, 48 air normals, 8 command normals, PWA build/cache, Continue/Stage Select/Options: PASS.

## Still not V0.1 COMPLETE
Final sprite/key-pose animation density, production-grade authored art/audio, and physical-phone PWA/latency verification remain below the MASTER acceptance bar.
