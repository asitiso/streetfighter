# Authored roster movement batch

Alex, Dudley, Makoto, Yun, Urien and Gill now each have idle 6F, forward walk 12F, guarded retreat 10F, forward dash 7F, backward dash 7F, jump 8F, landing 6F, hit 8F, guard 5F, parry 6F, standing LP 7F, MP 8F, HP 10F, LK 8F, MK 10F and HK 12F and crouch transition 6F plus crouching LP 7F, MP 8F and HP 10F plus crouching LK 8F, MK 10F and HK 12F: 138 runtime strips and 1146 stored frames (191 per character). The latest backward-dash batch adds six strips and 42 stored frames. All six crouching normal buttons now have dedicated art for these six characters. All six standing normal buttons now have dedicated art for these six characters. Together with the existing Ryu, Ken, Chun-Li and Ibuki strips, all eight playable characters and both bosses have authored idle, forward walking, forward dash, jump and landing. The six new guard/parry sets keep successful defense visually distinct from hit recoil. All ten characters now have authored hit reactions and retreat, including the supplemental Ryu support batch below.

This folder began as the missing-idle batch and also holds its matching locomotion. The built-in image generation tool produced each character's `sheet.png` (four idle key poses), `walk-sheet.png` (eight walking key poses), `retreat-sheet.png` (six backward-step poses), `dash-sheet.png` (six launch/compression/drive/braking/settling/recovery poses) and `dash-back-sheet.png` (six guarded backward-drive poses), and paired `jump-sheet.png` / `landing-sheet.png` (four articulated poses each), plus `hit-sheet.png` (six impact/recoil/stagger/recovery poses), `guard-sheet.png` and `parry-sheet.png` (four articulated defense poses each), and `stand-light-sheet.png` / `stand-heavy-sheet.png` (six or four articulated punch poses according to the recipe), plus `stand-medium-sheet.png` (four dedicated medium-strike poses) and `stand-light-kick-sheet.png` (four dedicated low-kick poses), plus `stand-medium-kick-sheet.png` (four dedicated 5MK poses) and `stand-heavy-kick-sheet.png` (six articulated heavy-kick poses), plus `crouch-sheet.png` (four progressively lowered guard poses) and `crouch-light-sheet.png` (four low-guard/chamber/contact/recovery poses), plus `crouch-medium-sheet.png` (six articulated low medium-attack poses) and `crouch-heavy-sheet.png` (six articulated heavy-attack poses), plus `crouch-light-kick-sheet.png` (six low-kick poses) and `crouch-medium-kick-sheet.png` (six character-specific medium poses), plus `crouch-heavy-kick-sheet.png` (six heavy low-sweep poses). The existing portrait supplies identity/costume, and subsequent motions also reference the generated idle sheet. Exact final prompts are in `prompt.txt`, `walk-prompt.txt`, `retreat-prompt.txt`, `dash-prompt.txt`, `dash-back-prompt.txt`, `jump-prompt.txt`, `landing-prompt.txt`, `hit-prompt.txt`, `guard-prompt.txt`, `parry-prompt.txt`, `stand-light-prompt.txt`, `stand-medium-prompt.txt`, `stand-heavy-prompt.txt`, `stand-light-kick-prompt.txt`, `stand-medium-kick-prompt.txt`, `stand-heavy-kick-prompt.txt` and `crouch-prompt.txt` / `crouch-light-prompt.txt` / `crouch-medium-prompt.txt` / `crouch-heavy-prompt.txt` / `crouch-light-kick-prompt.txt` / `crouch-medium-kick-prompt.txt` / `crouch-heavy-kick-prompt.txt`. These are newly generated assets, not additions to the separate user-approved original HQ master list.

Idle uses an articulated A-B-C-D-C-B breathing cycle, with ordering chosen from the same four poses to minimize frame jumps. Walking preserves an eight-pose alternating gait with deliberate holds at selected phases, and chooses a cyclic start that passes both idle/walk handoffs. Stored frame count includes these holds. Character-specific playback speeds preserve heavy wrestler/boss movement versus quicker boxing/karate/kung-fu movement.

Retreat uses six new guarded backward-step poses with deliberate phase holds over ten stored frames. It is not a reversed copy of the forward strip. The back foot leads while the character continues facing the opponent. Cyclic entry selection preserves phase order and checks both transitions against each active installed idle/walk peer. Every idle/walk/retreat replacement now verifies the installed peer checksum, dimensions and authored/enabled flags, covering all six directed connections. Initial idle bootstrap with no peers remains supported.

