# V058 / RC33 — HQ CHARACTER MASTER PILOT FINAL REPORT

- Candidate: `0.0.58-rc.33`
- Cache: `game-cache-v058`
- Verdict: `HQ_CHARACTER_MASTER_PILOT_PASS`
- Release root SHA-256: `9F4BE296BB40C1249AA417AE3A0C44BE7C994D780CFC595269C9D2AD375AAE55`

## What changed

- Rejected the earlier roster-derived Ryu HQ because it changed the authoritative in-game pose/silhouette.
- Added a pose-locked HQ reconstruction path using the current combat sprite as the authoritative motion/style source.
- Approved Ryu, Chun-Li, Ken, and Ibuki only after the exact-pose fidelity gate passed.
- Runtime priority is `HQ MASTER → RC32 HD REMASTER → LITE`.
- HQ assets stay outside the initial app shell and preload per character.
- Attack atlases remain on the RC32 HD remaster path; RC33 replaces the base combat masters only.

## Exact-pose fidelity

| Character | Mask IoU | Mean edge distance @192×224 | Ground | Center | Result |
|---|---:|---:|:---:|:---:|:---:|
| RYU | 0.9992 | 0.022px | PASS | PASS | PASS |
| CHUNLI | 0.9998 | 0.009px | PASS | PASS | PASS |
| KEN | 0.9993 | 0.022px | PASS | PASS | PASS |
| IBUKI | 0.9996 | 0.017px | PASS | PASS | PASS |

## Runtime assets

- RYU: `public/art/combat-sprites-hq/ryu.webp` — 384×448, SHA-256 `C477B3D50705538D2B213946E94C03C880D51F240661564B35B5106812A62A09`
- CHUNLI: `public/art/combat-sprites-hq/chunli.webp` — 384×448, SHA-256 `22E89E26CBA7CDD67CA42266D22495F19BA9DE3BFC869DB635164832B3E500A6`
- KEN: `public/art/combat-sprites-hq/ken.webp` — 384×448, SHA-256 `924339AD302EA33C99A76B5F4EFB3BFB4E7526E8BF789319E452EAAA4C1824F9`
- IBUKI: `public/art/combat-sprites-hq/ibuki.webp` — 384×448, SHA-256 `00CD36CA515FBE65CBE5B1522C46123BDA5A2D737D55B63853ECBE6A15726BA7`

## Regression status

- Full `npm run verify`: PASS
- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- 24 Super Arts / 48 Air Normals: PASS
- Stage 1→5 / Urien / Gill: PASS
- 50-minute virtual marathon: PASS
- Save / Offline / PWA / Update / Diagnostics / Final Proof / Release Seal: PASS

## Important quality note

RC33 deliberately prioritizes exact pose, facing, silhouette and motion continuity over inventing new anatomy. The HQ masters are pose-locked reconstructions of the authoritative in-game sprites with higher-resolution color/edge treatment. This avoids the Block1 problem where a sharper image changed the character motion/style.
