# Ibuki authored walk (12 frames)

Enabled forward walk adds 12 frames to the existing 6-frame idle, for 18 authored frames. Retreat, dash, jump, landing and hit retain staged fallback rendering.

Two built-in imagegen sheets supplied complete body poses. Source order is [idle01,1,2,3,4,5,4,6,3,8,8,idle01]; contact holds and guard endpoints are intentional. Replacing the widest reach with an existing reach reduced foot travel from 152.218px (above 145px) to 95.422px. Quality thresholds were unchanged. Shared normalization reuses Ibuki's original alpha-root alignment. Old staged walk anchor offsets are zeroed; timing weights remain unchanged.

The shared installer validates actual installed idle/walk peers in both replacement directions, including checksum, decoded dimensions and both transitions. First idle installation permits an inactive walk. Review identified the missing inverse gate; a corrupt active walk during idle replacement failed the regression before correction and is rejected afterward. Isolated tests cover rollback, incomplete sources and character isolation.

Real Fighter.updatePlayer tests cover all 12 frames, loop wrap, both facings, released-input idle and unchanged retreat fallback. Browser idle/walk in both facings passed all 6/12 frames, repeat=true, rendering failures=0, with no warning/error entries. Actual 384px source cells render at 192x224. Cache/preload v084 includes walk. Clean production builds remove the developer fixture.

```sh
python3 scripts/install-authored-chunli-walk.py walk --character IBUKI --install
python3 scripts/install-authored-chunli-walk.py walk --character IBUKI --runtime
node scripts/verify-ibuki-walk.mjs
python3 scripts/verify-ibuki-ingest.py
```