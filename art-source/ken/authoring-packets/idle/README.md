# KEN IDLE AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 6 transparent PNG frames named `01.png` ... `06.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/idle/`.
6. Run: `npm run ingest:ken -- --only idle`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Base fighting stance. Both feet planted. Guard relaxed but ready.
- **02 inhale** — Tiny ribcage expansion; rear shoulder opens a little. Feet unchanged.
- **03 chest-rise** — Chest/guard rises slightly; head stays locked on opponent.
- **04 weight-shift** — Small hip/shoulder counter-shift. No step; stance width stays constant.
- **05 exhale** — Chest settles; elbows soften; hair/gi may settle by a few pixels.
- **06 return** — Return close to frame 01 so the loop closes cleanly.
