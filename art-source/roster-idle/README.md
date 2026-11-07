# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have a 6-frame idle breathing loop, a 12-frame forward walk and a distinct 10-frame guarded retreat: 18 runtime strips and 168 frames. The latest retreat batch adds six strips and 60 frames. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle and forward walking. Nine characters have authored retreat; Ryu's retreat remains staged.

This folder began as the missing-idle batch and also holds its matching locomotion. The built-in image generation tool produced each character's `sheet.png` (four idle key poses), `walk-sheet.png` (eight walking key poses), and `retreat-sheet.png` (six backward-step poses). The existing portrait supplies identity/costume, and walking/retreat also reference the generated idle sheet. Exact final prompts are in `prompt.txt`, `walk-prompt.txt` and `retreat-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

Retreat uses six new guarded backward-step poses with deliberate phase holds over ten stored frames. It is not a reversed copy of the forward strip. The back foot leads while the character continues facing the opponent. Cyclic entry selection preserves phase order and checks both transitions against each active installed idle/walk peer. Every idle/walk/retreat replacement now verifies the installed peer checksum, dimensions and authored/enabled flags, covering all six directed connections. Initial idle bootstrap with no peers remains supported.

The builder extracts whole connected silhouettes with a two-pixel antialias fringe. It does not slice a boot merely because it crosses a nominal grid boundary into a blank gutter. It rejects incomplete/low-resolution poses and silhouettes touching the actual source-sheet edge. Background RGB under zero alpha is irrelevant to the rendered result; previews should be composited on a background.

Existing idle/walk pose variance and semantic thresholds are reused unchanged. Checks include loop closure, body/root stability, foot planting, genuine alternating foot travel, stance variation and idle-to-walk/walk-to-idle continuity. Dudley's initial walk failed the root-travel gate; it was regenerated. Dudley and Makoto were regenerated with more spacing. Source sheets, exact prompts, checksums, selected source order and QA metrics remain available for extending the next motions.

```sh
python scripts/build-roster-motions.py --kind idle
python scripts/build-roster-motions.py --kind walk
python scripts/build-roster-motions.py --kind walk-back
python scripts/build-roster-motions.py --kind idle --install
python scripts/build-roster-motions.py --kind walk --install
python scripts/build-roster-motions.py --kind walk-back --install
python scripts/build-roster-motions.py --kind idle --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/build-roster-motions.py --kind walk-back --runtime
python scripts/verify-roster-ingest.py
npm run build
npm run verify:roster-movement
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. For the six new retreats it also verifies world movement away from facing without turning, all ten frames, loop wrap, direct forward switch and idle return. Isolated ingestion includes new-retreat file removal on failure, replacement rollback for all three kinds, and rejection of corrupt peers in all six directions. These checks do not substitute for a manual game playthrough.

Remaining asset work: dash, jump, landing, hit, defense, normals and specials for these six characters; Ryu's remaining staged motions including retreat; and remaining normals/defense for Chun-Li and Ibuki. Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.
