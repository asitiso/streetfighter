# Ken step kick v1

Supplemental12-frame animation for KEN_CMD_MK. Existing standing MK and all legacy strips remain unchanged. Built-in image_gen generated the poses and performed the alpha-edge cleanup. Both source versions and prompts are retained.

`pack.mjs` reproduces the local atlas using Node and headless Chrome with no visible window. It reads generated-sheet-v2.png and the installed Ken idle strip, preserves alpha, normalizes body size and foot floor, and encodes the12x640x448 atlas. The first and last cells reuse the installed idle drawing; contact cells hold the planted foot while the step shifts forward. `packing.json` records the measured bounds and transforms.

Runtime: public/art/command-motion-v1/ken-step-kick.webp. Gameplay timing, hitboxes, damage and controls are unchanged. Legacy asset manifests are intentionally preserved; this supplement has its own manifest.json and verify-ken-step-kick check.