Forward dash uses fixed source order [1,2,3,3,4,5,6] without cyclic rotation. The unchanged eight-tick gameplay clock reaches stored frames [0,1,3,4,5,6]; skipped frame 2 duplicates frame 3, so every distinct preparation/drive/braking/recovery pose is reached. Dash art does not change movement speed or duration. These six forward-only records use facing-relative direction metadata, so forward-drive art cannot replace backward travel. Dedicated backward strips now supply that direction for these six characters. Existing four-character dash behavior is unchanged.

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
python scripts/build-roster-motions.py --kind dash-back --install
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
python scripts/build-roster-motions.py --kind crouch-heavy-kick --install
python scripts/build-roster-motions.py --kind crouch-medium-kick --install
python scripts/build-roster-motions.py --kind crouch-heavy-kick --runtime
python scripts/build-roster-motions.py --kind crouch-medium-kick --runtime
python scripts/build-roster-motions.py --kind crouch-light-kick --install
python scripts/build-roster-motions.py --kind crouch-light-kick --runtime
python scripts/build-roster-motions.py --kind crouch-heavy --install
python scripts/build-roster-motions.py --kind crouch-heavy --runtime
python scripts/build-roster-motions.py --kind crouch-medium --install
python scripts/build-roster-motions.py --kind crouch-medium --runtime
python scripts/build-roster-motions.py --kind crouch-light --install
python scripts/build-roster-motions.py --kind crouch-light --runtime
python scripts/build-roster-motions.py --kind crouch --runtime
python scripts/build-roster-motions.py --kind walk --runtime
python scripts/build-roster-motions.py --kind walk-back --runtime
python scripts/build-roster-motions.py --kind dash-back --runtime
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
npm run verify:roster-backward-dash-semantics
npm run verify:roster-movement
npm run verify:roster-crouch
npm run verify:roster-crouch-semantics
npm run verify:roster-standing-attacks
npm run verify:roster-kick-semantics
npm run verify:roster-medium-kick-semantics
npm run verify:roster-heavy-kick-semantics
```

Python requires Pillow, NumPy, SciPy and OpenCV (`python -m pip install pillow numpy scipy opencv-python-headless`). For read-only repository checks, set `POSE_ECC_CACHE_PATH` to a writable cache outside the repository and `PYTHONDONTWRITEBYTECODE=1`. All six characters must pass before installation writes any files. Failed writes restore existing assets/manifests and remove newly created files. Runtime verification also rejects corrupt or disabled installed peers.

The JavaScript check advances actual Fighter input/state for every character and facing, reaches all idle/walk frames, checks loop wrap, movement release, hit-reaction exclusion and Canvas source/output bounds, and advances boss AI idle clocks. For the six new retreats it also verifies world movement away from facing without turning, all ten frames, loop wrap, direct forward switch and idle return. New dash checks use actual double taps in both world directions and both facings: unchanged eight-tick duration and movement, all reachable forward poses, correct wide output, dedicated backward playback and idle recovery. Isolated ingestion includes new-retreat/dash file removal on failure, replacement rollback for all twenty-two installation kinds, six locomotion corrupt-peer directions and both idle/dash corrupt-peer directions, idle/air corruption, both idle/hit, idle/guard/parry and idle/standing-punch corruption directions, new hit/guard/parry file removal, paired replacement and missing-source rejection. These checks do not substitute for a manual game playthrough. Air checks also advance actual jump input through rise, physical apex, fall, all eight jump frames, all six landing frames and idle return in both facings. Canvas checks require exactly one physical-height translation. Pair source checksums and shared anatomical scale are verified. Preview GIFs are slowed down to show the poses; the air preview uses the actual Fighter trajectory. Hit checks exercise actual ground and air hits, all eight frames and successful-block exclusion in both facings. The hit-clock test covers ten characters, normal/counter stun duration, hit-stop freeze and a repeated hit during recoil. Hit previews show actual hit stop, repeat hits and airborne recoil. Defense checks use actual block/parry input for six characters and both facings, 6/12/24-tick block stun, repeated-block restart, hit-stop freeze, normal/red parry, no health loss and return to idle. Short blocks must show absorption; long blocks reach all five guard frames and red parries reach all six parry frames. The defense preview uses those actual state transitions. `verify-roster-standing-attacks.mjs` advances real 5LP/5MP/5HP/5LK/5MK/5HK inputs in both facings for all six characters, checks every stored frame and Canvas crop/output bounds, exact active/contact alignment, hit-stop freeze, unchanged attack duration and idle return. It also verifies the dedicated 2LP mapping and rejects other crouch/air/command/target attacks and specials as standing punches. It runs in standard verification.

Crouching LP uses [1,2,2,3,2,2,4] in 640x448 cells: startup 0–2, contact 3, recovery 4–6. All four source poses remain low. The installed crouch's held frame 5 supplies anatomical height and both-foot anchor, rather than standing idle. Entry and recovery are checked against that same low guard; replacing crouch validates the installed 2LP peer in both directions. Existing standing-light semantic and handoff limits are reused verbatim, with additional stable low-height and planted-foot checks. Makoto's final source uses a crossed-arm chamber and forward shoulder drive; its exact prompt references the installed crouch source and records that articulation revision. Stored frames include holds and chamber reuse.

The visual crouch clock stays at its held low endpoint throughout grounded 2* attacks, including when down is released. Once recovery completes it rises through frames 4–0 before idle. Actual move duration, damage and hitboxes are unchanged. The dedicated 2LP test covers six characters, both facings, held/released input, every stored frame, exact contact, hit-stop freeze, Canvas bounds and air/unsupported-button exclusions. Semantic negatives reject standing contact, static low guard, sliding and floating feet; isolated ingestion additionally rejects corrupt crouch/2LP peers in both directions.

Crouching MP adds six source drawings: low guard, chamber, half extension, contact, half retraction and recovered low guard. Dudley, Makoto, Urien and Gill retain `crouch-medium-edit-reference.png` for their final contact refinements; each final prompt identifies the exact target. Eight stored frames use [1,2,3,4,5,5,6,6], with startup 0–2, active 3 and recovery 4–7. Unlike four-pose LP, preparation and withdrawal have their own intermediate drawings. Exact grounded 2MP mapping follows existing labels: Alex elbow, Dudley straight, Makoto karate thrust, Yun open palm and Urien/Gill medium punches. Gameplay timing and hitboxes stay unchanged.

LP and MP retain existing light-strike numeric limits plus stable low-height/foot checks. For 2MP only, contact reach is measured from guard to actual contact in a fixed shoulder/forearm band (30–62% of the initial low-guard height), excluding head and wide feet. This avoids mistaking the crouch toe line for attack reach; 2LP keeps its prior full-body metric. Head-only advance and whole-body displacement negatives prevent false reach cues. Scale and both-foot anchors reference installed crouch frame 5. Crouch replacement checks all installed crouching-punch peers in both directions; the isolated installer covers 44 corrupt-peer directions. The historical `verify-roster-crouch-light-semantics.py` tests LP, MP and HP (150 stored frames), while `verify-roster-crouch-light.mjs` now exercises LP/MP/HP/LK/MK/HK (330 stored frames); clearer `verify:roster-crouch-attacks` and `verify:roster-crouch-attack-semantics` command aliases reuse those scripts, including standard verification. No parallel test implementation or new dependency is added.

Crouching HP uses six source drawings and ten stored frames [1,1,2,3,4,4,5,5,6,6]: startup 0–3, contact 4–5 and recovery 6–9. Art follows current labels: Alex lariat, Dudley cross, Makoto fierce karate thrust, Yun shoulder, Urien smash and Gill chop. The two stored contact frames deliberately hold the same contact drawing; frame counts include these holds.

HP uses the existing standing-heavy shape, recovery, body-drive, volume and nonrigid-articulation numeric limits. Its fixed shoulder/forearm band uses contact index 5: arm strikes require 38..145px forward tip advance. Yun's compact shoulder uses 7..62px forward band-centroid drive instead, matching a body strike with tucked arms. Batch and installed manifests record strike/shoulder profiles; unknown or mismatched profiles are rejected. Stable low height, two-foot 8px/4px root, source uniform scale and reciprocal crouch handoffs stay enforced. LP/MP metrics remain unchanged. Head-only/standing/static and displaced-foot negatives extend to HP, including its shoulder profile. Alex’s final lariat was regenerated from its crouch-sheet.png reference; Yun and Gill retain exact final edit targets as `crouch-heavy-edit-reference.png`.

Crouching LK adds six dedicated drawings: low guard, knee chamber, half extension, low contact, half retraction and recovered low guard. Source order [1,2,3,4,5,5,6,6] produces eight stored frames, startup 0–2, contact 3 and recovery 4–7. It maps only exact grounded 2LK. Attack duration, hitboxes and physical movement remain unchanged.

Scale references installed held crouch frame 5, while horizontal anchoring uses its rear support sole. Averaging both feet would slide the body when the front leg extends. The manifest records crouch-recovery-height and rear-support. Existing light-kick lower-body/reach/root/volume/articulation gates are reused with a dedicated low contact-foot envelope 0..80px and low body-height ratio .85..1.10; standing-kick defaults are unchanged. The low kick may skim the floor, so it does not require one airborne sole. Static/standing/punch substitutions and sliding/floating rear-support cases are rejected by the dedicated semantic regression.

Crouch replacement validates all six installed crouching-attack peers; isolated ingestion covers 44 corrupt-peer directions. The shared actual-Fighter check now covers LP/MP/HP/LK/MK/HK (330 stored frames), both facings, every frame/contact, held/released down, hit stop, low recovery and reverse-rise. Punch semantic checks retain their separate existing limits; the new low-kick semantic test runs in standard verification.

Crouching MK follows the existing shared MK profiles: Alex KNEE, Dudley SWAY HOOK and four low medium kicks. It reads the same standing-MK profile configuration rather than duplicating per-character data. Six source drawings produce ten stored frames [1,1,2,3,4,4,5,5,6,6], startup 0–3, contact 4–5 and recovery 6–9. Knee/kicks use the rear support sole; the planted hook uses both-foot anchoring. All reference held crouch frame 5 at one anatomical scale. Gameplay timing, damage and physical movement remain unchanged.

Medium foot kicks reuse the low-kick envelope with contact 4 and require 38..160px forward leg reach. Alex uses the existing folded-knee/one-support/articulation gates plus low posture. Dudley uses crouching medium-strike gates at contact 4, both grounded soles and strict support-root checks. The optional contact index in the shared punch helper preserves all older default contact indices. Every profile enforces low-height .85..1.10. Runtime manifests record and validate the existing knee/hook/kick profile, including wrong-profile rejection. Alex retains `crouch-medium-kick-edit-reference.png` for its final knee-drive revision.

The extended input test reaches both medium contact frames and all ten stored frames for every character/facing. Shared crouching input coverage is now 330 stored frames. The shared kick semantic regression covers LK, MK and HK (180 stored frames), with profile-aware wrong-action, standing/static and displaced-root negatives. Source diagnostics caught an initially omitted crouching-MK support-anchor branch; fixed rear-support alignment removed the resulting root drift. A focused isolated runtime test first reproduced accepted mismatched profiles, then passed after profile validation was extended. The isolated ingestion suite retains that rejection case and tests 44 corrupt-peer directions.

Crouching HK completes all six grounded crouching normal buttons for these six characters. Six new low-guard/heavy-windup/half-extension/long-low-contact/half-retraction/recovered drawings produce twelve stored frames [1,1,2,3,3,4,4,5,5,6,6,6]. Startup is0–4, contact5–6 and recovery7–11. All six current 2HK moves are low foot attacks, including Dudley; existing labels, timing, damage, hitboxes and knockdown remain unchanged. The source deliberately adds a larger windup and torso counterbalance rather than borrowing medium-kick contact.

Uniform anatomical scale and rear-support anchoring reference held crouch5. The shared low-kick helper now samples heavy contact5 and retains low-foot0..80px, low-height .85..1.10 and stable support8px/4px. Heavy reach38..190px, distinct contact .22..75 and residual average .014..18/peak .030..24 reuse existing heavy-kick limits; older standing/LK/MK defaults are unchanged. The standard shared input and semantic checks cover all12 frames, both contact frames, hit stop, held/released down, low recovery, air/command exclusions, standing/punch/static substitutions and displaced supports. Crouch replacement validates all six attack peers, and isolated ingestion includes new-file/replacement rollback, source rejection and 44 corrupt-peer directions.

Backward dash now has its own six-pose guarded launch/compression/backward-drive/rear-foot-braking/settling/guard source, rather than reversing or mirroring forward drive. Seven stored frames use [1,2,3,3,4,5,6]. The unchanged8-tick dash clock reaches [0,1,3,4,5,6], including every distinct drawing; the skipped index2 duplicates3. The fighter keeps facing its opponent while world movement travels away. Both world directions and both facings are checked with real double taps, exact speed/duration, hit-stop freeze, attack/jump interruption, Canvas bounds and idle recovery. Supplemental Ryu, Chun-Li, Ibuki and Ken backward dashes are documented below; all ten now have separate directional art.

Backward metadata is required at runtime, forward-only metadata stays forward-only, and disabled/missing backward art preserves prior fallback selection. Uniform scale uses recovered guard versus installed idle; existing dash pose, volume, vertical/horizontal drive, nonrigid-articulation and idle entry/recovery limits remain unchanged. A signed8..100px backward torso-drive gate additionally compares the upper-half center with the midpoint of the lower-leg extent (bottom30% of original guard height). This includes lifted feet; a grounded-only sole band could switch roots during forward drive and misclassify it. Shared limits are unchanged. Negative tests reject all six installed forward dashes, static guards and globally translated guards. Dudley, Makoto and Urien retain their final exact edit targets as `dash-back-edit-reference.png`; their `dash-back-prompt.txt` identifies the targeted refinement. Source/metadata/parent corruption and first-install/replacement rollback are checked; replacing idle validates both backward-dash handoffs.

Remaining asset work: air/command normals and specials for these six characters; Ryu's air/command normals and staged specials; and remaining normals for Ken, Chun-Li and Ibuki . Existing fallback rendering continues for those motions. Prioritize these frequent base transitions before less frequent Super Art polish. This batch does not claim every motion is complete.

## Supplemental Ryu retreat and reactions

Ryu now has newly generated retreat10F, hit8F, guard5F and parry6F, matching the existing crisp cel-shaded Ryu sprite identity and neutral guard. Six-pose retreat/hit sheets and four-pose guard/parry sheets are saved under `ryu/`, alongside their exact built-in imagegen prompts. Original HQ masters and approved source binding remain unchanged. The default six-character batch remains191F per character; Ryu is selected explicitly for retreat, hit, guard, parry and all twelve standing/crouching normals and crouch.

Ryu has193 enabled/full stored frames across23active records, including all twelve standing/crouching normals,6F crouch and7F backward dash. The manifest total217 includes two remaining staged-disabled special strips (24frames) and twenty-five records overall. Shared total accounting now distinguishes disabled, full and bridge records rather than treating every staged frame as enabled. Ryu retains its original approved-source metadata; generated support records carry their own source checksums, order and idle-referenced anatomical scale. Their opaque sole baseline also matches installed idle (433px), avoiding a roughly6rendered-pixel vertical step from the shared atlas baseline; offsets and the baseline reference are recorded. Unsupported Ryu selector kinds are rejected before sources or runtime writes.

All four new sheets pass the same existing retreat/hit/guard/parry semantic, pose and handoff limits. Real-input tests cover retreat direction/loop/idle switching, ground/air and repeated hits, hit-stop freeze, successful-block exclusion,6/12/24tick blocks, normal/red parries and idle return in both facings. Ryu guard uses linear playback, like the six-roster guard, so a short block shows absorption instead of skipping directly to recovery under ease-out/default weights. Gameplay timing, defense windows, damage and movement are unchanged.

The new isolated support-ingest check preserves still-disabled specials, existing support art and approved binding, rejects static sources/corrupt peers/invalid selector kinds, verifies new-file and replacement rollback, missing sources and stable record order. All ten characters now have authored retreat/hit; eight have authored guard/parry (Ken,Ryu and the six-roster batch).

```sh
python scripts/build-roster-motions.py --character RYU --kind walk-back --runtime
python scripts/build-roster-motions.py --character RYU --kind hit --runtime
python scripts/build-roster-motions.py --character RYU --kind guard --runtime
python scripts/build-roster-motions.py --character RYU --kind parry --runtime
npm run verify:ryu-support-ingest
```

## Ryu standing punches

Ryu now has dedicated six-pose jab and heavy rear-straight sheets in `ryu/stand-light-sheet.png` and `ryu/stand-heavy-sheet.png`, with exact built-in imagegen prompts alongside them. LP uses [1,2,3,4,5,5,6] in7stored frames; HP uses [1,1,2,3,4,4,5,5,5,6] in10stored frames. LP startup0–2/contact3/recovery4–6 and HP startup0–3/contact4–5/recovery6–9 align with actual gameplay timing. Wide640x448 cells render320x224 while retaining the same idle-referenced body scale, opaque sole433 and both-foot anchor.

Only exact grounded5LP/5HP select these strips. Ryu kicks/crouch/commands/target variants and physical air keep their own presentation, while prior projectile/rising special mappings remain unchanged. Legacy Ryu punch staging anchor arrays are now zero, preventing the already-planted authored sprite from receiving a second position offset. Actual Canvas translation tests cover that root, both facings, every stored frame, both heavy contact frames, hit-stop freeze, unchanged move duration and idle return.

Existing standing punch quality limits are unchanged. Ryu additionally validates reach at actual contact3 and both4/5 using the same24..105px light and38..145px heavy bounds; otherwise a different frame could supply whole-strip reach while a guard substituted for contact. The extended Ryu ingestion fixture rejects that substitution, static art, corrupt peers/missing sources and invalid selector kinds, and verifies old support art, approved binding, staged specials, partial totals, stable order and first/replacement rollback. Both new source sheets passed without relaxed gates. Cache is v138.

```sh
python scripts/build-roster-motions.py --character RYU --kind stand-light --runtime
python scripts/build-roster-motions.py --character RYU --kind stand-heavy --runtime
npm run verify:roster-standing-attacks
npm run verify:ryu-support-ingest
```


## Ryu medium punch

Built-in imagegen adds six distinct medium-straight drawings in `ryu/stand-medium-sheet.png`; the exact generation/background-extraction prompts are in `ryu/stand-medium-prompt.txt` and the exact edit target is retained as `ryu/stand-medium-edit-target.png`. Background RGB under zero alpha is ignored; runtime contains only the character. The Ryu-only existing recipe uses [1,2,3,4,5,5,6,6],8stored frames with startup0–2/contact3/recovery4–7. Same640x448cells, idle anatomical scale, opaque433sole and planted two-foot anchor. Exact grounded5MP now has its own strip; crouch/kick/command/target/air variants retain their presentation. Gameplay timing is unchanged.

The Ryu selector now accepts eighteen kinds. Its actual contact3 requires the same24..105px reach bounds as light strikes (measured64px). Full installed-record/file preservation, new-file/replacement rollback and static/guard-contact/source/peer negatives include MP. The old variance tool now crops Ryu LP/MP/HP at640px and aligns ECC to the actual mask dimensions, retaining384px Ken/special defaults and original numeric thresholds. Runtime source/handoff checks and real input verify all8frames, both facings, hit stop, contact and idle recovery.

```sh
python scripts/build-roster-motions.py --character RYU --kind stand-medium --install
python scripts/build-roster-motions.py --character RYU --kind stand-medium --runtime
npm run verify:ryu-support-ingest
npm run verify:roster-standing-attacks
```


## Ryu standing kicks

Built-in imagegen adds18independent drawings in `ryu/stand-light-kick-sheet.png`, `ryu/stand-medium-kick-sheet.png` and `ryu/stand-heavy-kick-sheet.png`. Exact prompts are alongside each sheet as `stand-*-kick-prompt.txt`; HK retains its exact original `stand-heavy-kick-edit-target.png` for the contact-angle refinement. Original HQ masters/binding and all previous runtime art are preserved.

Each sheet has six distinct neutral/chamber/half-extension/full-contact/half-withdrawal/recovered drawings. LK stores [1,2,3,4,5,5,6,6] in8frames (contact3/recovery4); MK [1,1,2,3,4,4,5,5,6,6] in10frames (contact4–5/recovery6); HK [1,1,2,3,3,4,4,5,5,6,6,6] in12frames (contact5–6/recovery7). The existing recipe mechanism supplies all three; the default six-character batch is unchanged.

Wide640x448cells render320x224 at the same installed-idle anatomical scale, opaque433sole and rear-support anchor. The striking leg lifts independently, so averaging both feet cannot slide the planted body. Ryu profiles contain zero additional anchor offsets. Exact grounded5LK/5MK/5HK select their own strips; crouch/command/air/target variants retain their presentation. Gameplay damage, timing, movement and hitboxes remain unchanged.

All original kick, mid-kick and heavy-kick semantic/handoff thresholds remain unchanged. LK/MK sources pass first generation; HK contact was refined from insufficient14px advance to48px without lowering the original38..190px bound. Final contact heights are137/195/251px, clearly distinct low/mid/high silhouettes. All three support-root ranges are below1px with zero baseline variation. A Ryu-only actual-contact audit applies the same original reach/height/one-support limits at LK3, MK4/5 and HK5/6. A guard substituted at the second MK contact was reproduced as a false acceptance before this audit; all such contacts now reject guard/punch substitutions, and both HK contacts reject low kicks. Default six-roster semantics are unchanged. Runtime partial-ingest fixtures preserve prior records/files and staged specials while rejecting static/punch/guard contact, displaced support, source/peer corruption and failed writes.

```sh
python scripts/build-roster-motions.py --character RYU --kind stand-light-kick --runtime
python scripts/build-roster-motions.py --character RYU --kind stand-medium-kick --runtime
python scripts/build-roster-motions.py --character RYU --kind stand-heavy-kick --runtime
npm run verify:ryu-support-ingest
npm run verify:roster-standing-attacks
```


## Ryu crouch and low punches

Built-in imagegen adds22independent drawings across `ryu/crouch-sheet.png`, `ryu/crouch-light-sheet.png`, `ryu/crouch-medium-sheet.png` and `ryu/crouch-heavy-sheet.png`. Exact prompts use matching `*-prompt.txt` names. All four first-generation sources passed original framing/pose/semantic/idle-or-crouch handoff gates; no threshold was relaxed. Original17records/art, approved HQ source binding and staged specials are preserved.

Crouch uses four anatomically consistent standing/shallow/half/deep poses in [1,2,2,3,3,4] for6stored frames. Uniform scale references standing idle349px; held low guard is255px(0.731ratio), with real hip/knee folding and planted feet, not a scaled standing copy. Shared input clock enters0–5, holds5, reverses4–0 on release, resumes rapidly toggled input and freezes in hit stop. Jump interrupts; belt down remains depth movement. Crouch decodes with existing movement preload before first down input.

Each low punch has six low-neutral/preparation/half-extension/contact/half-withdrawal/recovered drawings. Ryu LP uses the existing recipe override with [1,2,3,4,5,5,6] in7frames; MP [1,2,3,4,5,5,6,6] in8; HP [1,1,2,3,4,4,5,5,6,6] in10. All use installed held-low frame5 for anatomical scale and two-foot anchor, opaque433sole and wide640x448cells. Baseline provenance explicitly says installed-crouch. Exact grounded2LP/2MP/2HP use the low punch strips;2LK/2MK/2HK now use their own low kick strips. Command/air/target variants retain fallback. Held or released down recovers in low guard before reverse-rise; gameplay timing/damage/hitboxes are unchanged.

A Ryu-only actual-contact audit checks3/3/4–5 using original light/heavy numeric limits. Moving HP contact into startup while putting a guard at actual contact4 reproduced old false acceptance; the new audit rejects it. Existing six-roster semantics remain unchanged. Extended fixture validates all14Ryu kinds, source/peer corruption, static/standing/guard substitutions, low scale, first/replacement rollback and all prior records/files. New crouch reciprocal peer QA is refreshed after low attacks exist, then repeated installation is byte-stable.

Loading correction: the previously reported prefetch number was the declared enabled catalog size, not a measurement of entry requests. CharacterTextureManager first prepares movement; Stage1Scene.enter then eagerly prepares combat. Captured Image.src requests across that sequence total 12,490,276 bytes for Ryu, including the new 523,138-byte backward dash; movement alone is 6,533,514 bytes. The stage-entry animation cap is explicitly raised from 12 MB to 13 MB for this addition. The complete stored catalog is 14,344,356 bytes, including 1,854,080 bytes of unchanged disabled specials excluded from requests. The test captures both phases without clearing cached textures between them. This is Ryu animation traffic, not whole-game startup traffic; image quality and existing eager combat loading are preserved.

```sh
python scripts/build-roster-motions.py --character RYU --kind crouch --runtime
python scripts/build-roster-motions.py --character RYU --kind crouch-light --runtime
python scripts/build-roster-motions.py --character RYU --kind crouch-medium --runtime
python scripts/build-roster-motions.py --character RYU --kind crouch-heavy --runtime
npm run verify:ryu-support-ingest
npm run verify:roster-crouch
npm run verify:roster-crouch-attacks
```


## Ryu crouching kicks: all12ground normal buttons

Built-in imagegen adds18independent drawings in `ryu/crouch-light-kick-sheet.png`, `ryu/crouch-medium-kick-sheet.png` and `ryu/crouch-heavy-kick-sheet.png`, with exact prompts beside them. All three first-generation sheets passed existing pose, semantic and held-crouch handoff gates without relaxed limits. Original21records/art, approved source binding and staged specials remain unchanged.

Each action has neutral/chamber/half-extension/contact/half-withdrawal/recovered drawings. LK stores [1,2,3,4,5,5,6,6] in8frames(contact3); MK [1,1,2,3,4,4,5,5,6,6] in10(contact4–5); HK [1,1,2,3,3,4,4,5,5,6,6,6] in12(contact5–6). Same held-low255px anatomical scale, opaque433sole, rear-support root,640x448cells and zero additional anchor offsets. Exact grounded2LK/2MK/2HK only, preserving air/command/target fallback and original timing/damage/knockdown. Held/released down returns to low guard before rising.

LK uses a toe poke, MK a heel/sole thrust and HK a floor-skimming sweep. Existing reach is76/75/96px and contact-foot height51/55/22px; low posture stays within original limits and all baseline ranges are zero. A guard at second MK contact5 with compensating startup contact art reproduced old false acceptance. The Ryu-only audit now checks every actual contact for original per-kind reach, height, distinctness and leg articulation. Six-roster defaults are unchanged.

The extended fixture covers17Ryu kinds, all previous art/records, first/new-file and replacement rollback, source/connected-peer corruption, static/standing/guard/punch substitutions and shifted/floating support. Production prior21records remain byte-for-structure unchanged; dynamic crouch runtime validation checks all its newly installed peers. Actual input reaches all8/10/12kick frames and contacts in both facings, with hit-stop freeze and low recovery. Ryu now has all6standing and6crouching normal buttons,156→186active frames. Current stage-entry animation requests and the explicitly revised13MB budget are described above.

```sh
python scripts/build-roster-motions.py --character RYU --kind crouch-light-kick --runtime
python scripts/build-roster-motions.py --character RYU --kind crouch-medium-kick --runtime
python scripts/build-roster-motions.py --character RYU --kind crouch-heavy-kick --runtime
npm run verify:ryu-support-ingest
npm run verify:roster-crouch-attacks
```


## Ryu backward dash

Six new built-in imagegen drawings use [1,2,3,3,4,5,6] for7stored frames. Guarded launch, compression, backward drive, rear-foot brake, settling and recovery retain installed-idle349px anatomical scale and opaque433sole in640x448cells. Source `ryu/dash-back-sheet.png`, exact `ryu/dash-back-prompt.txt` and all three `dash-back-*-edit-target.png` inputs are retained. Three targeted edits passed original quality limits: nonrigid residual average0.029445/peak0.041241 and signed backward drive78.483px.

The actual8tick clock reaches [0,1,3,4,5,6], every distinct drawing; skipped2 duplicates3. Fighter owns world travel; both facings preserve opponent-facing direction, exact speed/duration, hit-stop freeze and attack/jump interruption. The forward dash gains an explicit forward tag. A Ryu-only absolute rearward torso check rejects the installed forward runner that incorrectly passed the earlier delta-only semantic gate. All prior24manifest records and installed WebP bytes remain unchanged. Default six-roster limits are unchanged. Movement preparation now includes backward dashes through the existing loader.

Loading correction: the previously reported prefetch number was the declared enabled catalog size, not a measurement of entry requests. CharacterTextureManager first prepares movement; Stage1Scene.enter then eagerly prepares combat. Captured Image.src requests across that sequence total 12,490,276 bytes for Ryu, including the new 523,138-byte backward dash; movement alone is 6,533,514 bytes. The stage-entry animation cap is explicitly raised from 12 MB to 13 MB for this addition. The complete stored catalog is 14,344,356 bytes, including 1,854,080 bytes of unchanged disabled specials excluded from requests. The test captures both phases without clearing cached textures between them. This is Ryu animation traffic, not whole-game startup traffic; image quality and existing eager combat loading are preserved. Cachev138.

```sh
python scripts/build-roster-motions.py --character RYU --kind dash-back --runtime
npm run verify:ryu-support-ingest
npm run verify:roster-movement
```


## Chun-Li backward dash

Six new independently articulated launch/compression/backward-drive/rear-foot-brake/settling/recovered-guard drawings use [1,2,3,3,4,5,6] for7stored frames in640x448cells. The unchanged8tick clock reaches [0,1,3,4,5,6], every distinct drawing. Source `chunli/dash-back-sheet.png`, exact built-in generation/background-extraction prompt `chunli/dash-back-prompt.txt` and exact extraction input `chunli/dash-back-edit-target.png` are retained. Background RGB beneath zero alpha is ignored; only bodies appear at runtime.

Uniform anatomical scale references installed idle337px and opaque sole422px (alpha>=32). Foot baseline is aligned with installed guard; profile adds no offset or foot lock. Original quality/handoff limits pass: residual average0.034339/peak0.063748, signed backward drive64.934px, drive torso offset-67.152px. The Ryu absolute rearward torso check now applies to Chun-Li too, rejecting forward runners in addition to static/translated guards. No thresholds were relaxed.

Exact direction metadata selects backward art while preserving opponent-facing stance, world speed/duration, hit stop and attack/jump interruption; existing forward art gets an explicit forward tag. Guard/parry are now authored (see below); other unfinished actions retain fallback. Total157enabled/full stored frames,16records. All15prior manifest records and installed art remain identical; original source binding and pipeline are retained. CHUNLI selector accepts dash-back only; default six-roster batch and Ryu selector remain unchanged.

New isolated ingest verification covers first-install/replacement rollback, byte-stable reinstall, prior-art/record preservation, invalid selectors, wrong direction, missing source, corrupt idle peer and forward/static/translated semantic substitutes. Movement preparation includes backward dash. Captured movement followed by combat entry requests11275864bytes for Chun-Li (new strip509070bytes), below the existing13MB stage-entry animation cap. This excludes other characters and non-animation game assets. Cachev138.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind dash-back --install
python scripts/build-roster-motions.py --character CHUNLI --kind dash-back --runtime
python scripts/verify-chunli-backdash-ingest.py
node scripts/verify-roster-movement.mjs
```


