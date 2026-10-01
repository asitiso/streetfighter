# KEN HIT AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 8 transparent PNG frames named `01.png` ... `08.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/hit/`.
6. Run: `npm run ingest:ken -- --only hit`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Readable pre-impact combat stance. Keep this compatible with the base renderer.
- **02 impact-compression** — Torso and guard compress into the strike. Head/shoulders react first.
- **03 torso-recoil** — Upper body recoils away from impact; hips begin to follow.
- **04 maximum-recoil** — Strongest recoil silhouette. Do not create this by rotating one standing sprite.
- **05 foot-slide** — Grounded foot slide/stance change carries the force while balance is recovered.
- **06 recovery-start** — Torso begins returning; guard is still displaced from neutral.
- **07 weight-recovery** — Hips and feet re-center; shoulders/guard settle.
- **08 neutral-return** — Return close to the approved combat stance for a clean runtime handoff.
