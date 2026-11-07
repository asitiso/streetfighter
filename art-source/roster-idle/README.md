# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have a 6-frame idle breathing loop and a 12-frame forward walk: 12 new runtime strips and 108 frames. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle and forward walking.

This folder began as the missing-idle batch and also holds its matching walks. The built-in image generation tool produced each character's `sheet.png` (four idle key poses) and `walk-sheet.png` (eight walking key poses), using the existing portrait as the identity/costume reference. Walking also references the generated idle sheet. The exact final prompts are in `prompt.txt` and `walk-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

The builder extracts whole connected silhouettes with a two-pixel antialias fringe. It does not slice a boot merely because it crosses a nominal grid boundary into a blank gutter. It rejects incomplete/low-resolution poses and silhouettes touching the actual source-sheet edge. Background RGB under zero alpha is irrelevant to the rendered result; previews should be composited on a background.

Existing idle/walk pose variance and semantic thresholds are reused unchanged. Checks include loop closure, body/root stability, foot planting, genuine alternating foot travel, stance variation and idle-to-walk/walk-to-idle continuity. Dudley's initial walk failed the root-travel gate; it was regenerated. Dudley and Makoto were regenerated with more spacing. Source sheets, exact prompts, checksums, selected source order and QA metrics remain available for extending the next motions.

```sh
python scripts/build-roster-motions.py --kind idle
python scripts/build-roster-motions.py --kind walk
python scripts/build-roster-motions.py --kind idle --install
python scripts/build-roster-motions.py --kind walk --install
python scripts/build-roster-motions.py --kind idle --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/verify-roster-ingest.py
npm run build
npm run verify:roster-movement
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. It does not substitute for a manual game playthrough.

Remaining asset work: retreat, dash, jump, landing, hit, defense, normals and specials for these six characters; Ryu's remaining staged motions; and remaining normals/defense for Chun-Li and Ibuki. Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.
