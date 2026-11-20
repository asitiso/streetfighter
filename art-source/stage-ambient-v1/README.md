# Stage ambient animation v1

Generated using built-in imagegen. Original source.png and exact [prompt](prompt.txt) are preserved. Five coherent rows each contain six distinct authored frames: subway steam, cooking vapor, tumbling maple leaves, rain ripples, brazier flame.

Runtime: public/art/stage-ambient-v1/atlas.webp. Shared768×640 RGBA atlas with128pxcells, common row crops, shared per-row scale and baseline120. Builder scripts/build-stage-ambient-v1.py uses premultiplied-alpha resampling and losslessWebP exact=True. qa.json records source/runtimeSHA and frame uniqueness. Transport266978bytes; decodedRGBA capacity1966080bytes (not measured RAM/GPU usage).

Renderer uses the existing scene.time at8frames/s, blending adjacent frames without simulation mutation or separate timers. High quality allows2visible instances/4image draws, balanced1instance/2draws. Low quality returns before requesting/decoding this optional atlas. Offscreen instances culled. Existing pause freezes scene clock. Frames draw behind props/fighters; stage5flame anchors were aligned on the existing brazier from gameplay captures.

Optional atlas and helper module belong to deferred stage/offline groups. Static art remains visible while atlas is pending, malformed or disabled. Original legacy background fallback is preserved.
