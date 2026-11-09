# Ryu Authored Hadoken Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Replace staged-disabled Ryu hadoken with original pose-authored full action, preserving gameplay and staged uppercut.
**Architecture:** Extend existing shared importer only for RYU hadoken;reuse original Ken hadoken numeric gates plus actual-release checks at5/6, sixposes/twelve640x448frames [1,1,2,2,3,4,4,5,5,6,6,6],startup0–4/release5–6/recovery7–11,snap24. Installedidle scale/twofoot/opaque baseline/zerooffset. Existing primary/EX/super/SA1/SA3 mapping retained. No aerial normals or other specials promoted. Cache167;explicit Ryu13→14MB only if measured entry exceeds13MB.
**Design:** Guard, two-hand hip gather, halfpush, both-palms forward release, arms withdrawal,guard. Same hands continuous, natural limbs,feet planted,real shoulder/hip articulation,no baked energy orb (gameplay owns projectile).

## Tasks
- [x] RED full-action availability test before implementation.
- [x] Generate6poses/save exactprompt/source;originalnumericgates and original handofflimits.
- [x] Sharedselector/order/audit/source-runtime provenance;replacement/rollback fixture;runtime integration.
- [x] Focusedactualinput/projectile/render tests,affectedfixtures/cleanbuild/readonlyreview;report existingPWA3.
- [x] Preserve all24prior Ryu records/art excluding replacedhadoken,commit/publishexistingPR2/canonicaltree equality,no merge.

## Verification ledger
FullactionavailabilityRED failed beforepromotion. Firstsource passes unchangedoriginalKenHADOKENlimits+bothactualrelease5/6audit/originalHADOKEN_BASEhandoffs;residual.019614/.042919,releasereach27,root1.025334. Source/exactprompt saved.12frames640x448/sourceorder[1,1,2,2,3,4,4,5,5,6,6,6],phase0–4/5–6/7–11,snap24,twofoot/zerooffset/opaque433.24otherRyurecords/art directlyequalbaseline,uppercutdisabled.217total205activefull/25records,new592340vsold969404,activeentry13082616explicitRyu13→14MB,cache167. QCF/EXrealinput/5variantsbothfacings396Canvasdraws,realCombatWorldprojectilegenerationat5/count,hitstop/idle/all12primaryframes pass;unchangedfasterEX/superdurations skippreparationframes. Explicitground-onlyhadoken keepsairfallback. SharedparameterizedRYUhadokenfixture,fullRyu-supportpromotion/variance,Ken-specialsemantics,Ibuki2HK pass. Originalvarianceauditorhadokenwidth384corrected640afterrealstripfailure;partialenabledcount53/final205 updated. FreshcleanTypeScript/build/release446files hash2AE6BEA66F46D2F5+13focusedchecks pass. FreshknownPWA v025network2vs0/v028removedpinCurrentShell/v063065vs167 remain,nofullsuiteclaim. OriginaltrackedRC39posecachegeneratedduringvariancefixture restored. Diagnosticpreviewfirsthadworldoffsetscaleerror;corrected.88halfsourceart+unscaledworldprojectilepositions,notbrowsercapture. Independentreadonlyreview review_ryu_hadoken foundnoactionableP1/P2,independentlyverified24priorrecords/art andruntime396draws;correctedpreviewspatialcheck confirmslowerpalmedge/shotmeetwithoutgameplaycoordinatechange. Publish existingPR2/canonicaltree equality,no merge.
