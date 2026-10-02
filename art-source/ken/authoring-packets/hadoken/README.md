# KEN HADOKEN AUTHORED SOURCE PACKET

Completed source frames are in `../../inbox/hadoken/01.png` through `12.png`. The 12-frame HQ strip is active in the runtime and passes pose, semantic, and handoff gates.

This folder remains the authoring brief for later revisions.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 12 transparent PNG frames named `01.png` ... `12.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/hadoken/`.
6. Run: `npm run ingest:ken -- --only hadoken`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance; both feet planted and guard compact.
- **02 load** — Shift weight slightly back and open the elbows without sliding the stance.
- **03 gather** — Hands retract toward the torso; shoulders and hips visibly coil.
- **04 charge** — Hands cup the charge position. Keep the character-only silhouette readable; no projectile baked into the body strip.
- **05 drive** — Rear hip and shoulder drive forward as the hands begin extending.
- **06 release** — Projectile-release pose: both hands clearly extend beyond frame 01 while feet remain grounded.
- **07 full-extension** — Maximum forward hand reach immediately after release; torso follows naturally.
- **08 follow-through** — Arms remain extended but start losing forward momentum.
- **09 hand-return** — Elbows bend and shoulders unwind; weight begins returning over the stance.
- **10 recovery** — Hands travel back toward guard without snapping to neutral.
- **11 settle** — Most body torque is gone; feet and hips re-center.
- **12 neutral-bridge** — End close to the approved base stance for clean runtime handoff.
