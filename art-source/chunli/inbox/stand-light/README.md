# Chun-Li standing light punch (7 frames)

Built-in imagegen uses the authored idle reference to preserve character and style. Four drawn poses form A-B-C-D-C-B-A: guard, windup, extension, contact, then deliberate reuse of returning poses. Frames 5/6/7 copy 3/2/1.

Only grounded 5LP uses this strip. Medium palm, kicks, crouching attacks, and air attacks keep their existing visuals. Startup/contact/recovery follow combat move frames; contact is frame index 3. Both facings are sampled in the regression test.

The shared installer retains existing pose, standing attack semantic, and base handoff thresholds. First installation creates the manifest record transactionally and removes a new runtime file if a later write fails.

```sh
python3 scripts/install-authored-chunli-walk.py stand-light --install
python3 scripts/install-authored-chunli-walk.py stand-light --runtime
node scripts/verify-chunli-light-attack.mjs
```
