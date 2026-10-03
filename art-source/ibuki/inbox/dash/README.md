# Ibuki authored dash (7 frames)

The fourth authored base motion enables dash, bringing Ibuki to 35 active frames (idle6 + walk12 + retreat10 + dash7). Jump, landing and hit remain staged.

Built-in imagegen generated four complete poses with the existing idle image as identity/style reference. Source order is [4,1,2,2,3,4,idle01]: guarded anticipation, compression, forward drive hold, planted braking, settling and idle recovery. Initial launch-to-master area ratio 1.420801 exceeded 1.4. Beginning with the generated guard instead produces 1.253138 without changing quality limits. Dash semantics, authored residual, master entry/recovery and checksums pass. A uniform original Ibuki root offset and zero authored dash anchor shifts preserve existing timing weights/fps.

Actual captureInput/updatePlayer double taps start the unchanged eight-tick dash. Both facings and both input directions reach [0,1,3,4,5,6]; frame2 is skipped by the existing ease-out timing and duplicates frame3's drive pose. Launch, drive, braking and recovery are visible, followed by idle and forward walk. No combat timing, speed or input logic changed.

Shared ingestion regression now covers dash existing-strip rollback, character isolation, complete-source rejection and bootstrap frame totals6/18/28/35. The established six directed idle/walk/retreat installed-peer checks remain intact; dash uses the existing dedicated master entry/recovery gates like Chun-Li. Cache v086 reuses the existing dash preload and removes a duplicate Ibuki manifest/locomotion preload line.

Fresh TypeScript/build, build/offline, combat, animation registry/assets, all four Ibuki timing tests, renderer sizing and runtime dash QA pass. Browser idle/walk/retreat plus forward/back dash in both facings (10 combinations) passed actual image/render/scale checks without warning/error entries. Dash covered all six reachable poses and phase endpoints; loops covered every stored frame and wrap. Screenshot inspected. Read-only review found no actionable issues. Clean production builds remove the developer fixture. This verifies rendering and simulated real input, not manual stage play.

## Generation prompt

Use case: stylized-concept. Asset: fighting game Ibuki dash pose sheet, transparent background. Four separated full-body figures in 2x2 grid. Exact reference identity and costume: beige sleeveless ninja gi and mask, brown forearm/shin wraps, exposed fingers/toes, long brown high ponytail. Match reference painted sprite shading. Every figure faces RIGHT. Upper left: guarded crouched launch, hips lowered, torso leans forward, rear leg pushes off and front knee bends. Upper right: fast forward ninja drive, torso leaned about 30 degrees forward, rear leg extends LEFT behind, front knee rises slightly forward, hands in compact guard. Lower left: planted front-foot braking, weight behind front knee, torso begins rising, rear foot pulls in, hair trails left. Lower right: guarded settling recovery, two feet planted moderately apart, torso nearly upright, knees slightly bent. Clearly different leg and hip poses, moderate width that fits vertical sprite canvas. Equal apparent body size. Entire hair silhouette, hands, toes must fit with large transparent margin (at least 10 percent) around each figure. No text, no shadows, no motion streaks, no panel borders, no backgrounds.

```sh
python3 scripts/install-authored-chunli-walk.py dash --character IBUKI --install
python3 scripts/install-authored-chunli-walk.py dash --character IBUKI --runtime
node scripts/verify-ibuki-dash.mjs
python3 scripts/verify-ibuki-ingest.py
```