# Ken forward dash motion v2

Built-in image_gen created eight source drawings: neutral anatomical reference followed by seven original dash poses. [Exact primary prompt](prompt-v1.txt) and [accepted primary sheet](generated-sheet-v1.png) are preserved. The first candidate failed the existing dash-to-idle silhouette cue because its last pose duplicated neutral too closely. No gate was relaxed.

Only runtime frame7 uses source pose8 from [targeted recovery edit](generated-recovery-v2.png), with [exact edit prompt](prompt-recovery-v2.txt). All earlier runtime poses remain from the primary sheet. Reference-pose height sets the override scale; all bodies then use one idle-based anatomical scale and ground alignment.

Runtime: seven384×448 cells, same8-tick dash, same20fps metadata, decoded memory delta0. Lossless WebP550172bytes,42822bytes above previous; complete Ken manifest stays below19MB. Largest silhouette-centroid step22.919287→18.477201 (19.38% reduction), an image metric rather than a player study. Existing pose/semantic/handoff/non-clipping gates all pass.

Reconstruct with scripts/build-ken-dash-motion-v2.py --runtime using Pillow/NumPy/SciPy and external POSE_ECC_CACHE_PATH. --install writes only Ken dash and its manifest after all gates pass. Node check: scripts/verify-ken-dash-motion-v2.mjs. Original runtime/manifest backups preserved here.
