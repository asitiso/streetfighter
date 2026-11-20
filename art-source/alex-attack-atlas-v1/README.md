# Alex attack atlas v1

Built-in image_gen authored 20 articulated full-body startup/follow-through/recovery poses matching the existing Alex reference. Rows normal/special/super/throw, 5 columns each. Contact frames remain the existing exact-move articulated visuals.

`generated-sheet-v1.png` is the rejected first generation: dark-background compositing exposed a translucent rectangular matte. `background-removal-prompt.txt` produced the selected `generated-sheet-v2.png` with built-in image_gen, preserving the character/grid. Original generation and both prompts retained for provenance.

The standalone builder performs only deterministic cell crop, one shared uniform scale, translation to the reference foot anchor, LITE half-size downsample and lossless WebP encoding. No code-based creative reposing, recolouring, alpha removal or background editing. A source-alpha validation rejects matte outside a 5-pixel silhouette expansion (alpha>=8, max16 sparse pixels per cell); the first generation fails with42125 such pixels in its first cell. Selected source has minimum4px opaque-body cell margin; runtime opaque-body margin is at least6px.

Runtime: `public/art/attack-atlases/alex-authored-v1.webp` (960x896) and `public/art/attack-atlases-hd/alex-authored-v1.webp` (1920x1792). Legacy assets preserved. `python scripts/build-alex-attack-atlas-v1.py --check` reconstructs both atlas RGBA images and verifies exact decoded pixels and source/prompt hashes. `node scripts/verify-alex-attack-atlas-v1.mjs` validates runtime selection/offline/source/contact policy.
