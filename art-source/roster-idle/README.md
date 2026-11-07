# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have idle 6F, forward walk 12F, guarded retreat 10F, forward dash 7F, jump 8F, landing 6F, hit 8F, guard 5F, parry 6F, standing LP 7F, MP 8F, HP 10F, LK 8F, MK 10F and HK 12F and crouch transition 6F plus crouching LP 7F: 102 runtime strips and 816 stored frames (136 per character). The latest 2LP batch adds six strips and 42 stored frames. All six standing normal buttons now have dedicated art for these six characters. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle, forward walking, forward dash, jump and landing. The six new guard/parry sets keep successful defense visually distinct from hit recoil. Nine characters also have authored hit reactions; Ryu's staged hit strip remains disabled, using fallback rendering. Nine characters have authored retreat; Ryu's retreat remains staged.

This folder began as the missing-idle batch and also holds its matching locomotion. The built-in image generation tool produced each character's `sheet.png` (four idle key poses), `walk-sheet.png` (eight walking key poses), `retreat-sheet.png` (six backward-step poses), `dash-sheet.png` (six launch/compression/drive/braking/settling/recovery poses), and paired `jump-sheet.png` / `landing-sheet.png` (four articulated poses each), plus `hit-sheet.png` (six impact/recoil/stagger/recovery poses), `guard-sheet.png` and `parry-sheet.png` (four articulated defense poses each), and `stand-light-sheet.png` / `stand-heavy-sheet.png` (six or four articulated punch poses according to the recipe), plus `stand-medium-sheet.png` (four dedicated medium-strike poses) and `stand-light-kick-sheet.png` (four dedicated low-kick poses), plus `stand-medium-kick-sheet.png` (four dedicated 5MK poses) and `stand-heavy-kick-sheet.png` (six articulated heavy-kick poses), plus `crouch-sheet.png` (four progressively lowered guard poses) and `crouch-light-sheet.png` (four low-guard/chamber/contact/recovery poses). The existing portrait supplies identity/costume, and subsequent motions also reference the generated idle sheet. Exact final prompts are in `prompt.txt`, `walk-prompt.txt`, `retreat-prompt.txt`, `dash-prompt.txt`, `jump-prompt.txt`, `landing-prompt.txt`, `hit-prompt.txt`, `guard-prompt.txt`, `parry-prompt.txt`, `stand-light-prompt.txt`, `stand-medium-prompt.txt`, `stand-heavy-prompt.txt`, `stand-light-kick-prompt.txt`, `stand-medium-kick-prompt.txt`, `stand-heavy-kick-prompt.txt` and `crouch-prompt.txt` / `crouch-light-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

Retreat uses six new guarded backward-step poses with deliberate phase holds over ten stored frames. It is not a reversed copy of the forward strip. The back foot leads while the character continues facing the opponent. Cyclic entry selection preserves phase order and checks both transitions against each active installed idle/walk peer. Every idle/walk/retreat replacement now verifies the installed peer checksum, dimensions and authored/enabled flags, covering all six directed connections. Initial idle bootstrap with no peers remains supported.

Forward dash uses fixed source order [1,2,3,3,4,5,6] without cyclic rotation. The unchanged eight-tick gameplay clock reaches stored frames [0,1,3,4,5,6]; skipped frame 2 duplicates frame 3, so every distinct preparation/drive/braking/recovery pose is reached. Dash art does not change movement speed or duration. These six forward-only records use facing-relative direction metadata, so backward dashes keep their existing fallback instead of displaying a forward-drive pose. Existing four-character dash behavior is unchanged.

Dash cells are 640x448 and render at 320x224, preserving the same body pixel scale as standard-width cells while keeping extended legs complete. One uniform scale for the entire sheet matches its final standing recovery height to the installed idle height. Using the median of compressed dash poses would enlarge the standing endpoints; the initial candidate correctly failed handoff scale gates. Urien's initial preparation remained too broad, so its explicit `dashEntry` recipe reuses raw retreat pose 1. The manifest records that extra source checksum and frame override. Existing pose, dash semantic and dedicated entry/recovery handoff thresholds remain unchanged. Updating idle also verifies both installed dash handoffs.

