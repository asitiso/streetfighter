# KEN STAND-HEAVY AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 10 transparent PNG frames named `01.png` ... `10.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/stand-heavy/`.
6. Run: `npm run ingest:ken -- --only stand-heavy`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance; readable base silhouette.
- **02 load** — Visible shoulder/hip load and weight preparation without root sliding.
- **03 hip-turn** — Hips and rear shoulder rotate into the strike; guard shape clearly changes.
- **04 drive** — Torso drives forward and arm accelerates; planted foot may pivot.
- **05 pre-contact** — Near-full extension with clear body torque.
- **06 contact** — Maximum heavy-punch reach and strongest silhouette change.
- **07 follow-through** — Carry the strike past contact; cloth/hair follow the momentum.
- **08 recoil** — Arm and torso begin recovering; do not snap directly to neutral.
- **09 recovery** — Weight returns over the stance and guard reforms.
- **10 neutral-bridge** — End close enough to base for a clean runtime handoff.
