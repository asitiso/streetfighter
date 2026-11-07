# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have idle 6F, forward walk 12F, guarded retreat 10F, forward dash 7F, jump 8F, landing 6F and hit 8F: 42 runtime strips and 342 stored frames. The latest hit batch adds six strips and 48 stored frames. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle, forward walking, forward dash, jump and landing. Nine characters also have authored hit reactions; Ryu retains its staged hit fallback. Nine characters have authored retreat; Ryu's retreat remains staged.

This folder began as the missing-idle batch and also holds its matching locomotion. The built-in image generation tool produced each character's `sheet.png` (four idle key poses), `walk-sheet.png` (eight walking key poses), `retreat-sheet.png` (six backward-step poses), `dash-sheet.png` (six launch/compression/drive/braking/settling/recovery poses), and paired `jump-sheet.png` / `landing-sheet.png` (four articulated poses each), plus `hit-sheet.png` (six impact/recoil/stagger/recovery poses). The existing portrait supplies identity/costume, and subsequent motions also reference the generated idle sheet. Exact final prompts are in `prompt.txt`, `walk-prompt.txt`, `retreat-prompt.txt`, `dash-prompt.txt`, `jump-prompt.txt`, `landing-prompt.txt` and `hit-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

Retreat uses six new guarded backward-step poses with deliberate phase holds over ten stored frames. It is not a reversed copy of the forward strip. The back foot leads while the character continues facing the opponent. Cyclic entry selection preserves phase order and checks both transitions against each active installed idle/walk peer. Every idle/walk/retreat replacement now verifies the installed peer checksum, dimensions and authored/enabled flags, covering all six directed connections. Initial idle bootstrap with no peers remains supported.

Forward dash uses fixed source order [1,2,3,3,4,5,6] without cyclic rotation. The unchanged eight-tick gameplay clock reaches stored frames [0,1,3,4,5,6]; skipped frame 2 duplicates frame 3, so every distinct preparation/drive/braking/recovery pose is reached. Dash art does not change movement speed or duration. These six forward-only records use facing-relative direction metadata, so backward dashes keep their existing fallback instead of displaying a forward-drive pose. Existing four-character dash behavior is unchanged.

Dash cells are 640x448 and render at 320x224, preserving the same body pixel scale as standard-width cells while keeping extended legs complete. One uniform scale for the entire sheet matches its final standing recovery height to the installed idle height. Using the median of compressed dash poses would enlarge the standing endpoints; the initial candidate correctly failed handoff scale gates. Urien's initial preparation remained too broad, so its explicit `dashEntry` recipe reuses raw retreat pose 1. The manifest records that extra source checksum and frame override. Existing pose, dash semantic and dedicated entry/recovery handoff thresholds remain unchanged. Updating idle also verifies both installed dash handoffs.

Jump uses source order [1,1,2,2,3,3,4,4]: anticipation, extended launch, tucked apex and landing-ready descent. Landing uses [1,2,2,3,3,4]: contact, deep impact squat, rebound and recovered guard. Both sheets use one common anatomical scale based on landing guard height versus installed idle height. Extended jump phases share the grounded foot root; tucked apex feet lift within the cell. Fighter supplies world height separately. Linear timing aligns the tucked pose with the physical apex and reaches all six landing frames. The existing four characters keep their timing settings. Initial landing candidates had insufficient knee/stance compression and were regenerated; thresholds were not relaxed.

The air pair is checked and installed together with `--kind air`: all twelve strips must pass pose/semantic checks plus idle→jump, jump→landing and landing→idle handoffs before any files are written. Replacing idle verifies its installed air pair as well. Failed first installs remove both new strips, and failed replacements restore both strips and manifest. An incomplete source partner leaves the runtime unchanged. Replacing existing motions preserves manifest record order, including air-pair reinstallation after hit art is added.

Hit reaction uses six new articulated poses in fixed order [1,2,3,3,4,5,6,6], covering impact, building recoil, peak recoil, stagger, settling and recovered guard. One uniform scale matches final guard height to installed idle height. The existing hit semantic gates require real torso/joint recoil, body/foot weight shift, stable volume and neutral recovery. Dedicated idle→hit / hit→idle handoffs are also checked when idle is replaced. Rendering uses the existing negative hit-stun clock and hit stop, without changing combat durations.

The builder extracts whole connected silhouettes with a two-pixel antialias fringe. It does not slice a boot merely because it crosses a nominal grid boundary into a blank gutter. It rejects incomplete/low-resolution poses and silhouettes touching the actual source-sheet edge. Background RGB under zero alpha is irrelevant to the rendered result; previews should be composited on a background.

Existing idle/walk pose variance and semantic thresholds are reused unchanged. Checks include loop closure, body/root stability, foot planting, genuine alternating foot travel, stance variation and idle-to-walk/walk-to-idle continuity. Dudley's initial walk failed the root-travel gate; it was regenerated. Dudley and Makoto were regenerated with more spacing. Source sheets, exact prompts, checksums, selected source order and QA metrics remain available for extending the next motions.

```sh
python scripts/build-roster-motions.py --kind idle
python scripts/build-roster-motions.py --kind walk
python scripts/build-roster-motions.py --kind walk-back
python scripts/build-roster-motions.py --kind dash
python scripts/build-roster-motions.py --kind air
python scripts/build-roster-motions.py --kind hit
python scripts/build-roster-motions.py --kind idle --install
python scripts/build-roster-motions.py --kind walk --install
python scripts/build-roster-motions.py --kind walk-back --install
python scripts/build-roster-motions.py --kind dash --install
python scripts/build-roster-motions.py --kind air --install
python scripts/build-roster-motions.py --kind hit --install
python scripts/build-roster-motions.py --kind idle --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/build-roster-motions.py --kind walk-back --runtime
python scripts/build-roster-motions.py --kind dash --runtime
python scripts/build-roster-motions.py --kind air --runtime
python scripts/build-roster-motions.py --kind hit --runtime
python scripts/verify-roster-ingest.py
npm run build
npm run verify:roster-movement
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. For the six new retreats it also verifies world movement away from facing without turning, all ten frames, loop wrap, direct forward switch and idle return. New dash checks use actual double taps in both world directions and both facings: unchanged eight-tick duration and movement, all reachable forward poses, correct wide output, backward fallback and idle recovery. Isolated ingestion includes new-retreat/dash file removal on failure, replacement rollback for all six installation kinds, six locomotion corrupt-peer directions and both idle/dash corrupt-peer directions, idle/air corruption, both idle/hit corruption directions, new hit-file removal, paired replacement and missing-source rejection. These checks do not substitute for a manual game playthrough. Air checks also advance actual jump input through rise, physical apex, fall, all eight jump frames, all six landing frames and idle return in both facings. Canvas checks require exactly one physical-height translation. Pair source checksums and shared anatomical scale are verified. Preview GIFs are slowed down to show the poses; the air preview uses the actual Fighter trajectory. Hit checks exercise actual ground and air hits, all eight frames and successful-block exclusion in both facings. The hit-clock test covers nine characters, normal/counter stun duration, hit-stop freeze and a repeated hit during recoil. Hit previews show actual hit stop, repeat hits and airborne recoil.

Remaining asset work: authored backward dash, defense, normals and specials for these six characters; Ryu's remaining staged motions including retreat; and remaining normals/defense for Chun-Li and Ibuki. Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.
