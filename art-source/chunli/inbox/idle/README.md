# Chun-Li authored idle (6 frames)

The built-in image generation tool drew restrained breathing poses using the approved master. Feet stay planted while the chest, shoulders, guard elbow, and lowered fist move subtly. The ordered cycle is A-B-C-D-C-B: frames 5 and 6 deliberately reuse the returning poses for a smooth loop.

The shared installer requires authored silhouette changes, the existing restrained idle semantic limits, and the stricter master transition limits. No quality thresholds were relaxed.

```sh
python3 scripts/install-authored-chunli-walk.py idle --install
python3 scripts/install-authored-chunli-walk.py idle --runtime
```