## Ibuki backward dash

Six newly generated guarded-launch/compression/backward-drive/rear-foot-brake/settling/recovered-guard drawings use [1,2,3,3,4,5,6] in7stored640x448frames. Exact built-in prompt is `ibuki/dash-back-prompt.txt`; actual source is `ibuki/dash-back-sheet.png`. Only the alpha-bearing character appears at runtime; background RGB under zero alpha is ignored. All original quality/idle-handoff limits pass on first generation: residual average0.039942/peak0.059651, signed backwarddrive53.393px and drive torso offset-57.430px.

One anatomical scale references installed idle342px and opaque sole429px(alpha>=32), with zero staging offsets/foot lock. Hair and sashes retain complete silhouettes. Unchanged8tick playback reaches every distinct drawing [0,1,3,4,5,6]; duplicate index2 is intentionally skipped. Fighter supplies world travel. Both facings/world directions preserve exact speed/duration, hit-stop freeze, attack/jump interruption and idle recovery. The existing forward strip gains an explicit forward tag. Ibuki guard/parry are now authored (see below); unfinished attacks retain fallback. Ken also has its own backward strip.

Totals143enabled/full frames and15records. All14prior records/art and original approved source binding/pipeline remain unchanged. IBUKI selector accepts dash-back only; shared Ryu/Chun-Li/default-six behavior is retained. The existing Chun-Li ingest fixture now accepts `--character IBUKI` instead of adding a duplicate test: first-install/replacement rollback, byte-stable reinstall, prior-record/art/binding preservation, invalid selector/wrong runtime direction and forward/static/translated/source/peer negatives run for each character. Both calls are included in standard verification.

