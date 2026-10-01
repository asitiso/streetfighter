# KEN LANDING AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 6 transparent PNG frames named `01.png` ... `06.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/landing/`.
6. Run: `npm run ingest:ken -- --only landing`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 pre-contact** — Feet are about to meet ground; body still carries downward momentum.
- **02 ground-contact** — First real ground contact. Ankles/knees absorb impact.
- **03 maximum-squash** — Lowest compressed pose; hips and knees clearly lower than frame 01.
- **04 rebound** — Body rises out of compression; guard begins to recover.
- **05 settle** — Most of the rebound is gone; stance width stabilizes.
- **06 neutral-bridge** — End near the approved combat stance for a clean Idle/base handoff.