Jump uses source order [1,1,2,2,3,3,4,4]: anticipation, extended launch, tucked apex and landing-ready descent. Landing uses [1,2,2,3,3,4]: contact, deep impact squat, rebound and recovered guard. Both sheets use one common anatomical scale based on landing guard height versus installed idle height. Extended jump phases share the grounded foot root; tucked apex feet lift within the cell. Fighter supplies world height separately. Linear timing aligns the tucked pose with the physical apex and reaches all six landing frames. The existing four characters keep their timing settings. Initial landing candidates had insufficient knee/stance compression and were regenerated; thresholds were not relaxed.

The air pair is checked and installed together with `--kind air`: all twelve strips must pass pose/semantic checks plus idle→jump, jump→landing and landing→idle handoffs before any files are written. Replacing idle verifies its installed air pair as well. Failed first installs remove both new strips, and failed replacements restore both strips and manifest. An incomplete source partner leaves the runtime unchanged. Replacing existing motions preserves manifest record order, including air-pair reinstallation after hit art is added.

Hit reaction uses six new articulated poses in fixed order [1,2,3,3,4,5,6,6], covering impact, building recoil, peak recoil, stagger, settling and recovered guard. One uniform scale matches final guard height to installed idle height. The existing hit semantic gates require real torso/joint recoil, body/foot weight shift, stable volume and neutral recovery. Dedicated idle→hit / hit→idle handoffs are also checked when idle is replaced. Rendering uses the existing negative hit-stun clock and hit stop, without changing combat durations.

Guard uses source order [2,2,3,3,4] across five frames: immediate shield, impact absorption and recovered guard. Source pose 1 is the neutral alignment reference, rather than an open stance held during long block stun. Parry uses [1,2,3,3,4,4] across six frames: ready, intercept, deflect and retract. Each sheet has one uniform anatomical scale referenced to recovered guard versus installed idle. Existing guard/parry semantic gates enforce planted feet, stable stance/volume, joint articulation and neutral recovery; dedicated idle entry/exit handoffs are checked in both directions when replacing idle. No defense windows, health, stun or movement rules change.

Alex guard shares its authored parry contact palm pose for the absorption frames. Urien uses its upright parry intercept pose as the palm shield at entry/recovery, surrounding the new guard impact side-bend. Explicit `guardOverrides` recipes record every affected stored frame, source pose and secondary source checksum in the manifest. Both sheets share one anatomical scale; no frame is warped to imitate joint motion. Missing secondary sources are rejected before writes. Other four guards use their dedicated sheet alone.

New guard playback is linear so six-tick block stun starts on the impact pose instead of an already recovered pose. Longer block stun retains the existing initial hold and recovery clock. New parry uses the existing linear snap curve: normal eight-tick parry starts at intercept, red ten-tick parry also reaches the ready frame; both show contact and retraction. Existing character timing is unchanged.

Standing normal art maps exclusively to grounded 5LP, 5MP, 5HP, 5LK, 5MK and 5HK. Crouching attacks, air attacks, command normals, target-combo variants and specials retain their own rendering. The previous generic button-strength mapper would have shown punch strips on those moves once enabled, so the new six-character mapping now requires exact move identity. All these grounded normal sequences reject airborne use; existing special flight mapping is preserved.

Each new punch uses 640x448 cells rendered at 320x224, keeping the same body pixel scale as standard cells. One anatomical scale matches source recovery height to installed idle height. The support-foot center aligns to installed idle inside the wide cell, rather than following the changing silhouette center as the fist extends; metrics record the foot correction. Full extended arms remain complete and the planted stance stays stable. Existing quality limits are unchanged.

Medium strikes have their own dedicated source art: Alex elbow, Dudley straight, Makoto karate thrust, Yun chain palm and Urien/Gill palm strikes. Four-pose source order [1,2,2,3,2,2,4,4] covers guard, chamber, contact, retraction and guard. MP uses the existing light-strike semantic/handoff limits verbatim, with contact at art frame 3; it does not relax existing gates or expand Ken's installer motion set. Its eight frames span startup 0–2, contact 3 and recovery 4–7. Alex/Urien retain `stand-medium-edit-reference.png` as the target used for their final targeted revision; the final prompt records that revision.

