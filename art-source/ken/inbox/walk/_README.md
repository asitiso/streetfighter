# KEN WALK AUTHORED SOURCE PACKET

This folder is an authoring brief, not runtime art.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 12 transparent PNG frames named `01.png` ... `12.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/walk/`.
6. Run: `npm run ingest:ken -- --only walk`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 contact-L** — Lead heel/foot contacts. Rear leg extended; opposite shoulder leads.
- **02 compression-L** — Weight compresses onto lead leg. Pelvis drops slightly; rear heel releases.
- **03 toe-off-R** — Rear foot pushes off. Torso advances; guard stays combat-ready.
- **04 lift-R** — Rear knee lifts and passes. Lead foot remains planted without sliding.
- **05 passing-R** — Rear leg passes under hips. Shoulder/hip counter-rotation becomes clear.
- **06 reach-R** — Rear foot reaches forward toward the next contact. Keep center moving forward.
- **07 contact-R** — Opposite foot contacts. This must NOT duplicate frame 01.
- **08 compression-R** — Weight compresses on the opposite side; pelvis and shoulders change phase.
- **09 toe-off-L** — Former lead foot pushes off. Show a real leg/foot silhouette change.
- **10 lift-L** — Lead knee lifts; planted foot stays visually locked.
- **11 passing-L** — Lead leg passes under hips. Opposite shoulder advances.
- **12 reach-L** — Lead foot reaches toward frame 01 contact; close the cycle smoothly.
