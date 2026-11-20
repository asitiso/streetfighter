# Yun authored attack atlas v1

Built-in image_gen generated20poses from the existing Yun reference with the preserved `generation-prompt.txt`. The generated original is `generated-sheet-v1.png`; the tool original remains in the Codex generated_images directory. Four rows: normal/special/super/throw, five windup/follow-through/recovery frames each. Contact still uses the existing articulated move-specific route.

`python scripts/build-yun-attack-atlas-v1.py --install` performs transparent-gutter cell cropping, a single shared uniform scale, translation to the reference foot anchor, half-size LITE sampling and lossless WebP encoding. No code-driven reposing, recolouring or alpha removal. `--check` validates clipping margins, foot anchors,20distinctframes, source/prompt/runtime hashes and every decoded RGBA pixel against the packed source.

Runtime LITE: `public/art/attack-atlases/yun-authored-v1.webp` (960×896). HD: `public/art/attack-atlases-hd/yun-authored-v1.webp` (1920×1792). Old atlases preserved. Source review and solid-background composite confirm the low-alpha RGB remnants are not an opaque backdrop.
