# V0.0.12 Progress Report

## Focus
Character Select animation previews, character-specific normal attack silhouettes, cinematic combat camera, and Parry/Super/Boss presentation polish.

## Implemented
- All 8 Character Select cards now animate through idle, walk, signature attack, parry, and victory preview states.
- The selected fighter panel uses the same live preview and identifies the current preview state.
- Normal attack rendering is more character-specific for Ryu, Ken, Chun-Li, Alex, Dudley, Makoto, Ibuki, and Yun.
- Combat camera now reacts to hit power, Super impacts, wall/ground bounce, Parry/Red Parry, KO, and boss warnings/bursts.
- Duel camera keeps both fighters framed with a slight zoom; Final Duel uses a stronger dedicated boss framing.
- Parry, Super, KO, and boss moments can add short cinematic letterbox presentation and reduced visual-time pacing without changing the fixed 60 Hz combat simulation.
- Belt scrolling remains world-coordinate based; camera focus converts world event positions into screen focus correctly.

## Regression status
All previous automated suites pass. Added `verify-v012-presentation.mjs` for the five preview states, Red Parry camera treatment, Super impact camera kick, Duel entrance camera, and Gill Final Duel camera setup.

## PWA
- Version: `0.0.12`
- Cache: `game-cache-v012`
