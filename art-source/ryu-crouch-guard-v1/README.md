# Ryu crouch guard v1

Six authored low-guard poses generated with the built-in imagegen tool from the preserved Ryu idle reference. Exact prompt: generation-prompt.txt. Original generation: generated-sheet-v1.png.

The standalone Pillow packer scripts/pack-ryu-crouch-guard-v1.py performs only silhouette crops, shared uniform scaling, foot alignment and lossless packing. It imports no project pose-analysis modules and does not write the root pose cache. Source and runtime hashes are recorded in manifest.json.

Runtime: public/art/animation-hq/ryu/crouch-guard-v1.webp, six 384×448 cells, 394198 bytes. All opaque foot baselines are aligned. Grounded Ryu low blocks in HD select the supplement through the existing generic crouch-guard renderer; no renderer or gameplay code changed in this batch. Standing guard, parry, other characters, Lite and missing-texture fallback retain prior routes. Existing Ken art is preserved byte-for-byte.

Validation: focused script scripts/verify-ryu-crouch-guard-v1.mjs checks frame selection, blending, a single shadow, parent opacity, no fighter mutation, preparation/release, failed-load retry and source hashes. A hidden native Chrome comparison checks both facings, six reaction phases, all stance weights, actual blocks and hitstop, loaded Lite body and missing-texture recovery. DPR 2 comparisons use an independent direct-resolution weighted reference; maximum premultiplied channel/alpha difference is 5/255 on six channels above 3/255. A work-only forced-density-1 renderer fails the same comparator with a maximum difference of 83/255 and 364548 channels above 3/255, confirming regression sensitivity. No mutant is part of runtime assets.

Reports and comparison screenshots are in sibling outputs/ryu-crouch-guard-* files. All work is local; no commit, push or deployment.
