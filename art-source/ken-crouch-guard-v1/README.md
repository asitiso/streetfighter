# Ken crouch guard v1

Six authored low-guard poses generated with the built-in imagegen tool using the preserved Ken idle reference. The exact creative instructions are in generation-prompt.txt. Original generated image: generated-sheet-v1.png.

The packer scripts/pack-ken-crouch-guard-v1.py only crops, uniformly scales and aligns the generated poses, then packs a lossless transparent horizontal WebP. Re-run with Pillow installed; no project pose-analysis modules or caches are imported. All source and runtime SHA-256 hashes are recorded in manifest.json.

Runtime: public/art/animation-hq/ken/crouch-guard-v1.webp, 6 cells of384×448,439070bytes. HD grounded Ken block reactions select the supplemental strip. Existing standing guard, parry, other characters, Lite mode and missing-texture fallbacks retain their prior routes.

The six-tick stance transition blends premultiplied poses in a reusable offscreen buffer, preserves one ground shadow and caller opacity, and follows display density up to4× (16MiB maximum buffer). Simulation clocks own timing; hitstop and pause freeze the pose.

Verification: scripts/verify-ken-crouch-guard-v1.mjs checks source hashes, payload bounds, six-frame selection, blend weights, nonmutation, texture preparation/release and failed-load retry. Native CDP comparisons and the local batch report are in sibling outputs/ken-crouch-guard-* files.