Captured movement followed by combat preparation requests7317686bytes for Ibuki, including499778new bytes, below the existing13MB per-character animation entry cap. This is animation traffic for one character, not total game startup traffic. Cachev138.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind dash-back --install
python scripts/build-roster-motions.py --character IBUKI --kind dash-back --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI
node scripts/verify-roster-movement.mjs
```


## Ken backward dash: all ten directional dashes

Six newly generated launch/compression/backward-drive/rear-foot-brake/settling/recovery drawings use [1,2,3,3,4,5,6] in7stored640x448frames. Exact built-in generation/refinement/background-extraction prompts are in `ken/dash-back-prompt.txt`; final source is `ken/dash-back-sheet.png`, with exact pose-edit and alpha-extraction targets alongside. The first source failed duplicate-like recovery/idle handoffs; targeted guarded anticipation and raised recovery fist passed the original unchanged gates. Residual average0.030967/peak0.045055, backwarddrive80.500px and drive torso-76.271px.

Uniform anatomical scale uses installed idle337px and opaque sole419px(alpha>=32), with zero additional profile offsets/foot lock. All6distinct drawings are reached by unchanged8tick playback [0,1,3,4,5,6]. Actual double taps cover both world directions/facings, exact speed/duration, hit-stop freeze, attack/jump interruption and idle return. All ten characters now have distinct forward/backward dash strips and direction metadata.

Ken totals144enabled/full frames and16records; all15prior records/art and original source binding/pipeline remain unchanged. Historical RC39 target137 remains historical; active-total checks include the supplemental7F. Legacy audit loops keep their original supported kinds, while backward dash is validated through the shared source/runtime/negative/rollback pipeline. KEN selector accepts dash-back only; default-six and other supplemental behavior are preserved. The existing fixture accepts `--character KEN` and remains default-compatible for Chun-Li.

Expanding the existing real-input defense test to Ken exposed its short6tick block skipping absorption under ease-out. Ken guard now uses the same linear playback as Ryu and six-roster guards;6/12/24tick and repeated-block/parry tests pass. Guard art, weights, hitboxes, blockstun and parry windows are unchanged.

Captured movement+combat preparation requests10693986bytes for Ken including468476newbytes, below existing13MB per-character animation cap. Not a whole-game startup measure. Cachev138.

```sh
python scripts/build-roster-motions.py --character KEN --kind dash-back --install
python scripts/build-roster-motions.py --character KEN --kind dash-back --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN
node scripts/verify-roster-movement.mjs
```


## Chun-Li guard and parry

Two first-generation4pose sheets add planted shielding/impact absorption and open-palm/forearm deflection. Final sources `chunli/guard-sheet.png` and `chunli/parry-sheet.png` have exact built-in generation prompts beside them. Alpha-zero RGB is ignored; runtime includes only character bodies. Guard stores [2,2,3,3,4] in5frames; parry [1,2,3,3,4,4] in6frames. Guard starts already shielding, so long blockstun does not hold a neutral unprotected pose.

Original pose/action/idle handoff gates pass unchanged on first generation: guard residual average0.021215/peak0.032266 and parry0.031578/0.046698. Uniform anatomical scale references installedidle337px with opaque sole422px(alpha>=32), zero extra profile anchors/foot-lock correction. Boot-root variation is1.51px guard/4.61px parry in source cells. No body-fit shrinking or gameplay root travel is introduced.

Guard uses linear playback to retain absorption in6tick blocks; parry uses existing snap playback. Actual input covers6/12/24tick and repeated blocks, normal/red parries, hit-stop freeze, both facings and idle recovery. Blockstun, parry windows, damage, hitboxes and input are unchanged. All ten characters now have authored guard/parry; Ibuki defense is documented below.

Totals168enabled/full frames,18records; all16previous records/art and original source bindings/pipeline remain unchanged. CHUNLI selector now accepts dash-back/guard/parry; Ken/Ibuki remain dash-back only and Ryu/default-six selectors are unchanged. The existing supplemental ingest fixture gains `--kind guard`/`--kind parry` with default dash-back compatibility, width/count-specific semantic negatives, metadata rejection, missing source/corrupt idle peer and first-install/replacement rollback. It preserves all other installed records/art, including the other defense action.

Movement preparation now includes guard/parry through their existing kind membership. Combined movement+combat requests11827492bytes for Chun-Li (guard232936/parry318692newbytes), under existing13MB animation cap. Not total game startup traffic. Cachev138.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind guard --runtime
python scripts/build-roster-motions.py --character CHUNLI --kind parry --runtime
python scripts/verify-chunli-backdash-ingest.py --kind guard
python scripts/verify-chunli-backdash-ingest.py --kind parry
node scripts/verify-roster-movement.mjs
```


## Ibuki guard and parry: all ten defense sets

Two first-generation4pose sources add planted shielding/absorption and open-hand/forearm deflection. Actual sources `ibuki/guard-sheet.png` and `ibuki/parry-sheet.png` have exact built-in prompts alongside. Guard stores [2,2,3,3,4] in5frames; parry [1,2,3,3,4,4] in6. Guard begins shielding, uses linear playback and retains absorption in short blocks. Parry uses existing snap playback. Damage, defense windows, blockstun, hitboxes and input are unchanged.

Original pose/action/idle-handoff limits pass without relaxation: guard residual average0.027/peak0.036629;parry0.032962/0.041781. Installedidle342px supplies uniform anatomical scale and opaque sole429px(alpha>=32). Existing two-foot anchoring is reused for Ibuki guard/parry only, preventing arms/hair from moving the planted body through whole-silhouette centering. Parry foot-center range improves14.235→0.692px; guard4.018→0.415px. Profiles have zero extra offsets/footLockStrength0, so there is no double correction.

Totals154enabled/full frames,17records. All15prior records/art and source bindings/pipeline remain unchanged. IBUKI selector now accepts dash-back/guard/parry, like Chun-Li; Ken selector remains dash-back only and other selectors are unchanged. The existing supplemental fixture handles both defense characters without a duplicate importer/test. Per-kind source orders/cell widths/counts, runtime metadata, static/translated sources, missing source/corrupt idle, byte-stable reinstallation and first/replacement rollback are checked. A dedicated <1px foot-root regression fails with anchoring removed in an isolated builder copy and passes with the production path.

Actual input covers all ten characters defense, both facings,6/12/24tick/repeated blocks, normal/red parries, hitstop and idle recovery. New four-panel preview uses actual Fighter clocks and shows guard/parry in both facings. All ten now have authored guard/parry as well as distinct forward/backward dashes; remaining normal/air/command/special work is not claimed complete.

Combined movement+combat preparation for Ibuki requests7874926bytes including232722guard+324518parrynewbytes, under existing13MB animation cap. Movement kind membership prepares both strips. This excludes other characters and non-animation game assets. Cachev138.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind guard --runtime
python scripts/build-roster-motions.py --character IBUKI --kind parry --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind guard
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind parry
node scripts/verify-roster-movement.mjs
```


## Ken standing medium punch

Six new built-in source drawings add neutral/preparation/half-extension/contact/half-withdrawal/recovered guard. Source `ken/stand-medium-sheet.png` and exact `ken/stand-medium-prompt.txt` are retained. The first-generation source passed unchanged pose/action/idle-handoff limits. Existing recipe [1,2,3,4,5,5,6,6] supplies8stored640x448frames with startup0–2/contact3/recovery4–7. Installedidle337px/opaque sole419px and two-foot anchor preserve scale and root; zero profile offsets avoid double staging.

Only exact grounded5MP uses the new strip; Ken standingLP/HP and all special mappings remain available, crouch/kick/air/command/target variants keep existing fallback. Damage/input/move duration are unchanged. Both-facing actual-input tests reach all8frames/contact3, freeze inhitstop and return idle. Standing attack verification now covers43strips/393storedframes across8characters,2004Canvasdraws; existingKen36stance/buttonmappingcases remain covered.

Reuse the existing actual-contact audit (same24..105px light/medium reach limits) for KenMP. Actualcontact advances54px, overallreach57px; residual average0.016521/peak0.027594. Guard substituted at actualcontact3 is rejected even with the real punch moved into startup1. Shared supplementalfixture adds Ken stand-medium without duplicating importer/testcode, checks8frame/640cell/order/provenance/runtime mismatch, static/translated/source/peer rejection, byte-stable reinstall and first/replacement rollback.

Totals152enabled/full frames,17records; all16prior records/art and approved source binding/pipeline remain unchanged. HistoricalRC39target137/attack69 are preserved as historical; actual totals include supplementalbackdash7+MP8. KENselector accepts dash-back/stand-medium only. Newstrip507852bytes; combinedKenmovement+combatpreparation11201838bytes, underexisting13MBcap. Movement alone excludes normal attack art. Cachev138.

```sh
python scripts/build-roster-motions.py --character KEN --kind stand-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind stand-medium
node scripts/verify-roster-standing-attacks.mjs
node scripts/verify-ken-normal-mapping.mjs
```


## Ken standing light kick

Six new neutral/knee-chamber/half-extension/full-contact/half-withdrawal/recovered-guard drawings use [1,2,3,4,5,5,6,6] in8stored640x448frames, startup0–2/contact3/recovery4–7. Source `ken/stand-light-kick-sheet.png` and exact built-in prompt `ken/stand-light-kick-prompt.txt` are retained. First-generation pose/action/idle-handoff gates pass unchanged: residual average0.030882/peak0.054430, leg reach57px and contactfootheight146px within originalLKbounds.

One idle337px anatomical scale, opaque419sole and rear-support foot anchoring keep the planted leg stable (source supportcenter range1.261px, baseline0); the leading knee/ankle move independently. Profiles add no anchor/footlock offsets. Exact grounded5LK only, with existingdamage/timing/input and standingpunch/special/air/crouch/command/target behavior preserved. Both-facing input tests reachall8frames/contact3,freezeinhitstop,andrecoveridle. Standing checks cover44strips/401frames across8characters,2030Canvasdraws.

The shared supplementalfixture addsKenLK ratherthan a duplicateimporter/test. Existing actual-contact kickQA rejectsguard/punchsubstitutions atcontact3 and displaced supportroot/baseline. Static/translated, metadata/source/peer rejection, byte-stable reinstall and first/newfile/replacement rollback remain covered.

Totals160enabled/full frames,18records; all17prior records/art and source bindings/pipeline remainunchanged. KENselector accepts dash-back/stand-medium/stand-light-kick only. HistoricalRC39constantsremain; currentattack frame count derives fromenabledmanifestrecords. Newstrip483216bytes;Kencombinedmovement+combatentry11685054underexisting13MBcap, movementaloneexcludesnormalattackart. Cachev138.

```sh
python scripts/build-roster-motions.py --character KEN --kind stand-light-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind stand-light-kick
node scripts/verify-roster-standing-attacks.mjs
node scripts/verify-ken-normal-mapping.mjs
```


## Ken standing medium kick

Six new neutral/knee-chamber/half-extension/contact/half-withdrawal/recovered-guard drawings use [1,1,2,3,4,4,5,5,6,6] in10stored640x448frames,startup0–3/contact4–5/recovery6–9. Source `ken/stand-medium-kick-sheet.png` and exactbuilt-inprompt `ken/stand-medium-kick-prompt.txt` retained. First-generationoriginalpose/action/idle-handoffgatespass unchanged:residualavg.031759/peak.055753,legreach84px/contactfootheight191px versus LK146px. Bothactualcontacts4/5 requirecorrectlegextension/height/onesupportfoot.

Idle337px/opaque419/rearsupportanchor retainsoneanatomicalscale and stableplantedfoot (rootrange.714px/baseline0),zeroadditionalprofileoffsets. Exactgrounded5MKonly;existingdamage/timing/input,punches/LK/specials/air/crouch/command/targetbehaviorunchanged. Actualinputbothfacingsreachesall10/bothcontacts,freezesinhitstopandreturnsidle. Standingchecks45strips/411frames across8characters,2074Canvasdraws;Ken36stance/buttoncasespreserved.

SharedfixtureaddsMKwithoutduplicateimporter/tests. Guard/punchsubstitutionsatboth4/5 anddisplacedsupportroot/baseline reject;wrongruntimeMKprofilehookrejects againstkickrecipe. Static/translated/source/peer/metadata rejection,byte-stablereinstallandfirstnewfile/replacementrollbackremaincovered.

Totals170enabled/full frames,19records;all18priorrecords/art/sourcebindings/pipelineunchanged. KENselectoracceptsdash-back/stand-medium/stand-light-kick/stand-medium-kickonly. Newstrip465624bytes;Kencombinedmovement+combatentry12150678underexisting13MBcap;movementaloneexcludesnormalattackart. Cachev138.

```sh
python scripts/build-roster-motions.py --character KEN --kind stand-medium-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind stand-medium-kick
node scripts/verify-roster-standing-attacks.mjs
node scripts/verify-ken-normal-mapping.mjs
```


## Ken standing heavy kick: all6standingnormals

Sixnewneutral/loadedchamber/half-upwardextension/highcontact/foldedwithdrawal/recoveredguarddrawingsuse [1,1,2,3,3,4,4,5,5,6,6,6] in12stored640x448frames,startup0–4/contact5–6/recovery7–11. Finalsource `ken/stand-heavy-kick-sheet.png`,exactgeneration/refinementprompts `ken/stand-heavy-kick-prompt.txt` andexacteditinput `ken/stand-heavy-kick-edit-target.png` retained. Firstcontactfailedforwardreach30pxbelow38minimum;contactangleeditpassed99pxat245pxheightwithoutrelaxinglimits. Finalresidualavg.034362/peak.068362.

Idle337px/opaque419/rearsupportanchor retainsuniformscale andplantedfoot (center range.598px/baseline0);profileaddsnooffsets. Bothcontact5/6requireoriginalhigh-kickreach/height/onesupportlimits. Guard/punch/lowkicksubstitutionanddisplacedsupportreject. Medium/highgeometryrangesoverlapbydesign;wedonotclaimallmediumposesareinvalidhighposesoraddpeerrequirementssolelytomaketheclassesdisjoint. ActualKenfootheightsLK146/MK191/HK245pxshowdistinctsilhouettes.

Exactgrounded5HKonly;existingdamage/timing/input/special/air/crouch/command/targetbehaviorpreserved. All6Kenstandingbuttonsnowhaveauthoredstrips. ExpandedinputchecksrevealedexistingLP/HPfirstwithdrawalframes4/6wereskippedbyrecoveryStart5/7;fixedregistryto4/6onlywithoriginalassets/profiles/gameplaydurationsunchanged. All8charactersstandingnormalsnow48strips/440frames,2228Canvasdraws,bothfacings/allframes/activecontacts/hitstop/idle;Ken36stance/buttonmappingcasesremaincovered.

Totals182enabled/full frames,20records;all19priorrecords/art/sourcebindings/pipelineunchanged. KENselectoracceptsdash-back/MP/LK/MK/HKonly. Sharedfixturecovers12frame/order/provenance,actualcontact5/6,static/translated/wrongaction/support/runtime/source/peerrejection,byte-stablereinstallandfirst/newfile/replacementrollback. Newstrip492990bytes;Kencombinedmovement+combatentry12643668underexisting13MBcap,movementaloneexcludesnormalart. Cachev138.

```sh
python scripts/build-roster-motions.py --character KEN --kind stand-heavy-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind stand-heavy-kick
node scripts/verify-roster-standing-attacks.mjs
node scripts/verify-ken-normal-mapping.mjs
```


## Chun-Li standing medium palm

Sixnewneutral/preparation/half-extension/palmheel-contact/half-withdrawal/recoverydrawingsmatchtheexisting5MPgame labelPALMSTRIKE. Source `chunli/stand-medium-sheet.png` andexactbuilt-inprompt `chunli/stand-medium-prompt.txt` retained. Order [1,2,3,4,5,5,6,6] supplies8stored640x448frames,startup0–2/contact3/recovery4–7. First-generationoriginalquality/handoffgatespass:residualavg.01425/peak.02492,actualcontactreach34pxwithin24..105bounds.

Installedidle337px/opaque422/twofootanchor retainonescaleandplantedboots (center range.609px);profilesaddzerooffsets. Exactgrounded5MPonly. ExistingLP/HP,air/crouch/kick/command/target/special/SA mappingsandgameplaydamage/timing/inputunchanged. Actualinputbothfacingsreachesall8/contact3,hitstopandrecovery. ExistingLP/HPalsoincluded:ChunLipunch3setallframespass. Standingchecksnow51strips/465framesacross9characters,2348Canvasdraws.

Sharedactual-contactstandingstrikeaudit/recipeandparameterizedfixtureare reused. Guardatcontact3withcompensatingstartuppalmrejects,alongwithstatic/translated/runtime/source/peer errors. Byte-stablereinstallandfirst/newfile/replacementrollbackpreserveallotherrecords/art. CHUNLIselector nowdash-back/guard/parry/stand-medium;otherselectorsunchanged.

Totals176enabled/full frames,19records;all18priorrecords/art/sourcebindings/pipelineunchanged. Newstrip506002bytes;ChunLicombinedmovement+combatentry12333494underexisting13MBcap,movementaloneexcludesnormalattackart. Cachev138.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind stand-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --kind stand-medium
node scripts/verify-roster-standing-attacks.mjs
```

