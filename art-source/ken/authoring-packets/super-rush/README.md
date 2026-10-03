# KEN SUPER-RUSH AUTHORED SOURCE PACKET

Completed source frames are in `../../inbox/super-rush/01.png` through `16.png`. The 16-frame HQ strip is active in the runtime and passes pose, semantic, and handoff gates. The neutral entry uses the approved master, and the final-hit load reuses the compact guard link pose for continuity.

This folder remains the authoring brief for later revisions.

## Fastest workflow
1. Use `_references/ken_master_new_original_v01.png` as the exact character-design reference.
2. Produce exactly 16 transparent PNG frames named `01.png` ... `16.png`.
3. Keep the character body at least 240 px tall in every source frame; 600 px+ is preferred.
4. Keep feet/root stable unless the motion explicitly requires translation.
5. Copy the finished frame files to `art-source/ken/inbox/super-rush/`.
6. Run: `npm run ingest:ken -- --only super-rush`.

The ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.

## Pose plan
- **01 neutral** — Approved combat stance before the rush.
- **02 load** — Compress and load forward drive; feet remain readable.
- **03 drive** — First forward body drive before contact.
- **04 contact-1** — First distinct strike contact. Do not reuse later contact silhouettes.
- **05 link-1** — Recover just enough to visibly link into the next strike.
- **06 contact-2** — Second contact with a different arm/shoulder/hip configuration.
- **07 link-2** — Weight transfers for the third hit; preserve forward momentum.
- **08 contact-3** — Third contact, preferably a clearly different height or limb line.
- **09 link-3** — Short recovery/link pose; no frozen body translation.
- **10 contact-4** — Fourth contact with distinct reach and torso rotation.
- **11 link-4** — Prepare the final hit while maintaining controlled root travel.
- **12 contact-5** — Final strongest contact silhouette, distinct from contacts 1-4.
- **13 follow-through** — Carry final-hit momentum through limbs, torso, hair and gi.
- **14 recovery-1** — Begin deceleration and re-form guard.
- **15 recovery-2** — Return weight over the stance.
- **16 neutral-bridge** — End close to approved base for clean handoff.
