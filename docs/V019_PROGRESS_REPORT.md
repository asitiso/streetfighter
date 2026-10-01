# v0.0.19 Progress Report — Hit Zones, Throw Sync, Super Camera & Boss Motion

## Implemented
- Added 5 rendering reaction zones: `head / torso / leg / launch / throw`.
- Hit zone is stored independently from combat hit level, allowing head, body and lower-body recoil to render differently without changing damage or stun timing.
- Added paired throw synchronization metadata to Fighter: role, partner UID, direction, total frames and progress.
- Added an 8-key-pose `throwVictim` animation and synchronized attacker/victim throw presentation over 24 frames.
- Added `SuperCameraProfiles` with 15 cinematic motif profiles used by all 24 playable Super Arts.
- Super camera framing now changes zoom, forward framing, vertical pan, slow presentation and letterbox timing by motif.
- Added `BossAnimationProfiles`.
  - Urien Aegis: 12-key-pose boss animation.
  - Urien tackle / physical boss attacks: 12-key-pose accent timeline.
  - Gill elemental attacks: 13-key-pose timeline.
  - Gill Seraphic attacks: 14-key-pose timeline.
- Stage 5 scripted projectile boss patterns now also drive the boss animation state while preventing duplicate projectile emission.
- Added boss attack aura intensity directly to the character animation layer.

## Regression safety
Combat timing and balance remain on the existing fixed 60 Hz simulation. The new hit-zone, throw synchronization, camera and boss motion layers are presentation-focused.

Verified retained values:
- Ryu heavy: 92 damage.
- Ken SA I: 3 hits / 327 damage in regression test.
- Juggle regression: 2 hits.
- BELT active attackers: 2.
- Stage 1 through Stage 5 campaign flow: pass.
- Urien / Gill boss pattern verification: pass.
- 24 Super Arts / 48 air normals / Options / Continue / Stage Select: pass.

## New v0.0.19 checks
- 5 distinct hit zones: PASS.
- Throw attacker/victim partner metadata: PASS.
- Throw victim animation: 8 key poses, PASS.
- 24 Super Arts mapped through 15 cinematic camera motifs: PASS.
- Super camera variety: 15 distinct camera signatures, PASS.
- Urien scripted Aegis drives `URIEN_SUPER` animation state without double spawn: PASS.
- Gill scripted volley drives `GILL_SUPER` animation state without double spawn: PASS.
- Urien boss Super animation: 12 key poses, PASS.
- Gill boss Super animation: 14 key poses, PASS.

## PWA
- Version: `0.0.19`
- Cache: `game-cache-v019`
- App Shell: 42 entries / 0 missing.
- Local HTTP verification: core files and new render modules all returned 200.
- New offline shell modules:
  - `BossAnimationProfiles.js`
  - `SuperCameraProfiles.js`

## Still required before V0.1 COMPLETE
- Final authored sprite/image assets replacing the current procedural/vector character rendering.
- Full production-quality authored animation frame sets for all eight playable characters and bosses.
- Final audio asset pass.
- Real-phone PWA installation, safe-area, touch latency and sustained performance verification.
- Full visual comparison against the project Visual Master on actual mobile screenshots.