## Chun-Li standing light kick

Six built-in source drawings in `chunli/stand-light-kick-sheet.png`, with exact prompt in `chunli/stand-light-kick-prompt.txt`, show neutral, knee chamber, partial extension, low contact, withdrawal and recovered guard. Order [1,2,3,4,5,5,6,6] supplies eight 640x448 frames: startup0–2, contact3, recovery4–7. Unchanged gates pass first generation: residual average0.025405/peak0.045371, reach56px, contact foot height140px, support center range0.504433px/baseline0. Installed idle337px/opaque422 and rear-support anchoring preserve scale; profile offsets remain zero.

Only grounded5LK selects the new strip. Actual-input/Canvas checks reach every frame in both facings, preserve contact/hitstop and return to idle. Other normal, crouch, air, command, target, special and Super Art behavior remains unchanged. The shared selector, recipe, actual-contact audit and fixture are reused; punch/guard substitution, shifted support, static/translated art, invalid runtime/source/peer metadata reject. Byte-stable reinstall and first/new-file/replacement rollback preserve all19prior records/art/bindings.

Chun-Li now has184enabled/full frames in20records, including standing LP/MP/HP/LK. New strip464850bytes; combined movement+combat entry12798344bytes remains below the existing13MBcap. Movement-only loading excludes it. Cachev139. Standing checks cover52strips/473frames across9characters and2374Canvasdraws.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind stand-light-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --kind stand-light-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Chun-Li standing medium kick

Six new drawings in `chunli/stand-medium-kick-sheet.png` use the built-in image tool with exact saved prompt `chunli/stand-medium-kick-prompt.txt`. Neutral, knee chamber, half extension, waist-height contact, folded withdrawal and recovered guard become10stored640x448frames with order [1,1,2,3,4,4,5,5,6,6]. Startup0–3/contact4–5/recovery6–9. First-generation original pose/action/handoff gates pass: residual average0.025768/peak0.045798, contact reach45px, foot height190.5px (versus LK140px), support center range0.77537px/baseline0.

Installed idle337px/opaque422 and rear-support anchoring retain scale/root; profile offsets remain zero. Only grounded5MK maps to it. Both-facing actual input covers all10frames/both contacts/hitstop/idle recovery. LP/MP/HP/LK, crouch, air, command, target, special and Super Art presentation and gameplay remain unchanged. Shared recipes/selector/fixture/contact audit are reused; wrong guard/punch contacts, displaced supports, static/translated motion, runtime/source/peer errors reject. Reinstallation remains byte-stable with first/new-file/replacement rollback. All20prior records/art/bindings/pipeline are preserved.

Current194enabled/full frames,21records; standing LP/MP/HP/LK/MK authored, HK still fallback. New strip429664bytes raises Chun-Li combined movement+combat entry from12798344 to13228008bytes. Explicitly raise only Chun-Li animation budget13MB→14MB, preserving original art quality and eager loading. Other budgets unchanged; movement-only preparation still excludes normals. Cachev140. Standing checks now53strips/483frames across9characters,2418Canvasdraws.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind stand-medium-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --kind stand-medium-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Chun-Li standing heavy kick: six standing normals complete

Six authored neutral/chamber/half-extension/high-contact/folded-withdrawal/recovered-guard drawings use [1,1,2,3,3,4,4,5,5,6,6,6] in12stored640x448frames: startup0–4/contact5–6/recovery7–11. Final source `chunli/stand-heavy-kick-sheet.png`, exact built-in generation/alpha-cleanup/angle-edit prompts `chunli/stand-heavy-kick-prompt.txt`, and both exact edit targets are retained. First generation had faint background alpha joining two figures; alpha cleanup restored six separate bodies. Initial steep contact failed forward reach(-14px); lowering/forward extension passed62px reach at243px foot height without relaxing numeric gates. Final residual average0.029732/peak0.053148. The final source retains faint alpha-1 haze; existing complete-body extraction removes it and composited runtime previews are clean.

Idle337px/opaque422/rear-support anchoring retains uniform scale and planted foot (center range0.521687px/baseline0); profiles add zero offsets. Both contacts5/6 require high kick reach/height/one support. Guard/punch/low-kick substitutions, shifted roots/baselines, static/translated motion and runtime/source/peer errors reject; medium/high geometry ranges intentionally overlap. Actual Chun-Li foot heightsLK140/MK190.5/HK243px distinguish silhouettes. Exact grounded5HK only; existing gameplay and other mappings unchanged. Both-facing input covers all12frames/both contacts/hitstop/idle; six-button actual-input preview shows the complete set.

All21prior records/art/bindings/pipeline remain unchanged. Chun-Li now206enabled/full frames,22records, all six standing normals. Shared selector/recipe/audit/fixture are reused; byte-stable reinstall and first/new-file/replacement rollback pass. Standing checks54strips/495frames across9characters/2490Canvasdraws. New strip470596bytes; Chun-Li combined movement+combat entry13698604bytes stays below the existing14MB budget, other budgets13MB unchanged. Movement-only preparation excludes normal attacks. Cachev141.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind stand-heavy-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --kind stand-heavy-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Ibuki standing medium palm

Six new neutral/preparation/half-extension/palm-heel contact/half-withdrawal/recovered-guard drawings follow the existing5MP PALM label. Built-in source `ibuki/stand-medium-sheet.png` and exact prompt `ibuki/stand-medium-prompt.txt` are retained. Order [1,2,3,4,5,5,6,6] supplies8stored640x448frames,startup0–2/contact3/recovery4–7. First-generation original pose/action/handoff gates pass: residual average0.019806/peak0.032528, actual contact reach37px within24..105 bounds.

Installed idle342px/opaque429 and two-foot anchoring retain scale/planted stance (center range0.665751px); profile offsets are zero. Exact grounded5MP only. Existing LP/HP, crouch/kicks/air/command/target/special/Super Art mappings and gameplay remain unchanged. Both-facing actual input reaches all8/contact3/hitstop/idle; existing Ibuki LP/HP also receive complete frame coverage. Standing checks now57strips/520frames across10characters,2606Canvasdraws.

Shared recipe/selector/actual-contact standing audit and supplemental fixture are reused. Guard substituted at actual contact with compensating startup palm rejects, as do static/translated/runtime/source/peer errors. Byte-stable reinstall and first/new-file/replacement rollback preserve all17prior records/art/bindings/pipeline. IBUKI selector now accepts dash-back/guard/parry/stand-medium only.

