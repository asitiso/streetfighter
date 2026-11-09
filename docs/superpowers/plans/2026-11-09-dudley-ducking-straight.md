# Dudley authored Ducking Straight implementation plan

Goal: expand the authorized roster motion work to Dudley's grounded mobility special with a continuous duck, straight punch and guard recovery. Reuse shared six-pose/twelve-frame import, original heavy-strike limits and guard handoffs. Exact DUDLEY_MOBILITY only; real QCB kicks and unchanged gameplay movement.

Design: neutral guard, lowered load, half low straight, full low straight, recoil, upright guard. Near arm punches throughout, far glove guards, same foot roots; hip/knee bend lowers head 15–75px at actual contacts. Six-source order[1,1,2,3,4,4,5,5,6,6,6,6],640x448,snap24,startup0–3/contact4–5/recovery6–11. Installed idle scale/baseline/two-foot anchor and zero runtime offsets. Original heavy-strike and handoff numeric gates remain unchanged; additional per-contact head-drop cue rejects standing punches as ducking art. The established pipeline is the implementation choice under continuing authorization.

Tasks:
- [x] RED authored availability/exact mobility mapping, QCB3kicks/2facings, allframes/contacts/exactdistance/hitstop/airfallback.
- [x] Generate and save six source drawings/exact prompts; pass original gates, head-drop negatives, source/runtime provenance and rollback.
- [x] Extend DUDLEY-only supplemental selector/library/profile/catalog/cache172; preserve all23priorrecords/WebPbytes/bindings and default6-roster import.
- [x] Green fixtures, clean build/release/focused checks, runtime-derived preview and one readonly final review. Measure entry and use explicit12MB Dudley cap if within.
- [x] Save provenance; commit/update existingPR2 with canonical tree equality/expected-head lease; never merge.

Baseline local4fca76c12319c6c6a1c8bed6709f61a075c38acf; remote5f8126ae2a4cc63ec19783be8bbab229f82dd3bb; tree ddf1e00f1ea3841d4178af81946f1a557475566d. Existing isolated branch feat/ken-specials. Ruling: continuing requests authorize another motion through the existing workflow; no renewed approval needed.

Progress: availability RED observed before implementation. Prior23records/191frames eager7,462,724bytes. Ruling: use a tighter new9MB Dudley cap instead of provisional12MB, because the existing roster is materially smaller; measure final entry before acceptance. Shared special semantic helper renamed generically; Alex numeric behavior and metadata must remain identical.

Semantic RED: standing heavy punch passed all original strike gates and dipped17px, revealing provisional15px minimum was insufficient. Ruling: require30–75px actual head drop at contacts, stricter than the original proposed extra cue and independent of unchanged heavy-strike numeric gates. First new source drops46px and passes. Visual review caught near-to-far arm switching at full contact despite numeric PASS; correcting source before any installation.

Final verification: all23priorDudleyrecords/art/sourcebindings preserved. New389,382bytes;203active/fullstoredframes24records,entry7,852,106bytes<new9MBcap. Contacts4/5 reach94px/drop48px,footroot1.041336px. Same neararm straight/far guard corrected and finalPNGinspected. ActualQCB3kicks/2facings156Canvasdraws,all12frames,exactdistance,hitstop/idle/airfallback pass. Five fixtures(Dudley/default6roster/AlexSlash/AlexChop/Ken-specialsemantics),cleanTS/build/release450files4C40571DF93F225D and18focusedchecks pass. KnownPWA3reproduced(v0252vs0/v028pinCurrentShell/v063065vs172); nofullsuite/manualbrowserclaim. Independentreadonlyreview foundnoP1/P2 and independently verified23priorrecords/art/bindings,156draws,Dudleyingest,Alexspecials,rosterstandingattacks. GeneratedRC39cache restored after checks. ExistingPR2 published by expected-headlease/canonicaltree equality;nomerge.
