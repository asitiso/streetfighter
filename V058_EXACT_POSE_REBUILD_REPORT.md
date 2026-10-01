# Side-Scroll Chronicles — v0.0.58-rc.33 Exact-Pose HQ Rebuild Block 2

## Purpose
Reset the RC33 HQ pilot so newly authored character masters must preserve the current in-game facing, pose character, ground line, center and silhouette. The prior roster-derived Ryu HQ is rejected and can no longer become active simply because a file exists.

## Source-of-truth contract
- Pilot targets: RYU, CHUNLI, KEN, IBUKI
- Runtime order: HQ MASTER → RC32 HD REMASTER → LITE
- Runtime size: 384×448
- Authoring reference: current in-game `public/art/combat-sprites/<character>.webp`
- Ground tolerance: ±2 px at 192×224 comparison scale
- Center tolerance: ±4 px
- Height tolerance: ±5%
- Width tolerance: ±12%
- Minimum silhouette mask IoU: 0.62
- Maximum mean edge distance: 5 px

## Block1 correction
The previous Ryu HQ was moved out of the runtime path and stored under `art-source/hq-character-masters/rejected/`.
Measured against the current in-game Ryu:
- ground line: PASS
- center: PASS
- height: PASS
- width delta: 17.74% — FAIL
- silhouette mask IoU: 0.5676 — FAIL
- mean edge distance: 10.075 px — FAIL

Therefore Ryu is no longer approved for HQ runtime use.

## New implementation
- Added `src/render/HqCharacterMasterRegistry.ts` as the only runtime approval registry.
- `CharacterTextureManager` now consults the approval registry instead of assuming a present HQ key is accepted.
- Current approved HQ count: 0.
- Rejected/unapproved HQ files are not part of the `character-hq` preload group.
- Added `scripts/generate-hq-exactpose-guides.py`.
- Added `scripts/check-hq-pose-fidelity.py`.
- Added `scripts/register-hq-exactpose-master.py`.
- Generated exact-pose authoring/review guides for Ryu, Chun-Li, Ken and Ibuki.
- Replaced the old roster extraction bootstrap with the safe exact-pose v2 bootstrap.
- Service worker module list includes the new HQ registry module.

## Runtime safety
Current game behavior is intentionally RC32 HD Remaster for all four pilot characters until a newly authored master passes the exact-pose gate. HQ remains lazy and outside the initial app shell.

## Regression result
Full `npm run verify`: PASS.
Key preserved values:
- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT attackers: 2
- 24 Super Arts
- 48 Air Normals
- Stage 1→5 PASS
- Urien / Gill PASS
- 50-minute virtual marathon PASS
- Save / Offline / PWA / Update / Diagnostics / Final Proof / Release Seal PASS

## Release integrity
- Candidate: `0.0.58-rc.33`
- Cache: `game-cache-v058`
- Manifest files: 168
- Root SHA-256: `16E12DE98E4894F39066C98836815B5DA1ED04C2A0ECC855C051765B3FA0C075`

## Current verdict
`HQ_EXACT_POSE_PIPELINE_PASS`

This is an implementation checkpoint, not the final RC33 art-completion verdict. The next art step is to author Ryu v02 against the exact-pose guide, run the fidelity gate, then repeat for Chun-Li, Ken and Ibuki.
