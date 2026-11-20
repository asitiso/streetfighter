# Ibuki articulated attack atlas v1

Built-in image_gen authored20 distinct grounded windup/follow-through/recovery poses matching the existing masked Ibuki cel-shaded reference. Replaces repeated transforms of a raised-knee legacy body.5x4 normal/special/super/throw rows. Actual active/contact exact-move visuals, timing/hitboxes unchanged.

Selected first generation `generated-sheet-v1.png` and `generation-prompt.txt` retained. No code-based creative reposing, recolouring, background editing or alpha removal. Optional secondary prompt hash is null because no edit was needed.

Technical packing uses cell crop with gutter, one shared uniform scale, translation to a shared two-foot anchor (bottom12% of body), independent runtime stance guard (bottom16%, <=3px center error), verticalbaseline tolerance2px, half-size LITE and lossless WebP. Source opaque margin>=4px and runtime>=6px. Alpha matte guard rejects more than16 alpha>=8 pixels outside5px-expanded alpha>=32 silhouette per cell; all20 RGBA frames distinct.

Runtime: public/art/attack-atlases/ibuki-authored-v1.webp (960x896), public/art/attack-atlases-hd/ibuki-authored-v1.webp (1920x1792). Original legacy files preserved.

`python scripts/build-ibuki-attack-atlas-v1.py --check` reconstructs every RGBA pixel and checks provenance/stance. `node scripts/verify-ibuki-attack-atlas-v1.mjs` checks runtime quality/offline mapping and contact policy. Native comparison explicitly preloads HQ body for HD contact controls and disables high-frame loading only to exercise fallback atlas.
