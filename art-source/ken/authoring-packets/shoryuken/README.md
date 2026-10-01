# KEN SHORYUKEN AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 12 transparent PNG frames named `01.png` ... `12.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/shoryuken/`.
6. Run: `npm run ingest:ken -- --only shoryuken`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance immediately before the anti-air.
- **02 compression** — Drop the hips and compress both knees; striking shoulder loads.
- **03 hip-rotation** — Rear hip and shoulder rotate under the punch; guard shape opens.
- **04 launch** — Legs extend and the striking arm begins the rising path.
- **05 contact** — First rising contact pose. Fist, shoulder and torso form a clear upward line.
- **06 rise** — Body leaves the compressed stance; arm continues rising with visible vertical displacement.
- **07 full-extension** — Maximum rising-punch extension and strongest airborne silhouette.
- **08 apex** — Highest controlled pose; do not duplicate frame 07 or translate a standing sprite.
- **09 turn-fall** — Body begins turning/falling; arm and legs change phase.
- **10 recovery-fall** — Guard reforms while descending; legs prepare to catch the ground.
- **11 landing** — Feet/knees absorb the return without teleporting the root.
- **12 neutral-bridge** — Return close to approved base for the next action.
