# KEN DASH AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 7 transparent PNG frames named `01.png` ... `07.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/dash/`.
6. Run: `npm run ingest:ken -- --only dash`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 ready** — Neutral bridge with a slight forward intent; both feet readable.
- **02 drive-load** — Drop the center and load the rear leg; shoulders begin driving forward.
- **03 launch** — Rear foot pushes hard; torso lean increases and front arm/guard trails naturally.
- **04 max-drive** — Strongest forward drive silhouette. Long body line; do not just translate frame 03.
- **05 passing-drive** — Legs pass under the hips while the upper body keeps forward inertia.
- **06 brake** — Front foot prepares to catch; torso begins recovering from the lean.
- **07 recovery-bridge** — Return toward combat stance without duplicating frame 01 pixel-for-pixel.
