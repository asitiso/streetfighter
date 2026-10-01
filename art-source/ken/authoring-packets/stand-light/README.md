# KEN STAND-LIGHT AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 7 transparent PNG frames named `01.png` ... `07.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/stand-light/`.
6. Run: `npm run ingest:ken -- --only stand-light`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance; planted feet and compact guard.
- **02 anticipation** — Small shoulder/hip load. Do not slide the whole body forward.
- **03 startup** — Punching shoulder and elbow begin extending; rear hand protects the face.
- **04 contact** — Fast full light-punch reach. Hand clearly extends beyond frame 01 while feet remain planted.
- **05 follow-through** — Small natural carry past contact; torso remains balanced.
- **06 recovery** — Elbow retracts quickly; shoulder/hip unwind.
- **07 neutral-bridge** — Return close to the approved combat stance for clean handoff.