Default six-pose LP order is [1,2,3,4,5,5,6], HP [1,1,2,3,4,4,5,5,5,6]. Selected four-pose sheets use explicit `attackRecipes`: LP [1,2,2,3,2,2,4], HP [1,1,2,2,3,3,2,2,4,4], reusing the chambered fist as retraction. This keeps original guard proportions stable where a crowded six-pose sheet introduced scale drift. Source grid and selected order are recorded. Stored frames include deliberate holds. LP art frames 0–2 are startup, 3 contact, 4–6 recovery; HP 0–3 are startup, 4–5 contact, 6–9 recovery. Every stored frame is reached with actual per-character attack timing. Hit stop freezes the current art frame; move duration and damage are unchanged.

Light kick has dedicated four-pose source order [1,2,2,3,2,2,4,4]: guard, knee chamber, low extension, retract chamber and recovered guard. Its eight frames use startup 0–2, contact 3 and recovery 4–7 with actual 5LK timing. Wide cells keep the extended leg complete at one body scale. Unlike a punch, a kick lifts the leading foot: normalization anchors the rear support sole to the matching idle sole, recorded as `footAnchorMode: rear-support`. Averaging both feet would pull the entire body sideways during contact.

Kick quality checks require lower-body articulation, at least 24px additional lower-body reach and an elevated striking foot, while the support sole stays within 8px horizontally and 4px vertically. Body volume, vertical root, neutral recovery and genuine pose residual gates also apply. Existing motion gates remain unchanged; idle entry/exit uses existing light-strike handoff limits. The semantic regression rejects punch substitutions, static guards and deliberately sliding/floating support feet for all six characters. Makoto/Yun retain `stand-light-kick-edit-reference.png` for their targeted low-contact revision. Gill was regenerated from the clean light-punch identity reference after the first alpha connected adjacent poses.

The 5MK button has character-specific art: Alex KNEE, Dudley SWAY HOOK, Makoto STEP KICK, Yun CHAIN KICK and Urien/Gill medium kicks, matching existing move labels. Ten stored frames use source order [1,1,2,2,3,3,2,2,4,4], startup 0–3, contact 4–5 and recovery 6–9. Damage, duration, hit stop and physical movement stay unchanged; Makoto's named step kick has stationary art in this existing stationary move.

Each explicit `attackRecipes` entry records a `semanticProfile` (`knee`, `hook` or `kick`), also recorded and checked in the runtime manifest. Kicks/knee use rear-support anchoring, while Dudley's planted hook uses the established two-foot anchor. The old low-kick gates retain all defaults. The new middle-height kick measures from 40% body height and contact frame 4, preserving volume/root/residual limits and requiring a lifted striking foot plus one grounded support sole. Alex instead drives a folded knee ahead of that root, so his toes need not reach beyond idle toes. Dudley's hook uses existing light-strike limits at contact frame 4 plus both grounded soles and strict rear-root stability. Negative cases reject a kick substituted for the hook, punches substituted for the knee/kicks, static guard and displaced support feet. Yun retains `stand-medium-kick-edit-reference.png` for the final balance revision; its exact prompt is saved beside the final sheet.

Heavy kick uses SIX dedicated source poses: guard, loaded chamber, halfway extension, full high contact, halfway retraction and recovered guard. Source order [1,1,2,3,3,4,4,5,5,5,6,6] produces twelve stored frames, including deliberate holds. Startup spans 0–4, contact 5–6 and recovery 7–11. Exact grounded 5HK mapping preserves existing attack duration, active frames, damage and knockdown. All six original key poses are reachable through actual Fighter input.

The high-kick envelope samples contact 5 from 25% body height, requires 200–300px raised contact-tip height and 38–190px added reach, and permits the larger centroid movement needed for a high raised leg/counterbalance (80px horizontal/65px vertical). It keeps the same strict 8px/4px support limits and neutral-recovery requirement, with heavy-strike body-volume/articulation limits. Both contact frames need one grounded sole. Existing low/medium kick profiles and gates remain unchanged. A single idle-recovery scale and rear-sole anchor keep full extended legs complete in 640px cells. Negative cases reject punches, low kicks, static guards and sliding/floating support feet.

