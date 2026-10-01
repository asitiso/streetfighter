# V0.0.15 Progress Report — Move-family Motion & Secondary Animation

## Implemented

- Split the old generic special animation into rendering-only move-family clips:
  - projectile (8 poses)
  - antiAir (8 poses)
  - spin (9 poses)
  - rush (8 poses)
  - throw (7 poses)
  - throwEscape (7 poses)
  - landing (6 poses)
  - dash (7 poses)
- Existing idle/walk/jump/hit/parry/special/super clips remain intact.
- Added real double-tap left/right dash (8-frame burst). Attacks can cancel the dash because move reading stays ahead of dash continuation.
- Added dedicated landing and throw-escape visual timers without changing hit/parry simulation timing.
- Added jointed two-segment lower-body rendering for anti-air, spin, rush, dash, throw, throw escape and landing.
- Improved special upper-body poses:
  - projectile hand gather/release glow
  - rising anti-air arm path
  - spin/tatsumaki arm sweep
  - forward rush/shoulder posture
  - two-arm throw grip
- Added secondary motion:
  - Ryu/Alex headband tails
  - Ibuki ponytail/mask cloth
  - Chun-Li ribbons/sash
  - Makoto belt tails
  - Dudley bow/coat accents
  - Yun shirt/cap-related trailing accent
  - Ken long-hair follow-through
- Secondary motion amplitude increases during walk, dash, jump, attack and hit reactions.

## Regression verification

Full `npm run verify` PASS.

Preserved combat reference values:
- Ryu heavy hit: 92
- Ken SA I: 3 hits / 327 damage
- Juggle verification: 2 hits
- BELT director active attackers: 2
- Stage 1-5 callbacks: all pass
- 24 Super Arts: pass
- 48 Air Normals: pass
- Urien/Gill patterns: pass
- Continue / Stage Select / Options / PWA: pass

V0.0.15-specific verification:
- Hadoken family -> projectile clip
- Shoryuken family -> antiAir clip
- Tatsumaki family -> spin clip
- Alex mobility -> rush clip
- Throw / Throw Escape / Landing / Dash clips -> pass
- New clip key-pose minimums -> pass
- 8 playable characters secondary-motion coverage -> pass
- Double-tap dash -> pass (8.2 px first burst step in Ryu verification)

## Remaining before V0.1 COMPLETE

- Replace/augment procedural vector fighters with higher-fidelity authored character animation assets.
- More character-specific special/super silhouette work.
- Real mobile-device PWA installation/input/performance validation.
- Final authored audio/visual pass and device-specific tuning.
