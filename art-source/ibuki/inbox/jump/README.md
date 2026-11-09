# Ibuki authored jump / landing

Jump8F and landing6F are enabled together, bringing Ibuki to49 active frames across6 base motions. Hit remains staged. Built-in imagegen supplied full-body jump and landing sheets using idle as identity/style reference. Jump order [idle,1,2,3,3,2,4,4] covers launch, rise, tuck, descent and landing-ready brace. Landing order [1,2,2,dash1,3,idle] covers contact, compression, weight transfer, rebound and guard. Repeated tuck/compression poses are intentional.

Initial landing foot-width CV .137579 failed the unchanged .15 minimum. Reusing the existing dash launch as weight-transfer pose passes all landing limits; reorder places rebound on the actual reachable frame4. Jump and landing pose, semantics and master/pair transitions pass unchanged gates. Uniform Ibuki original-root correction applies to both strips; jump's grounded endpoints retain that baseline after anchoring instead of resetting to Ken's423px baseline. Staging anchor offsets are zero; physics and timing weights/fps are unchanged.

The installer already promotes jump and landing as a verified pair from either command, with rollback of both runtime strips, registry and manifest. Isolated Ibuki regression confirms both commands replace a stale peer, paired rollback on injected write failure, rejection of incomplete peer source, matching checksums and49 active frames. Character isolation and six directed idle/walk/retreat installed-peer gates remain covered.

The real jump-input test failed before promotion, then passed both facings through actual rise, apex, fall, landing and idle return. All8 jump frames are reached. Existing landing timing reaches [1,2,4,5], four of6 stored frames; compression, rebound and recovery remain visible. Actual Canvas tests confirm jump-height translation and384x448 cells rendered at192x224.

Chrome renderer verification covered all7 motion options in both facings (14 combinations), with no rendering failures or warning/error console entries. Jump8/8 and landing4/6 (all4 reachable poses) passed, as did existing loops and dashes. Screenshots inspected. This checks renderer integration and simulated input, not manual stage play. Cachev087; existing preload contains both assets. Clean production builds remove the developer fixture.

## Generation prompts

Jump: Game animation asset, four separated full-body adult female ninja athletic jumping poses in2x2 grid, transparent background. Match reference beige ninja uniform, face mask, brown wraps, long brown ponytail and illustrated sprite style. Nonsexual neutral action, adult character. Keep uniform fully covering torso, loose beige trousers, open-toe ninja footwear. Each faces right guarding with hands. Top left planted shallow knee-bend anticipation. Top right upright rising jump with one bent knee, one extended leg. Bottom left upright airborne apex with both knees tucked and feet below hips. Bottom right downward landing-ready pose, legs extended below torso and slightly bent knees. Complete body, hair, fingers, toes with generous clear margins and gaps between figures. Same anatomical scale. No text, shadows, environment, effects or floor.

Landing: Create transparent2x2 sprite sheet four complete Ibuki landing poses matching reference exact beige ninja costume, mask, brown wraps, open toes and long ponytail, painted fighting-game style. Every face RIGHT keeping open-hand guard. Same anatomical size. Upper left initial contact: knees bent shallow, torso upright guard, both feet moderately apart planted. Upper right deep landing squash: hips lowered substantially, knees folded deeply, torso forward about20degrees, both feet planted moderately wide, hands guard. Lower left rebound: knees halfway straightened, hips rise, weight centered, feet planted, hair settling. Lower right final guard recovery: upright ninja guard with soft knees, stance comparable reference but slightly narrower. Complete ponytail and hands and toes with large clear transparent margins and gaps, no cropping. Each figure fullbody around500px tall except compressed squat naturally shorter. No text, shadows, floor, effects or background.

```sh
python3 scripts/install-authored-chunli-walk.py jump --character IBUKI --install
python3 scripts/install-authored-chunli-walk.py landing --character IBUKI --runtime
node scripts/verify-ibuki-air.mjs
python3 scripts/verify-ibuki-ingest.py
```