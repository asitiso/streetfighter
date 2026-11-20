# Chun-Li articulated attack atlas v1

Built-in image_gen authored20 articulated generic windup/follow-through/recovery poses in the approved reference cel-shaded style, replacing repeated transforms of a single idle body.5x4 normal/special/super/throw rows. Actual active/contact exact-move visuals, timing and hitboxes remain unchanged.

`generated-sheet-v1.png` is the selected first generation; original source and generation-prompt retained. No code-based creative reposing, recolouring, background editing or alpha removal.

Technical packing: cell crop with gutter, shared uniform scale, translation to shared two-foot anchor (bottom12% body band), independent runtime stance guard (bottom16%, <=3px center error), verticalbaseline tolerance2px, half-size LITE, lossless WebP. Source body margin>=4px, runtime margin>=6px. Alpha matte guard rejects more than16 alpha>=8 pixels outside5px-expanded alpha>=32 silhouette per cell; all20 RGBA frames distinct.

Runtime public/art/attack-atlases/chunli-authored-v1.webp (960x896) and public/art/attack-atlases-hd/chunli-authored-v1.webp (1920x1792). Legacy assets preserved. Optional secondary prompt hash is null because no generation edit was needed.

Validation: `python scripts/build-chunli-attack-atlas-v1.py --check` reconstructs all decoded RGBA and checks provenance/stance. `node scripts/verify-chunli-attack-atlas-v1.mjs` checks quality/offline mapping and contact policy. Native browser QA preloads the HQ base in both controls so HD attack frames are also compared with HQ contact rendering.