Totals162enabled/full frames,18records. New strip524784bytes raises combined movement+combat entry to8399710bytes, below the unchanged13MB budget. Movement-only preparation excludes it. Other loading budgets unchanged. Cachev142.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind stand-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind stand-medium
node scripts/verify-roster-standing-attacks.mjs
```

## Ibuki standing light kick

Six new neutral/knee-chamber/half-extension/low-contact/half-withdrawal/recovered-guard drawings in `ibuki/stand-light-kick-sheet.png` use the built-in image tool; exact prompt saved in `ibuki/stand-light-kick-prompt.txt`. Order [1,2,3,4,5,5,6,6] supplies8stored640x448frames,startup0–2/contact3/recovery4–7. First-generation original pose/action/handoff gates pass unchanged: residual average0.031133/peak0.049036, contact reach70px, foot height144px, planted support center range0.662555px/baseline0.

Installed idle342px/opaque429 and rear-support anchoring preserve scale/root; profile offsets are zero. Exact grounded5LK only. Existing punches, crouch/otherkicks/air/command/target/special/Super Art mappings and gameplay remain unchanged. Actual input reaches all8/contact3, freezes during hitstop and returns idle in both facings. Standing checks now58strips/528frames across10characters,2632Canvasdraws.

The shared recipe/selector/actual-contact audit/parameterized fixture are reused. Guard/punch substitution at actual contact and shifted support roots/baselines reject, along with static/translated/runtime/source/peer errors. Byte-stable reinstall and first/new-file/replacement rollback preserve all18prior records/art/bindings/pipeline. IBUKI selector now supports dash-back/guard/parry/stand-medium/stand-light-kick only.

Ibuki now170enabled/full frames,19records, standing LP/MP/HP/LK authored. New strip517332bytes raises combined movement+combat entry to8917042bytes, below unchanged13MB budget; movement-only preparation excludes normals. Other budgets unchanged. Cachev143.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind stand-light-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind stand-light-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Ibuki standing medium kick

Six new neutral/knee-chamber/half-extension/waist-height contact/half-withdrawal/recovered-guard drawings use the built-in image tool. Source `ibuki/stand-medium-kick-sheet.png` and exact prompt `ibuki/stand-medium-kick-prompt.txt` retained. Order [1,1,2,3,4,4,5,5,6,6] supplies10stored640x448frames,startup0–3/contact4–5/recovery6–9. Source has faint low-alpha residue (gutter maximum alpha2, corners alpha0); existing extraction removes it and runtime composites are clean. First-generation unchanged pose/action/handoff gates pass: residual average0.039569/peak0.063126, contact reach58px, foot height192px (versus LK144px), support center range0.993948px/baseline0. Both actual contacts require kick geometry and one planted support.

Installed idle342px/opaque429/rear-support anchoring retain one scale/plantedroot; profiles add zero offsets. Exact grounded5MK only. Existing punches/LK,crouch/otherkicks/air/command/target/special/Super Art mappings and gameplay unchanged, including existing target-combo behavior. Both-facing actual input reaches all10frames/both contacts/hitstop/idle. Standing checks now59strips/538frames across10characters,2674Canvasdraws.

Shared recipe/selector/actual-contact audit/parameterized fixture reused. Guard/punch substitution at either contact and shifted support roots/baselines reject, along with static/translated/wrong runtime profile/source/peer errors. Byte-stable reinstall and first/new-file/replacement rollback preserve all19prior records/art/bindings/pipeline. IBUKI selector permits dash-back/guard/parry/stand-medium/stand-light-kick/stand-medium-kick only.

Ibuki now180enabled/full frames,20records, standing LP/MP/HP/LK/MK authored; HK remains fallback. New strip523692bytes raises combined movement+combat entry to9440734bytes below unchanged13MB budget. Movement-only preparation excludes normals, other budgets unchanged. Cachev144.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind stand-medium-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind stand-medium-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Ibuki spinning heavy kick: six standing normals complete

Six new neutral/turned chamber/partial spinning extension/high heel-contact/folded rotational withdrawal/recovered-guard drawings match the existing5HK SPIN KICK label. Source `ibuki/stand-heavy-kick-sheet.png` and exact built-in prompt `ibuki/stand-heavy-kick-prompt.txt` retained. Back shoulder/gi and hip turning distinguish the strike from a front kick; ponytail/sash follow the turn. Order [1,1,2,3,3,4,4,5,5,6,6,6] supplies12stored640x448frames,startup0–4/contact5–6/recovery7–11. First-generation unchanged pose/action/handoff limits pass: residual average0.058158/peak0.101594, reach58px/foot height247px at both contacts, support center range1.064195px/baseline0. Numeric audits validate high-kick geometry/root; source/visual review verifies the rotation cue.

Installed idle342px/opaque429/rear-support anchoring retain scale/root; profile offsets zero. Both actual contacts require high-kick reach/height/one planted support. Guard/punch/low-kick substitution and displaced support roots/baselines reject; medium/high envelopes intentionally overlap. Actual foot heightsLK144/MK192/HK247px distinguish silhouettes. Source gutter alpha max1/corners0; established extraction removes low-alpha residue and runtime composites are clean.

Exact grounded5HK only. Existing gameplay, target-combo and special mappings unchanged. Both-facing actual input reaches all12frames/both contacts/hitstop/idle. Complete six-button input preview includes all frames and final HK recovery. All20prior records/art/bindings/pipeline unchanged. Shared selector/recipe/contact audit/fixture reused with byte-stable reinstall and first/new-file/replacement rollback.

Ibuki now192enabled/full frames,21records, all six standing normals authored. All10characters now have authored six-button standing sets; standing checks60strips/550frames/2744Canvasdraws. New strip514290bytes; combined movement+combat entry9955024bytes stays below existing13MBcap, other budgets unchanged. Movement-only preparation excludes normals. Cachev145.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind stand-heavy-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind stand-heavy-kick
node scripts/verify-roster-standing-attacks.mjs
```

## Ken crouch transition

Four new standing/slightly-lowered/mid-crouch/low-guard drawings in `ken/crouch-sheet.png` use built-in imagegen; exact prompt retained in `ken/crouch-prompt.txt`. Order [1,2,2,3,3,4] gives6stored384x448frames. First-generation original crouch/handoff limits pass: final/standing height ratio0.643917, centroid drop64.170164px, foot center range0.636073px/baseline0, residual average0.040933/peak0.061788. One anatomical scale uses standing source frame1 and installed idle337px/opaque419, with two-foot anchoring/zero profile offsets. Low poses are articulated, not resized to fill cells.

Existing Fighter/mapper crouch clock plays entry, holdsframe5 and reverses4→0 on release. Early release/repress resumes current pose; hitstop freezes the frame. Both-facing actual-input/Canvas checks cover all6frames, long idle/hold, quick toggle, reversal, jump and unchanged belt depth movement. Ken low attacks retain fallback; held/released low attacks recover into low guard before standing, without authored standing flashes. Existing specials and six standing normals unchanged.

All20prior records/art/bindings/pipeline preserved. Shared selector/fixture extended to crouch for KEN only. Source grid/order/standing-reference normalization, reversed-rising/static/translated negatives, runtime/source/peer errors, byte-stable reinstall and first/new-file/replacement rollback pass. No new gameplay/clock implementation or dependencies.

Ken now188enabled/full frames,21records; eight characters have authored crouch transitions, seven have all six low attacks. New strip271446bytes raises combined movement+combat entry to12915114bytes below unchanged13MBcap. Crouch loads with movement before first down input; other budgets unchanged. Cachev146.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch
node scripts/verify-roster-crouch.mjs
node scripts/verify-ken-authored-pipeline.mjs
```

## Ken crouching light punch

Six new low-guard/preparation/half-extension/jab/withdrawal/recovered-low-guard drawings use order [1,2,3,4,5,5,6] in7stored640x448frames,startup0–2/contact3/recovery4–6. Final source `ken/crouch-light-sheet.png`, exact generation/edit/redraw prompts `ken/crouch-light-prompt.txt`, and exact edit/redraw references are retained. Initialdraft residual0.007939/0.014172 and firstedit0.008817/0.014241 failed original motion gates. Wider cells and stronger shoulder/torso/arm articulation passed0.011954/0.023556 with actualcontact85pxreach; no numeric limits relaxed.

Installed crouch frame5 height217px/opaque419 and two-foot anchoring retain low posture/root, center range0.747443px; profile offsets zero. Only grounded2LP selects this strip. Existing input/physics/damage/timing, six standing normals, specials/SA/command/target and five other low attacks remain unchanged. Both-facing actual input covers all7/contact3/hitstop and held/released recovery into lowguard before rising. Low-attack checks now8characters(7complete sets plusKen2LP),392storedframes/3980Canvasdraws.

Shared selector/recipe/Ryu actual-contact crouch audit/supplemental fixture reused. Guard at contact3 with compensating startup jab rejects; static/translated/runtime/source/actualcrouch-peer corruption reject. Fixture now corrupts the low attack's actual crouch normalization peer rather than unrelated idle. Byte-stable reinstall and first/new-file/replacement rollback preserve21prior records/art/bindings/pipeline.

Ken now195enabled/full frames,22records; attack total114 while historicalRC39target69 remains unchanged. Newstrip398630bytes raises combined movement+combat entry12915114→13313744bytes. Explicitly budget14MB for Ken only, preserving original-quality art and eager combat preparation; Chun-Li14MB/Ryu-Ibuki13MBunchanged. Movement-only preparation excludes low attacks. Cachev147.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-light --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-light
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Ken crouching medium punch

Six new lowguard/load/half-extension/compact body-cross/withdrawal/recovered-lowguard drawings use the existing defaultorder [1,2,3,4,5,5,6,6] in8stored640x448frames,startup0–2/contact3/recovery4–7. Final source `ken/crouch-medium-sheet.png`, exact built-in generation/refinement/alpha prompts `ken/crouch-medium-prompt.txt` and four exact edit targets retained. Initial residual0.006276/0.014190 and edits0.008699/0.017472,0.011613/0.020830 failed original motion gates. Stronger upper-body outline/shoulder drive plus alpha cleanup passes0.012566/0.027794, actualcontact upper-band reach82px. No numeric quality limits changed.

Installed crouch frame5 height217px/opaque419 and two-foot anchoring retain low posture/root (center range1.051855px); profiles add zero offsets. Only grounded2MP maps to this strip. Existing2LP, four other low normals, standing normals, specials/SA/command/target and gameplay timing/input/damage unchanged. Both-facing actual input reaches all8/contact3/hitstop, then returns to lowguard before rising when released. Low-attack checks now400storedframes/4056Canvasdraws across8characters(7complete sets plusKenLP/MP).

Shared default medium-punch recipe/selector/Ryu actual-contact audit/supplemental fixture reused. Lowguard at actual contact with compensating startup attack rejects; static/translated/runtime/source/actualcrouch-peer corruption reject. Byte-stable reinstall and first/new-file/replacement rollback preserve all22prior records/art/bindings/pipeline.

Ken now203enabled/full frames,23records,122attackframes; historicalRC39attacktarget69 remains unchanged. Newstrip393462bytes raises combined movement+combat entry13313744→13707206bytes below existing14MBcap. Other budgets/loading behavior unchanged; movement-only preparation excludes low attacks. Cachev148.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-medium
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Ken crouching heavy punch

Six authored lowguard/load/half-extension/heavy body-cross/withdrawal/recovered-lowguard drawings use default order [1,1,2,3,4,4,5,5,6,6] in10stored640x448frames: startup0–3/contact4–5/recovery6–9. Final source `ken/crouch-heavy-sheet.png`, exact built-in generation/edit prompts `ken/crouch-heavy-prompt.txt`, and exact edit target retained. First source residual0.011443/0.025558 failed original heavy motion gates; refined articulation passes0.014944/0.032607 without changing numeric limits. Both actual contacts reach99px in fixed upper band270–339. Low posture remains217px/opaque419 with two-foot anchoring, foot center range0.743667px/baseline0 and zero profile offsets.

Only grounded2HP selects the new strip, completing authored Ken low punches2LP/2MP/2HP. Both-facing actual inputs reach all7/8/10frames, contacts3/3/4–5, hitstop, held lowguard and released recovery before rising. Three low kicks retain fallback. Shared selector/default heavy strike profile/Ryu actual-contact crouch audit/fixture are reused. Each heavy contact independently rejects guard substitution, including compensating startup attack; static/translated/runtime/source/crouch-peer corruption rejects. Byte-stable reinstall and first/new-file/replacement rollback preserve23prior records/art/bindings/pipeline.

Ken now213enabled/full frames,24records,132attackframes; historical RC39target69 remains historical. New421824byte strip raises combined movement+combat entry13707206→14129030bytes, requiring an explicit Ken-only15MBcap (previous14MB). Other budgets and original image quality/eager loading remain unchanged; movement preparation excludes low attacks. Cachev149. Low-attack checks cover410storedframes/4172Canvasdraws across8characters (seven complete sets plusKen low punches).

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-heavy --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-heavy
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Ken crouching light kick

Six new authored lowguard/chamber/half-extension/lowcontact/foldedwithdrawal/recovered-lowguard drawings use defaultorder [1,2,3,4,5,5,6,6] in8stored640x448frames, startup0–2/contact3/recovery4–7. Final source `ken/crouch-light-kick-sheet.png` and exact built-in prompt `ken/crouch-light-kick-prompt.txt` retained; original crouch source bottom-right guard is the reference. Original numeric pose/action/handoff gates pass unchanged on first generation: residualaverage0.013449/peak0.027789, contactlegreach99px/footheight66px, supportcenter range0.783128px/baseline0. Installed crouch217px/opaque419, rear-support anchoring and zero profile offsets retain low posture/root. Clean runtime composite inspected.

Only exact grounded2LK selects this strip. Both-facing actual input covers all8frames/contact3/hitstop and held lowguard/released recovery before rising. Ken low medium/heavy kicks retain fallback; other mappings and gameplay unchanged. Low attacks now418storedframes/4224Canvasdraws across8characters (seven complete sets plusKenLP/MP/HP/LK).

Shared defaultrecipe/selector/Ryu actual-contact low-kick audit/parameterized fixture reused. At contact3 guard/standingpunch/lowpunch/highkick substitutes reject even with validkick placed at startup; displaced supportroot/baseline, static/translated/runtime/source/crouch-peer errors reject. Byte-stable reinstall and first/new-file/replacement rollback preserve all24prior records/art/bindings/pipeline.

Ken now221enabled/full frames,25records,140attackframes; historical RC39target69 remains historical. New359584byte strip raises eagerentry14129030→14488614bytes below unchanged15MBKen cap. Other budgets/loading unchanged; movement preparation excludes low attacks. Cachev150.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-light-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-light-kick
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Ken crouching medium kick

Six new authored lowguard/load/halfextension/lowcontact/foldedwithdrawal/recoveredguard drawings use defaultorder [1,1,2,3,4,4,5,5,6,6] in10stored640x448frames: startup0–3/contact4–5/recovery6–9. Final source `ken/crouch-medium-kick-sheet.png` and exact built-in prompt `ken/crouch-medium-kick-prompt.txt` retained; bottom-right fully lowguard in original crouch source is the reference. Original numeric pose/action/handoff gates pass unchanged on first generation: residualaverage0.016332/peak0.028199, actualcontact legreach87px/footheight78px at both4/5, supportcenter range0.782129px/baseline0. Installed crouch217px/opaque419/rear-support and zero offsets retain low posture/root. Hip rotation/counterlean and loaded chamber differ visually from light kick. Numeric LK/MK envelopes intentionally overlap; no disjoint reach claim. Clean runtime composite inspected.

Only exact grounded2MK selects the new strip. Actual input in both facings covers all10frames/bothcontacts/hitstop and held lowguard/released recovery before rising. Low heavy kick retains fallback; other mappings/gameplay unchanged. Low-attack checks now428storedframes/4316Canvasdraws across8characters (seven complete sets plusKenLP/MP/HP/LK/MK).

Shared defaultrecipe/selector/kickprofile/Ryu both-contact low-kick audit/parameterized fixture reused. Each actual contact independently rejects guard/standingpunch/lowpunch/highkick with validkick at startup. Displaced supportroot/baseline, static/translated/runtimeprofile/source/crouch-peer corruption reject. Byte-stable reinstall and first/new-file/replacement rollback preserve all25prior records/art/bindings/pipeline.

Ken now231enabled/full frames,26records,150attackframes; historicalRC39target69 remains historical. New378340byte strip raises eagerentry14488614→14866954bytes below unchanged15MBcap. Other budgets/loading unchanged; movement preparation excludes low attacks. Cachev151.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-medium-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-medium-kick
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Ken crouching heavy kick and completed low normals

Six new lowguard/load/half-sweep/contact/foldedwithdrawal/recoveredguard source drawings use defaultorder[1,1,2,3,3,4,4,5,5,6,6,6] in12stored640x448frames, startup0–4/contact5–6/recovery7–11. Final source `ken/crouch-heavy-kick-sheet.png`, exact built-in generation/edit/refinement prompts `ken/crouch-heavy-kick-prompt.txt` and two exact edit targets retained. First source residual0.017086/0.028955 failed heavy peak0.030; stronger loaded/recovery rotation passed peak0.031170 but bodycenter range64.907055 exceeded62. Compact contactguard reduced forward body drive. Final original numeric pose/action/handoff gates pass0.018792/0.031642, contactlegreach142px/footheight50px at both5/6, bodycenter range51.543245px, supportcenter range0.844245px/baseline0. No numeric limits relaxed. Installed lowcrouch217px/opaque419/rear-support anchoring and zero offsets retained.

Only exact grounded2HK selects the strip. Ken now has all six authored low normals and all twelve standing/crouching normals. Twelve-panel actual-input preview covers LP/MP/HP/LK/MK/HK in both facings, all55storedlowattackframes, contacts/hitstop/heldlowguard/released recovery before rising; runtime composite inspected. Other mappings/gameplay unchanged. Low-attack checks now eight complete sets/440storedframes/4460Canvasdraws.

Shared defaultrecipe/selector/Ryu both-contact low-kick audit/parameterized fixture reused. Each actualcontact independently rejects guard/standingpunch/lowpunch/highkick even with validkick at startup; displaced supportroot/baseline/static/translated/runtime/source/crouch-peer failures reject. Byte-stable reinstall and first/new-file/replacement rollback preserve all26prior records/art/bindings/pipeline. Numeric low-kick envelopes intentionally overlap.

Ken now243enabled/full frames,27records,162attackframes; historicalRC39target69 remains historical. New415940byte strip raises eagerentry14866954→15282894bytes, requiring explicit Ken-only16MBcap(previous15MB). Other budgets unchanged, original image quality and eager loading retained; movement preparation excludes low attacks. Cachev152.

```sh
python scripts/build-roster-motions.py --character KEN --kind crouch-heavy-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character KEN --kind crouch-heavy-kick
node scripts/verify-roster-crouch-light.mjs
node scripts/verify-ken-normal-mapping.mjs
```

## Chun-Li crouch transition

Four authored uprightguard/quarterbend/half-squat/full-lowguard drawings use existingorder[1,2,2,3,3,4] in6stored384x448frames,linear60fps,holdframe5/reverse4→0. Final source `chunli/crouch-sheet.png` and exact built-in prompt `chunli/crouch-prompt.txt` retained; existing installed idle strip is the identity/style/standing reference. First generation passes original numeric pose/crouch/handoff gates unchanged: residualaverage0.041217/peak0.067137,height ratio0.724036,centroiddrop55.554513px,centerXrange7.641124px,footcenter range0.650363px/baseline0,widthCv0.002499. Installedidle337px/opaque422,twofootanchoring and zerooffsets preserve boot/standing scale. Clean compositedruntime preview inspected.

Generic crouch clock reused without new gameplay/mapper logic. Both-facing actual input covers all6frames,hold/reversal,rapidrelease/repress,hitstop,jump and beltdepthmovement. Existing six crouching attacks retain fallback but recover into lowguard before rising when down is released; test covers held/released2HK. Ibuki remains crouchfallback. Transition checks now9characters/54storedframes/108Canvasdraws; lowattack eightcomplete sets unchanged.

Shared selector/parameterized fixture reused. Reversed rising/static/translated guard, runtime/source/idle-peer errors reject. Reinstall is byte-stable and first/new-file/replacement rollback preserve all22priorrecords/art/bindings/pipeline. Current212enabled/fullframes/23records; new293678byte strip raises entry13698604→13992282bytes under unchanged14MBcap. Crouch loads with movement before first input; combatloading/otherbudgets unchanged. Cachev153.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch
node scripts/verify-roster-crouch.mjs
```

