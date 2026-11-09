# Chun-Li standing heavy palm (10 frames)

The built-in imagegen tool drew two sheets using the authored idle design and the first sheet as references. Frames 2–9 show open-hand windup, shoulder coil, palm extension, two contact poses, and recovery. Frames 1 and 10 deliberately reuse the standing light attack's neutral guard source.

Only grounded 5HP uses this strip. Medium palm, kicks, crouching and air attacks, and Kikoken retain their existing visuals. Combat move time selects startup frames 0–3, contact frames 4–5, and recovery frames 6–9. Regression checks both facings and phase boundaries.

Existing heavy attack pose, semantic and base handoff gates are unchanged. The shared installer handles manifest creation, checksums and rollback. Both standing attacks are tested for first-install write failure and successful reinstall.

```sh
python3 scripts/install-authored-chunli-walk.py stand-heavy --install
python3 scripts/install-authored-chunli-walk.py stand-heavy --runtime
node scripts/verify-chunli-heavy-attack.mjs
```
