# KEN TATSUMAKI AUTHORED SOURCE PACKET

Completed source frames are in `../../inbox/tatsumaki/01.png` through `12.png`. The 12-frame HQ strip is active in the runtime and passes pose, semantic, and handoff gates.

This folder remains the authoring brief for later revisions.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 12 transparent PNG frames named `01.png` ... `12.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/tatsumaki/`.
6. Run: `npm run ingest:ken -- --only tatsumaki`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral-chamber** — Approved base stance transitioning into a compact spin chamber.
- **02 load** — Load hips and support leg; shoulders begin counter-rotation.
- **03 first-kick** — First real kick extension. Redraw the leg chain; do not rotate the entire sprite.
- **04 quarter-turn** — Quarter-turn silhouette with torso/arms counter-rotating and a clear support-leg phase.
- **05 cross-body** — Kick travels across the body line; hip and cloth direction visibly change.
- **06 second-contact** — Second strong contact pose with a different limb silhouette from frame 03.
- **07 opposite-turn** — Opposite rotational phase. This must not be a mirrored/translated duplicate.
- **08 third-contact** — Third readable kick contact with a new leg extension and body orientation.
- **09 spin-carry** — Carry angular momentum through the torso, arms and gi cloth.
- **10 brake** — Support foot/hips begin braking rotation and lowering toward recovery.
- **11 recovery** — Leg retracts and guard reforms without snapping to neutral.
- **12 neutral-bridge** — End near approved base for clean runtime handoff.