Crouch uses standing guard, initial bend, half crouch and full low guard in source order [1,2,2,3,3,4] across six stored frames. One anatomical scale references source pose 1 (standing) against installed idle height; using the final low pose as scale reference would enlarge the crouched head/body. Both planted feet anchor the silhouette. Quality gates require genuine progressive joint compression, lower body height/centroid, stable feet/stance and body volume; static or uniformly shrunken standing sprites and displaced feet are rejected.

`Fighter.crouchAnimationFrame` is a visual-only input clock: -1 inactive, 0–5 entry into held pose 5. Releasing down decrements it to 0 then -1; early release/repress reverses from the current pose. Hit stop freezes it. It is independent of the shared `stateFrame`, so a long idle cannot skip entry. Duel down crouches; belt down retains depth movement. Grounded crouching attacks retain the held visual clock, while attack mapping has priority, so unfinished crouching attacks keep fallback and returning to held crouch does not flash a standing sprite. Air/locked states interrupt this clock. Existing four characters without crouch assets keep their previous fallback and authored idle on release.

Crouch exit reverses the same strip; both idle handoffs compare the standing endpoint, not the full low hold. Idle replacement validates the installed crouch peer accordingly. Physics, move timing, hitboxes and crouch gameplay eligibility are unchanged.

The builder extracts whole connected silhouettes with a two-pixel antialias fringe. It does not slice a boot merely because it crosses a nominal grid boundary into a blank gutter. It rejects incomplete/low-resolution poses and silhouettes touching the actual source-sheet edge. Background RGB under zero alpha is irrelevant to the rendered result; previews should be composited on a background.

Existing idle/walk pose variance and semantic thresholds are reused unchanged. Checks include loop closure, body/root stability, foot planting, genuine alternating foot travel, stance variation and idle-to-walk/walk-to-idle continuity. Dudley's initial walk failed the root-travel gate; it was regenerated. Dudley and Makoto were regenerated with more spacing. Source sheets, exact prompts, checksums, selected source order and QA metrics remain available for extending the next motions.

