# V0.0.16 Progress Report — Anatomy Silhouettes & Dedicated Super Poses

## Goal
Improve the procedural fighter renderer where the previous build still looked too uniform at the extremities and during supers, while preserving the fixed 60 Hz combat simulation and all established balance values.

## Implemented

### 1. Fighter anatomy visual profiles
Added `src/render/FighterVisualProfiles.ts`.

Each fighter now has a rendering-only anatomy profile describing:
- neutral hand silhouette
- projectile hand silhouette
- throw/grab hand silhouette
- foot/footwear silhouette
- shoulder twist response
- head lag response
- limb taper identity

Playable fighter footwear/hand examples:
- Chun-Li: palm + slipper silhouette
- Alex: large fist/grab + boot silhouette
- Dudley: boxing glove + dress shoe silhouette
- Makoto: knife-hand + bare-foot silhouette
- Ibuki: knife-hand + ninja-foot silhouette
- Yun: palm + sneaker silhouette

### 2. Hands are no longer circular endpoints
Neutral articulated arms now end in character-specific fists, open palms, knife hands, boxing gloves, or grab shapes.
Projectile poses use open/technique-appropriate hands, and throws use visible grab silhouettes.

### 3. Feet are no longer straight line endpoints
Jointed legs now terminate in shaped feet/footwear rather than a single horizontal stroke. Combat movement uses character-specific footwear silhouettes.

### 4. Torso twist and head lag
Hit reactions and attacks now deform the upper-body silhouette:
- asymmetric shoulder height
- waist shift
- torso highlight showing twist direction
- head lag/turn applied separately from torso rotation

This is rendering-only and does not modify hitboxes or frame timing.

### 5. 24 dedicated Super Art pose profiles
All 8 playable characters × 3 Super Arts now have explicit pose profiles.
The profile controls:
- pose family
- lead/rear arm angles
- lead/rear reach
- hand shape
- torso twist
- lower-body drive

Pose families include:
- wave
- uppercut
- barrage
- kick rush
- throw
- spiral
- install
- aerial
- power rush

Examples:
- Ryu Shinku/Denjin: two-hand wave posture
- Ryu Shin Shoryuken / Ken Shinryuken: vertical uppercut drive
- Chun-Li Houyokusen: kick-rush lower body
- Alex Hyper Bomb: wide grab posture
- Dudley Rolling Thunder: boxing barrage silhouette
- Makoto Tanden Renki / Yun Genei Jin: install stance
- Ibuki Kasumi Suzaku: aerial/ninja posture

### 6. Super lower-body silhouettes
Super Art lower-body animation no longer falls back to the same neutral legs. Uppercut, kick-rush, throw, power-rush, barrage/spiral, wave, and install families use different stance/leg-drive logic.

### 7. Spin readability
Spin-family mobility now draws an arc trail behind the rotating leg to make the circular motion readable at mobile screen size.

### 8. PWA/version update
- package version: `0.0.16`
- title footer: `V0.0.16 • ANATOMY SILHOUETTES • 60HZ COMBAT • PWA`
- service worker cache: `game-cache-v016`
- `FighterVisualProfiles.js` added to the offline App Shell

## Verification
Full `npm run verify` passes.

New V0.0.16-specific verification:
- 8 playable fighters have 8 distinct anatomy profile signatures
- all 24 Super Arts have dedicated pose profiles
- all 24 Super Arts produce distinct pose signatures in the current data set
- Alex SA1 uses grab hand silhouette
- Dudley SA2 uses boxing glove silhouette
- Ryu SA1 uses open-palm wave silhouette
- Ken SA2 is uppercut family
- Chun-Li SA2 is kick-rush family
- Makoto SA3 is install family

Regression values preserved:
- Ryu heavy hit damage: 92
- Ken SA I: 3 HIT / 327 damage in verification
- Juggle verification: 2 hits
- BELT active attackers: 2
- Stage 1 → 5 flow: PASS
- Urien/Gill boss patterns: PASS
- 24 Super Arts: PASS
- 48 air normals: PASS
- Continue / Stage Select / Options: PASS

## Remaining high-impact visual work
The renderer is more readable and character-specific, but V0.1 COMPLETE should still wait for a larger visual jump beyond procedural/vector characters: richer sprite/key art production, more character-specific facial/body detail, and real-device PWA presentation/input verification.
