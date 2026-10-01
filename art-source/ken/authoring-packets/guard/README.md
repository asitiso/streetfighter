# KEN GUARD AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 5 transparent PNG frames named `01.png` ... `05.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/guard/`.
6. Run: `npm run ingest:ken -- --only guard`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral-guard** — Compact defensive stance. Both feet planted and ready to absorb impact.
- **02 brace** — Elbows/shoulders close and torso compresses slightly. Do not slide the feet.
- **03 impact-deflect** — Peak block silhouette: forearms absorb/redirect the strike; torso gives a little.
- **04 recoil-hold** — Small controlled recoil while guard stays closed. No hit-reaction collapse.
- **05 neutral-return** — Recover close to the approved base stance for a clean runtime handoff.
