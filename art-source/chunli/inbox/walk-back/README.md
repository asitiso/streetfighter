# Chun-Li authored backward walk (10 frames)

Source frames were drawn with the built-in image generation tool using the approved Chun-Li master as the character and costume reference. The guarded retreat keeps her facing the opponent while alternating foot support. Narrow passing poses have extra source margins to preserve the hair ribbons and boots.

Frames `01.png` through `10.png` are ordered source poses, not transformed copies of the standing master. The shared walking installer normalizes their scale and grounded baseline, then requires authored-pose, backward-walk semantics, loop closure, and master handoff gates before enabling the runtime strip.

```sh
python3 scripts/install-authored-chunli-walk.py walk-back --install
python3 scripts/install-authored-chunli-walk.py walk-back --runtime
```

The existing forward-walk commands remain supported without a positional argument. Dash is also enabled through the shared installer. Jump and landing are also enabled and verified as a pair. Idle and hit are also authored and enabled; all seven base movement/reaction sequences are active (57 frames).
