# KEN WALK-BACK AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 10 transparent PNG frames named `01.png` ... `10.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/walk-back/`.
6. Run: `npm run ingest:ken -- --only walk-back`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 rear-contact** — Rear foot establishes the retreat contact while the lead foot stays ready to release.
- **02 compression** — Weight compresses onto the rear leg; guard stays compact and defensive.
- **03 front-toe-off** — Lead foot pushes away from the opponent; torso keeps a slight backward bias.
- **04 front-lift** — Lead knee/foot lifts into the retreat step. Rear foot stays visually planted.
- **05 passing** — Lead leg passes under the hips; shoulders counter-rotate without opening the guard.
- **06 front-contact** — Opposite contact pose. This must not duplicate frame 01.
- **07 compression-opposite** — Weight settles on the new rearward contact; pelvis/shoulders change phase.
- **08 rear-toe-off** — Former rear foot releases and begins the second half of the retreat cycle.
- **09 rear-lift** — Rear leg passes while the upper body remains defensive and balanced.
- **10 return-reach** — Reach toward the next frame-01 contact so the loop closes smoothly.
