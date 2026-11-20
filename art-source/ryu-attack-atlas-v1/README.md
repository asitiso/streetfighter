# RYU articulated attack atlas v1

Built-in image_gen authored20 distinct grounded generic windup/follow-through/recovery poses matching the approved reference cel-shaded identity.5x4 normal/special/super/throw. Exact active/contact visuals, timing and hitboxes unchanged. Ryu preserves off-white gi, red headband/gloves and dark hair.

Selected first generation generated-sheet-v1.png and generation-prompt.txt retained. No code-based creative reposing, recolouring, background editing or alpha removal. Optional secondary prompt hash null because no edit was needed. Technical crop/shared uniform scale/two-foot12%anchor, independent16%stance guard<=3px, verticalbaseline tolerance2px, source/runtime opaque margins>=4/6px, alpha matte guard, half-size LITE and lossless WebP. All20 RGBA frames distinct.

Runtime public/art/attack-atlases/ryu-authored-v1.webp (960x896), public/art/attack-atlases-hd/ryu-authored-v1.webp (1920x1792). Legacy files and all pre-existing changes preserved.

`python scripts/build-ryu-attack-atlas-v1.py --check` reconstructs all RGBA pixels and verifies provenance/geometry. `node scripts/verify-ryu-attack-atlas-v1.mjs` checks quality/offline mapping and contact policy. Combined Ryu/Ken controls exclude only the four intended attack keys. Native comparison preloads HQ base for HD contact controls, disables high-frame loading only to exercise fallback atlas, and asserts each move actually started.