## Chun-Li crouching light punch

Six new lowguard/load/halfjab/contact/withdrawal/recovered-lowguard drawings use sharedrecipe[1,2,3,4,5,5,6] in7stored640x448frames,startup0–2/contact3/recovery4–6. Final source `chunli/crouch-light-sheet.png`, exact built-in generation/edit/refinement prompts `chunli/crouch-light-prompt.txt` and two exact edit targets retained. Initial residual0.011688/0.018980 and firstedit0.013624/0.020118 failed original peak0.022. Stronger contactshoulder/torso drive and oppositearm counterbalance pass0.016027/0.031301, actualcontactreach71px,footcenter range0.648897px. No numeric qualitylimits relaxed. Installedcrouchreference/twofootanchoring/baseline422/zerooffsets preserve lowguard/root. Clean compositedruntime preview inspected.

Only grounded2LP selects this strip. Actualinput in bothfacings reaches all7frames/contact3/hitstop/heldlowguard and released recovery before rising. Otherfive lowattacks retainfallback; standing/special/SA/command/air/target mappings andgameplay unchanged. Lowattackchecks cover9characters(8complete sets plusChun-Li2LP),447storedframes/4504Canvasdraws.

Sharedselector/lightrecipe/Ryu actualcontactcrouchpunch audit/parameterizedfixture reused. Guard at contact3 with validjab at startup rejects; static/translated/runtime/source/actualcrouch-peer errors reject. Byte-stable reinstall and first/new-file/replacement rollback preserve23priorrecords/art/bindings/pipeline. Fouraffectedfixtures(CHUNLI2LP/crouch/5MP,KEN2LP) pass.

Chun-Li now219enabled/fullframes/24records. New471066bytes raises entry13992282→14463348bytes, explicitlybudgetChun-Lionly14→15MB; Ken16MB/Ryu-Ibuki13MBunchanged. Originalquality/eagerloading retained; movementpreparation excludes lowattacks. Cachev154.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-light --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-light
node scripts/verify-roster-crouch-light.mjs
```

## Chun-Li crouching medium punch

Six new lowguard/load/halfextension/mediumbodycross/withdrawal/recoveredguard drawings use existing defaultorder[1,2,3,4,5,5,6,6] in8stored640x448frames,startup0–2/contact3/recovery4–7. Final source `chunli/crouch-medium-sheet.png` and exact built-in prompt `chunli/crouch-medium-prompt.txt` retained; original crouch bottom-right lowguard is the reference. First generation passes original numeric pose/action/handoff gates0.015036/0.028289,actualcontactreach57px in fixedband255–332,footcenter range0.913219px. Installedcrouchreference/twofootanchoring/opaque422/zerooffsets retain posture/root. Mediumcross shoulder/chestrotation differs from quickjab; standingMPpalm unchanged. Clean runtimecomposite inspected.

Only exactgrounded2MP selects this strip. Both-facing actualinput covers all8frames/contact3/hitstop/heldlowguard/released recoverybefore rising. Existing2LP and fourremaininglowattacks/standing/special/SA/command/air/target/gameplay unchanged. Lowattackchecks now9characters(8complete sets plusChun-LiLP/MP),455storedframes/4580Canvasdraws.

Sharedselector/defaultmediumrecipe/Ryu actualcontactlowpunch audit/parameterizedfixture reused. Guard at actualcontact3 with validcross at startup rejects; static/translated/runtime/source/crouch-peer errors reject. Byte-stable reinstall and first/new-file/replacement rollback preserve24priorrecords/art/bindings/pipeline. Fouraffectedfixtures(CHUNLI2MP/2LP/5MP,KEN2MP) pass.

Chun-Li now227enabled/fullframes/25records. New460590bytes raises entry14463348→14923938bytes underunchanged15MBcap; otherbudgets/originalquality/eagerloading unchanged. Movementpreparation excludes lowattacks. Cachev155.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-medium
node scripts/verify-roster-crouch-light.mjs
```

## Chun-Li crouching heavy punch and completed low punches

Six new lowguard/deepload/halfextension/heavybodycross/withdrawal/recoveredguard drawings use defaultorder[1,1,2,3,4,4,5,5,6,6] in10stored640x448frames,startup0–3/contact4–5/recovery6–9. Final source `chunli/crouch-heavy-sheet.png` and exact built-in prompt `chunli/crouch-heavy-prompt.txt` retained; original crouch bottom-right lowguard is reference. First generation passes unchanged original numeric pose/action/handoff gates0.020019/0.040501,actualcontacts4/5reach121px,footcenter range1.022866px. Strikeprofile/installedcrouchreference/twofootanchoring/opaque422/zerooffsets retained. Clean runtimecomposite inspected.

Only exactgrounded2HP selects this strip, completing Chun-Li lowpunch3set. Six-panel actualinput preview coversLP/MP/HP in bothfacings,all7/8/10frames,contacts3/3/4–5,hitstop,heldlowguard/releasedrecoverybefore rising. Existing lowkicks/standing/special/SA/command/air/target/gameplay unchanged. Lowattackchecks9characters(8complete sets plusChun-LiLP/MP/HP),465storedframes/4696Canvasdraws.

Sharedselector/defaultheavystrikeprofile/Ryu bothactualcontactaudit/parameterizedfixture reused. Eachcontact independently rejects guardsubstitute with validcontact atstartup,plusstatic/translated/runtimeprofile/source/crouch-peer errors. Byte-stable reinstall and first/new-file/replacementrollback preserve25priorrecords/art/bindings/pipeline. Fouraffectedfixtures(CHUNLI2HP/2MP/2LP,KEN2HP) pass.

Chun-Li now237enabled/fullframes/26records. New504938bytes raisesentry14923938→15428876bytes,requiring explicitChun-Lionly15→16MBcap;otherbudgets/originalquality/eagerloading unchanged. Movementpreparation excludeslowattacks. Cachev156.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-heavy --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-heavy
node scripts/verify-roster-crouch-light.mjs
```

## Chun-Li crouching light kick

Six new lowguard/chamber/halfextension/lowcontact/foldedwithdrawal/recoveredguard drawings use defaultorder[1,2,3,4,5,5,6,6] in8stored640x448frames,startup0–2/contact3/recovery4–7. Final source `chunli/crouch-light-kick-sheet.png`, exact built-in generation/edit prompts `chunli/crouch-light-kick-prompt.txt` and exact edit target retained. Initial request was output-moderation rejected withoutsavedimage; clarifiedneutraladultcombat prompt generatedsource. Initialsource footheight89px exceeded original80pxmaximum; downward joint rotation fixescontact without changinglimits. Final numeric pose/action/handoff gates0.020108/0.036195,actualcontactreach86px/footheight62px,supportcenter range0.590441px/baseline0 pass. Installedcrouchreference/rear-support/opaque422/zerooffsets retained. Runtimecomposite inspectedclean.

Only exactgrounded2LK selects newstrip. Both-facingactualinput verifiesall8frames/contact3/hitstop/heldlowguard/releasedrecoverybefore rising. Existingthree lowpunches andtworemaininglowkicks/standing/special/SA/command/air/target/gameplay unchanged. Lowattackchecks9characters(8complete sets plusChun-LiLP/MP/HP/LK),473storedframes/4748Canvasdraws.

Sharedselector/defaultrecipe/Ryuactualcontactlowkick audit/parameterizedfixture reused. Guard/standingpunch/lowpunch/highkick atactualcontact reject with validkickatstartup; displaced supportroot/baseline/static/translated/runtime/source/crouch-peer errors reject. Byte-stablereinstall andfirst/new-file/replacementrollback preserve26priorrecords/art/bindings/pipeline. Fouraffectedfixtures(CHUNLI2LK/2HP/5LK,KEN2LK)pass.

Chun-Li now245enabled/fullframes/27records. New415370bytes raisesentry15428876→15844246bytes underunchanged16MBcap;otherbudgets/originalquality/eagerloading unchanged. Movementpreparation excludeslowattacks. Cachev157.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-light-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-light-kick
node scripts/verify-roster-crouch-light.mjs
```

