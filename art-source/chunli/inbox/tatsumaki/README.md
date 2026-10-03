# Chun-Li Spinning Bird Kick (12 frames)

Grounded CHUNLI_MOBILITY uses CHUNLI_SPINNING_BIRD_HQ and the existing `tatsumaki` kind. Startup occupies frames 0–2, active rotation 3–8, and recovery 9–11. Rising kick, air attacks and all Super Arts retain their separate presentation.

The built-in imagegen tool authored twelve full-body poses across preparation/inversion, inverted rotation, and return/landing sheets. Blue/gold tunic, opaque dark brown training leggings, white boots and wrist guards match across the sequence. Alpha connected components were extracted from the whole sheets, preserving limbs that extend across nominal grid boundaries.

The 640x448 frame canvas preserves the same body scale throughout the wide leg rotation. The renderer draws every authored canvas at half source scale, keeping existing 384x448 motions unchanged. The shared installer's horizontal pixel thresholds are converted by 640/384 for this canvas; IoU, vertical, pose residual, area and handoff limits retain their existing values. Ken configuration is unchanged.

Runtime pose/semantic/handoff checks, both facing directions and phase boundaries, active rotation advancement, exclusions and idle return are covered. A renderer regression reproduces the old 192px destination squeezing a 640px frame, then checks 320px output and unchanged Ken/Chun-Li idle output. First-install failure rollback is also covered.

```sh
python3 scripts/install-authored-chunli-walk.py tatsumaki --install
python3 scripts/install-authored-chunli-walk.py tatsumaki --runtime
node scripts/verify-chunli-spinning-bird.mjs
node scripts/verify-animation-render-sizing.mjs
```
