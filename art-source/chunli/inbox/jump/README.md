# Chun-Li authored jump (8 frames)

Transparent source poses were drawn with the built-in image generation tool using the approved Chun-Li master. The sequence covers launch, compression, ascent, apex tuck, descent, and contact. Source extraction preserves the full hair ribbons and boots even where the sheet rows have different margins.

The shared movement installer normalizes body scale. Launch/contact use the grounded baseline; the compression pose lifts the feet 12px for departure, and aerial poses retain their centered anchor. These anchors prevent a visible position jump without relaxing the existing motion gates.

Jump and landing are verified as a pair: both must pass authored-pose and motion semantics, plus master-to-jump, jump-to-landing, and landing-to-master transitions.

```sh
python3 scripts/install-authored-chunli-walk.py jump --install
python3 scripts/install-authored-chunli-walk.py jump --runtime
python3 scripts/install-authored-chunli-walk.py landing --runtime
```

Either `jump --install` or `landing --install` promotes both verified strips together. Runtime, registry, and manifest writes are rolled back on a write failure. Runtime checks require the paired strip to be enabled and checksum-valid.
