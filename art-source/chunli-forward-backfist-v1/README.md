# Chun-Li forward backfist v1

Supplemental12-frame authored animation for CHUNLI_CMD_HP. Standing HP, other commands, and all legacy strips are preserved. Generated and alpha-cleaned with the built-in image_gen tool; both original sheets and exact prompts are retained.

pack.mjs reproduces the local asset with Node and hidden headless Chrome. It measures the installed Chun-Li idle height, boot floor and supporting-foot anchor, preserves alpha while packing12x640x448 cells, and reuses the installed idle drawing at cells0/11. Forward weight shift peaks during contact then returns. packing.json records the measurements. WebP quality0.88 uses lossyRGB with alpha retained.

Runtime: public/art/command-motion-v1/chunli-forward-backfist.webp. Timing, damage, hitboxes, movement and controls are unchanged. Independent manifest.json and verify-chunli-forward-backfist bind the source and runtime hashes without rewriting legacy manifests.
