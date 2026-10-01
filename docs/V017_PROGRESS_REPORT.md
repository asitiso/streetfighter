# V0.0.17 Progress Report — Body Detail, Facial Readability & Reaction Animation

## Goal

Raise character readability without touching the fixed 60 Hz combat rules. This pass focuses on face/body proportions, wrist/ankle articulation, and character-specific hit/KO/victory reactions.

## Implemented

### 1. Detailed fighter anatomy profiles
Added a second visual profile layer in `FighterVisualProfiles.ts` for all 8 playable fighters plus Urien/Gill.

Per-character data now includes:
- face width / height
- jaw shape
- eye spacing / brow angle
- neck width
- shoulder / chest / waist proportions
- arm / leg thickness scale
- wrist snap / ankle snap
- hit recoil twist
- KO spin / slide weight
- victory lift / lean

This keeps visual tuning data-driven instead of hardcoding every fighter directly in the renderer.

### 2. Face readability
`Visuals.ts` now uses the anatomy profile for:
- face silhouette and jaw
- eyes and brows
- nose/mouth landmarks
- focus expression during attacks/parry
- hit expression during damage/KO
- victory expression after a win

Existing hair/headgear silhouettes remain character-specific.

### 3. Body proportion differentiation
The torso renderer now uses per-character neck, shoulder, chest and waist dimensions. Arm and leg render thickness also follows the anatomy profile.

Examples:
- Alex: broad shoulders, thick arms/legs, large KO slide
- Chun-Li: compact torso/waist with emphasized legs
- Ibuki: narrow frame with high wrist/ankle articulation
- Dudley: compact boxing recoil
- Makoto: stronger hit-twist response

### 4. Wrist and ankle snap
Motion arms, projectile/Super hands, idle hands and articulated legs now include fighter-specific wrist/ankle angles. Fast/mobile characters show more terminal-joint snap while power characters stay heavier and more planted.

### 5. Hit / KO / Victory differentiation
Hit reaction arms and KO arms now use each character's reaction values. The full-body knockdown renderer also applies per-character KO rotation/slide values. Victory uses per-character lift and body lean.

## Combat regression
No combat values were intentionally changed.

Full verification preserved:
- Ryu heavy: 92 damage
- Ken SA I: 3 hits / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → Stage 5: PASS
- Urien/Gill patterns: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options: PASS

## New verification
Added `scripts/verify-v017-anatomy-detail.mjs`.

Results:
- 8 / 8 playable fighters have unique detailed body/face profile signatures
- 8 / 8 have unique hit/KO/victory reaction signatures
- Alex power silhouette assertions: PASS
- Chun-Li leg emphasis assertions: PASS
- Ibuki wrist/ankle articulation assertions: PASS
- Dudley compact recoil assertion: PASS
- Makoto explosive recoil assertion: PASS
- Ken energetic victory/KO assertion: PASS

## Build / PWA
- package version: `0.0.17`
- title footer: `V0.0.17 • BODY DETAIL & REACTIONS • 60HZ COMBAT • PWA`
- service worker cache: `game-cache-v017`
- full `npm run verify`: PASS
- build cache verification: 36 required files present and cached

Local HTTP artifact checks returned 200 for:
- `/`
- `/assets/main.js`
- `/assets/render/FighterVisualProfiles.js`
- `/assets/render/Visuals.js`
- `/assets/combat/Fighter.js`
- `/sw.js`
- `/manifest.webmanifest`

A headless Chromium screenshot attempt was not used as a pass/fail gate because Chromium hung in this container environment. Typecheck, production build, automated combat/campaign tests, PWA cache verification and direct HTTP artifact checks all passed.

## Still not V0.1 COMPLETE
The project still needs a final visual-production pass beyond procedural/vector characters, final audio/art asset quality, and real mobile-device PWA/input/performance validation before the MASTER acceptance criteria can be considered complete.
