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

## Ibuki crouching light kick (2026-11-09)

Built-in imagegen first-generation source: ibuki/crouch-light-kick-sheet.png; exact prompt: ibuki/crouch-light-kick-prompt.txt; reference: final crouch-heavy-sheet.png for slender lowguard anatomy/high ponytail. Six original poses: lowguard, front-leg load, halfextension, lowkick contact, withdrawal, recoveredguard. Same front/right leg throughout; rear/left sole planted, hands guard.

Eight640x448 stored frames [1,2,3,4,5,5,6,6],startup0–2/contact3/recovery4–7,snap28,zero staging offsets/rear-support anchor/opaque429. First source passes all original numeric gates: affine residual average.019262/peak.0416,actualcontact3legreach89px/footheight60px,supportcenter range.634281/baseline0,lowheight ratio.980159–1;both guardhandoffs pass. All25priorrecords/art preserved;231active/fullframes26records,new495676bytes,entry12271526below unchanged13MB;client+SWcache164.

Commands: python scripts/build-roster-motions.py --character IBUKI --kind crouch-light-kick [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-light-kick.

Verification: four affected fixtures IBUKI2LK/2HP/5LK andCHUNLI2LK pass, clean TypeScript/build/release444files hash33A44CA4E7665085 plus twelve focused checks pass. Both-facing160tick input preview reaches all8frames/contact3/hitstop/heldlowguard/releasedrise;528stored lowattackframes/5264Canvasdraws. Fresh knownPWA v025/v028/v063 fail same network2vs0/pinCurrentShell/cache065vs164 expectations; full suite not rerun.

Independent readonly review review_ibuki_crouch_light_kick found no actionable P1/P2; confirmed coherent leg continuity, guarded arms, grounded-only mapping and all25previousrecords/WebPbytes unchanged.

## Ibuki crouching medium kick (2026-11-09)

Built-in imagegen source: ibuki/crouch-medium-kick-sheet.png; exact generation/edit prompts: ibuki/crouch-medium-kick-prompt.txt; exact original edit target: ibuki/crouch-medium-kick-edit-target.png. Existing2LK supplies identity/anatomy/style. First generation passed original QA but contact resembled2LK; one targeted edit adds open-hip drive, backward torso counterbalance and residual recovery rotation. Same front/right leg throughout; rear/left sole planted and both arms guard.

Six original poses become ten640x448frames [1,1,2,3,4,4,5,5,6,6],startup0–3/contact4–5/recovery6–9,snap28,zero offsets,rear-support anchor,opaque429. Final unchanged numeric gates pass affine residual average.027523/peak.05948,actualcontacts4/5legreach105px/footheight67px,supportcenter.722301/baseline0,lowheight ratio.976285–1,both guardhandoffs pass. Medium reach105px differs from prior2LK89px with visibly stronger hip/torso rotation. All26priorrecords/art preserved;241active/fullframes27records,new509244bytes,entry12780770below unchanged13MB;client+SWcache165.

Commands: python scripts/build-roster-motions.py --character IBUKI --kind crouch-medium-kick [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-medium-kick.

Verification: fouraffectedfixtures IBUKI2MK/2LK/5MK CHUNLI2MK pass,cleanTypeScript/build/release445files hashCF3FC942B7389368 plus12focusedchecks pass. Bothfacing160tickinputpreview all10frames/contact4/5/hitstop/heldlowguard/releasedrise checked;538stored lowattackframes/5352Canvasdraws. FreshknownPWA v025/v028/v063 same network2vs0/pinCurrentShell/cache065vs165 failures;no fullsuiteclaim.

Independent readonly review review_ibuki_crouch_medium_kick found no actionable P1/P2; confirmed distinct2MKhip/torso motion,legcontinuity/guardedarms/exactgroundmapping and26priorrecords/WebPbytes preserved.

## Ibuki crouching heavy kick / complete normal set (2026-11-09)

Built-in imagegen first-generation source: ibuki/crouch-heavy-kick-sheet.png; exact prompt: ibuki/crouch-heavy-kick-prompt.txt; reference: existing2MKsheet for identity/style. Six poses show lowguard,rotated front-leg load,half-sweep,full low sweep,withdrawal,lowguard. Same front/right leg throughout,rear/left sole fixed and arms guard. Forward torso/shoulder rotation and lower contact distinguish heavy from backward-leaning2MK.

Twelve640x448frames [1,1,2,3,3,4,4,5,5,6,6,6],startup0–4/contact5–6/recovery7–11,snap28,rear-support anchor/zero offsets/opaque429. Firstsource passes all originalnumericgates:residual average.024909/peak.050794,actualcontacts5/6reach125px/footheight57px,supportcenter.811187/baseline0,lowheight.975904–1.012048,guardhandoffs pass. Prior2MKcontactreach105px/footheight67px retains its original drawing. All27priorrecords/art unchanged;253active/fullframes28records,new523636bytes,entry12780770→13304406. Ibuki-only preload budget explicitly13→14MB toretain originalimagequality and eagercombatloading;other characterbudgets unchanged. Client+SWcache166.

Alltencharacters now have authored sixstanding and sixcrouching normals. Exact2HKmapping/lowguard recovery replaces finalIbukilowfallback. Air/command/specials and gameplay retain existing behavior. Commands: python scripts/build-roster-motions.py --character IBUKI --kind crouch-heavy-kick [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character IBUKI --kind crouch-heavy-kick.

Verification: fouraffectedfixtures IBUKI2HK/2MK/5HK CHUNLI2HK pass;cleanTypeScript/build/release446files hash1CE46AC20B9ABA6F plus12focusedchecks pass. Both-facing160tickinputpreview all12frames/contact5/6/hitstop/heldlowguard/releasedrise checked. All10low-normal sets:550storedframes/5492Canvasdraws;standing60strips550frames unchanged. FreshknownPWA v025network2vs0/v028removedpinCurrentShell/v063pinned065vscurrent166 fail;no fullsuiteclaim.

Complete six-button both-facing actual-input preview covers every storedframe/contact/hitstop/heldlowguard/releasedrise. Independent readonly review review_ibuki_crouch_heavy_kick found no actionable P1/P2,confirmed leg/armcontinuity/2MKdistinction and27previousrecords/WebPbytes preserved.

## Ryu pose-authored hadoken promotion (2026-11-09)

Built-in imagegen source ryu/hadoken-sheet.png and exactprompt ryu/hadoken-prompt.txt; reference existing ryu/stand-medium-sheet.png. Six new poses:guard,twohandhipgather,halfpush,bothpalmsrelease,withdrawal,guard. No baked energy orb;existing gameplay owns projectile. Same two hands continuous,feet planted. Firstgeneration passes originalKenhadoken numeric gates and originalHADOKEN_BASE handofflimits,plus actualrelease5/6 audit.

Twelve640x448frames [1,1,2,2,3,4,4,5,5,6,6,6],startup0–4/release5–6/recovery7–11,snap24,installedidle349px/twofoot/opaque433/zerooffsets. Residual.019614/.042919,reachrange59px,releasepastgather27px at5/6,footcenter1.025334px;handoffIoU.695191/.653412. New592340bytes replaces969404-byte disabled384widepilot. Ryu217totalframes/205active-full,25records;24otherrecords/art unchanged,12-frame884676-byteuppercut remainsdisabled. Activeentry12490276→13082616;Ryu-only13→14MBbudget preservesquality/eagerloading. Diskpilotbytesdecrease377064. Cacheclient+SW167.

Exactexisting primary/EX/super/SA1/SA3 bindings retained. Grounded-onlystrip preserves aerialfallback. New test covers realquartercircle/EXinputs,bothfacings,5mappedvariants,realCombatWorldprojectilegeneration atrelease5,Canvascropping/zerooffsets,hitstop,completeprimary12frames/recovery. FasterEX/superstartups sample fewer preparationframes per unchanged gameplay duration. Allstanding/crouching normals and other specials unchanged.

Commands: python scripts/build-roster-motions.py --character RYU --kind hadoken [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character RYU --kind hadoken; node scripts/verify-ryu-hadoken.mjs.

Fresh verification: RYUhadoken fixture,Ryu supportpromotion/variance fixture,Ken specialsemantics andIbuki2HK fixture pass. CleanTypeScript/build/release446files hash2AE6BEA66F46D2F5 and13focusedchecks pass. Actual5variants/bothfacings396Canvasdraws,projectile release5/count/hitstop/airfallback/idle verified. Diagnosticpreview corrected to.88*halfsource art and unscaled worldprojectile coordinates,not a browsercapture. KnownPWA v025network2vs0/v028pinCurrentShell/v063065vs167 remain;fullsuite not rerun. Generated trackedposecache restored.

Independent readonly review review_ryu_hadoken found no actionable P1/P2; independently verified24priorrecords/art and396runtimeCanvasdraws. Corrected diagnostic preview shows palms meet shot upperedge; gameplaycoordinates unchanged.

## Ryu pose-authored Shoryuken promotion (2026-11-09)

Built-in imagegen firstgeneration source ryu/shoryuken-sheet.png and exactprompt ryu/shoryuken-prompt.txt;reference ryu/stand-medium-sheet.png. Eight original poses:guard,compression,front-arm risinglaunch,fulluppercut,tuckedapex,descentwithdrawal,landingcompression,guard. Same front/right fistthroughout,reararmguards,nobakedworldtranslation/effects. Expand raw poses BEFORE originalKen specialnormalization into12frames withsourceOrder[1,2,2,3,3,4,4,5,6,7,7,8]. Metadata sourceGrid2x4. Onlyframes0–2/9–11receiveinstalledidlefootbaseline433/footanchor;air3–8useoriginalcenterednormalization. Fixedanatomicscale via349pxidle,zero stagingoffsets.

Firstsource passes originalSHORYUKENsemantic+handofflimits unchanged:residual.039464/.072685,verticalcentroidrange75.871813/toprise69,contactIoU.496875/.546514/.546514/.557616,guardhandoffIoU.728918/.639239. Anegativefixture initiallyacceptedguardatanactualcontact becauseotherframes suppliedrisingarc;addedoriginal28–145centroidriseenvelope toEACH4–7contact. Actualcontactlifts64.061152/60.630367/60.630367/48.605005;guardnowrejected. Static/translated/source/runtime/idlepeer/reinstall/rollbackfixtures pass.

Twelve640x448storedframes,snap24,phase0–3/contact4–7/recovery8–11,fullart/antiAir+SA2 existingbindings. Initialclockpreviewshowedgroundedrecoveryatflightapex;regressionRED thenRYUonlyrecovery nowholdsframe7whileascending,8whiledescending,and9/10/11byactuallandingclock. Physics/damage/input/timing unchanged. NormalantiAirhasoneattacktickaftertouchdown thenexistinglandingsequence;itandSA2eachsample10frameswhiletogethercoverall12storedframes. Noextramove-memory/statefields added. TestsrealDP/SA2,bothfacings198Canvasdraws,allcontacts,hitstop/land/idle,exactlyonegameplayheighttranslation,airhitinterruption,airrecoverynevergrounded. Diagnosticpreviewuses.88halfsourceart+realworldheight/drift,notbrowsercapture.

24otherRyurecords/artunchangedincludingHadoken. Shoryuken740122bytesreplaces884676disabledpilot;activeentry13082616→13822738belowunchanged14MB,diskdecreases144554. Ryu217total/active/fullframes,25records;allcurrentstoredstripsactive,remainingmobility/air-commandmotionsnotclaimedcomplete. Cacheclient+SW168. Commands: python scripts/build-roster-motions.py --character RYU --kind shoryuken [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character RYU --kind shoryuken; node scripts/verify-ryu-shoryuken.mjs.

Final verification: fourfixturecommands RYUshoryu/RYUhadoken/Ryu-supportpromotion+variance/Ken-specialsemantics pass. FreshcleanTypeScript/build/release446files hashB1A558FB0B8E29DE+14focusedchecks pass. NewREDguard-at-contact and air-groundrecovery regressions nowpass. Independentreadonlyreview foundnoactionableP1/P2,reran198Canvasdraws andverified24otherrecords;own24WebPbytecompareunchanged. FreshknownPWA3failures v025network2vs0/v028pinCurrentShell/v063065vs168 remain;nofullsuiteclaim. Generatedtrackedposecache restored.

## Ryu pose-authored Tatsumaki / stable spin root (2026-11-09)

Built-in imagegen firstgeneration source ryu/tatsumaki-sheet.png and exactprompt ryu/tatsumaki-prompt.txt;reference ryu/stand-medium-sheet.png. Eight original poses:guard,load,frontextension,back-obliquerotation,oppositeextension,returnextension,landing,guard. Same anatomicalkickingleg and two guardedarms;real hip/knee/gi changes,notrotatedcutouts. RawexpandBEFOREoriginalspecialnormalizer into12sourceOrder[1,2,3,3,4,4,5,5,6,7,8,8],grid2x4. OriginalTATSUMAKIsemantic/handofflimits retained;eachactive3–8also requiresexistingturn/extensionlimits and waist-footheight120–225px. Actualwidthdeltas44–107px/footheights184–206px rejectguard/punch/lowkicksubstitutes.

Afinalpixel auditexposed167.42sourcepxofupper-body horizontalshiftfromextended-legbboxcentering. NewREDfixturefailedbeforefix. Tatsu-onlynormalizer alignsframes1–9byopaquehead/shoulderband[0,160] tofirstguardheadX320.511522;groundframes0/10–11retainidlefootanchor/opaque433. Recordedsourceoffsets[0,20,70,70,93,93,-74,-74,60,5,0,0];runtimeprofile remainszero. Finalheadrange.678143px (semantic/runtimegate<=2),originalglobalcentroidX87.840729<100,vertical55.554245,extentwidthrange157,turnIoU.442870/.405217,startend.722467,residual.071879/.106673;originalnumericlimitsnotrelaxed. No clippedfigures. HandoffIoU.814095/.706546.

ExactRYU_MOBILITYonly,full12x640x448/snap24/phase0–2/contact3–8/recovery9–11. ActualQCBforLK/MK/HK,bothfacings192Canvasdraws,every12frame/6contact/hitstop/idle,exactmobilitydistanceandgroundedphysics/jumpHeight0verified. Hoverartusesexistingnormalizer,nogameplayjump/invulnerability/damage/timingchanges. Groundartrejectsairborneuseandpreservesairhitfallback. Hadoken/Shoryuken/normal/command/superbindings retained.

All25priorRyurecords/WebPbytesunchanged. New749320bytes;229total/active/fullframes26records,entry13822738→14572058. Ryu-onlybudgetexplicit14→15MBretainsoriginalquality/eagerloading;otherbudgetsunchanged. Cacheclient+SW169. Varianceauditorregistersactual640-wideTatsu;supportfixturepartial112total/77enabled,final229allactive/26records. Commands: python scripts/build-roster-motions.py --character RYU --kind tatsumaki [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character RYU --kind tatsumaki; node scripts/verify-ryu-tatsumaki.mjs.

Freshverification: fivefixturecommands RYU Tatsu/Shoryu/Hadoken/fullsupportpromotion+variance/Ken-specialsemantics pass. CleanTypeScript/build/release447files hash045BDBAF44B12605+15focusedchecks pass afterrootfix. Independentreview foundnoactionableP1/P2,verified25priorrecords/192draws and independently measured.678143pxrootrange/unclippedart. Own25WebPbytecompare unchanged. PWA3freshlyfailsamev0252vs0/v028pinCurrentShell/v063065vs169;nofullsuiteclaim. Generatedtrackedposecache restored.

## Alex pose-authored Flash Chop / EX (2026-11-09)

Built-in image generation produced six original poses using Alex's existing standing artwork as reference: guard, high near-arm open-hand load, half downward chop, full forward/downward contact, withdrawal and guard. The same near arm continues through the action while the far arm guards and both boots remain planted. Saved final source alex/flash-chop-sheet.png, original edit input alex/flash-chop-edit-target.png and exact generation/edit prompts alex/flash-chop-prompt.txt. The first source failed the unchanged contact distinctness limit (IoU 0.762532 > 0.75); a source-art edit increased shoulder/torso rotation and open-hand reach. No numeric quality threshold was relaxed.

Six source poses expand to twelve 640x448 frames with sourceOrder [1,1,2,3,4,4,5,5,6,6,6,6], startup 0–3, contact 4–5 and recovery 6–11, snap 24. Installed idle height 338px, opaque foot baseline 421 and two-foot anchoring preserve size and position, with zero runtime offsets. Original standing-heavy semantic and guard-handoff limits pass: residual 0.020630/0.047536, contact IoU 0.615434, actual-contact reach 98px on both frames, foot-center range 0.711419px and handoff IoU 0.726483/0.663845. Negative fixtures reject guard substitutes at either actual contact, source/runtime corruption and altered idle peers. First/replacement rollback and byte-stable reinstall pass. The shared importer supports ALEX only for flash-chop and preserves the existing default six-character import.

Exact grounded ALEX_PRIMARY and ALEX_EX_PRIMARY use the full strip. Actual quarter-circle-forward/EX inputs, both facings, all twelve frames, active contacts 4/5, hitstop, recovery, idle and airborne fallback are verified through CombatWorld and 136 Canvas draws. Movement, damage, physics, move timing and other bindings are unchanged. Asset loading tests check both deferred combat loading and movement-only exclusions. Diagnostic PNG/GIF use captured runtime frame selections and draw geometry; they are not browser captures.

All 23 prior Alex records, WebP bytes and top-level source bindings remain unchanged. New strip 637,162 bytes; Alex now has 203 total/active/full stored frames in 24 records. Eager entry 10,437,044 -> 11,074,206 bytes, under a new explicit Alex-only 12MB regression cap; other budgets remain unchanged. Client/service-worker cache 170.

Commands: python scripts/build-roster-motions.py --character ALEX --kind flash-chop [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character ALEX --kind flash-chop; node scripts/verify-alex-flash-chop.mjs.

Fresh verification: clean TypeScript/build/release (448 files, hash 8D1D54A7A626C558) and 16 focused checks pass. Five fixture commands pass: Alex Flash Chop, default six-character roster import, Ryu Tatsumaki, Ken special semantics and Ibuki crouching heavy kick. The three known PWA checks still fail: v025 cached-stage network 2 vs 0, v028 removed pinCurrentShell assertion, v063 pinned cache 065 vs current 170. No full-suite or manual-browser verification claim.

Independent readonly review review_alex_flash_chop found no actionable P1/P2. Reviewer independently reran 136 Flash Chop Canvas draws, 2,744 standing-normal Canvas draws and git diff --check; Python fixtures and release build were verified by the implementer. No interactive browser playtest.

## Alex pose-authored Slash Elbow (2026-11-09)

Built-in imagegen created six new Alex poses using alex/flash-chop-sheet.png as the identity/style/guard reference: guard, rear-loaded coil, elbow lead, full elbow contact, withdrawal and guard. The near fist remains folded toward the chest and the near elbow leads; the far arm guards. Both boots are anchored and gameplay supplies the forward movement. Final source alex/slash-elbow-sheet.png and exact generation/edit prompts alex/slash-elbow-prompt.txt are committed. Original/intermediate edit inputs are preserved as slash-elbow-edit-target.png, slash-elbow-margin-target.png, slash-elbow-reach-target.png and slash-elbow-extended-target.png.

Artwork corrections: the first source reached only 36px vs the unchanged 38px minimum. The first edit touched the canvas edge and was rejected before normalization. Margin and initial reach edits still produced short contacts (33/32px). Inspection showed the elbow stopped over the front toe; the final edit explicitly projected a bent elbow ahead of that toe. No failed candidate was installed and no original numeric quality gate was relaxed. Final contact reach is 89px at both frames. Pose residual 0.019341/0.048138, contact IoU 0.511122, centroid ranges X51.402237/Y8.332793px, foot-center range 0.813010px, guard-handoff IoU 0.641227/0.622456 all pass original heavy-strike and guard-handoff limits.

An additional RED-to-GREEN regression replaces each actual contact with Flash Chop art. Slash Elbow now supplements the original gates with a leading-silhouette edge-height ratio 0.5–0.8 of its neutral body height. Actual edge is 199px (ratio 0.606707), versus the lower chop edge 142px. This is a coarse high-versus-low contact cue; manual source inspection establishes bent-arm anatomy. Original heavy-strike and handoff constants are untouched. Static/translated guard, wrong-contact, corrupt source/runtime/idle-peer, rollback and byte-stable reinstallation fixtures pass.

Twelve 640x448 frames use sourceOrder [1,1,2,3,4,4,5,5,6,6,6,6], startup0–3/contact4–5/recovery6–11, snap24, installed-idle height338/opaque baseline421/two-foot anchor and zero runtime staging offsets. Exact grounded ALEX_MOBILITY only; existing Flash Chop/EX, command, air, throw and Super Art bindings remain intact. Actual QCB LK/MK/HK in both facings verifies all twelve frames, contacts, hitstop, recovery, idle and airborne/hit fallback through 234 Canvas draws. Existing mobility distance, damage, input, duration and physics remain unchanged. Deferred combat loading includes the asset and movement-only loading excludes it.

All 24 prior Alex records, WebP bytes and top-level source bindings compare equal to baseline165697144289bfb93b0d456e5030e8de4c2f020e. New strip681,180bytes; Alex now has215total/active/full stored frames in25records. Eager entry11,074,206 -> 11,755,386bytes remains below the unchanged Alex12MB cap. Other character budgets and default six-character import remain unchanged. Client/service-worker cache171.

Commands: python scripts/build-roster-motions.py --character ALEX --kind slash-elbow [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character ALEX --kind slash-elbow; node scripts/verify-alex-slash-elbow.mjs.

Fresh clean TypeScript/build/release:449files, hash FCF74A95A7629A9A; all17focused checks pass. Six fixture commands pass: Alex Slash Elbow, Alex Flash Chop, default roster, Ryu Tatsumaki, Ken special semantics and Ibuki crouching heavy kick. Runtime-derived diagnostic PNG/GIF show all three inputs/both facings with actual frame selections, .88 runtime art scale and world movement; no browser-capture or manual-playtest claim. Known PWA failures reproduced: v025 cached-stage network2vs0, v028 removed pinCurrentShell assertion, v063 cache065vs171. Full suite not rerun. Generated tracked pose-cache changes restored.

Independent readonly review review_alex_slash_elbow found no concrete P1/P2. Reviewer reran Slash Elbow234Canvasdraws, Flash Chop, roster movement and Slash Elbow ingest fixture; independently compared all24prior records/WebPbytes/sourcebindings and visually inspected bent-elbow anatomy. Build/release and known PWA checks were verified by the implementer. A separate wrong-action diagnostic confirms Flash Chop substitution passes all original heavy/global/per-contact strike gates and is rejected specifically by the additional high-edge cue.

## Dudley pose-authored Ducking Straight (2026-11-09)

Built-in imagegen produced six new source drawings from dudley/stand-medium-sheet.png as identity/style/guard reference: neutral guard, duck-load, half low straight, full low straight, recoil and upright guard. The same near arm now extends and recoils while the far glove guards the cheek. Both shoes stay rooted and gameplay owns forward travel. Final source dudley/ducking-straight-sheet.png and exact generation/edit prompts dudley/ducking-straight-prompt.txt are committed. Original first source and intermediate edit input are saved as ducking-straight-edit-target.png and ducking-straight-finish-target.png.

The first source passed numeric gates, but visual inspection found an anatomical arm switch between preparation and full contact. The first edit corrected the near straight but hid the far glove and left a connected alpha haze; the unchanged connected-body extraction gate rejected it. A targeted second edit restored the visible cheek guard and isolated transparent cutouts. Neither rejected visual candidate was installed. The final same-arm, two-glove sheet passes all original heavy-strike and guard-handoff limits without changing their constants.

Added RED-to-GREEN per-contact duck posture checks: existing standing-heavy art passes all original strike gates and dips its head only17px, so the provisional extra15px minimum was insufficient. The final extra head-drop range is30–75px at both actual contacts; source contacts drop48px, with94px forward reach. Fixture substitutions reject standing-heavy punches and guards at each contact. Original residual0.020492/0.050927, contactIoU0.537221, centroidX12.005321/Y22.385644px, foot-center range1.041336px and guard-handoffIoU0.732921/0.735268 pass unchanged limits. This numeric posture cue supplements manual arm/anatomy inspection.

Six source drawings expand to twelve640x448 frames with sourceOrder[1,1,2,3,4,4,5,5,6,6,6,6], snap24, startup0–3/contact4–5/recovery6–11. Installed-idle anatomical height337px, opaque sole baseline421, two-foot anchor and zero runtime offsets preserve body size and position. Exact grounded DUDLEY_MOBILITY only. Actual QCB LK/MK/HK in both facings verifies all12frames, contacts4/5, unchanged mobility distance, hitstop, recovery, idle and airborne/hit fallback through156Canvas draws. Damage, inputs, duration and physics remain unchanged. Combat loading includes the new strip, movement-only loading excludes it; primary/EX/anti-air/super/command/air bindings retain their prior fallback.

All23prior Dudley records, WebP bytes and top-level source bindings compare equal to local baseline4fca76c12319c6c6a1c8bed6709f61a075c38acf. New strip389,382bytes; Dudley now has203total/active/full stored frames in24records. Eager entry7,462,724 -> 7,852,106bytes fits a new explicit Dudley-only9MB regression cap. Other budgets remain unchanged. Shared helper renamed from Alex-specific to generic; both Alex special fixtures confirm identical prior behavior and metadata. Default six-character import remains unchanged. Client/service-worker cache172.

Commands: python scripts/build-roster-motions.py --character DUDLEY --kind ducking-straight [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character DUDLEY --kind ducking-straight; node scripts/verify-dudley-ducking-straight.mjs.

Fresh verification: clean TypeScript/build/release450files hash4C40571DF93F225D and18focused checks pass. Five fixture commands pass: Dudley Ducking Straight, default six-character roster import, Alex Slash Elbow, Alex Flash Chop and Ken special semantics. Source/runtime/idle-peer corruption, static/translated guard and wrong-contact negatives, atomic first/replacement rollback, prior preservation and byte-stable reinstall pass. Runtime-derived diagnostic PNG/GIF show all3inputs/2facings with correct Dudley width1.02/height1.03/.88 art scale and actual world motion; previewPNG inspected. No browser-capture or manual-playtest claim. Known PWA checks still fail: v025 cached-stage network2vs0, v028 removed pinCurrentShell assertion, v063 cache065vs172. Full suite not rerun; generated tracked pose-cache changes restored before commit.

Independent readonly review review_dudley_ducking_straight found no concrete P1/P2. Reviewer reran156DudleyCanvasdraws, Dudley ingest (including standing-punch rejection), Alex Flash Chop/Slash Elbow and roster standing attacks; independently verified all23prior Dudley records/WebPbytes/sourcebindings and inspected the final same-near-arm punch/visible far guard. No edits by reviewer.

## Dudley pose-authored Machine Gun Blow / EX — YAKSACOM local only (2026-11-10)

User's priority instruction is LOCAL edits, execution and tests on YAKSACOM(약사컴), preserving all existing work. Hostname was independently confirmed YAKSACOM. No commit, push, remote PR update or deployment was performed for this increment. All current modifications remain uncommitted; earlier history is preserved.

Built-in imagegen produced six upright same-near-arm drawings from dudley/stand-medium-sheet.png as identity/style/guard reference: standing guard, coil, half straight, full straight, halfway withdrawal and guard. Far glove remains visible by the cheek. Saved final source dudley/machine-gun-blow-sheet.png, exact generation/edit prompts machine-gun-blow-prompt.txt and all edit inputs machine-gun-blow-edit-target.png, machine-gun-blow-recoil-target.png, machine-gun-blow-drive-target.png and machine-gun-blow-alpha-target.png. First artwork failed distinct-contact/motion gates (IoU0.834217, residual0.009328/0.019288). Torso-drive and recoil edits improved motion but averages0.013671/0.013989 still fell below the unchanged0.014 minimum. Final contact drive adds genuine shoulder/hip/torso movement; a separate alpha extraction edit corrected connected background haze. No rejected candidate was installed and no original numeric gate was relaxed.

Final residual0.016004/0.043933, peak-contactIoU0.663691, actual-contact reach85px (global reach range86px), headDelta3px, foot-center range0.651553px and guard-handoffIoU0.764049/0.751813 pass original heavy-strike/handoff numeric limits. The original strike gates are applied at actual peakframes3/6. An extra upright headDelta[-15,15] cue rejects the48px-lowered Ducking Straight contact, which otherwise passes every original strike gate. Guard substitutions fail at both peaks. Static/translated guard, source/runtime/idle-peer corruption, atomic first/replacement rollback, preservation and byte-stable reinstall pass.

Six source drawings expand to twelve640x448frames, sourceOrder[1,2,3,4,5,3,4,5,3,5,6,6], snap24, startup0–2/active3–8/recovery9–11. Peak3/6, withdrawal4/7 and reload5/8 loop during the active window. Installed-idle anatomical scale337px, opaque sole baseline421, two-foot root and zero runtime staging offsets preserve size and position. Exact grounded DUDLEY_PRIMARY/EX_PRIMARY only; other actions retain prior bindings. Normal multiHit3/interval3 and EX5/interval2 drive repeated punches, with a capped final active withdrawalframe4; recovery uses9–11. Normal samples all12storedframes; faster EX omits the two reload frames. Gameplay hit detection, damage, move duration, movement, physics and projectile behavior are unchanged. Existing public hit counters/frames provide the clock; no new mutable presentation state was added.

Independent review found a P2 in the initial highest-hit-target-only clock: targetA hit atframes6/9, new targetB hit at10 froze withdrawalframe7. A permanent real belt-mode two-target regression failed before the fix. The mapper now takes the highest valid hit count for the ordinal and independently the newest valid impact on ANY victim for phase age. The original repro now samples peakframes3/6/6. This keeps every real impact fully extended through hitstop, including a newer lower-count victim. Reviewer independently reran the fix and found no remaining P1/P2.

Actual QCF/EX inputs in both facings verify3/5whiff punches and124Canvasdraws;32real single-target impacts include normal/EX, bothfacings and0/2frame delayed first contact. Twelve additional real multi-target impacts cover normal/EX/bothfacings and real hitstop. Source crops, zero offsets, ground/air/hit fallback and idle recovery pass. Combat preload includes the new strip, movement-only preload excludes it. All24prior Dudley records/WebPbytes/top-level source bindings compare equal to baselineHEAD2c47a85165fb7a28f1ac5d8ea5a28ced8a209c1a. New381,342bytes;215total/active/fullstoredframes25records, eagerentry7,852,106 -> 8,233,448bytes remains below unchanged9MBcap. Other budgets/default six-character import remain unchanged. Client/service-worker cache173.

Fresh final verification after the multi-target fix: clean TypeScript/build/release451files hash2B41835A3CA6246E and19focusedchecks pass. Six asset fixtures pass: Dudley Machine Gun Blow, Dudley Ducking Straight, default roster, Alex Slash Elbow, Alex Flash Chop and Ken special semantics. Known PWA checks still fail: v025 cached-stage network2vs0; v028 removed pinCurrentShell assertion; v063 pinned cache065vs173. Full-suite green is not claimed. Test-generated RC39 cache remains local and uncommitted along with the existing changes; no wholesale reset/cleanup was used.

Local execution: Python HTTP server bound ONLY to127.0.0.1:4173 on YAKSACOM, HTTP200. Latest final build reloaded in Chrome; title/new-game/Dudley/super-art selection/stage entry, Continue, movement, keyboard JAB and P pause were observed. Final browser warning/error logs empty. Browser kept open on the final local stage in PAUSED state; P resumes. Manual browser Machine Gun Blow activation was not established; its exact inputs/animation/impacts are verified by automated tests. Saved browser screenshot ../outputs/yaksacom-streetfighter-local-browser.png. Diagnostic PNG/GIF ../outputs/dudley-machine-gun-blow-preview.* use captured runtime timelines and Dudley width1.02/height1.03/.88 art scale; these diagnostics are not browser captures.

Commands: python scripts/build-roster-motions.py --character DUDLEY --kind machine-gun-blow [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character DUDLEY --kind machine-gun-blow; node scripts/verify-dudley-machine-gun-blow.mjs. Local serve: python -m http.server 4173 --bind 127.0.0.1 --directory dist.

## Makoto pose-authored Hayate / EX — YAKSACOM local only (2026-11-10)

This increment follows the user's YAKSACOM(약사컴) local-only instruction: edits, execution and tests only; no commit, push, remote PR update or deployment. All earlier uncommitted work is preserved. Before editing, 24 existing changed/source files and Makoto/Dudley manifests were copied to ../work/makoto-hayate-baseline, with hashes for all 48 existing Makoto/Dudley runtime strips. This snapshot, not HEAD alone, is the baseline for the new increment because Dudley Machine Gun Blow was already uncommitted.

Built-in imagegen produced six new Makoto drawings using makoto/stand-heavy-sheet.png as identity/style/guard reference: guard, near-fist torso coil, half straight, full Hayate, halfway withdrawal and guard. The same near arm closes, drives across the chest and recoils while the far fist stays visible by the cheek. Bare feet remain rooted and the existing gameplay model remains stationary; no new dash or other physics was invented. Saved original/final source makoto/hayate-sheet.png and exact prompt makoto/hayate-prompt.txt. The first generated source passed all original quality gates; no image edit or numeric-threshold relaxation was needed.

Six drawings expand to twelve 640x448 frames with sourceOrder [1,1,2,3,4,4,5,5,6,6,6,6], snap24, startup0–3/contact4–5/recovery6–11. Installed-idle height337px, opaque sole baseline421, two-foot anchoring and zero runtime staging offsets preserve anatomy and position. Original heavy-strike and guard-handoff gates pass: residual0.018432/0.038349, contactIoU0.628408, actual-contact reach49px on both frames (global range51px), centroidX14.986325/Y7.182042px, foot-center range1.618600px and handoffIoU0.571454/0.540827. Guard substitutions are rejected at each actual contact. Static/translated guard, source/runtime/idle-peer corruption, first/replacement atomic rollback and byte-stable reinstall pass.

Exact grounded MAKOTO_PRIMARY and MAKOTO_EX_PRIMARY use the full action. Actual QCF/EX input in both facings verifies all twelve frames, active contacts4/5, hitstop, recovery, idle and airborne/hit fallback through112Canvas draws. Damage, inputs, durations, movement and physics remain unchanged. Command/air/anti-air/mobility/throw/super bindings retain their prior presentation. Combat preload includes Hayate, movement-only preload excludes it. The standard verification command includes the new runtime and asset fixture.

All23prior Makoto manifest records, WebP bytes and source bindings are unchanged. All25current Dudley records/art/bindings, including uncommitted Machine Gun Blow, and the entire MGB timing block compare identical to the pre-increment snapshot. Independent review also verified all48old art hashes. Makoto now has203total/active/full stored frames in24records. New strip533,470bytes; eager entry9,088,544 -> 9,622,014bytes fits a new explicit Makoto-only10MB regression cap. Other character budgets and the default six-character importer are unchanged. Client/service-worker cache174.

Fresh verification: clean TypeScript/build/release452files hashABE096A1F89264B3 and20focused checks pass, including the earlier Dudley32single-target/12multi-target timing regressions. Six asset fixtures pass: Makoto Hayate, Dudley Machine Gun Blow, Dudley Ducking Straight, default six-character roster, Alex Slash Elbow and Ken special semantics. Known PWA failures reproduced: v025 cached-stage network2vs0, v028 removed pinCurrentShell assertion and v063 pinned cache065vs174. A full-suite green result is not claimed.

Independent read-only review review_makoto_hayate found no concrete P1/P2. Reviewer independently reran112Canvas draws and Hayate ingest; compared all48baseline art hashes, prior23Makoto records/bindings, byte-identical Dudley manifest and unchanged MGB timing block; inspected source arm/guard/feet anatomy. Reviewer made no edits or external writes.

Local browser verification: server remains bound only to127.0.0.1:4173 on YAKSACOM; new Hayate WebP returns HTTP200 with533,470bytes. Latest build reloaded in Chrome; title -> New Game -> Makoto -> Super Art selection -> stage play, movement and P pause observed. Final console warning/error list empty. Browser left open in PAUSED state (P resumes). Manual browser Hayate activation was not established; its exact normal/EX inputs and all frame/impact timing are covered by automated tests. Browser screenshot saved at ../outputs/yaksacom-makoto-hayate-local-browser.png. Diagnostic PNG/GIF ../outputs/makoto-hayate-preview.* use captured runtime timeline, actual positions and Makoto width0.9/height0.91/.88 draw scale; they are not browser captures. Source, prompts, code, tests and existing generated-cache changes remain local and uncommitted; HEAD unchanged2c47a85165fb7a28f1ac5d8ea5a28ced8a209c1a.

Commands: python scripts/build-roster-motions.py --character MAKOTO --kind hayate [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character MAKOTO --kind hayate; node scripts/verify-makoto-hayate.mjs. Local serve: python -m http.server 4173 --bind 127.0.0.1 --directory dist.

## Yun pose-authored Palm Rush / EX — YAKSACOM local only (2026-11-10)

User scope remains local edits, execution and tests on YAKSACOM(약사컴), with NO commit, push, remote PR update or deployment. All earlier uncommitted Dudley Machine Gun Blow and Makoto Hayate work is preserved. Before editing, current shared source/manifests/tests were copied to ../work/yun-palm-rush-baseline; baseline.json records all72old Yun/Makoto/Dudley runtime-art hashes and17untouched pre-existing changed-file hashes. This snapshot, not the older HEAD alone, is the increment baseline.

Built-in imagegen generated six new Yun drawings using yun/stand-heavy-sheet.png for identity/style/guard reference: open-hand guard, near-palm coil, half palm drive, full palm contact, halfway recoil and guard. The same near open hand remains connected through the action while the far hand guards beside the cheek; shoes stay rooted. First source passed body/foot/handoff quality but actual reach28px failed the unchanged38px minimum. A single contact-art edit increased genuine shoulder/torso protraction and open-palm extension. Final source yun/palm-rush-sheet.png, original edit input palm-rush-edit-target.png and exact generation/edit prompts palm-rush-prompt.txt are saved locally. No rejected source was installed and no original numeric quality threshold was relaxed.

Six drawings expand to twelve640x448frames with sourceOrder[1,1,2,3,4,4,5,5,6,6,6,6], snap24, startup0–3/contact4–5/recovery6–11. Installed-idle height338px, opaque sole baseline421, two-foot root and zero runtime staging offsets preserve size/position. Original heavy-strike/handoff numeric gates pass: residual0.017379/0.045312, contactIoU0.614670, actual reach51px at both contacts (global range52px), centroidX16.309976/Y6.138858px, foot-center range1.059896px and guard-handoffIoU0.730939/0.766168. Guard substitutes at either actual contact, static/translated guard, source/runtime/idle-peer corruption, first/replacement atomic rollback and byte-stable reinstall are rejected/verified. Open-palm/far-guard anatomy is visually inspected rather than adding a new classifier.

Exact grounded YUN_PRIMARY and YUN_EX_PRIMARY use the full action. Actual QCF/EX input in both facings verifies90Canvasdraws, contacts4/5, hitstop, stationary gameplay root, recovery, idle and air/hit fallback. Normal startup6ticks samples all12storedframes. EX startup3ticks skips only duplicated guard frame1 while retaining all6unique source drawings; the test explicitly checks unique-source coverage for both speeds and facings. Damage, inputs, durations, movement and physics remain unchanged; no new dash was invented for the stationary primary in this game's model. Other normals/air/command/anti-air/mobility/super bindings retain their prior fallback. Combat preload includes the strip, movement-only preload excludes it.

All23prior Yun records/WebPbytes/source bindings are preserved. All current Makoto24/Dudley25 records/art/bindings and the entire MGB timing block remain identical to the pre-increment snapshot. All72old art hashes and17untouched changed-file hashes were independently verified. New strip494,770bytes; Yun now has203total/active/fullstoredframes in24records. Eager entry9,262,094 -> 9,756,864bytes fits a new explicit Yun-only10MB regression cap. Other budgets/default six-character import are unchanged. Client/service-worker cache175.

Fresh verification: clean TypeScript/build/release453files hash8C3C13EA600634E1 and21focused checks pass, including previous MGB32single-target/12multi-target regressions. Six asset fixtures pass: Yun Palm Rush, Makoto Hayate, Dudley Machine Gun Blow, Alex Slash Elbow, default six-character roster and Ken special semantics. Known PWA checks still fail: v025 cached-stage network2vs0, v028 removed pinCurrentShell assertion, v063 pinned cache065vs175. Full-suite green is not claimed; generated-cache changes remain local and uncommitted.

Independent read-only review review_yun_palm_rush found no P1/P2. Reviewer independently reran90Canvasdraws, runtime import QA and the Yun ingest fixture; checked72prior art hashes,17untouched hashes, old Yun records and scoped additive mapping/selector changes; inspected source and composited preview for near open palm/far guard/rooted shoes/anatomy. Reviewer made no edits or external writes.

Local browser run: same YAKSACOM server remains bound only to127.0.0.1:4173; new WebP returnsHTTP200 with494,770bytes. Latest build reloaded in Chrome, then title -> New Game -> Yun -> Super Art selection -> stage play, movement and P pause observed. Final tab console warning/error list empty. Browser left in PAUSED state (P resumes); screenshot ../outputs/yaksacom-yun-palm-rush-local-browser.png. Manual browser Palm Rush activation was not established; exact normal/EX input and animation timing are covered by automated tests. Diagnostic PNG/GIF ../outputs/yun-palm-rush-preview.* use the runtime timeline, actual world position and Yun width0.88/height0.93/.88 draw scale; they are not browser captures. All old/new source, code, tests and existing generated-cache changes stay local/uncommitted; HEAD remains2c47a85165fb7a28f1ac5d8ea5a28ced8a209c1a.

Commands: python scripts/build-roster-motions.py --character YUN --kind palm-rush [--install|--runtime]; python scripts/verify-chunli-backdash-ingest.py --character YUN --kind palm-rush; node scripts/verify-yun-palm-rush.mjs. Local serve: python -m http.server 4173 --bind 127.0.0.1 --directory dist.


## Urien Metallic Sphere — local authored projectile

2026-11-10: added six original body drawings from the built-in imagegen tool, saved as `urien/hadoken-sheet.png`; exact generation prompt is `urien/hadoken-prompt.txt`. Reuse the existing projectile animation kind `hadoken` for exact URIEN_PRIMARY/URIEN_EX_PRIMARY only; no combat balance or projectile physics changes. Runtime strip12frames/640x448, source order1,1,2,2,3,4,4,5,5,6,6,6, startup0–4/release5–6/recovery7–11, zero staging offsets, installed-idle sole/root anchoring. Original numeric gates pass: affine residual .029307/.059068, neutral IoU .953474, release IoU .563243, reach delta56px, foot root range .769334px. Both speeds retain all six unique drawings; both facings render and emit the real projectile at frame5. Urien now203enabledframes/24records, deferred authored entry10,010,074bytes<11MB. All work remains local on YAKSACOM; no commits, pushes, PR writes or deployment.


## Gill Pyro Sphere / EX Elemental Sphere — local authored projectile

2026-11-10: built-in imagegen produced six original body drawings, saved as `gill/hadoken-sheet.png`; exact generation prompt in `gill/hadoken-prompt.txt`. Red near-side/blue far-side identity and long blond hair preserved across gather, drive, release, withdrawal and original guard. Existing grounded projectile kind hadoken maps exact GILL_PRIMARY/GILL_EX_PRIMARY only. Twelve640x448frames,sourceorder1,1,2,2,3,4,4,5,5,6,6,6;startup0–4/release5–6/recovery7–11,zerooffsets,installed-idle sole/root anchoring. Original numeric gates pass: residual.030018/.058386,neutralIoU.890764,releaseIoU.571349,releaseReach57px,footrootrange.828957px. Both speeds/facings retain six source drawings,emit normal1/EX2 projectiles at frame5,and preserve hitstop/aerial fallback. Gill203enabledframes/24records. Entry size11,785,164bytes<12MB; prior art alone11,165,110bytes, new strip620,054bytes. Urien11MBcap and all pose/handoff limits unchanged. Local YAKSACOM only, no commit/push/PR writes/deploy.


## Dudley Jet Upper — local rising uppercut

2026-11-10: built-in imagegen produced eight original uppercut poses in `dudley/shoryuken-sheet.png` (initial generation also retained in `shoryuken-initial-sheet.png`), plus a corrected full-rise drawing from pose4 of `shoryuken-rise-edit-sheet.png`; exact generation/edit prompts in `shoryuken-prompt.txt`. Preserve the seven original-scale drawings and override only runtimeframes6/7 from corrected sourcepose4, with both source hashes recorded. Initial rise28px failed the unchanged42pxminimum; the corrected composition passes75px with no threshold relaxation. Runtime12x640x448,sourceorder1,2,2,3,3,4,4,5,6,7,7,8;startup0–3/contact4–7/recovery8–11,zerooffsets,grounded frames use installedidle baseline/root. Residual.032885/.056288,neutralIoU.853719,contact/apexIoU.521542/.484854;all4activeposes pass original uppercut gates. Exact DUDLEY_ANTI_AIR only; actual launch/drift/damage/timings unchanged. Visual-only completed-move metadata keeps descent/landing art after combat ends and clears on jump,dash,newmove,hit,throwescape,victory;no extra attack contact. Bothfacings88Canvasdraws coverall12frames and apply worldheight once. Dudley227enabledframes/26records,authoredentry8737668bytes<unchanged9MBcap. PWA/MGBclock/priorart kept;local YAKSACOM,no commit/push/PR writes/deploy.


## Makoto Fukiage — local authored rising uppercut

2026-11-10: built-in imagegen produced eight original drawings in `makoto/shoryuken-sheet.png`; exact prompt in `shoryuken-prompt.txt`. The generated eighth drawing stayed crouched, so runtime deliberately uses sourcepose1 for the final exact neutral return (seven unique selected drawings, no misleading extra guard drawing). Actual sourceorder1,2,2,3,3,4,4,5,6,7,7,1;first/last encoded alpha silhouette equal; same original guard drawing reused. Twelve640x448frames,phase0–3/contact4–7/recovery8–11,zerooffsets,installedidle groundedsole/root. All original uppercut numericgates pass,residual.037603/.059945,neutralIoU1.0,contact/apexIoU.414834/.365985,topRise63px,all4contactlifts44.57–51.78px. ExactMAKOTO_ANTI_AIR only, existing Fighter visualRecoveryMoveId reused for post-combat descent/landing;no Fighter/physics/balance edit. RealDPbothfacings90Canvasdrawsreachall12frames,worldheightonce,hitstop,newjump/dash/hitreset. Makoto215active/fullframes25records;entry10,174,058bytes<11MBcap (prior9,622,014;newstrip552,044). All qualitylimitsunchanged,priorDudley/Gill/Urien/PWAworkpreserved. LocalYAKSACOM,no commit/push/PR writes/deploy.


## Gill Cyro Upper — local blue-arm rising uppercut

2026-11-10: built-in imagegen generated8originalposes, then correctedtransparentrowspacing (initialconnectedrows retained as `gill/shoryuken-initial-sheet.png`; edit also retained as `shoryuken-layout-edit-sheet.png`). Finalruntime source `gill/shoryuken-sheet.png`,exactgeneration/editprompts `shoryuken-prompt.txt`. Bluefararm strikes overhead while rednearhand guards;anatomicalskinhalves retained. Runtime7unique drawings with sourcepose1reused for exactneutralreturn;trueorder1,2,2,3,3,4,4,5,6,7,7,1;encodedalpha first/lastexact. Twelve640x448frames,phase0–3/contact4–7/recovery8–11,zerooffsets,groundedsole/roottoinstalledidle. AlloriginalqualitygatesPASS,residual.040953/.061951,neutralIoU1.0,contact/apexIoU.466881/.534025,topRise62px,contactlifts36.37–42.50px. ExactGILL_ANTI_AIRonly;existingFighter visualRecoveryMoveId reused, no Fighter/physics/timing/balance edit. Bothfacings88Canvasdrawsall12frames,worldheightonce,hitstop/post-combatlanding/newactionandhitreset. Gill215activeframes25records,newstrip648080bytes,entry12433244<13MBcap(prior11785164);initialshell unchanged,deferredcombatload only. Allpriorart/specials/PWA preserved. LocalYAKSACOM,no commit/push/PR write/deploy.


Cyro Upper review correction: originalcontactpose4 had an extra red hanging leg and was rejected on manualreview. Builtinimagegen removed it, recolored the complete farleg blue, and restored truealpha0 background. Final correctedsource `gill/shoryuken-contact-edit-sheet.png` supplies ONLY sourcepose4 at runtimeframes6/7 via sourceOverrides (hashrecorded), preserving all other base drawings. Originalanatomy/colorattempts retained in `shoryuken-anatomy-edit-sheet.png` and `shoryuken-color-edit-sheet.png`; exactprompts appended. Final residual0.042111/0.061951,topRise72,allcontactgatespass. Finalstrip668824bytes,entry12453988bytes<13MB. No qualitythreshold relaxation.


## Yun Nishokyaku — local authored rising kick

2026-11-10: builtinimagegen produced8originalkickposes in `yun/shoryuken-sheet.png` (initialretained),then improvedonlypose4highkick in `shoryuken-kick-edit-sheet.png`;exactgen/editprompts `shoryuken-prompt.txt`. SourceOverridesframes6/7 selectcorrectedpose4withSHA;otherbasedrawingskept. Handsstayguarded,twolegs/twoshoes,alternatingkickarticulation. Runtime7uniquedrawings,pose1exactneutralreturn,sourceorder1,2,2,3,3,4,4,5,6,7,7,1;first/lastencodedalphaequal. Twelve640x448frames,phase0–3/contact4–7/recovery8–11,zerooffsets,installedidlegroundedanchors. InitialtopRise40failedunchanged42minimum;corrected48passes;residual.047642/.078631,allcontactlifts56.15–60.67,neutralIoU1.0. Existingrisingbody/legphasegates reusedwithmanualkickanatomyreview;no numericlimitrelaxation. ExactYUN_ANTI_AIRonly;Fighter/physics/timing/hitcount/damageunchanged,existingvisualrecoveryflow reused. Bothfacings90Canvasdrawsall12frames,worldheightonce,hitstop,postcombatlanding/newactionreset. Yun215enabledframes25records,newstrip572836bytes,entry10329700<11MB(prior9756864). Allpriorwork/PWAlocalonly, no commit/push/PR write/deploy.


## Urien Danger Knee — local original rising knee

2026-11-10: builtinimagegen8originalposes in `urien/shoryuken-sheet.png`,exactprompt `shoryuken-prompt.txt`. Actualkneeattackartwithguardedhands,onefrontknee/itsfoldedlowerleg andoneoppositetrailingleg. Runtime7uniquedrawings andpose1neutralreturn,order1,2,2,3,3,4,4,5,6,7,7,1;first/lastencodedalphaequal. Twelve640x448frames,phase0–3/contact4–7/recovery8–11,zerooffsets,groundedroot/soletoinstalledidle. Firstsource passesoriginalrisingbody/legphasegates,residual.040184/.053683,neutralIoU1,contact/apexIoU.374015/.409401,topRise67,contactlifts64.73–82.64. ExactURIEN_ANTI_AIRonly;noFighter/physics/timing/hitcount/damageedits,existingvisualrecovery reused. Bothfacings90Canvasdraws/all12frames/worldheightonce/hitstop/postcombatlanding/newjump/dash/hitresetPASS. Urien215activeframes25records,newstrip529208bytes,entry10539282<unchanged11MBcap(prior10010074). No initialshellload,combatartdeferred. Allprioruncommittedwork/PWA retained;YAKSACOMlocalonly,nocommit/push/PR write/deploy.

### Alex Air Knee Smash (2026-11-10, local)

Built-in image generation: eight original transparent poses; margin edit restores complete bottom-row boot soles. Exact prompts and initial sheet preserved beside final `alex/shoryuken-sheet.png`. Seven selected drawings and exact source-pose1 return produce12frames640x448, order1,2,2,3,3,4,4,5,6,7,7,1. Full original semantic gates pass (topRise66; residual avg0.04815/max0.077686); no lowered thresholds or source override. Grounded guard/landing aligns to installed idle; game applies flight height once. Exact ALEX_ANTI_AIR uses rising knee and post-combat descent/landing; Fighter.ts and combat timings unchanged. New lossless strip644,558bytes; authored entry12,399,944bytes under13MB budget (previous artwork11,755,386bytes untouched).

### Yun Tetsuzanko (2026-11-10, local)

Built-in imagegen creates six original transparent shoulder-tackle key drawings2x3; pose4 edited for stronger forward shoulder articulation (initial contact reach36 rejected; final40 passes unchanged38minimum). Initial/final source sheets and exact prompts preserved in yun/. No source overrides. Twelve640x448frames order1,1,2,3,4,4,5,5,6,6,6,6, phase0-3/4-5/6-11. Shared standingheavy pose/semantic and handoff gates unchanged (residualavg0.021308/max0.042035). Bothshoe roots anchored to installedidle; gameplay retains actual mobility translation. ExactYUN_MOBILITY uses shoulder-tackle groundedonly, with aerialfallback; Fighter/physics/contact/MGB unchanged. Newlosslessstrip546,764bytes, Yunentry10,876,464bytes under unchanged11MBcap.

### Urien Charging Tackle (2026-11-10, local)

Built-in imagegen creates6original transparent shoulder-tackle drawings2x3; edit removes extra thirdhand in sourcepose5withdrawal and adds completeoutermargins. Initial/final sources+exactprompts/provenance preserved in urien/. Reuses existing Yun shoulder-tackle importer/atomic/groundedstrikegates. Fiveunique drawings selected for12frames640x448, order1,1,2,3,4,4,5,5,1,1,1,1; finalfourframes reuseexactoriginalguard toavoid generatedrecoverybackshift. Numericgatesunchanged (centroidXrange53.906313,contactreach46,residualavg0.017625/max0.042319,neutralIoU1). Groundfeet root toinstalledidle; game supplies originalmobilitytravel. ExactURIEN_MOBILITY uses groundedshoulderart; existingprojectile/risingknee/MGB/Fighter/physics unchanged. Newlosslessstrip400,638bytes,totalentry10,939,920bytes under unchanged11MBcap.

### Gill Lariat Rush (2026-11-10, local)

Built-in imagegen creates8original transparent full-body drawings2x4 with redneararm sweepingforward and bluefararmguarding. Imageeditcompletesoutermargins/extendsinitialsweep; initial/finalsource+exactprompts/provenance preserved in gill/. Sevenunique drawingsselectedfor12frames640x448,order1,1,2,3,4,4,5,6,7,7,1,1,phase0-3/4-7/8-11. Shortsourcepose3 is finalstartup; source4fullcontactholds4/5,source5/6followthroughcontact6/7; originalguardreturn. Allstandingheavysemanticnumericgatesunchanged and all4actualcontactsvalidated (reach63/63/63/54;residualavg0.023198/max0.042406;neutralIoU1). Footrootsaligninstalledidle, game supplies originalmobilitytravel. ExactGILL_MOBILITY groundedonly,existingPyro/Cyro/MGB/Fighter/physicsunchanged. Newlosslessstrip810,814bytes,totalentry13,264,802bytes under14MBbudget (13→14MB toretainprior12,453,988bytesoriginalquality). Deferredcombatloading retained.

### Makoto Tsurugi (2026-11-10, local)

Built-in imagegen creates6original transparent forward-down kick drawings2x3,firstpass noedits/overrides. Exactprompt/source/provenance in makoto/. Fiveunique drawings selectedfor12frames640x448,order1,1,2,3,4,4,5,5,1,1,1,1,phase0-3/4-5/6-11; final4framesreuseoriginalguard. Preserveexistingengine groundedforwardmobility/noaddedlaunchphysics. Existingmediumkicknumericgates reused unchanged atbothactualcontacts4/5 (legreach52,raisedfoot60,exactly1rearsole;supportrootrange0.833055px/baseline0;residualavg0.021686/max0.043842;neutralIoU1). Rear-supportfootanchornormalizationreusesnormal kickpipeline andidlehandoffs; game supplies originalmobilitytravel. ExactMAKOTO_MOBILITY groundedonlyaerialfallback;Hayate/Fukiage/MGB/Fighter/physicsunchanged. Newlosslessstrip411,016bytes,totalentry10,585,074bytes under unchanged11MBcap.

### Dudley Corkscrew Blow (2026-11-10, local)

Built-in imagegen:8originalfull-bodykeydrawings2x4, sourcepose5torqueedit passes unchangedpeakgate(.026291rejected→.031849), exactguardreturn; base/initial/torquevariants+exactprompts savedindudley/. Twelve640x448framesorder1,2,3,4,4,5,6,6,7,7,1,1,phase0-1/2-7/8-11. ExactDUDLEY_SUPER+DUDLEY_SA3 only. All6actualcontacts2–7pass unchangedstandingheavygates(reach47/61/61/130/61/61).

ReviewP2 recoveryshrink fixed: new2x1guard/recoverypair `corkscrew-blow-recovery-pair.png` swaps onlyframes9/10(1-based), sourcePose2 calibratedtoitsmatchingguardPose1 byuniformingestscale0.45628743. Original10otherframes alpha/visibleRGBApixel-identical. RegressionRED[333,278,278,333]→GREEN[333,335,335,333]heights; permanent94–103%guardheightassertion+pairSHA/missing/corrupt/atomicrollbackchecks. No runtimegrowingtransform. Guard/recov/corkscrewcompletegloves/shoes verified.

ActualdoubleQCF3punches×2variants×2facings,510draws/108freezechecks/12delayedimpactcases/noextraHits;cost100/104andfreeze9 preserved. ExistingMGBtiming/Fighter/physics/gauge/presentationunchanged. Newlosslessstrip448,494bytes;entry9,186,162bytes under10MBbudget(9→10MB to preserveprior8,737,668losslessart),combat-onlydeferredload. Finalcache190.

### Urien Aegis Reflector (2026-11-10, local)

Built-in imagegen creates6originaltwo-palmprecast/release/withdrawdrawings2x3; separate2x1guard/recoverypair fixesproactivelydetectedlower-rowshrink. Exactprompts/base/pair/provenance savedinurien/. Fiveunique drawingsselect12frames640x448,order1,2,2,3,4,4,5,5,1,1,1,1,phase0-3/4-5/6-11; overrideframes7/8(1-based)pairpose2calibratedtopairguardpose1. RecoveryRED335/291/291/335→GREEN335/334/334/335; other10framesalpha/visibleRGBAunchanged. Sharedpairedguardrecipetable preservesDudleyrecoveryvalues.

Existinghadoken numericgates unchanged; actualreleasechecksparameterized4/5 forAegis,olddefaults5/6 preserved (releaseReachDelta37,poseavg0.021225/max0.046052,neutralIoU1). ExactbossURIEN_SUPER only; no selectedbossSA3mapping/newmechanics. Existingfield speed.08/life180/radius54/piercingtrue,cost100/freeze9 preserved;6realspawnsalignframe4,1074lifeprogresschecks,4piercingvictims/norepeatedsamevictim. NativeStage1Sceneprojectilerenderer usedinlocalQA; bodyimagescontain noeffects.

Newlosslessstrip372,718bytes,entry11,312,638bytes under12MBbudget(11→12MB preservesprior10,939,920losslessart); combat-onlydeferredload. OldMetallicSphere/DangerKnee/ChargingTackle/MGB/Fighter/combatcode unchanged;cache191.

### Gill Seraphic Storm (local, 2026-11-10)
Original transparent 2×3 cast sheet generated with built-in image_gen; source reference: gill/sheet.png. Exact prompts: gill/seraphic-storm-prompt.txt and gill/seraphic-storm-refinement-prompt.txt. First attempt retained as seraphic-storm-sheet-attempt1.png. Refined release extends42px beyond gather against unchanged24px gate. Selected order1,2,3,3,4,4,5,5,1,1,1,1;12frames640×448, exactguardreturn, opaque heights336/335/335/336 at guard/recovery/recovery/return. Exactboss GILL_SUPER only; native3-projectile mechanics unchanged. Deterministic importer, original numeric gates and foot alignment retained. Localonly, no commit/push/deploy.

### Makoto Seichusen Godanzuki (local,2026-11-10)
Built-in image_gen original2×4 transparent sheet; identity reference makoto/sheet.png. Exact generation/refinement prompts in makoto/seichusen-godanzuki-{prompt,refinement-prompt}.txt; firstattempt retained. Stronger torso drive clears original heavystrike gates on ALL contactframes2–7,reach86/97/94px within38–145px. Twelve640×448frames,order1,2,3,4,3,4,5,5,6,7,1,1; originalguardreturn exact. Fullbody heights guard333/recovery331/331/return333,no shrinking recovery. Exact MAKOTO_SUPER and MAKOTO_SA1 only; native singlehit/fivehit mechanics unchanged. Newlosslessstrip692968bytes; Makotoentry11278042bytes,budget12MB. Localonly,no commit/push/deploy.

### Yun Genei Jin basic super (local,2026-11-10)
Built-in image_gen original2×4 transparent source; identity reference yun/sheet.png. Exact prompts yun/genei-jin-{prompt,refinement-prompt}.txt; clippedfirstattemptretained. Refinedsourcefullyinsideedgeguard, no runtimegeometryedits. Twelve640×448frames,order1,2,3,2,3,4,4,4,5,6,1,1; contacts1–7 reach93/80/121pxwithinoriginal38–145pxgates. Opaquebodyheights334/323/324/334atguard/recoveries/return; exactguardreturn. ExactYUN_SUPER only; native1tickstartup,16active,16recovery,248damage,100cost,singlehit unchanged; SA3 install unchanged. Newlosslessstrip631342bytes,entry11507806bytes,12MBbudget. Localonly,no commit/push/deploy.

### Alex Hyper Bomb entry / whiff / recovery (local,2026-11-10)
Built-in image_gen original2×4transparent source; identity referencealex/sheet.png. Exactprompts alex/hyper-bomb-{prompt,refinement-prompt}.txt; firstattemptretained. Refinedcaptureposes pass originalheavystrike numericgates at ALLcontact3–5,reach64/43/43px within38–145,centroid49.252004within62. Twelve640×448frames,order1,2,2,3,4,4,5,5,6,6,1,1; opaqueguard/recovery334/328/328/334,exactguardreturn. ExactALEX_SUPER/SA1only. Nativepairedthrow retainsbothactors onceconnected; no bakedvictim or render/physicschanges. Newlosslessstrip667302bytes,entry13067246bytes,budget14MB. Localonly,no commit/push/deploy.

### Alex SA2 Boomerang Raid (local,2026-11-10)
Built-inimage_gen original2×4source,referencealex/sheet.png; exactpromptalex/boomerang-raid-prompt.txt. Twelve640×448frames,order1,2,3,4,3,5,5,5,6,7,1,1; nativefourhitclocks4/7/10/13 mapart2/3/4/5. Contacts2–7 passoriginalheavystrikegates,reach106/63/91px. Sourceuprightrecoveriesfailedscalegate303/297vs334guard. New2×2boomerang-raid-recovery-sheet.png andexactrecovery-prompt calibrate distinctearly/lateposes toitsguard; runtimeframes9/10onlycorrectedto336/335px. Other10frames alpha/visibleRGBA preserved. Sharedingestionrecipestillbyte-stableforoldDudley/Urien. ExactALEX_SA2only, fourhits/wallbounce/damage/gauge/physics unchanged. Newlosslessstrip726690bytes,Alexentry13793936<14MB. Localonly,no commit/push/deploy.

### Dudley SA2 Rolling Thunder (local,2026-11-10)
Built-inimage_gen original2×4source,referencedudley/sheet.png; exactpromptdudley/rolling-thunder-prompt.txt. Sixteen640×448frames,order1,2,3,4,3,4,3,4,5,5,5,5,6,7,1,1; native7hitclocks3/5/7/9/11/13/15 mapart2–8. Contacts2–11 passoriginalheavystrikegates,reach116/108/126px. Firstrecovery311pxvs333guardfailedscalegate. Newrolling-thunder-recovery-pair.png +exactrecovery-prompt useexisting2×1guardcalibration tocorrectruntimeframe13onlyto335px. Other15framesalpha/visibleRGBA preserved; late326px,exactguardreturn. ExactDUDLEY_SA2only; native7hits,gauge/damage/physics/MGBtiming unchanged. Newlosslessstrip509190bytes,entry9695352<existing10MB. Localonly,no commit/push/deploy.

### Yun SA2 Sourai Rengeki (local,2026-11-10)
Built-inimage_gen original2×4transparent source,referenceyun/sheet.png; exactpromptyun/sourai-rengeki-prompt.txt. Sixteen640×448frames,order1,2,3,4,3,4,3,4,5,5,5,5,6,7,1,1. Native7hitclocks2/4/6/8/10/12/14 mapart2/3/4/5/6/7/9; actualcontacts2–11 reach68/83/91withinoriginal38–145pxgates. Guard/recoveries334/338/338/return334,exactguardreturn, no recoverycorrectionneeded. ExactYUN_SA2only; first6nativehits belowwallbouncethresholdandfinalhitbounces retained, damage/gauge/physicsunchanged. Newlosslessstrip686182bytes,Yunentry12193988,budget13MBpreservesoldart. Localonly,no commit/push/deploy.


### Yun SA1 You Hou (local,2026-11-10)
Built-in image_gen original transparent2×4 source, referenceyun/sheet.png. Exact prompts yun/you-hou-prompt.txt and you-hou-refinement-prompt.txt; first attempt retained as you-hou-sheet-attempt1.png. First finisher reach34px failed original38px minimum; refined hand reach67px passes unchanged numeric gates. Twelve640×448 frames, order1,2,3,4,4,3,5,5,6,7,1,1; native fourhit clocks2/5/8/11 mapart2/3/5/6. Contact reach92/97/67px; guard334/recoveries332/331px; exactguardreturn. Actual native launch moves both attacker and final victim: exactSA1 keeps strip airborne, ascent7/descent8 and landing9/10/11 follow actual physics using existing visualRecoveryMoveId. No combat/renderer/physics changes. Losslessstrip728984bytes; Yunentry12922972 below existing13MB. Localonly,no commit/push/deploy.


### Dudley SA1 Rocket Uppercut (local,2026-11-10)
Built-in image_gen original transparent2×4 source, reference dudley/sheet.png; exact prompt dudley/rocket-uppercut-prompt.txt. Twelve640×448frames, order1,2,3,3,4,4,5,5,6,7,7,1. Existing rising normalization/QA reused; short native startup2 adapted by reordering canonical normalized keys and metadata. All6contact poses2–7 pass unchanged original rising limits; centroid lifts51/51/44/44/54/54px. Exactguardreturn, softkneebendlanding. ExactDUDLEY_SA1 only; native singlehit/damage300/launch98/cost88 and attacker drift unchanged. Actualflight and landing use existing visualRecoveryMoveId; no combat/renderer/MGB changes. Losslessstrip388478bytes, entry10083830;10MB→11MB cap preserves all prior lossless art. Localonly,no commit/push/deploy.


### Alex SA3 Stun Gun Headbutt entry/whiff (local,2026-11-10)
Built-in image_gen original transparent2×4source, referencealex/sheet.png. Exactprompts alex/stun-gun-headbutt-prompt.txt and refinement-prompt.txt; firstattempt retained. Refined source preserves complete hair/boots in all8poses. Twelve640×448frames, order1,2,2,3,3,4,4,5,6,7,7,1; phase startup0–2/contact3–7/recovery8–11. Canonical rising normalization reused, exactguardreturn. Dedicated leapingheadbutt QA retains original contact/centroid/volume/leg/affine/return thresholds and all5actualcontacts; excludes uppercut-only raised-silhouette topRise criterion because headbutt tucks the crown. Old uppercut/rocket profiles unchanged; failed uppercut-profile report preserved. Native throw startup5/active6/recovery30/damage292/cost104/launch68/guardBreak retained; successful pairedthrow owns bothactors, so no new pairedart is claimed. Nativeinput whiff/latecatch/pairedpriority/escape/flight/landing checks pass. Browser also exposed oversized legacy paired/supervictim vectors; scoped body-only scale.6/rootY-34 aligns them with authored height while preserving physics, partner offsets and shadow.240geometrycases across roster/bosses pass; native vector style unchanged. Losslessstrip705742bytes; Alexentry14499678,14MB→15MB retains all prior losslessart. Localonly,no commit/push/deploy.


### Makoto SA2 Abare Tosanami (local,2026-11-10)
Built-in image_gen original transparent2×4 source, referencemakoto/sheet.png. Exactprompts makoto/abare-tosanami-prompt.txt and refinement-prompt.txt; firstattempt retained. One-foot source windup initially caused133px horizontalrootrange; refined bothfeetplanted windup passes unchanged82px limit at56.061px, with no extra bodyshift transforms. Sixteen640×448frames, order1,2,2,3,4,3,4,5,5,5,5,5,6,7,7,1; canonical12risingnormalization then deterministic16key/metric/offset expansion. Existing leaping quality helper reused without changing headbutt output; all9contacts3–11 additionally pass original legReach24–160/raisedfoot48–225/articulation criteria, reach93–98px. Native6hitclocks3/5/7/9/11/13 mapart3/4/5/6/7/8; initialgroundbounce and finalnative launch86 preserved, no inventedwalljump. Actualflight recovery11/12/13–15 followsphysics, exactguardreturn. Losslessstrip632868bytes; entry11910910 fits unchanged12MB cap. Fighter/CombatWorld/MoveLibrary/Visuals/MGB and previouspaired-size fix preserved. Localonly,no commit/push/deploy.


### Makoto SA3 Tanden Renki activation (local,2026-11-10)
Built-in image_gen original transparent2×4 source, reference makoto/sheet.png; exactprompts makoto/tanden-renki-prompt.txt and makoto/tanden-renki-transparency-prompt.txt, firstattempt retained. ActualRGBAalpha0–254 and8separatefigures verified (brownpreview was not an opaque background). Twelve640×448frames, order1,2,3,3,4,5,5,6,6,7,1,1; peakart4 isNONCONTACT andengine remainszero-damageinstall. OriginalGUARDqualitylimits plusall4chargeposes3–6: redwrapdrop45/41/51/51px, forwardreachbelowneutral. Recoveryheight313/304vs333guardfailed original94–103percent gate; newtanden-renki-recovery-sheet.png + exactrecovery-prompt reuse2×2pairedguard calibration, correctingruntime8/9to336px and10to334px. Explicit framegroups metadata preserves oldscalar/intrecipes. Existingaura/native600frames/power1.28/frame.96/move1.08/cost104/expiry/reapply unchanged; no physics/renderer/MGBchanges. Losslessstrip546376bytes; entry12457286,12MB→13MB preserves allpriorlosslessart. Localonly,no commit/push/deploy.


### Yun SA3 Genei Jin install activation (local,2026-11-10)
Built-in image_gen original transparent2×4 source, referenceyun/sheet.png. Exactprompts yun/genei-jin-install-prompt.txt and yun/genei-jin-install-layout-prompt.txt; firstattempt retained. Actualalpha0–254. Initialsource rows progressively shrank437/437/433/434/378/378/275/275px; equalrowlayout fixes allruntimeheights334/334/335/334/334/335/335/335/335/334/334/334, original94–103percentrecoverygate passes without correction. Twelve640×448frames, order1,2,3,4,4,5,5,6,6,7,1,1; exactYUN_SA3 only, distinctfrombasicYUN_SUPER/genei-jin attack. OriginalGUARDqualitylimits andall3focusposes2–4; upperretractions75/63/63px. Neutral-substitutionRED measured19pxfalseaccept underinitial12min; newonlyfocusmin strengthenedto24(existingauthoredarm-releasecue), oldprofiles unchanged. Existingnoncontactsampler/native720frames/power.94/frame.68/move1.18/cost104/yellowStage1aura/expiry/reapply retained. No damageincrease or newphysics. Losslessstrip646724bytes; entry13569696,13MB→14MB retains all29priorlosslessartrecords. Localonly,no commit/push/deploy.

## Ken airborne heavy punch (local,2026-11-10)
Original built-in image_gen6poses2x3; source and exact generation prompt in ken/air-heavy-punch-*. No rippedframes.12runtimeframes640x448 lossless472010bytes, exactKEN_AIR_HP only; nativeairtiming/damage/jump preserved. Airguard300px uniformscale with90pxheadtop/headaxis; allfeet tucked, no footlock/worldlift baked in. Contactreach98px, centroidstep10.591px, areaCV.051892; guardreturn visibleRGBA+alpha exact (WebP may alter invisibleRGB). Uses shared roster extraction/poseQA/WEBP/atomicwrite. New script build-air-normal.py; adversarialfixture14checks. Ken total255frames/28records,15,754,904bytes keeps existing16MBcap. Cache206. Prior vector size correction preserved.

## Ken airborne heavy kick (local,2026-11-10)
Original built-in image_gen6poses2x3, identity/style reference priorair-heavy-punch-sheet.png. Exactprompt/source in ken/air-heavy-kick-*.12runtimeframes640x448 lossless461820bytes, exactKEN_AIR_HK only; native8fbase startup/5factive/recovery/profile/knockdown preserved by nativeMoveData comparisons. Sameairguard300px/top90/headaxis andzerofootlock asairHP. Kick-specificcontact lowerreach157px beyondhands157px, footheightfraction.439851; centroidstep15.537px areaCV.047321, completebody292–306px. Existingbuilder/defaultpunchlimits preserved; --kind air-heavy-kick addskickrecipe. Sharedfixture20adversarial/preservationchecks, includingeverycontactguard/punch/plantedkick substitutions. Ken267frames/29records entry16,216,724bytes; increasecap16→17MBto retainalloldlosslessassets. Cache207. No commit/push/deploy.

## Ken airborne light punch (local,2026-11-10)
Original built-in image_gen4poses2x2; exactprompt/source in ken/air-light-punch-*.8runtimeframes640x448 lossless314818bytes exactKEN_AIR_LP quickleadjab only. Sourceorder1/2/3/3/4/4/1/1; startup0–1/contact2–3/recovery4–7. Existingairguard300px/top90/headaxis/nofootlock, newlightrecipe reusesstandinglightpose/reach24–105px gates, actualreach79px; centroidstep8.6253px/areaCV.024634/body300–301px. Existingheavyrecipes/records reproducible unchanged. Sharedfixture16adversarial/preservationchecks includesbadframecount andeverycontactkick substitution. Ken275frames/30records entry16,531,542bytes remainsunderexisting17MBcap. Cache208; nativephysics/hitwindows/damage/landingunchanged. No commit/push/deploy.

## Ken airborne light kick (local,2026-11-10)
Original built-in image_gen4poses2x2 with priorlightpunch/heavykick identity/style references; exactprompt/source in ken/air-light-kick-*.8runtime640x448frames, order1/2/3/3/4/4/1/1; lossless292126bytes/exactKEN_AIR_LK. Same300pxguard/top90/headaxis/nofootlock. Lightkicklowerreach71px, beyondhands85px, footfraction.438849, rootreach157px (heavy238), body297–300px/centroidstep8.928664/areaCV.0242. Newlightkicklimits24–140/rootmax210 distinguishshortsnapkick; existingheavykicklimits60–240 remainunchanged. Sharedfixture20checks includes eachcontactguard/punch/plantedkick/heavykick substitutions, wrongcount, source/runtimecorruption andatomicrollback. Ken283frames31records/entry16,823,668bytes<unchanged17MBcap. Cache209; nativegameplay/renderer/oldLP/HP/HK unchanged. No commit/push/deploy.

## Ken airborne medium punch (local,2026-11-10)
Original built-in image_gen6poses2x3 using priorairlight/heavypunch style/identityreferences; exactprompt/source in ken/air-medium-punch-*.10runtime640x448frames order1/2/3/4/4/5/5/6/1/1. ExactKEN_AIR_MP only, phase0–2startup/3–4contact/5–9recovery. Lossless472216bytes. Same300pxguard/top90/headaxis/nofootlock. Mediumreach38–145 actual77px; forwardfisttipfraction.307825 passes.18–.40 shouldergate; body296–300px/centroidstep6.824001/areaCV.033299. Existingfourairrecipes/source/metadata preserved; newfixture16checks coverswrongcount/eachcontactguard/kicksubstitutions pluscorruption/provenance/rollback. Ken293frames32records/entry17,295,884bytes; cap17→18MB preservesalloldlosslessart. Cache210; nativephysics/hitwindows/damage/knockdown/renderer unchanged. No commit/push/deploy.

## Ken airborne medium kick / JUMP KNEE (local,2026-11-10)
Original built-in image_gen6poses2x3, priorairMP/LK identity/style references; exactprompt/source in ken/air-medium-kick-*.10runtime640x448frames order1/2/3/4/4/5/5/6/1/1, lossless442460bytes, exactKEN_AIR_MK withnativeJUMPKNEElabel. Same300pxguard/top90/headaxis/nofootlock. Newknee-only colorgeometry: redkneeadvance34px/beyondguardhands41px/barefeetbehindknee54px/tipfraction.455264. Raisedkneeenteredoldhand-band, so guardskin/glovecolorselection correctsfalse433pxhandfrontto395px; original12pxkneebeyondhandminimum unchanged. Existingallfiveairrecipes/records preserved.20adversarial/preservationchecks covereachcontactguard/fullkick/punchsubstitutions, wrongcount andsource/runtime/provenance/atomicrollback. Ken303frames33records/entry17,738,344bytes<unchanged18MBcap;6/6airnormals authored (60runtimeframes/32originalkeydrawings). Cache211; nativephysics/hitwindows/damage/knockdown/renderer unchanged. No commit/push/deploy.

## Ryu airborne heavy punch / JUMP FIERCE (local,2026-11-10)
Original built-in image_gen6poses2x3 using approvedRyuHQidentity/style reference; originalprompt, targetedfeet-refineprompt andattempt1 retainedinryu/air-heavy-punch-*. Initialfoot/cuffspan114–124 failedexisting110pxgate; anatomicallyredrawnclosertuckedlegs pass69–79withoutchangingQAthresholds.12runtime640x448frames/order1/2/2/3/4/4/4/5/5/6/1/1/lossless450766bytes, exactRYU_AIR_HP withnativeJUMPFIERCElabel. Same300pxguard/top90/headaxis/nofootlock; reach58px/centroidstep5.155893/areaCV.039741/body300–305px. Existingairbuilder supportsvalidated --character RYU (onlyair-heavy-punch), defaultKENsixrecipes unchanged. Sharedfixture17rejection/preservationchecks coverswrongcharacter/kind/manifest, source/runtime/provenance/rollback. Ryu241frames27records/entry15,022,824bytes; cap15→16MB preservesall26priorlosslessrecords. Cache212. Kenfull303frames33records/6airnormals unchanged. No commit/push/deploy.

### Ryu airborne heavy kick / JUMP ROUNDHOUSE (2026-11-10)
Original six-pose transparent AI source `ryu/air-heavy-kick-sheet.png`, retained attempt1, generation and targeted leg-refinement prompts. Existing air-heavy-kick importer (`--character RYU`) creates12 lossless640x448 frames with exact airguard return, head-axis root, no foot-lock. All prior27 Ryu records and Ken artwork preserved. Attempt1 failed kickBeyondGuardHands3px; selected redraw passes151px without changing any numeric QA gate. Kick reach133px, footheight0.608, centroidstep16.524650, areaCV0.033797. Exact RYU_AIR_HK only; startup8/active5/recovery14/damage82/knockdowntrue unchanged. New420410bytes; Ryu entry15443234bytes stays within16MB. Deferred character-hq/cache213; built-in image_gen used.
RyuHK adversarial QA additionally requires a bare contact foot (>=75% skin pixels at silhouette tip): selected96.75%, substituted red punching glove28.37% rejected. Old gates and default Ken metadata unchanged; 23negative/preservationchecks passed.

### Ryu airborne light punch / AIR LP (2026-11-10)
Four original transparent jab drawings, eight lossless640x448frames, exactguardreturn/roothead-axis/nofootlock. Source `ryu/air-light-punch-sheet.png`, retainedattempt1, generationandarm-refinementprompts. Built-in image_gen used; deterministic existing air importer `--character RYU --kind air-light-punch`. Attempt1 authoredpose max.017238 failed old.018gate; targeted arm redraw passes unchangedgates. Shortreach87px, shoulderheight.238629, step6.071083, areaCV.023947. Reuses existing raisedPunchFist check for RyuLP to reject low heavyHP substitution;21negative/preservationchecks pass. DefaultKen and old28Ryu records unchanged. New256352B; entry15699586B under unchanged16MB. ExactRYU_AIR_LP startup4/active3/recovery8/damage32/knockdownfalse unchanged; deferredcharacterasset/cache214.

### Ryu airborne light kick / AIR LK (2026-11-10)
Four original transparent snapkick drawings,8lossless640x448frames via existing air-light-kick recipe, head-axisroot/exactairguardreturn/nofootlock. Built-in image_gen source `ryu/air-light-kick-sheet.png`, retainedattempt1, generationandheight-refinementprompts. Attempt1 footheight.400065 crossedguardhandband (beyondhands-1px); targetedcontactleg redraw passes oldgates withkickreach58px/beyondhands65px/rootreach137px/footheight.552541/step10.484120/areaCV.022947. Existing Ryu bareContactFoot check alsoapplies toLK (81.12% skin-tip vs75%minimum), rejecting punchingglove substitutions without duplicatingdetector/changingoldgates. All29oldRyurecords andKenmanifest remainidentical. New258024B; entry15957610B under unchanged16MB. ExactRYU_AIR_LK only, native4startup/3active/8recovery/32damage/knockdownfalse unchanged; deferredcharacterasset/cache215.

### Ryu airborne medium punch / AIR MP (2026-11-10)
Six original transparent drawings,10lossless640x448frames using existing air-medium-punch recipe, head-axisroot/exactairguardreturn/nofootlock. Built-in image_gen source `ryu/air-medium-punch-sheet.png`, retainedattempt1/2, generation/feet/arm-refinementprompts. Firstsource lowerfeet115–123px exceeded110; feetrefine67–76px passed butposemax.017546failed.018; targetedcontactarm redraw passesposeavg.008814/max.019163 withoutrelaxingnumericgates. Selectedreach85px/shoulderheight.280415/step11.783441/areaCV.036419;21negative/preservationchecks includeeverycontact swappedwithRyuHP. All30oldRyurecords andKenmanifest unchanged. New401894B makesentry16,359,504B; onlyRyu cap16→17MB retains everypriorlosslessstrip. Native6startup/4active/10recovery/52damage/knockdownfalse unchanged; exactRYU_AIR_MP/deferredcharacterasset/cache216.

### Ryu airborne medium side kick / JUMP SIDE KICK (2026-11-10)
NativeRYU_AIR_MK is JUMP SIDE KICK, distinct fromKen JUMP KNEE. Six originaldrawings/10lossless640x448frames, source `ryu/air-medium-kick-sheet.png`, retainedattempt1, generation/range-refinementprompts via built-in image_gen. Reuses existing footkick geometry andbarefootgate with RyuMK-only mediumreach:65–125kickdelta/155–210root/beyondhands24–140; oldKen knee branch andallpriornumericgates unchanged. Attempt1root233/delta140 tooheavy/prepfeet112>110; selectedtargetedlegredraw passesroot186/delta92/beyondhands96/feet56–105/step21.080098/areaCV.026383. Lowfoottrajectory[94,91,188,186,186,159,159,91,94,94] confirms preparation/contact connection. All25negative/preservationchecks includefootkick/punch/Ken-knee substitutions. New491126B; entry16850630B under unchanged17MB. All31oldRyurecords/Kenmanifest preserved; native6startup/4active/10recovery/52damage/knockdownfalse unchanged. Exactmapper/deferredasset/cache217. Ryu6/6airnormals:60runtimeframes/32originaldrawings.

### Chun-Li airborne heavy palm / AIR PALM (2026-11-10)
Six original openpalm drawings/12lossless640x448frames, source `chunli/air-heavy-punch-sheet.png` and generationprompt via built-in image_gen. Identity/style referenceonly: bluegoldqipao/whiteboots/buncovers/spikedwristbands; nativeCHUNLI_AIR_HP openpalm instead offist. Existingair-heavy-punch importer/oldnumericQA reused withHP-onlyCHUNLIselector; defaultKen/all6Ryu outputs preserved. Firstgenerationpasses poseavg.013338/max.024161/reach70/bootwidth66–72/step12.827053/areaCV.045959;18negative/preservationchecks. Old29Chunlirecords identical. New432550B makesentry17,187,562B; onlyChunlicap17→18MB (smallestwholeMB) preservesallpriorlosslessart. Native7startup/5active/13recovery/74damage/knockdownfalse unchanged; exactmapper/deferredasset/cache218.
Actualjump+HP regression exposed oldChunliairborne blanketguard. ExactCHUNLI_AIR_HP exemption added alongside existingantiAir/SA3; other5nativeairfallbacks and4ground-in-air identifiers remainrejected. REDlogs retained beforefix; fresh149command suite rerun.

### Chun-Li airborne heavy heel / AIR HEEL (2026-11-10)
Six original bootheel drawings/12lossless640x448frames, source `chunli/air-heavy-kick-sheet.png`, retainedattempt1 andgeneration/height-refinementprompts via built-in image_gen. Existing heavykick geometry/oldnumericgates unchanged; no skin gate usedforwhiteboots. Attempt1bootenteredhandband(beyond0px/footheight.42555); targetedcontactleg redraw passes kickdelta131/beyondhands142/footheight.619408/bootspan49–69/step17.166706/areaCV.042498. ExactCHUNLI_AIR_HK addedtosampler alongsideexistingHP/antiAir/SA3; remaining4airfallbacks/groundedinflightguards preserved. New444514B; entry17632076B under unchanged18MB. All30oldChunlirecords/Ken/Ryu manifests unchanged. Native7startup/5active/13recovery/74damage/knockdowntrue unchanged; deferredcharacterasset/cache219.

### Chun-Li airborne light jab / AIR LP (2026-11-10)
Four originalclosedfistjab drawings/8lossless640x448frames, source `chunli/air-light-punch-sheet.png` andgenerationprompt via built-in image_gen. FirstsourcepassesoldQA:reach85/bootspan61–66/step7.580865/areaCV.022278. HeavyAIRPALMsubstitution RED exposedreach-onlyacceptance; scopedChunliLP reusesfarthest8pxtipgeometry: shoulderband.18–.40 andclosedfistheight<=36px at300reference. ActualLP27px vsPALM56px;22negative/preservationchecks pass. Noothercharacter/oldnumericQA changes. ExactCHUNLI_AIR_LP airsamp exception only; other3airfallbacks/ground-in-airreject preserved. New277534B; entry17909610B underunchanged18MB, all31oldChunlirecords andKen/Ryu manifests identical. Native3startup/3active/7recovery/29damage/noKD unchanged; deferred/cache220.

### Chun-Li airborne light kick (2026-11-10)
Four original transparent poses / eight runtime frames, generated with built-in image_gen using the adjacent generation prompt and prior Chunli identity reference. Short bent-knee white-boot toe kick, both hands remain guarding; native AIR LK timing 3/3/7, damage29/no knockdown unchanged. Shared deterministic light-kick importer and all existing numeric gates reused unchanged; 24 adversarial/preservation checks pass. First generation passed: 280560-byte lossless strip; Chunli total307frames/33records, entry18190170B. Only Chunli cap18MB→19MB to preserve all32 prior lossless records. No additional dependencies.

### Chun-Li airborne medium punch (2026-11-10)
Six original transparent full-body poses / ten runtime frames, built-in image_gen with adjacent generation prompt and Chunli identity reference. Articulated shoulder-height closed-fist straight punch, windup/extension/recoil; boots stay tucked, rear fist guards. Native5/4/9 timing,47damage/no knockdown unchanged. First source passed existing pose/volume/reach/root QA. Heavy open-palm substitution accepted before compact-fist check (RED); reuse existing Chunli LP compact tip-height<=36px for MP too (newMP29 vs oldpalm56), no new numerical thresholds/dependencies.22 negative/preservation checks pass. New479306B; total317frames/34records/entry18669476B under unchanged19MB cap. All33 prior records unchanged.

### Chun-Li airborne medium kick (2026-11-10)
Six original poses / ten runtime frames complete all6Chunli airborne normals (60frames/32drawings). Native FLYING SIDE KICK5/4/9/47/noKD unchanged. Built-in image_gen, adjacent prompt; initial opaque draft rejected, alpha refinement, contact length and half-extension refinement. Shared Ryu sidekick numeric geometry preserved; Chunli white boots skip Ryu barefoot-skin gate. Adversarial LK substitution accepted RED: scoped heel-tip height>=24px distinguishes medium sole31px vs light toe18px. Pre-contact overshoot observed RED: corrected original poses3/5 and require contactExtensionPeak for ChunliMK only. Final tip reach path [88,135,141,179,179,137,137,91,88,88].27negative/preservationchecks. New470804B, total19140280B/327frames/35records; only Chunli entry cap19→20MB to preserve34prior lossless records.

### Alex airborne heavy punch (2026-11-10)
Six original transparent poses / twelveframes for native AIR HAMMER9/5/15/93/noKD. Built-in image_gen firstsource with adjacent prompt/identityreference. Existingheavy-punch geometry/pose thresholds unchanged. NewALEX:HP-only hammercontacttip .42–.65bodyheight anddownwarddrop>=.15 fromlastwindup; actual .534/.264drop. GenericQA accepted65pxraisedfist RED;21adversarial/preservationchecks nowpass. New526030B; entry15025708B,275frames/30records; Alexcap15→16MB preserves29priorlosslessrecords. ExactHPonly; fiveotherairnormals retainfallback, grounded special-in-air exclusions unchanged.

### Alex airborne heavy kick (2026-11-10)
Six original poses/twelveframes fornative FLYING BIG BOOT9/5/15/93/knockdowntrue. Built-in image_gen adjacentprompt/identityreference; original plus2contactheight/raisedknee refinements. ExistingQA unchanged: firstcandidate rejected becausebootenteredguardhandband andpreparationfeetwidth112>110; firstrefinementcontacttoolow; finalsource passes allgates/24negativechecks. Tipreachpath[117,126,126,171,190,190,190,151,151,120,117,117] peaksatcontact. New538370B; total15564078B/287frames/31records underunchanged16MBcap. All30priorrecords preservedincludingAIRHAMMER. FourremainingAlexairnormals keepfallback.

### Alex airborne light punch (2026-11-10)
Four original transparent poses/eightframes fornative AIR LP5/3/9/36/noKD. Built-in image_gen firstsource withadjacentprompt/reference. GenericQA acceptedheavyhammer atbothjabcontacts RED; reusedexistingRYU LP raisedtipband .18–.40 forAlexLPonly, actualjab .26046 vshammer .53417. No newnumericthresholds/dependencies;22negative/preservationchecks pass. New333906B;entry15897984B/295frames/32records underunchanged16MBcap. All31oldrecords preservedinclHP/HK; other3Alexairfallback/specialgroundguard unchanged.

### Alex airborne light kick (2026-11-10)
Four original transparent poses/eightframes fornative AIR LK5/3/9/36/noKD. Built-in image_gen firstsource withadjacentprompt/reference. GenericlightkickQA acceptedheavyhammer RED. Reusefootlevelcheck withAlexLK-only minimum .58(default.35unchanged); actualshorttoe.62172 vs hammer.53417/heavyboot.51478. Allothernumericgates unchanged;24negative/preservationchecks pass. Tipreachpath[110,133,173,173,117,117,110,110] peaksatcontact. New314022B; entry16212006B/303frames/33records. Alexcap16→17MB tokeep32priorlosslessrecords, only102016Bheadroompreviously. Other2Alexairfallback/specialgroundguard unchanged.

### Alex airborne medium punch (2026-11-10)
Six original transparent poses/10frames fornative AIR MP7/4/11/59/noKD. Built-in image_gen original+bootanklerefinement withadjacentprompt/reference. Initialfeetwidth117–119>110rejected; selectedboots60–63px. Existingmedium-punch/raisedfistQA numericgates unchanged;22negative/preservationchecks passincludinghammer/HKsubstitutions. New498014B;entry16710020B/313frames/34records underunchanged17MBcap. All33oldrecords preserved, remainingMKfallback/specialgroundguard unchanged. Windowfreevalidation: nativeCombatWorld/sampler/actualdrawImage sourcecrop assertions andsavedRGBAframepreviews; no browseropened.

### Alex airborne medium knee (2026-11-10)
Six original transparent poses/10frames completeall6Alexairnormals60frames/32drawings. NativeJUMPKNEE7/4/11/59/noKD unchanged. Built-in image_gen firstsource withadjacentprompt/reference. Genericenvelope acceptedHP/HK RED. AlexMK-only olivecloth knee:reuseKenreach20–120/handbeyond12–160/foldedbootbehind12–200/kneelevel.40–.75; requireleadingoliveclothgap<=8px andbroadtip>=35px (native40vshammer30/HK26/LK14). ExistingKenredknee/Ryu+Chunlisidekick/defaultQA numericgates unchanged.30negative/preservationchecks includeall5otherAlexairnormal substitutions andKenredknee. New515514B;entry17225534B/323frames/35records; cap17→18MBkeeps34priorlosslessrecords. No windowsopened; actualrendercrop/nativeworld andstaticframepreview.

### Dudley airborne heavy cross (2026-11-10)
Six original transparent poses/12 runtime frames for native JUMP CROSS 7/5/12/84/noKD. Built-in image_gen original plus two arm-silhouette refinements; first two sources failed unchanged ECC max0.018 threshold (0.017650/0.017959); selected original passes. Generic envelope accepted Alex hammer substitution RED; reuse existing raised fist band .18–.40 for DudleyHP only (actual .244651 vs hammer .53417). Preserve every existing numeric threshold and other character selectors. New353764B; entry10437594B/279frames/30records under unchanged11MB cap. All29priorlosslessrecords preserved; other5Dudleyairnormal fallbacks unchanged. Exact DUDLEY_AIR_HP mapping/deferred character-HQ/cache230. Window-free native draw-source-crop/jump/hitstop tests and static frame previews, not browser screenshots. Source and prompt siblings preserve all attempts/provenance.

### Dudley airborne heavy sway kick (2026-11-10)
Six original transparent poses/12 runtime frames for native AIR SWAY KICK 7/5/12/84/knockdown. Built-in image_gen firstsource with adjacent generation prompt; reuse reference identity only, newly authored knee/shin/foot extension and return. Existing heavy-kick QA numerical gates unchanged: foot reach154px, shoe143px beyond gloves, footlevel.52999, feetwidth54–90, centroidstep31.49238, poseECCavg.022343/max.039445. New357106B; entry10794700B/291frames/31records under unchanged11MB cap. All30priorlosslessrecords preserved including JUMP CROSS; other4Dudleyairfallbacks and rising/grounded special guards unchanged. Exact DUDLEY_AIR_HK mapping/deferred character-HQ/cache231. Window-free native drawImage sourcecrop/jump/hitstop verification and static frame previews, not browser screenshots.

### Dudley airborne light jab (2026-11-10)
Four original transparent poses/eight runtime frames for native AIR LP3/3/7/33/noKD. Built-in image_gen original plus arm/recovery refinements; firsttwoattempts rejected unchanged ECC.008/.018gates (.007163/.014700 and .007905/.018376). Selectedavg.009487/max.019141passes. Genericlight-punchQA acceptedheavycrosscontact RED; DudleyLP-only reachmax65 rejects cross, nativejabreach46; reuse existingraisedfistband.18–.40 (actual.24764), allothernumericthresholdsunchanged.22negative/preservationchecks includeHP/HKwrongcontact. New231266B;entry11025966B/299frames/32records. Cap11→12MB scopedDudley since205300Bpriorheadroom<231266Blosslessstrip; all31priorrecords preserved. Three dedicatedDudleyairnormals32frames/16originaldrawings; remainingMP/LK/MKfallbackunchanged. ExactDUDLEY_AIR_LP/deferredcharacterHQ/cache232. Window-free nativeworld/actualdrawsourcecrop/jump/hitstop andstaticframepreview, notbrowsercapture. Prompt/sourceattemptsiblingspreserveprovenance.

### Dudley airborne light snap kick (2026-11-10)
Four original transparent poses/eight runtime frames for native AIR LK3/3/7/33/noKD. Built-in image_gen firstsource and adjacent generation prompt/reference identity. Existinglightkick numerical QA unchanged: feetwidth72–89, contactkickreach86px, shoe82px beyondgloves, tiproot169px andfootlevel.67705 distinguish shortbentlegkick fromlongHK/punches. ECCavg.017378/max.031205 passes unchanged. New236762B;entry11262728B/307frames/33records underunchanged12MBcap. All32priorlosslessrecords preserved, fourdedicatedDudleyairnormals40frames/20originaldrawings; remainingMP/MKfallback unchanged. ExactDUDLEY_AIR_LK/deferredcharacterHQ/cache233. Window-free actualdrawsourcecrop/nativeworld/jump/hitstop andstaticframepreview, notbrowsercapture.

### Dudley airborne medium punch (2026-11-10)
Six original transparent poses/10runtimeframes for nativeAIR MP5/4/9/54/noKD. Built-in image_gen firstsource/adjacentgenerationprompt/referenceidentity. GenericmediumQA acceptedheavycrosscontact RED; scopeDudleyMP reach55–70pixels (native59, wrongHP77/LP51) to reject incorrect light/heavy substitutions atbothcontactframes. Existingraisedfistband.18–.40 unchanged, actualtip.258; allothercharacters/QAthresholds unchanged. New358550B;entry11621278B/317frames/34records underunchanged12MBcap. All33priorlosslessrecords preserved; fivededicatedDudleyairnormals50frames/26originaldrawings, remainingMKfallbackunchanged. ExactDUDLEY_AIR_MP/deferredcharacterHQ/cache234. Window-free actualdrawsourcecrop/nativeworld/jump/hitstop andstaticframepreview, notbrowsercapture.

### Dudley airborne body blow / complete six air normals (2026-11-10)
Six original transparent poses/10runtimeframes for nativeMK JUMP BODY BLOW5/4/9/54/noKD, aclosedglovebodypunch. Built-in image_gen original+armrefinement withadjacentprompts/referenceidentity; firstsource rejectedECCmax.017839<unchanged.018, selectedavg.009985/max.020340passes. ExcludeDudleybodyblowonlyfromKenredkneebranch. Genericenvelope acceptedupperpunchRED; reuseexistingtipbandmechanismwithDudleyMK-onlybodyPunchLevel.42–.50 (actual.455). Height-onlystillacceptedKenredkneeRED; requireleadingnavyglovefraction>=.75 withB>G*1.08/B>R*1.05 (native.98333 vsredknee0,heavyshoe.01835/lightshoe.06557/hammer0). Othercharacters/defaultnumericgatesunchanged.32negative/preservationchecks includeall5Dudleyairnormal substitutions, Kenknee, Alexhammer. New390282B;entry12011560B/327frames/35records. Cap12→13MB scopedDudley because378722Bheadroom<390282Blosslessstrip; preserve34priorrecords. All6Dudleyairnormals60runtimeframes/32originaldrawings haveuniqueassets. ExactDUDLEY_AIR_MK/deferredHQ/cache235. Window-free actualdrawsourcecrop/nativeworld/jump/hitstop andstaticframepreview, notbrowsercapture.

### Makoto airborne karate fist (2026-11-10)
Six original transparent poses/12runtimeframes for nativeAIR KARATE FIST8/5/14/97/noKD. Built-inimage_gen original+lowerleg/gihemrefinement; firstsourceauthoredposepassedbutflaringhemsmadebottomfootband125–146>unchanged110. Selected53–58px/ECCavg.013015/max.020738/reach77passes. GenericHPQA acceptedAlexhammerRED ->reuseexistingraisedfistband.18–.40 (native.37613); height-onlyacceptedChunliopenpalmRED ->reuseexistingcompactfistmax36(native30vsopenpalm56). No newnumericthresholds; scopedMakotoHPonly. New382426B;entry12839712B/279frames/30records underunchanged13MBcap. All29priorlosslessrecords preserved; fiveotherMakotoairfallbacks/groundedandrising specialguards unchanged. ExactMAKOTO_AIR_HP/deferredHQ/cache236. Window-free actualdrawsourcecrop/nativeworld/jump/hitstop andstaticframepreview, notbrowsercapture. Adjacentprompts/attempt1source preserveprovenance.

### Makoto airborne flying kick (2026-11-10)
Six originaltransparentposes/12runtimeframes fornativeFLYING KICK8/5/14/97/knockdown. Built-inimage_gen original+frontlegheightrefinement, adjacentprompts/attempt1/referenceidentity. Initialcontactfoot.781>unchanged.70rejected; selected.55962/ECCavg.017269/max.030451/feet57–83/reach107/beyondhands117passes. GenericHKQAacceptedAlexhammerRED; reuseexistingRyu/Chunlisidekickrootwindow155–210 forMakotoHKonly(native183vsownHP145/hammer148). No newnumericthresholds. New400510B;entry13240222B/291frames/31records. Cap13→14MBscopedMakoto because160288Bpriorheadroom<400510Blosslessstrip; preserve30priorrecords/HP. RemainingLP/MP/LK/MKfallbacks unchanged. ExactMAKOTO_AIR_HK/deferredHQ/cache237. Window-freeactualdrawsourcecrop/nativeworld/jump/hitstop andstaticframepreview,notbrowsercapture.

### Makoto airborne short karate jab (2026-11-10)
Fouroriginalposes/eightruntimeframesfornativeAIR LP4/3/8/38/noKD. Built-inimage_gen original+twoarm/winduprefinements, adjacentprompts/threeattemptsources. Shortjabreach41 remainslessthanHP77. Afterthreeattempts, full-framealpha/ECCmax.013139<.018 despiteaverage.008252pass andvisiblejointmotion: scopedMakotoLP uses upperbodyROI[0,90,640,264] withUNCHANGED.008/.018thresholds plusfullbodyaveragefloor.008 andallglobalvolume/feet/jump/returngates. StorefullBodyQa/upperBodyQa/regionexplicitly; moduleheightrestoredfinally/cachekeysincludemaskshape. Frozen-arm/leg-motionfake passesoldfullbodyECC(.016111/.023370) butnewupperbodyECC0rejects; failureinjectionconfirmsheight448restored. GenericacceptedHPRED; reuseexistingDudleyLPmaxreach65/raisedband.18–.40 andMakotoclosedfistmax36(native28).28negative/preservationchecks includeHP/hammer/openpalm,unchanged/affinecopies,frozenarms,write/regionfailure. New246758B;entry13486980B/299frames/32records underunchanged14MBcap; all31priorrecords preserved, other3Makotoairfallbacks unchanged. ExactMAKOTO_AIR_LP/deferredHQ/cache238. Window-freenativeworld/actualdrawsourcecrop/jump/hitstop/staticframepreview,notbrowsercapture.

### Makoto airborne short snap kick (2026-11-10)
Fouroriginalposes/eightruntimeframesfornativeAIR LK4/3/8/38/noKD. Built-inimagegenoriginal+twofrontlegheightrefinements, adjacentprompts/attemptsources. Initialfoot.8535/span189failed; second.74655stilllow; selected.66439/span68/root134/reach51/beyondhands64passesallsemantic/stabilitygates. CompactkickfullbodyECCavg.009692passes/max.017928<.018; reuseMakotoLPregionaljointQAforLKlowerbodyROI[0,210,640,448] withunchanged.008/.018andfullbodyavgfloor.008; loweravg.018042/max.034093. LPmetadataretainedexactly/allotherrecipesunchanged. Frozenlegs/uppermovementfakepassesoldwholebodyECC(.020176/.028565)butlower0rejects; forcedregionfailureheightrestores448. GenericHKsubstitutionacceptedRED ->reuseexistingAlexLKfootminimum.58(native.66439vsHK.55962); othernumericthresholdsunchanged.30negative/preservationchecks includeHP/HK/LP/hammer,frozenlegs,restoration. New263644B;entry13750624B/307frames/33records underunchanged14MBcap. All32priorrecords preserved; fourdistinctMakotoairnormals40frames/20drawings, remainingMPMKfallbackunchanged. ExactMAKOTO_AIR_LK/deferredHQ/cache239. Windowfreenativeworld/actualdrawsourcecrop/jump/hitstop/staticframepreview,notbrowsercapture.


### Makoto AIR MP — local authored medium punch

Six original transparent poses become ten lossless 640×448 runtime frames (391,140 bytes), selected only by MAKOTO_AIR_MP. Built-in image generation produced the sheet; generation and successive range refinement prompts are stored alongside it. Final contact reach55 is between the own LP substitution46 and HP78; reuse the existing Dudley medium-punch55–70 gate for Makoto, plus raised closed-fist checks. Four source attempts are retained for provenance.

Reuse Makoto upper-body joint QA [0,90,640,264] with unchanged .008/.018 thresholds and .008 full-body average floor. Full-body residual .011244/.017445; upper-body .024121/.043465. Frozen arms with moving legs must fail, and injected regional failures restore448px render height. All global stability gates remain: feet span57–60, centroid step8.670943, areaCV.022241. Thirty negative/preservation fixtures pass.

Makoto now has five distinct authored airborne normals,50 runtime frames/26 original drawings; MK keeps fallback. Preserve all33 prior manifest records and lossless assets. Entry317frames/34records/14,141,764bytes exceeds the old14MB cap by141,764; raise only Makoto cap to15MB rather than recompress prior art. Native6/4/10/61/noKD fields, rising specials and engine files unchanged. Deferred HQ/cache240; no windows, commits, pushes or deployment.


### Makoto AIR MK — authored JUMP KNEE

Six original transparent drawings, ten lossless640×448 frames for native MAKOTO_AIR_MK/JUMP KNEE,6/4/10/61/noKD unchanged. Generated with built-in imagegen; source and exact prompt stored alongside. Makoto now has all six distinct airborne normals,60runtimeframes/32originaldrawings.

Reuse Alex knee joint/semantic checks with off-white gi mask scoped to Makoto; no regional QA extension or threshold reduction required. Fullbody affine residual .019351/.033663 passes existing.008/.018 thresholds. Knee reach59, beyond guarded hands65, folded bare feet37 behind, tipheightfraction.574943, broadcloth46px, leadinggap0. Feet span60–81, centroidstep11.686212, areaCV.034371.

Adversarial Alex knee was initially accepted (recordedRED). Reuse offwhite predicate at outer8px and established.75 fraction gate: native.890785 vs Alex.373913/Ken0. Require actual named semantic false for MP/MK wrong-peer tests; punch/straightkick/olive/redknee substitutions reject. Preserve all34previousMakotorecords/previousassets. Newstrip425630bytes; entry14567394bytes/327frames/35records remains under15MBcap. DeferredHQ/cache241; no windows/commits/push/deploy.


### Yun AIR HP — original AIR PALM

Six original transparent drawings become twelve lossless640×448runtimeframes for exact YUN_AIR_HP/AIR PALM. Built-in imagegen source and original/tuck-refinement prompts retained. Native7/5/11/75/noKD unchanged, remainingfiveairnormalsfallback. Initial source feet/cuffspan111–121 rejected; lowerlegrefinement final75–80 passes unchanged110maximum. Fullbodyaffine .019536/.034757 passes unchanged.008/.018; noROIchange. Contactreach74, centroidstep11.993856,areaCV.044039,handlevel.240979.

WrongMakotoclosedfist acceptedRED; reuse tipheight measurement with min36 forYunopenPalmProfile, native60 vsMakoto30, andexistingraisedband. Require actual named false for palm/hammer substitution.23negative/preservationfixtures pass. Preserve30oldYunrecords/alloldart. Newstrip493660B exceeds430304Bheadroom;entry14063356B/291frames/31records needsYun15MBcap only, preserving losslesspriorart. DeferredHQ/cache242, no windows/commits/push/deploy.


### Yun AIR HK — original DIVE ROUNDHOUSE

Six original drawings/twelve lossless640×448frames, exactYUN_AIR_HK native7/5/11/75/KDtrue unchanged. Built-inimagegen source/prompt/tuckrefinementretained. Initialwindupfootspan113 exceeds110→refineonlyrearshoe/cuff yields88. FinalglobalECC0.029338/0.052397 passes unchanged.008/.018, noROIchange. Feet70–98, centroidstep29.27474, areaCV.082175; footlevel.54455, kickreach142/beyondhands103.

Alexhammer acceptedRED→reuseexistingrootreachgate155–240 forYunHKonly; native221 vsAlex148/ownHP177(rejectedbyotherkickgates). Intended semanticfalseassertions prove rejection.26negative/preservationfixtures pass. Preserve31oldrecordsandalloldart. Newstrip530856B;entry14594212B/303frames/32records remainsunder15MBcap. ExistingHPdistinct,remainingLP/MP/LK/MKfallback. DeferredHQ/cache243;no windows/commits/push/deploy.


### Yun AIR LP — original compact airborne jab

Four original transparent drawings/eight lossless640×448frames for exactYUN_AIR_LP; native3/3/7/29/noKD unchanged. Built-inimagegen sourceandprompt retained. Noimagerefinement/ROIchange/thresholdreduction needed: globalECC0.009473/0.018876 passes.008/.018,feet67–73,centroid9.499745,areaCV.031316. Shortreach36,raisedtip.33458,closedfist30px.

WrongownHPopenpalm acceptedRED→reuseDudley/MakotoLPmaxreach65/raisedband.18–.40 andexistingcompactfistmax36; native30vsownpalm60. Expectednamedsemanticfalse assertions prove ownpalm/Alexhammerrejection.23negative/preservationfixtures pass. Preserve32oldrecordsandallpriorart;newstrip302450B,entry14896662B/311frames33records staysunder15MBcap. ThreeauthoredYunairnormals32runtimeframes16originaldrawings;MP/LK/MKfallback. DeferredHQ/cache244;nowindows/commits/push/deploy.


### Yun AIR LK — original short airborne snap kick

Fouroriginaltransparentdrawings/eightlossless640×448frames exactYUN_AIR_LK; native3/3/7/29/noKD unchanged. Built-inimagegen source/prompt retained; no refinement/ROI/thresholdreductionneeded. FullbodyECC.014712/.029686 passes unchanged.008/.018. Feet69–90,centroidstep14.278866,areaCV.01591,kickreach60/beyondhands59/rootreach136.

Alexhammer acceptedRED→reuseexistingAlex/MakotoLKfootmin.58 (native.682111vsYunHK.54455). Actualnamedsemanticfalse assertions prove hammer rejection; existingownHKswaprejects shortrootgate221>210.25negative/preservationfixtures pass. Preserve33oldYunrecordsandalloldart. Newstrip290444B exceedsprevious103338Bheadroom;entry15187106B/319frames34records requiresYun16MBcap only, preservinglosslesspriorart. FourauthoredYunairnormals40frames20originaldrawings;MP/MKfallback. DeferredHQ/cache245;no windows/commits/push/deploy.


### Yun AIR MP — original medium closed-fist strike

Sixoriginaldrawings/tenlossless640×448frames exactYUN_AIR_MP native5/4/8/47/noKD unchanged. Built-inimagegen source/prompt retained,noartrefinement/ROIchange/QAthresholdreduction. GlobalECC0.01623/0.029178 passes.008/.018;feet78–82,centroidstep5.047749,areaCV.049747. Contactfist29px,level.34064.

GenericownHP/LPacceptedRED. Actualhead-axiscontactreachMP161 liesbetweenLP117/HP177; closedguard-relative96 differsfromexistingDudley/Makoto55–70, so reusehead-axisroot155–210 andcompactfistmax36 instead ofdistortingart. OwnLP117failsroot;ownHP60pxpalmfailscompact;Alexhammerfailsraisedband. Existingrootmeasurementmovedoutofkick-onlyblock, existingkickmetadataorderpreserved;root-gatedkickruntime/negativechecks includedinexpanded184suite.25newingestfixturespass.

Preserve34oldYunrecords/alloldart.Newstrip468086B;entry15655192B/329frames35records staysunder16MBcap. FiveYunairnormals50frames26originaldrawings;MKfallback. DeferredHQ/cache246;nowindows/commits/push/deploy.


### Yun AIR MK — original FLYING KICK completes airborne normals

Sixoriginaldrawings/tenlossless640×448frames exactYUN_AIR_MK native5/4/8/47/noKD unchanged. Built-inimagegen source/prompt andcontact/alpha refinementsretained. Initialfoot.41765 overlappedhandband, loweringattempt.77730 failed.35–.70band; finalgeometryandtransparentalpha pass withoutQArelaxation. Finalfoot.602025,root178,kickreach110,beyondhands98,feet68–77,centroidstep14.190515,areaCV.048636. GlobalECC.025106/.04585 passesunchanged.008/.018,noROIchange.

ReuseRYU/CHUNLI sidekickrecipe65–125reach/155–210root/140beyondmax; ownLK136andHK221 rejectrootgate, ownHP rejectskickBeyondGuardHands. Kenkneealsorejected;25negative/preservationfixturespass. No newsemanticthresholds. Preserve35oldYunrecords/alloldart.473448Bnewstrip exceeds344808Bheadroom;entry16128640B/339frames36records needsYun17MBcap only, preservinglosslessoldart. AllsixYunairnormalsnowdistinct60frames32originaldrawings. DeferredHQ/cache247;nowindows/commits/push/deploy.


### Urien AIR HP — original airborne heavy fist

Sixoriginaltransparentdrawings/twelvelossless640×448frames exactURIEN_AIR_HP;native8/5/13/97/noKD unchanged. Built-inimagegen source/original/tuckrefinementprompts retained. Initiallowerband118–134 failed110→raise/tuckkneescalves imagegenrefinement yields65–83 withoutshrinkingbody orQArelaxation. GlobalECC.014985/.02727 passesunchanged.008/.018,noROI. Contactreach87,centroidstep20.440079,areaCV.044796.

Alexhammer acceptedRED→reuseexistingraisedtipband.18–.40/compactfistmax36;nativefist36/level.260664,Chunliopenpalm56 rejectscompact. Actualnamedfalseassertions prove intendedgates.23negative/preservationfixturespass,selectorURIENHPonly. Preserve27oldrecordsandalloldart. Newstrip441080B;entry11753718B/251frames28records staysunder12MBcap unchanged. Otherfiveairnormalsfallback. DeferredHQ/cache248;nowindows/commits/push/deploy.


### Urien AIR HK — original heavy bare-foot kick

Sixoriginaldrawings/twelvelossless640×448frames exactURIEN_AIR_HK/native8/5/13/97/KDtrue unchanged. Built-inimagegen source/original/prep/contact/alpha promptsretained. Prepfootspan129>110→raise/tuckfrontfoot33; latercontacttoeinhandband causedkickBeyond7<24→smallcontactlowering, thenopaquealpharejected/repairedusingimagegenonly. Finalfeet33–73,footlevel.4899,kickreach122/beyondhands131/root209. GlobalECC.021323/.037194 passesunchanged.008/.018,noROI/QArelaxation.

AlexhammeracceptedRED→reuseexistingYunHKroot155–240, native209vsAlex148; actualnamedfalseassertions.25negative/preservationfixturespass. Preserve28oldrecordsandalloldart.455916Bnewstrip exceeds246282Bheadroom;entry12209634B/263frames29records needsUrien13MBcap only,preservinglosslesspriorart. Twoairnormals24frames12originaldrawings;LP/MP/LK/MKfallback. DeferredHQ/cache249;nowindows/commits/push/deploy.


### Urien AIR LP — original short airborne jab

Fouroriginaldrawings/eightlossless640×448frames exactURIEN_AIR_LP/native4/3/8/38/noKD unchanged. Built-inimagegen source/promptretained;noartrefinement/ROI/thresholdreduction. FullbodyECC0.0088/0.021291 passesunchanged.008/.018;feet60–65,centroid13.44792,areaCV.035153. Contactreach34,raisedtip.266231,closedfist34px.

OwnHPacceptedRED→reuseexistingLPmaxreach65/raisedband.18–.40 andcompactfistmax36. OwnHPfailsreach/Alexhammerraisedband/Chunlipalmcompact,actualnamedfalseassertions. URIENunsupportedLKfixtureappliesallthreeairkinds. Preserve29oldrecordsandalloldart. Newstrip302062B;entry12511696B/271frames30records remainsunder13MBcap unchanged. Threeairnormals32frames16drawings;MP/LK/MKfallback. DeferredHQ/cache250;nowindows/commits/push/deploy.


### Urien AIR LK — original short downward snap kick

Fouroriginaldrawings/eightlossless640×448frames exactURIEN_AIR_LK/native4/3/8/38/noKD unchanged. Built-inimagegen original/contactrefinementprompts retained. Firstfoot.47469 lookedtooclosetoHK.4899→contact-onlyloweringfinal.676159,shortroot140/kickreach54/beyondhands57. Feet68–108,centroid12.146261,areaCV.006833;globalECC0.009567/0.020334 passesunchanged.008/.018,noROI.

WrongownHKacceptedRED→reuseexistingAlex/Makoto/YunLKfootmin.58 forUrientoo. OwnHK.4899/Alexhammer/ownLP nowrejectexpectedraisedContactFootfalse;27negative/preservationfixturespassincludingunsupportedMP. Preserve30oldrecords/alloldart. Newstrip288278B;entry12799974B/279frames31records staysunder13MB unchanged. Fourdistinctairnormals40frames20drawings;MP/MKfallback. DeferredHQ/cache251;nowindows/commits/push/deploy.


### Urien AIR MP — original medium airborne fist

Sixoriginaldrawings/tenlossless640×448frames exactURIEN_AIR_MP/native6/4/10/61/noKD unchanged. Built-inimagegen source/promptretained,noartrefinement/ROI/thresholdreduction. FullbodyECC.011965/.023526 passesunchanged.008/.018;feet66–80,centroid15.374908,areaCV.043503. Contactreach70,raisedtip.257333,closedfist34px.

OwnHPacceptedRED→reuseDudley/MakotoMP55–70contactreach pluscompact36 anddefaultmediumraisedband. OwnHP/LPfailreach,Alexhammerraisedband,Chunlipalmcompact;actualnamedfalseassertions.27negative/preservationfixturespassinclunsupportedMK. Preserve31oldrecords/alloldart.458408Bnewstrip exceeds200026Bheadroom;entry13258382B/289frames32records requiresUrien14MBcap only,preservinglosslesspriorart. Fiveairnormals50frames26drawings;MKfallback. DeferredHQ/cache252;nowindows/commits/push/deploy.


### Urien AIR MK — complete six airborne normals

Six original drawings / ten lossless 640×448 frames, exact URIEN_AIR_MK, native 6/4/10/61/no knockdown unchanged. Built-in imagegen plus two contact-leg refinements retain source attempts and prompts. Full-body ECC .015944/.029344 passes unchanged .008/.018; tucked feet 39–93, centroid step 10.316599, area CV .019238. Medium contact root reach 172 versus LK 140 and HK 209. Wrong-HK accepted RED led to URIEN MK-only maximum 190 (minimum 155); other recipes unchanged. 25 negative/preservation checks include explicit false semantic gates and unsupported selector. New strip 430646 bytes; total 13689028 bytes / 299 frames / 33 records remains within existing 14MB cap. Six dedicated air normals / 60 runtime frames / 32 original drawings. Deferred HQ/cache253. Window-free native runtime and static crop QA; no commit, push or deployment.


### Gill AIR HP — original airborne blue-arm fist

Six original drawings / twelve lossless 640×448 frames, exact GILL_AIR_HP / native 8/5/13/102/noKD unchanged. Built-in imagegen; initial spread lower-body rejected (bottom15% widths145–160 >110), lower-body-only refinement brought widths71–97. Full-body ECC .022444/.039072 passes unchanged .008/.018; centroid14.24194/areaCV.015021. Contact reach126, fist level.330978, closed fist33px. Wrong Alex hammer accepted RED: reuse raised fist band .18–.40 and compact fist maximum36 for Gill HP; explicit false assertions reject hammer/palm.24 negative/preservation checks. New533662-byte lossless strip exceeds221746-byte former14MB headroom; Gill-only budget15MB preserves27priorrecords, total14311916B /251frames28records. First dedicated Gill air normal; otherfive remain fallback. DeferredHQ/cache254; no windows/commits/push/deploy.


### Gill AIR HK — original flying blue-leg kick

Six original drawings / twelve lossless640×448frames; exactGILL_AIR_HK native8/5/13/102/knockdown unchanged. Built-inimagegen source/prompt retained. Initial opaque source rejected, background-only alpha repair then high contactfoot (.42523, beyondhands2) rejected; contactleg-only lowering givesfoot.59402/beyond114/reach116. GlobalECC.024022/.039237 passesunchanged.008/.018; feet32–99,centroid9.335416,areaCV.015831. ExistingQA rejects ownHP andgroundedkick; Alexhammer fails actualcontactReachfalse (52<60); no newsemanticrule/QArelaxation needed.27negative/preservationchecks inclunsupportedLP.552610Bnewstrip;total14864526B/263frames29records retains15MBcap, all28priorrecords preserved. Two dedicatedGillairnormals24frames12drawings;LP/LK/MP/MKfallback. DeferredHQ/cache255;window-free native/runtime/staticQA;no commit/push/deploy.


### Gill AIR LP — original short airborne jab

Four original drawings / eight lossless640×448frames; exactGILL_AIR_LP native4/3/7/40/noKD unchanged. Built-inimagegen plus contactfist-only refinement39→36px, truealpha preserved. Full-bodyECC.010072/.021518 passes unchanged.008/.018;feet64–78,centroid3.688748,areaCV.00352. Contactreach37,raisedfistlevel.344951. WronghammeracceptedRED→reuseexistingLPmax65/raisedband.18–.40/compactmax36; ownHPcontactReachfalse,Alexraisedfistfalse,Chunlipalmcompactfalse explicitlyasserted.26negative/preservationchecks includingunsupportedLK.376400Bnewstrip exceeds135474Bformer15MBheadroom, so Gill-onlycap16MB preserves29priorlosslessrecords:total15240926B/271frames30records. Three dedicatedGillairnormals32frames16drawings;LK/MP/MKfallback. DeferredHQ/cache256;window-free native/runtime/staticQA;no commit/push/deploy.


### Gill AIR LK — original short airborne blue-foot kick

Four original drawings / eight lossless640×448frames exactGILL_AIR_LK native4/3/7/40/noKD unchanged. Built-inimagegen firstsource passes globalQA;noartrefinement/ROI/thresholdreduction. Full-bodyECC.010361/.025222 passesunchanged.008/.018;feet34–78,centroid3.836547,areaCV.011182. Contactfoot.631185/root154/kickreach61/beyondhands57, visiblyshorter thanHK. WrongAlexhammeracceptedRED→reuseexistingLKfootmin.58forGill; actualnamedraisedContactFootfalse forhammer/ownLP, existingrootmax210rejects ownHK.28negative/preservationchecks inclunsupportedMP.367220Bnewstrip,total15608146B/279frames31records retains16MBcap;30oldrecordspreserved. FourdistinctGillairnormals40frames20drawings;MP/MKfallback. DeferredHQ/cache257;window-free native/runtime/staticQA;no commit/push/deploy.


### Gill AIR MP — original medium airborne blue-arm fist

Six original drawings / ten lossless640×448frames exactGILL_AIR_MP native6/4/9/64/noKD unchanged. Built-inimagegen initialreach85 shortened; firstrefinement33rejected as too short, contactextensionrefinementfinal61. Sourceattempts/promptsretained. Full-bodyECC.015238/.026776 passes unchanged.008/.018,noROI;feet73–101,centroid5.892623,areaCV.01586. Closedfist29px/level.334343. WrongownHPacceptedRED→reuseDudley/Makoto/UrienMP55–70reach andcompactmax36. Actualnamedfalseassertions rejectownHP/LPcontactreach,Alexhammerraisedband,Chunlipalmcompact.28negative/preservationchecks inclunsupportedMK.512754Bnewstrip exceeds391854Bformer16MBheadroom;Gill-onlycap17MB preserves31oldlosslessrecords,total16120900B/289frames32records. Five dedicatedGillairnormals50frames26drawings;MKfallback. DeferredHQ/cache258;window-free native/runtime/staticQA;no commit/push/deploy.


### Gill AIR MK — complete six dedicated airborne normals

Six original drawings / ten lossless640×448frames exactGILL_AIR_MK native6/4/9/64/noKD unchanged. Built-inimagegen firstsource/root195passesdefaultsidekickQA; contactleg-only refinement/root169 makesmediumkick visiblyshorter/bent. Sourceattempt/promptretained. Finalfull-bodyECC.02092/.034797 passesunchanged.008/.018,noROI;feet32–98,centroid7.801962,areaCV.030554. Contactfoot.621245,kickreach74,beyond71/root169 betweenLK154andHK. Existing sidekick65–125reach/root155–210 fullyreused, no newsemanticgate/QArelaxation.26negative/preservationchecks rejectownHP/HK/LK andKenMK, explicitnamedfalseassertions forownpeers;unknownselectorfails nowall6supported.541896Bnewstrip,total16662796B/299frames33records stayswithin17MBcap;32priorrecordspreserved. All6Gillairnormals60frames32originaldrawings. DeferredHQ/cache259;window-free native/runtime/staticQA;no commit/push/deploy.


### Ibuki AIR PALM — original airborne open-palm strike

Six original cel-painted drawings / twelve lossless640×448frames, exactIBUKI_AIR_HP labelAIR PALM native7/5/12/72/noKD unchanged. Built-inimagegen: initialguardreach17rejected; firstguardedit lackedvisiblearmandglobalmax.016028<.018rejected; secondjointedit restoresbothvisiblearms/verticalguardpalms and fullcontactextension. Finalfull-bodyECC.01079/.01897 passesunchanged.008/.018,noROI. Feet69–72,centroid1.798014,areaCV.003256,reach46. ClosedGillfistacceptedRED→reuseYunHPopenpalmmin36 andraisedband.18–.40; nativepalm45px/.338091, actualnamedfalseassertions rejectclosedfist/Alexhammer.24negative/preservationchecks includingunsupportedHK/wrongmanifest. New565228Bstrip,total13869634B/265frames29records under14MB;28priorrecords includingauthoredSource metadata preserved. FirstdedicatedIbukiairnormal;otherfivefallback. ExactHP-only exception toIbuki airblanket preservesKazekiri/groundspecialrestrictions. DeferredHQ/cache260;noGUI/commit/push/deploy.


### Ibuki NINJA AXE KICK — original airborne heel drop

Six original cel-painted drawings / twelve lossless640×448frames exactIBUKI_AIR_HK native7/5/12/72/knockdown unchanged. Built-inimagegen square2×3source; threeleg/contactrefinements fix spreadfeet/lowcontact/highcontact withoutQArelaxation. Finalfull-bodyECC.029581/.054768 passesunchanged.008/.018;feet57–110,centroid12.420779,areaCV.03987. Kickreach65/beyond73,contactfoot.565609. WrongGillfullsidekickacceptedRED→IbukiHK-onlyaxeHeelDrop: raisedwindupframe4foot≤.40bodyheight thencontactdropsatleast.15bodyheight; nativewindup.314982/drop.250627. Actualnamedfalse assertions rejectsidekick/frozenwindup;26negative/preservationchecks inclunsupportedLP.625938Bstrip exceeds130366Bformer14MBheadroom;Ibuki-only15MBcap preserves29priorrecords,total14495572B/277frames30records. Two dedicatedIbukiairnormals24frames12drawings;otherfourfallback. ExactHK-onlyaddition toexistingHP/Kazekiriairexceptions, deferredHQ/cache261;noGUI/commit/push/deploy.


### Ibuki AIR LP — original short closed airborne jab

Four original cel-painted drawings / eight lossless640×448frames exactIBUKI_AIR_LP native3/3/7/28/noKD unchanged. Built-inimagegen: initialweakjointmax.016366 rejected; shoulder/elbow/kneecounterbalance edit passesglobalbutreach21rejected; contactfist-onlyextensionfinalreach32. Twoedits/sourceattemptsretained. Finalfull-bodyECC.012795/.023452 passesunchanged.008/.018,noROI;feet60–65,centroid4.070839,areaCV.019956. Closedfist23px/.365912. WrongownopenpalmacceptedRED→reuseexistingLPmax65/raisedband.18–.40/compactmax36;actualnamedfalseassertions rejectownHPpalm/ChunlipalmcompactandAlexhammerraisedband.26negative/preservationchecks inclunsupportedLK.325580Bstrip,total14821152B/285frames31records retains15MBcap,30priorrecordspreserved. Three dedicatedIbukiairnormals32frames16drawings;LK/MP/MKfallback. ExactLP-onlyaddition toHP/HK/Kazekiriairexceptions;deferredHQ/cache262;noGUI/commit/push/deploy.


### Ibuki AIR LK — original short airborne snap kick

Four original cel-painted drawings / eight lossless640×448frames exactIBUKI_AIR_LK native3/3/7/28/noKD unchanged. Built-inimagegen firstsourcepassesallQA,noartrefinement/ROI/thresholdreduction. Full-bodyECC.015841/.032135 passesunchanged.008/.018;feet56–109,centroid5.088739,areaCV.014575. Contactfoot.637015/root178/kickreach42/beyondhands45. ExistingLKrecipefullyreused; no newsemanticrule.28negative/preservationchecks rejectownHP/HK/LP andAlexhammer; actualnamedfalse forownLPbeyondhands/Alexcontactreach;unsupportedMP.318142Bstrip exceeds178848Bformer15MBheadroom;Ibuki-only16MBcap preserves31priorrecords,total15139294B/293frames32records. Four dedicatedIbukiairnormals40frames20drawings;MP/MKfallback. ExactLK-onlyaddition toHP/HK/LP/Kazekiriairexceptions,deferredHQ/cache263;noGUI/commit/push/deploy.


### Ibuki AIR MP — original medium airborne closed-fist strike

Six original cel-painted drawings / ten lossless 640×448 frames for exact IBUKI_AIR_MP; native 5/4/9/46/no-knockdown unchanged. Built-in image_gen initial reach36 and recovery foot width119 rejected; one art refinement fixes extension/tucked recovery. Final full-body ECC .015624/.023731 passes unchanged .008/.018, no ROI; feet44–109, centroid12.062622, areaCV .051397. Closed fist27px at height .390263; reach41 exceeds LP32. Own open-palm substitution accepted RED, so reuse compact max36 for Ibuki MP only; actual named-false fixtures reject ownHP/Chun-Li palms, ownLP short reach and Alex hammer height. 28 negative/preservation checks; unsupported MK still rejected. New496376B strip brings Ibuki to15635670B/303frames33records within existing16MBcap;32prior records preserved. Five dedicated airborne normals /50frames26drawings; MK remains fallback. Exact MP-only addition to HP/HK/LP/LK/Kazekiri air exceptions; deferredHQ/cache264. Window-free local runtime/static QA; no commit/push/deploy.


### Ibuki AIR CROSS KICK — complete six dedicated airborne normals

Six original cel-painted drawings / ten lossless640×448frames for exact IBUKI_AIR_MK, label AIR CROSS KICK, native5/4/9/46/noKD unchanged. Built-in image_gen first source passes all QA; no art refinements, ROI extension or threshold reduction. Full-body ECC .0183/.031913 exceeds unchanged .008/.018; feet46–60, centroid6.096479, areaCV .026624. Contactfoot .549685/root197, kickreach75/beyondhands64. Existing sidekick recipe fully reused; no new semantic gate. Thirty negative/preservation checks reject own HP/HK/LK/LP/MP and KenMK; explicit named false gates include ownLK contactReach, ownHP/LP/MP kickBeyondGuardHands, ownHK shortContactRootReach. All six selectors now supported, unknown-kind fixture remains rejected. New477100B strip exceeds364330B former16MB headroom; Ibuki-only17MB cap preserves33prior lossless records, total16112770B/313frames34records. All six Ibuki airborne normals total60frames32originaldrawings. Exact MK-only addition to HP/HK/LP/LK/MP/Kazekiri air exceptions, deferredHQ/cache265. Window-free local runtime/staticQA; no commit/push/deploy.


### Ken victory — original grounded celebration

Built-in image_gen four original drawings/eight lossless640×448frames, source2×2sheet andgenerationprompt retained. Relaxedguard→shoulderfist→shortfistpump→confidentfinalhold. Installed-idle referenceheight332/footfloor419/footcenter319.046667; stablefourkeyframes, no sourcealpharemoval. Firstart passes fullbodyECC .016761/.023181 vs unchanged .008/.018. Footcenterrange<.3px, identicalfloor419, stance197–199, areaCV .036125, centroidstep10.23526. New289100B strip exceeds261656B former18MBheadroom; Ken-only19MBcap preserves33priorrecords, total18027444B/311frames34records. Ken victory uses existing nonloop stateclock/deferredHQ, cache276; all other character victory fallbacks retained. Finalposeheld, nativecombat unchanged; no GUI/commit/push/deploy.

Ryu victory: built-in image_gen four original drawings, eight lossless frames at12fps, final pose held. Source: `ryu/victory-sheet.png`; prompt: `ryu/victory-generation-prompt.txt`. Shared importer: `python scripts/build-roster-victory.py --character RYU --runtime`. No prior art recompressed; total17,208,254B, Ryu-only18MBcap (208,254B over prior17MBcap).

Chun-Li victory: built-in image_gen four original drawings/eight lossless frames at12fps, finalhold. Source `chunli/victory-sheet.png`; original and four refinement prompts retained, rejected attempts1–4 retained. FullbodyQA thresholds unchanged; final average.011512/max.02322, fixedfeet/floor. Shared importer `python scripts/build-roster-victory.py --character CHUNLI --runtime`; total19,406,154B, existing20MBcap retained.

Ibuki victory: built-in image_gen four original drawings/eightlosslessframes at12fps,finalhold. `ibuki/victory-sheet.png` and `ibuki/victory-generation-prompt.txt`; sharedimporter `python scripts/build-roster-victory.py --character IBUKI --runtime`. Firstsourcepassed unchangedQA(.015580avg/.021229max), feetfloor429. Total16,451,082B,existing17MBcapretained; prior34recordspreserved.

Alex victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold. `alex/victory-sheet.png` and `alex/victory-generation-prompt.txt`; sharedimporter `python scripts/build-roster-victory.py --character ALEX --runtime`. Firstsourcepassed unchangedQA(.013914avg/.026270max),floor421. Total17,560,900B<existing18MBcap; prior35recordspreserved.

Dudley victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold. `dudley/victory-sheet.png` and `dudley/victory-generation-prompt.txt`; sharedimporter `python scripts/build-roster-victory.py --character DUDLEY --runtime`. Firstsourcepassed unchangedQA(.015112avg/.027893max),floor421. Total12,247,114B<existing13MBcap; prior35recordspreserved.

Makoto victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold. `makoto/victory-sheet.png` and `makoto/victory-generation-prompt.txt`; sharedimporter `python scripts/build-roster-victory.py --character MAKOTO --runtime`. Firstsourcepassed unchangedQA(.013419avg/.027995max),floor421. Total14,864,194B<existing15MBcap; prior35recordspreserved.

Yun victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold. `yun/victory-sheet.png` and `yun/victory-generation-prompt.txt`; sharedimporter `python scripts/build-roster-victory.py --character YUN --runtime`. Firstsourcepassed unchangedQA(.013885avg/.026586max),floor421. Total16,434,718B<existing17MBcap; prior36recordspreserved.

URIEN victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold; source/prompt `urien/victory-sheet.png`, `urien/victory-generation-prompt.txt`. Firstsourcepassed unchangedQA; total13965620B; existing14MBcapretained, prior33recordspreserved.

GILL victory: built-in image_gen fouroriginaldrawings/eightlosslessframes12fps/finalhold; source/prompt `gill/victory-sheet.png`, `gill/victory-generation-prompt.txt`. Firstsourcepassed unchangedQA; total16997682B; existing17MBcapretained, prior33recordspreserved.
