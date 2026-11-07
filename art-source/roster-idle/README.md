# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have idle 6F, forward walk 12F, guarded retreat 10F and forward dash 7F: 24 runtime strips and 210 stored frames. The latest dash batch adds six strips and 42 frames. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle, forward walking and forward dash. Nine characters have authored retreat; Ryu's retreat remains staged.

This folder began as the missing-idle batch and also holds its matching locomotion. The built-in image generation tool produced each character's `sheet.png` (four idle key poses), `walk-sheet.png` (eight walking key poses), `retreat-sheet.png` (six backward-step poses), and `dash-sheet.png` (six launch/compression/drive/braking/settling/recovery poses). The existing portrait supplies identity/costume, and subsequent motions also reference the generated idle sheet. Exact final prompts are in `prompt.txt`, `walk-prompt.txt`, `retreat-prompt.txt` and `dash-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

Retreat uses six new guarded backward-step poses with deliberate phase holds over ten stored frames. It is not a reversed copy of the forward strip. The back foot leads while the character continues facing the opponent. Cyclic entry selection preserves phase order and checks both transitions against each active installed idle/walk peer. Every idle/walk/retreat replacement now verifies the installed peer checksum, dimensions and authored/enabled flags, covering all six directed connections. Initial idle bootstrap with no peers remains supported.

Forward dash uses fixed source order [1,2,3,3,4,5,6] without cyclic rotation. The unchanged eight-tick gameplay clock reaches stored frames [0,1,3,4,5,6]; skipped frame 2 duplicates frame 3, so every distinct preparation/drive/braking/recovery pose is reached. Dash art does not change movement speed or duration. These six forward-only records use facing-relative direction metadata, so backward dashes keep their existing fallback instead of displaying a forward-drive pose. Existing four-character dash behavior is unchanged.

Dash cells are 640x448 and render at 320x224, preserving the same body pixel scale as standard-width cells while keeping extended legs complete. One uniform scale for the entire sheet matches its final standing recovery height to the installed idle height. Using the median of compressed dash poses would enlarge the standing endpoints; the initial candidate correctly failed handoff scale gates. Urien's initial preparation remained too broad, so its explicit `dashEntry` recipe reuses raw retreat pose 1. The manifest records that extra source checksum and frame override. Existing pose, dash semantic and dedicated entry/recovery handoff thresholds remain unchanged. Updating idle also verifies both installed dash handoffs.

The builder extracts whole connected silhouettes with a two-pixel antialias fringe. It does not slice a boot merely because it crosses a nominal grid boundary into a blank gutter. It rejects incomplete/low-resolution poses and silhouettes touching the actual source-sheet edge. Background RGB under zero alpha is irrelevant to the rendered result; previews should be composited on a background.

Existing idle/walk pose variance and semantic thresholds are reused unchanged. Checks include loop closure, body/root stability, foot planting, genuine alternating foot travel, stance variation and idle-to-walk/walk-to-idle continuity. Dudley's initial walk failed the root-travel gate; it was regenerated. Dudley and Makoto were regenerated with more spacing. Source sheets, exact prompts, checksums, selected source order and QA metrics remain available for extending the next motions.

```sh
python scripts/build-roster-motions.py --kind idle
python scripts/build-roster-motions.py --kind walk
python scripts/build-roster-motions.py --kind walk-back
python scripts/build-roster-motions.py --kind dash
python scripts/build-roster-motions.py --kind idle --install
python scripts/build-roster-motions.py --kind walk --install
python scripts/build-roster-motions.py --kind walk-back --install
python scripts/build-roster-motions.py --kind dash --install
python scripts/build-roster-motions.py --kind idle --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/build-roster-motions.py --kind walk-back --runtime
python scripts/build-roster-motions.py --kind dash --runtime
python scripts/verify-roster-ingest.py
npm run build
npm run verify:roster-movement
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. For the six new retreats it also verifies world movement away from facing without turning, all ten frames, loop wrap, direct forward switch and idle return. New dash checks use actual double taps in both world directions and both facings: unchanged eight-tick duration and movement, all reachable forward poses, correct wide output, backward fallback and idle recovery. Isolated ingestion includes new-retreat/dash file removal on failure, replacement rollback for all four kinds, six locomotion corrupt-peer directions and both idle/dash corrupt-peer directions. These checks do not substitute for a manual game playthrough. Dash preview GIFs are slowed down to show the poses.

Remaining asset work: authored backward dash, jump, landing, hit, defense, normals and specials for these six characters; Ryu's remaining staged motions including retreat; and remaining normals/defense for Chun-Li and Ibuki. Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.
