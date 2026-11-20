# Makoto attack atlas v1

Built-in image_gen authored20 articulated full-body startup/follow-through/recovery poses matching the existing Makoto reference. Row-major5x4 normal/special/super/throw. Actual active/contact exact-move visuals, timing and hitboxes remain unchanged.

`generated-sheet-v1.png` is rejected for translucent backdrop (21962 alpha>=8 pixels outside expanded silhouette in first cell). `background-removal-prompt.txt` produced selected `generated-sheet-v2.png` through built-in image_gen. Both sources and prompts retained. No code-based creative reposing, recolouring, alpha removal or background editing.

Technical packing crops cells with gutter, applies one shared uniform scale, translates to a shared foot anchor, downsamples LITE by half and losslessly encodes WebP. A fixed8px foot band initially selected only one foot for2poses and shifted stance center78HDpixels. The selected pack uses bottom12% of each body for BOTH feet; independent bottom16% runtime stance check requires center within3px of the reference anchor. Vertical baseline tolerance2px, source body margin>=4px, runtime margin>=6px. Alpha matte guard checks beyond5px expansion of alpha>=32 silhouette, allowing at most16 sparse alpha>=8 pixels per cell. All20 frames distinct.

Runtime: public/art/attack-atlases/makoto-authored-v1.webp (960x896), public/art/attack-atlases-hd/makoto-authored-v1.webp (1920x1792). Legacy files preserved.

Validation: `python scripts/build-makoto-attack-atlas-v1.py --check` verifies stance geometry and reconstructs all decoded RGBA pixels and provenance hashes. `node scripts/verify-makoto-attack-atlas-v1.mjs` verifies runtime/offline mapping and exact contact policy.
