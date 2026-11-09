# Chun-Li authored hit reaction (8 frames)

Transparent full-body poses were drawn with the built-in image generation tool using the approved Chun-Li master. The reaction progresses from neutral through impact and peak recoil to planted recovery. Source framing preserves the hair ribbons, hands, and boots.

The shared installer checks authored pose changes, recoil/compression/foot travel, recovery near neutral, and master transitions using the existing hit limits.

```sh
python3 scripts/install-authored-chunli-walk.py hit --install
python3 scripts/install-authored-chunli-walk.py hit --runtime
```

Chun-Li's seven base movement/reaction sequences are authored and enabled after installation: idle, walk, walk-back, dash, jump, landing, and hit (57 frames total).
