# v0.0.18 Progress Report — Joint Trajectories & Directional Reactions

## Implemented
- Added `FighterKinematicsProfiles.ts` with per-character shoulder, elbow, wrist, hip, knee, ankle and recovery-chain values.
- Normal punches now use jointed shoulder→elbow→wrist trajectories instead of one straight extended limb.
- Normal kicks now couple hip rotation, knee lift, leg reach and ankle whip while keeping combat hitboxes unchanged.
- Projectile, primary special, anti-air, throw and rush-style specials now reuse the jointed arm chain so special moves have character-specific elbow/wrist motion.
- Fighter now records the last incoming hit direction and visual reaction category (`high`, `mid`, `low`, `launch`, `throw`). Rendering uses this data for directional recoil and vertical response.
- Added 8-key-pose `KO` and 8-key-pose `Victory` clips.
- Fixed Victory state so it persists long enough for the multi-stage Victory animation instead of returning to idle after one update.
- KO/Knockdown/Victory remain rendering-focused; fixed 60 Hz combat timing and existing damage/frame data remain unchanged.

## Validation
`npm run verify` PASS.

Key regression values retained:
- Ryu Heavy: 92 damage
- Ken SA I: 3 hits / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1→5 callbacks: PASS
- Urien/Gill patterns: PASS
- 24 Super Arts / 48 Air Normals / Options / Continue / Stage Select: PASS

New v0.0.18 checks:
- 8/8 playable characters have unique strike-chain signatures.
- Chun-Li kick chain has more ankle whip/reach than Alex.
- Dudley favors elbow-led compact punching.
- Makoto has high shoulder lead + wrist snap.
- Directional reaction memory: high/low/launch/throw PASS.
- Victory remains active for 90+ simulation frames.
- KO key poses: 8.
- Victory key poses: 8.

## PWA / deployment check
- Cache: `game-cache-v018`
- App-shell required files: 37, all present and cached.
- HTTP 200 verified for `/`, `main.js`, `Visuals.js`, `FighterKinematicsProfiles.js`, `AnimationPoseLibrary.js`, `Fighter.js`, `sw.js`, and `manifest.webmanifest`.

## Still not V0.1 COMPLETE
The campaign is playable through Stage 5/Ending, but the MASTER acceptance bar still requires final production-grade character art/animation, audio assets and real mobile-device PWA/touch/performance validation before V0.1 COMPLETE should be declared.
