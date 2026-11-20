# Chun-Li forward dash motion v2

Built-in image_gen created [eight original source drawings](generated-sheet-v1.png) with [this exact prompt](prompt-v1.txt). Neutral cell1 calibrates anatomy; cells2–8 are the seven runtime drawings in reading order. The existing full-pose, dash semantics, non-clipping, and idle-to-dash/dash-to-idle gates pass without relaxed limits.

Uniform idle-reference height scaling and a shared foot anchor preserve body scale and ground alignment. Extraction/packing does not redraw joints or colors. All prior runtime and manifest bytes are preserved in previous-dash.webp and previous-manifest.json.

Seven384×448 cells, same8-tick dash and19fps metadata; decoded memory delta0. Lossless WebP526248bytes versus699998 previously (173750bytes saved). Largest silhouette-centroid step31.740805→20.796190 (34.48% reduction), an image metric rather than a player study or physical input latency measurement.

Reconstruct with scripts/build-chunli-dash-motion-v2.py --runtime using Pillow/NumPy/SciPy and external POSE_ECC_CACHE_PATH. --install writes only Chun-Li dash and its manifest after all gates pass. Node check: scripts/verify-chunli-dash-motion-v2.mjs.
