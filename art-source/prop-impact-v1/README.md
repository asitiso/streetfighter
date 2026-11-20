# Material prop impact animation v1

Built-in imagegen produced one original transparent sheet source.png. Exact [generation prompt](prompt.txt) is preserved. Four material rows each have six distinct one-shot frames: wood, metal, glass, cloth.

Runtime public/art/prop-impact-v1/atlas.webp:768×512 RGBA,128pxcells,24frames,203930encodedbytes,1572864decodedRGBA pixelcapacity (not measured hardware memory). Rebuild using scripts/build-prop-impact-v1.py. Premultiplied-alpha downscale preserves centered shared origins; losslessWebP exact=True; qa.json records SHA256 and uniqueness.

PropImpactAssets.ts handles only recognized prop-hit/break events. Existing TTL18/42 is read without mutation. Visual thresholds6/18ticks suppress stale spokes/labels after the short sprite ends; existing World ages the creation tick, so first naturally renderedTTL is17/41 and observed display is5/17ticks. Every material uses all6breakframes; hit uses first3frames. Source event ownership/audio/damage/clock unchanged.

Low quality skips optionalimage decoding and uses legacy effects. Pending/malformed/unknown/unrelated events retain legacy rendering. Atlas/helper are deferred stage/offline assets. Static debris art remains separately owned by the existing stage-props-v1 atlas.
