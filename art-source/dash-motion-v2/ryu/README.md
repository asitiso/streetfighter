# Ryu forward dash motion v2

Generated with the built-in image_gen tool. [Exact prompt](prompt-v1.txt) and [accepted source](generated-sheet-v1.png) are preserved alongside previous runtime/manifest backups. Cell1 is neutral scale reference; cells2–8 are the seven runtime drawings.

The previous strip clipped feet at frames2–5. New frames pass the existing authored-pose, dash semantics, idle handoff and non-clipping gates. Uniform neutral-height normalization preserves anatomy; extraction/packing does not redraw joints or colors.

Runtime remains seven384×448 cells and the same8-tick dash. Lossless WebP is610144bytes,137730bytes below previous. Decoded memory delta is0. Largest silhouette-centroid step drops34.046586→18.250119 (46.4%); this is an image metric, not a player study or latency measurement.

Reconstruct with scripts/build-ryu-dash-motion-v2.py --runtime using existing Pillow/NumPy/SciPy dependencies and an external POSE_ECC_CACHE_PATH. --install writes only Ryu dash/its manifest after all gates pass. Node verification: scripts/verify-ryu-dash-motion-v2.mjs.
