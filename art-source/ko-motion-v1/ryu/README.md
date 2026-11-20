# Ryu grounded KO motion v1

Generated with built-in image_gen using [exact prompt](prompt-v1.txt) and [accepted source](generated-sheet-v1.png). Eight original drawings show stunned recoil, collapse, ground contact and a fully lying rest. All source cells are used once in reading order. No existing Ryu motion or manifest record is replaced.

Uniform initial-reference anatomical scale and shared horizontal center/ground baseline pack512×448cells without clipping or shrinking the lying body. Eight unique drawings, bounded body volume, horizontal resting endpoint and frame-centroid step gates are checked. Source/runtime hashes and visible RGBA are lossless. Runtime640254bytes; decodedHQstrip7,340,032bytes (7MiB).

Only Ryu grounded KO without throw/super/bounce ownership selects this optional HQ strip. KO stateFrame ages the visual collapse over24ticks then holds the last drawing; hitstop/pause freeze it. Existing Fighter physics/KO/retry counters are unchanged. Airborne KO, recoverable knockdown, other characters, missing/malformed art and LITE keep their existing routes. The asset is in character-hq preparation and can use normal service-worker runtime caching; optionalHQ availability is not required for ordinary offline play.

Reconstruct with scripts/build-ryu-ground-ko.py --runtime using Pillow/NumPy/SciPy. --install writes only this supplemental WebP after all gates. Node regression scripts/verify-ryu-ground-ko.mjs covers clock/frames/hold/exclusions/fallbacks/immutability and source/runtime hashes.
