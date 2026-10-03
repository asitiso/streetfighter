# Ibuki authored idle (6 frames)

Ibuki now enables only its idle strip. Walking, retreat, dash, jump, landing and hit remain staging-only with their existing fallback visuals. Four full-body breathing poses were generated with the built-in imagegen tool, preserving the beige ninja costume, mask, forearm/shin wraps, open toes and long ponytail. Whole-sheet alpha components retain complete fingers, hair and toes. The restrained cycle uses [1,3,2,4,2,3]; repeated return poses are deliberate.

The original [1,2,3,4,3,2] order exceeded the unchanged per-frame centroid step limit (8.296px > 8px). Reordering reduced it to 5.734px. Initial base handoff IoU was about .60 versus the unchanged .62 requirement. A uniform character-specific root offset derived from the original alpha bounding box center/baseline (14px right, 7px down) raises endpoint handoff IoU to .758/.768. The same offset is applied to all frames, preserving the actual breathing changes and planted feet. This aligns Ibuki's original root instead of assuming Ken's centered 423px baseline. Ibuki's old staging idle anchor offsets are zeroed so the already-grounded art does not receive extra root shifts. Timing weights and speed remain unchanged.

The existing installer accepts --character IBUKI; CHUNLI remains its default. Paths, reports, registry lookup and manifests are scoped by character, avoiding a duplicate quality pipeline. All pose, idle semantic and master handoff thresholds remain unchanged. Candidate/runtime hashes match. TypeScript, production build, combat, registry/assets, actual Canvas scale and existing Chun-Li Super Art tests passed. A regression failed on the previously disabled Ibuki idle before promotion, then passed through all six frames and loop wrap using actual Fighter.updatePlayer in both facings. Unfinished walk/hit retain fallback rendering.

Isolated ingestion verified existing-runtime rollback, successful character-scoped promotion/checksum, unchanged Chun-Li registry entries, and rejection of incomplete source without runtime changes. Existing default Chun-Li paired-ingest/rollback regression also passed. Read-only review found no actionable issues. The developer browser page loaded and drew every idle frame in both facings, with loop wrap, correct source/output scale and no warning/error console entries. Screenshot inspected. This covers actual renderer integration, not a new manual stage playthrough. Clean production builds remove the developer fixture. Cache/preload v083 includes Ibuki manifest and idle.

```sh
python3 scripts/install-authored-chunli-walk.py idle --character IBUKI --install
python3 scripts/install-authored-chunli-walk.py idle --character IBUKI --runtime
node scripts/verify-ibuki-idle.mjs
python3 scripts/verify-ibuki-ingest.py
npm run prepare:ibuki-browser-check
```

Subsequent walk increment enables 12 forward-walk frames (18 total). Walk references above describe the original idle-only milestone. Active idle/walk replacements now validate both installed-peer transitions; cache v084 includes both strips.