```sh
python scripts/build-roster-motions.py --kind idle
python scripts/build-roster-motions.py --kind crouch
python scripts/build-roster-motions.py --kind walk
python scripts/build-roster-motions.py --kind walk-back
python scripts/build-roster-motions.py --kind dash
python scripts/build-roster-motions.py --kind air
python scripts/build-roster-motions.py --kind hit
python scripts/build-roster-motions.py --kind guard
python scripts/build-roster-motions.py --kind parry
python scripts/build-roster-motions.py --kind stand-light
python scripts/build-roster-motions.py --kind stand-medium
python scripts/build-roster-motions.py --kind stand-light-kick
python scripts/build-roster-motions.py --kind stand-medium-kick
python scripts/build-roster-motions.py --kind stand-heavy-kick
python scripts/build-roster-motions.py --kind stand-heavy
python scripts/build-roster-motions.py --kind idle --install
python scripts/build-roster-motions.py --kind crouch --install
python scripts/build-roster-motions.py --kind walk --install
python scripts/build-roster-motions.py --kind walk-back --install
python scripts/build-roster-motions.py --kind dash --install
python scripts/build-roster-motions.py --kind air --install
python scripts/build-roster-motions.py --kind hit --install
python scripts/build-roster-motions.py --kind guard --install
python scripts/build-roster-motions.py --kind parry --install
python scripts/build-roster-motions.py --kind stand-light --install
python scripts/build-roster-motions.py --kind stand-medium --install
python scripts/build-roster-motions.py --kind stand-light-kick --install
python scripts/build-roster-motions.py --kind stand-medium-kick --install
python scripts/build-roster-motions.py --kind stand-heavy-kick --install
python scripts/build-roster-motions.py --kind stand-heavy --install
python scripts/build-roster-motions.py --kind idle --runtime
python scripts/build-roster-motions.py --kind crouch-light --install
python scripts/build-roster-motions.py --kind crouch-light --runtime
python scripts/build-roster-motions.py --kind crouch --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/build-roster-motions.py --kind walk-back --runtime
python scripts/build-roster-motions.py --kind dash --runtime
python scripts/build-roster-motions.py --kind air --runtime
python scripts/build-roster-motions.py --kind hit --runtime
python scripts/build-roster-motions.py --kind guard --runtime
python scripts/build-roster-motions.py --kind parry --runtime
python scripts/build-roster-motions.py --kind stand-light --runtime
python scripts/build-roster-motions.py --kind stand-medium --runtime
python scripts/build-roster-motions.py --kind stand-light-kick --runtime
python scripts/build-roster-motions.py --kind stand-medium-kick --runtime
python scripts/build-roster-motions.py --kind stand-heavy-kick --runtime
python scripts/build-roster-motions.py --kind stand-heavy --runtime
python scripts/verify-roster-ingest.py
npm run build
npm run verify:roster-movement
npm run verify:roster-crouch
npm run verify:roster-crouch-semantics
npm run verify:roster-standing-attacks
npm run verify:roster-kick-semantics
npm run verify:roster-medium-kick-semantics
npm run verify:roster-heavy-kick-semantics
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. For the six new retreats it also verifies world movement away from facing without turning, all ten frames, loop wrap, direct forward switch and idle return. New dash checks use actual double taps in both world directions and both facings: unchanged eight-tick duration and movement, all reachable forward poses, correct wide output, backward fallback and idle recovery. Isolated ingestion includes new-retreat/dash file removal on failure, replacement rollback for all sixteen installation kinds, six locomotion corrupt-peer directions and both idle/dash corrupt-peer directions, idle/air corruption, both idle/hit, idle/guard/parry and idle/standing-punch corruption directions, new hit/guard/parry file removal, paired replacement and missing-source rejection. These checks do not substitute for a manual game playthrough. Air checks also advance actual jump input through rise, physical apex, fall, all eight jump frames, all six landing frames and idle return in both facings. Canvas checks require exactly one physical-height translation. Pair source checksums and shared anatomical scale are verified. Preview GIFs are slowed down to show the poses; the air preview uses the actual Fighter trajectory. Hit checks exercise actual ground and air hits, all eight frames and successful-block exclusion in both facings. The hit-clock test covers nine characters, normal/counter stun duration, hit-stop freeze and a repeated hit during recoil. Hit previews show actual hit stop, repeat hits and airborne recoil. Defense checks use actual block/parry input for six characters and both facings, 6/12/24-tick block stun, repeated-block restart, hit-stop freeze, normal/red parry, no health loss and return to idle. Short blocks must show absorption; long blocks reach all five guard frames and red parries reach all six parry frames. The defense preview uses those actual state transitions. `verify-roster-standing-attacks.mjs` advances real 5LP/5MP/5HP/5LK/5MK/5HK inputs in both facings for all six characters, checks every stored frame and Canvas crop/output bounds, exact active/contact alignment, hit-stop freeze, unchanged attack duration and idle return. It also verifies the dedicated 2LP mapping and rejects other crouch/air/command/target attacks and specials as standing punches. It runs in standard verification.

Crouching LP uses [1,2,2,3,2,2,4] in 640x448 cells: startup 0–2, contact 3, recovery 4–6. All four source poses remain low. The installed crouch's held frame 5 supplies anatomical height and both-foot anchor, rather than standing idle. Entry and recovery are checked against that same low guard; replacing crouch validates the installed 2LP peer in both directions. Existing standing-light semantic and handoff limits are reused verbatim, with additional stable low-height and planted-foot checks. Makoto's final source uses a crossed-arm chamber and forward shoulder drive; its exact prompt references the installed crouch source and records that articulation revision. Stored frames include holds and chamber reuse.

The visual crouch clock stays at its held low endpoint throughout grounded 2* attacks, including when down is released. Once recovery completes it rises through frames 4–0 before idle. Actual move duration, damage and hitboxes are unchanged. The dedicated 2LP test covers six characters, both facings, held/released input, every stored frame, exact contact, hit-stop freeze, Canvas bounds and air/unsupported-button exclusions. Semantic negatives reject standing contact, static low guard, sliding and floating feet; isolated ingestion additionally rejects corrupt crouch/2LP peers in both directions.

Remaining asset work: authored backward dash, remaining normals and specials for these six characters; Ryu's remaining staged motions including retreat; and remaining normals/defense for Chun-Li and Ibuki. Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.
