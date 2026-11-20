# Dudley attack atlas v1

Built-in image_gen authored20 articulated full-body startup/follow-through/recovery poses matching the existing Dudley boxer reference. Row-major5x4, normal/special/super/throw. Actual active/contact frames retain existing exact-move visuals and gameplay timing/hitboxes.

`generated-sheet-v1.png` is the rejected first generation: several cells had insufficient hair/shoe gutters (including zero-margin cell). `layout-refinement-prompt.txt` produced selected `generated-sheet-v2.png` using built-in image_gen; the poses and identity were retained while margins expanded. Both generations and both prompts preserved. No code-based creative reposing, recolouring, alpha removal or background editing.

The standalone builder uses deterministic cell crop with gutter, one common uniform scale and foot anchor, half-size LITE downsample, lossless WebP. Source alpha guard rejects matte beyond5px expansion of alpha>=32 silhouette (alpha>=8, at most16 sparse pixels per cell). Source opaque body cell margins>=4px and runtime margins>=6px, baseline tolerance2px; all20 RGBA frames distinct.

Runtime: public/art/attack-atlases/dudley-authored-v1.webp (960x896), public/art/attack-atlases-hd/dudley-authored-v1.webp (1920x1792). Legacy files retained.

Validation: `python scripts/build-dudley-attack-atlas-v1.py --check` reconstructs every decoded pixel and verifies provenance. `node scripts/verify-dudley-attack-atlas-v1.mjs` checks mapping/offline/quality and exact contact policy.
