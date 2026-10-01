# Side-Scroll Chronicles — v0.0.21 Progress Report

## Scope
This build concentrates on the Stage 5 climax and paired character motion without changing the established 60 Hz combat timing or campaign structure.

## Implemented

### 1. Throw two-character joint synchronization
- Added `ThrowJointProfiles.ts`.
- Eight playable characters now have unique attacker/victim arm, elbow, leg, knee, hand-open, and torso-twist profiles during throws.
- Throw attacker and victim still share the existing synchronized throw timeline, but joint motion now follows each character's individual throw identity.

### 2. Multi-hit Super victim rhythm
- Super victim reactions now receive hit index / hit total information.
- Opening hits compress the victim, middle hits use rhythmic shake, and the finisher applies the largest displacement.
- Projectile bursts now carry `burstIndex` and `burstTotal`, so multi-projectile Supers can drive the same staged reaction rhythm instead of treating every projectile as hit 1.

### 3. Gill five-family Final Phase pattern set
Final Phase now cycles through five readable attack families:
1. SERAPHIC VOLLEY
2. SERAPHIC RAIN
3. SERAPHIC LARIAT / SERAPHIC ASCENT
4. SERAPHIC SPHERE
5. SERAPHIC CROSS

Each family maps to a distinct full-body animation profile: projectile, EX projectile barrage, anti-air, mobility/lariat, or Seraphic Super.

### 4. Gill technique animation density
- `GILL_PRIMARY`: elemental sphere body motion
- `GILL_EX_PRIMARY`: EX cross/barrage motion
- `GILL_ANTI_AIR`: vertical ascent motion
- `GILL_MOBILITY`: lariat / advancing body motion
- `GILL_SUPER`: Seraphic full-body motion
- All five families have distinct animation signatures; Gill's Seraphic sequence uses up to 16 key poses.

### 5. Final KO collapse and Ending bridge
- Added `FinalSequenceProfiles.ts` with 13 Gill collapse key poses.
- Aura and wing energy progressively disappear while Gill physically collapses.
- Final KO no longer jumps visually straight into a generic clear screen.
- Stage 5 now transitions through a short campaign-clear bridge with Secret Society signal-loss / Ending transfer presentation before invoking the Ending scene.
- The sequence remains intentionally short so the player is not locked out by an overly long cutscene.

### 6. PWA/offline corrections
- Cache version updated to `game-cache-v021`.
- Added `ThrowJointProfiles.js` and `FinalSequenceProfiles.js` to the offline App Shell.
- Version display updated to V0.0.21.

## Verification
Full `npm run verify` passes.

Key regression values retained:
- Ryu Heavy: 92 damage
- Ken SA I: 3 hits / 327 total test damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → Stage 5 campaign: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options: PASS

New v0.0.21 verification:
- 8 unique throw-joint profiles: PASS
- Projectile Super burst index sync: `1/5 → 5/5`: PASS
- Gill 5 technique animation families: PASS
- Gill Final Phase 5 readable patterns: PASS
- Final KO 13 key poses: PASS
- Final KO → Campaign Clear → Ending callback: PASS

## Deployment checks
HTTP 200 confirmed for:
- `/`
- `/assets/main.js`
- `/assets/render/ThrowJointProfiles.js`
- `/assets/render/FinalSequenceProfiles.js`
- `/assets/render/BossAnimationProfiles.js`
- `/assets/render/SuperVictimProfiles.js`
- `/assets/scenes/Stage1Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

## Remaining before V0.1 COMPLETE
V0.1 is still not declared complete. The largest remaining gap is final-production visual/audio quality and physical mobile-device verification of touch response, performance, installation, offline launch, safe-area behavior, and the full 50–70 minute campaign.
