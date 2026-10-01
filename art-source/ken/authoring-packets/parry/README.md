# KEN PARRY AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 6 transparent PNG frames named `01.png` ... `06.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/parry/`.
6. Run: `npm run ingest:ken -- --only parry`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance immediately before the read.
- **02 read** — Tiny anticipation: guard opens just enough to prepare the deflect.
- **03 deflect-contact** — Fast decisive parry contact. One arm/hand clearly intercepts; body remains balanced.
- **04 extension** — Follow the deflect a short distance. Do not turn it into an attack lunge.
- **05 withdraw** — Hand/shoulder return toward guard; feet remain planted.
- **06 neutral-return** — Return close to frame 01/base for a clean handoff.
