# Throw escape motion v1

Ten characters, six original poses each, generated with the built-in image_gen tool from the existing character reference. Each character folder preserves its exact generation prompt, input reference crop, and original generated sheet. Gill's rejected sheet and prompt remain as provenance for the source-grid clipping correction. The rejected vector renderer is retained outside the repository under ../work.

Runtime files: public/art/throw-escape-v1/<character>.webp, six 384x448 cells, lossless WebP. Build with scripts/build-throw-escape-motion-v1.py --install; reproduce and verify without writes by omitting --install. Packing uses only uniform scaling and translation; no pose warps, interpolation, alpha removal, or painted-over fixes. A single horizontal translation and anatomical scale are shared by all six poses; foot baselines use per-frame vertical translation.

Source cells must have transparent margins before normalization; opaque and clipped source controls are rejected. The manifest binds source, reference, prompt and runtime SHA256 hashes. Existing animation-hq packages/manifests remain unchanged. This supplemental bundle is 4,829,422 bytes and decodes to 4,128,768 bytes per fighter (41,287,680 bytes if all ten are resident). Existing character texture lifecycle releases each supplemental strip with its character. The movement/menu preload excludes this bundle; combat preload includes it.

The twelve existing throw-escape ticks play six authored frames, two ticks each. Hitstop freezes the same gameplay counter. Existing action priority is reused. Missing, loading, failed or malformed supplemental textures retain the established loaded idle HQ image; lite mode keeps its existing rendering path. The immunity period and gameplay rules are unchanged.

Technical source contact sheet: runtime-contact-sheet.jpg. Actual game-renderer browser evidence: ../outputs/throw-escape-motion-v1-comparison.png and throw-escape-motion-v1-browser.json.
