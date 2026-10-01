# KEN JUMP AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 8 transparent PNG frames named `01.png` ... `08.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/jump/`.
6. Run: `npm run ingest:ken -- --only jump`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 anticipation** — Grounded ready pose with visible jump intent.
- **02 compression** — Deepen knee/hip compression before launch; feet still grounded.
- **03 launch** — Legs extend and arms react to takeoff; clear silhouette break from compression.
- **04 rise** — Body lengthens upward; knees/arms transition toward aerial control.
- **05 apex** — Distinct apex pose with strongest aerial tuck/opening; not a translated standing sprite.
- **06 fall** — Reverse the rise shapes for descent; cloth/hair follows the direction change.
- **07 landing-prepare** — Legs extend/prepare for contact; center lowers toward landing.
- **08 contact-bridge** — Contact-ready bridge that can hand off to Landing or base fallback cleanly.