## Chun-Li crouching medium kick

Six new lowguard/loadedchamber/halfextension/mediumlowcontact/foldedwithdrawal/recoveredguard drawings use defaultorder[1,1,2,3,4,4,5,5,6,6] in10stored640x448frames,startup0–3/contact4–5/recovery6–9. Finalsource `chunli/crouch-medium-kick-sheet.png` andexactbuilt-inprompt `chunli/crouch-medium-kick-prompt.txt` retained; originalcrouchbottom-rightlowguardisreference. Firstgeneration passesunchangedoriginalnumericpose/action/handoffgates0.021271/0.039061,bothcontactsreach94px/footheight73px,supportcenter0.950633px/baseline0. Kickprofile/installedcrouchreference/rearsupport/opaque422/zerooffsetsretained. Cleanruntimecompositeinspected.

Onlyexactgrounded2MKselectsnewstrip. Both-facingactualinputcoversall10frames/contacts4–5/hitstop/heldlowguard/releasedrecoverybefore rising. Existinglowpunch3set/2LK/remaining2HKfallback/standing/special/SA/command/air/target/gameplayunchanged. Loadedchamber/counterleanandextensiondistinguishmediumkick; numericlowkickenvelopesintentionallyoverlap. Lowattackchecks9characters(8complete sets plusChun-LiLP/MP/HP/LK/MK),483storedframes/4840Canvasdraws.

Sharedselector/defaultkickprofile/Ryuactualcontactaudit/parameterizedfixture reused. Eachactualcontactindependentlyrejectsguard/standingpunch/lowpunch/highkickwithvalidkickatstartup;displacedroot/baseline/static/translated/runtimeprofile/source/crouch-peererrorsreject. Byte-stablereinstallandfirst/new-file/replacementrollbackpreserve27priorrecords/art/bindings/pipeline.

Chun-Linow255enabled/fullframes/28records. New431110bytesraisesentry15844246→16275356bytes,requiringexplicitChun-Lionly16→17MBcap;otherbudgets/originalquality/eagerloadingunchanged. Movementpreparationexcludeslowattacks. Cachev158.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-medium-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-medium-kick
node scripts/verify-roster-crouch-light.mjs
```

## Chun-Li crouching heavy kick and completed low normals

Six new lowguard/deeprotationalload/halfsweep/fulllowcontact/foldedwithdrawal/recoveredguard drawings use defaultorder[1,1,2,3,3,4,4,5,5,6,6,6] in12stored640x448frames,startup0–4/contact5–6/recovery7–11. Finalsource `chunli/crouch-heavy-kick-sheet.png` andexactbuilt-inprompt `chunli/crouch-heavy-kick-prompt.txt` retained; originalcrouchbottom-rightlowguardisreference. Firstgenerationpassesunchangedoriginalnumericpose/action/handoffgates0.023800/0.047951,bothcontactsreach127px/footheight56px,supportcenter0.465526px/baseline0. Installedcrouchreference/rearsupport/opaque422/zerooffsetsretained. Runtimecompositeinspectedclean.

Onlyexactgrounded2HKselectsnewstrip. Chun-Linowhasall6authoredlownormals/all12standing-crouchingnormals. Twelve-panelactualinputpreviewcoversLP/MP/HP/LK/MK/HKbothfacings/all55storedframes/contacts/hitstop/heldlowguard/releasedrecoverybefore rising. Othermappings/gameplayunchanged. Lowattackchecksnow9completecharacter sets/495storedframes/4984Canvasdraws;Ibuki remainsunfinishedcrouch/lowattacks. CrouchtransitiontestnowexpectsChun-Liauthored2HKconsistentlywithothercomplete sets.

Sharedselector/defaultheavykickrecipe/Ryubothactualcontactaudit/parameterizedfixture reused. Eachactualcontactindependentlyrejectsguard/standingpunch/lowpunch/highkickwithvalidkickatstartup;displacedsupportroot/baseline/static/translated/runtime/source/crouch-peererrorsreject. Byte-stablereinstallandfirst/new-file/replacementrollbackpreserve28priorrecords/art/bindings/pipeline.

Chun-Linow267enabled/fullframes/29records. New479656bytesraisesentry16275356→16755012bytesunderunchanged17MBcap;otherbudgets/originalquality/eagerloadingunchanged. Movementpreparationexcludeslowattacks. Cachev159.

```sh
python scripts/build-roster-motions.py --character CHUNLI --kind crouch-heavy-kick --runtime
python scripts/verify-chunli-backdash-ingest.py --character CHUNLI --kind crouch-heavy-kick
node scripts/verify-roster-crouch-light.mjs
```

## Ibuki crouch transition

Four new uprightguard/quarterbend/halfsquat/fulllowguard drawings use defaultorder[1,2,2,3,3,4] in6stored384x448frames,linear60fps/hold5/reverse4→0. Finalsource `ibuki/crouch-sheet.png` andexactbuilt-inprompt `ibuki/crouch-prompt.txt` retained;firstinstalledidleposeisstanding/style/anatomyreference. Firstgenerationpassesunchangedoriginalnumericpose/crouch/handoffgates0.054537/0.120543,height ratio0.733918/centroiddrop52.553012px,horizontalcenter3.669997px,footcenter1.232575px/baseline0/widthCv0. Installedidle342px/opaque429/twofoot/zerooffsetsretainstanding/foot/hairscale. Cleanruntimecompositeinspected.

Genericcrouchclockreusedwithoutnewgameplay/mapperlogic. Both-facingactualinputcoversall6frames/hold/reversal/quickrelease-repress/hitstop/jump/beltdepthmovement. Existing6lowattacksretainfallbackbutrecoverlowbeforerising;held/released2HKrecoverychecked. All10charactersnowhaveauthoredcrouchtransitions:60storedframes/120Canvasdraws. Ninecomplete lowattacksetsunchanged.

Sharedselector/parameterizedfixture reused. Reversedrising/static/translatedart,runtime/source/idle-peererrorsreject. Byte-stablereinstallandfirst/new-file/replacementrollbackpreserve21priorrecords/art/bindings/pipeline. Current198enabled/fullframes/22records;new310460bytesraisesentry9955024→10265484underunchanged13MBcap. Crouchprepareswithmovementbeforefirstdowninput;combatloading/otherbudgetsunchanged. Cachev160.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind crouch --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch
node scripts/verify-roster-crouch.mjs
```

## Ibuki crouching light punch

Six authored lowguard/compactpreparatoryguard/halfextension/lowjab/withdrawal/recoveredguard drawings use sharedlightrecipe[1,2,3,4,5,5,6] in7stored640x448frames,startup0–2/contact3/recovery4–6. Finalsource `ibuki/crouch-light-sheet.png`,exactbuilt-ingeneration/editprompts `ibuki/crouch-light-prompt.txt` andthreeexacteditinputs retained. Initialnumericgatespassedbutvisualreviewcaughtarm-roleinconsistency. Repeatedwaist-chambereditsdidnotresolveit;finalcompacttwo-fistpreparatoryguard makesfront/rightarmcontinuouslyguard→halfextension→contact→withdrawal. ReviewerP2resolvedonfinalart. Originalnumericgatesremainunchanged;final0.019233/0.028342,contact3reach65px,footcenter0.695372px. Installedcrouchreference/twofoot/opaque429/zerooffsetsretainposture/root. Compositedruntimepreviewclean.

Onlyexactgrounded2LPselectsnewstrip. Both-facingactualinputall7frames/contact3/hitstop/heldlowguard/releasedrecoveryverified. Otherfive lownormals/standing/special/SA/command/air/target/gameplayunchanged. Lowattackchecks10characters(9complete sets plusIbuki2LP),502storedframes/5028Canvasdraws.

Sharedrecipe/selector/Ryuactualcontactcrouchpunch audit/parameterizedfixture reused. Guardatactualcontactwithvalidjabatstartup,static/translated/runtime/source/crouch-peererrorsreject. Byte-stablereinstallandfirst/new-file/replacementrollbackpreserve22priorrecords/art/bindings/pipeline.

Ibukinow205enabled/fullframes/23records. New497894bytesraisesentry10265484→10763378underunchanged13MBcap;otherbudgets/originalquality/eagerloadingunchanged. Movementpreparationexcludeslowattacks. Cachev161.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind crouch-light --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-light
node scripts/verify-roster-crouch-light.mjs
```

## Ibuki crouching medium punch

Six authored lowguard/rotatedcompacttwo-fistpreparation/halfextension/mediumcontact/withdrawal/recoveredguard drawings use defaultorder[1,2,3,4,5,5,6,6] in8stored640x448frames,startup0–2/contact3/recovery4–7. Finalsource `ibuki/crouch-medium-sheet.png`,exactbuilt-ingeneration/editprompts `ibuki/crouch-medium-prompt.txt` andexacteditinput retained;Ibuki2LPsheetisguard/anatomy/armcontinuityreference. Firstsourcepassed0.016068/0.025412;strongershoulderrotationandforwarddrive refinesmediumactionwithoutarmroleswap. Finalunchangedoriginalnumericpose/action/handoffgates0.016896/0.028735,contact3reach77pxinfixedband256–337,footcenter1.290645pxpass. Installedcrouchreference/twofoot/opaque429/zerooffsetsretained. Compositedruntimepreviewclean.

Onlyexactgrounded2MPselectsnewstrip. Compacttwo-fistguardkeepsfront/rightarmconsistentthroughhalfextension/contact/withdrawal. Both-facingactualinputall8frames/contact3/hitstop/heldlowguard/releasedrecoveryverified. Existing2LP/fourremaininglowattacks/standingMPpalm/special/SA/command/air/target/gameplayunchanged. Lowattackchecks10characters(9complete sets plusIbukiLP/MP),510storedframes/5100Canvasdraws.

Sharedselector/defaultmediumrecipe/Ryuactualcontactaudit/parameterizedfixture reused. Guardatactualcontactwithvalidcrossatstartup,static/translated/runtime/source/crouch-peererrorsreject. Byte-stablereinstallandfirst/new-file/replacementrollbackpreserve23priorrecords/art/bindings/pipeline.

Ibukinow213enabled/fullframes/24records. New529638bytesraisesentry10763378→11293016underunchanged13MBcap;otherbudgets/originalquality/eagerloadingunchanged. Movementpreparationexcludeslowattacks. Cachev162.

```sh
python scripts/build-roster-motions.py --character IBUKI --kind crouch-medium --runtime
python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-medium
node scripts/verify-roster-crouch-light.mjs
```

## Ibuki crouching heavy punch (2026-11-09)

Built-in imagegen final source: ibuki/crouch-heavy-sheet.png; exact generation and three refinement prompts: ibuki/crouch-heavy-prompt.txt. Original edit targets saved alongside as crouch-heavy-edit-target.png, crouch-heavy-edit2-target.png and crouch-heavy-edit3-target.png. References: existing medium-punch sheet, then bottom-right low guard in crouch-sheet.png. First source failed clean extraction; second failed heavy contact distinction and guard scale; third passed attack semantics but failed guard scale. Final redraw restores the installed low guard's slimmer anatomy and high ponytail arc without lowering any numeric gate.

Six original poses become ten640x448 stored frames [1,1,2,3,4,4,5,5,6,6], startup0–3/contact4–5/recovery6–9, snap28, zero offsets, two-foot lock. Front/right punching arm continues through two-high-fist load, halfextension, fullcontact and withdrawal; rear arm guards. Affine residual average.01655/peak.04043, contact4/5 reach57px in fixed upper band257–336, foot-center range.645672px. Both guard handoffs pass unchanged limits. Ibuki223active/fullframes,25records; new strip482834bytes, entry11775850under unchanged13MB. All24prior records and WebPbytes preserved. Cache163.

Commands: python scripts/build-roster-motions.py --character IBUKI --kind crouch-heavy [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-heavy.

Verification: four affected ingest fixtures and clean TypeScript/build/release443files hashDA955B18DE102A33 plus twelve focused checks pass. Both-facing input preview covers all10frames/contact4/5/hitstop/held/released recovery;520stored lowattackframes/5212Canvasdraws. Independent readonly review found no actionable P1/P2 and confirmed all24priorrecords/art. Known PWA v025/v028/v063 remain failing; broad suite not rerun.
