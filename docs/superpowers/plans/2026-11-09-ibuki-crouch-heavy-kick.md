# Ibuki Crouching Heavy Kick Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Complete Ibuki's authored twelve standing/crouching normals with exact grounded2HK.
**Architecture:** Reuse six source poses/twelve640x448frames [1,1,2,3,3,4,4,5,5,6,6,6],startup0–4/contact5–6/recovery7–11,snap28,rear-support anchor/zerooffset. Existing numeric gates and27priorrecords/art/gameplay preserved;cache166.
**Design:** Lowguard,rotated lowleg load,half-sweep,full low forward sweeping kick,withdrawal,lowguard. Same front/right leg extends/retracts, rearsole fixed and arms guard. Lower sweep and forward shoulder rotation distinguish2HK from2MK backward counterbalance.
**Budget:** Current entry12780770 has219230bytes left under13MB; comparable original-quality strips are~500KB. If final exceeds13MB, explicitly raise Ibuki-only entry budget to14MB and document measured delta, retaining image quality/loading behavior. Existing user continuation authorizes this routine decision and existingPR2 update; no merge.

## Tasks
- [x] Exact2HKmappingRED and all-character crouch transition expectation.
- [x] Sixbitmapposes/exactprompt/originalnumericgates.
- [x] Sharedselector/audit/fixture/runtime/profile/catalog/cache integration.
- [x] Fouraffectedfixtures/cleanbuild/12focusedchecks/actualinputpreview/readonlyreview.
- [x] Preserve27priorrecords/art,commit/publishPR2/canonicaltree equality.

## Verification scope
IBUKI2HK/2MK/5HK,CHUNLI2HK fixtures. Both contacts/facings/hitstop/held-released recovery/air-command isolation;wrongaction/displacedsole/static/translated/source/runtime/crouchpeer negatives,reinstall/rollback. All10characters complete crouch/standing sets. Freshknown3PWAfailures reported;nofullsuiteclaim.

## Verification ledger
Exact2HKmappingRED observed null beforeproductionchange. Firstsource passes alloriginalnumericgates unchanged:residual.024909/.050794,contacts5/6reach125/footheight57,supportcenter.811187/baseline0,lowheight.975904–1.012048,guardhandoffs pass. Sixsourceposes/twelve640x448frames/contact5–6/snap28/rearsupport/zerooffset/opaque429. Exactprompt+source saved. All27priorrecords/WebPbytes directly equalHEAD;253active/fullframes28records,new523636bytes,entry13304406. ExplicitIbuki13→14MBbudget keepsoriginalquality/eagerloading;otherbudgets unchanged. Client+SWcache166. Fourfixtures IBUKI2HK/2MK/5HK CHUNLI2HK pass provenance/negativecontacts/displacedsole/static/translated/source/runtime/crouchpeer/reinstall/rollback. FreshcleanTypeScript/build/release446files hash1CE46AC20B9ABA6F+12focusedchecks pass. All10complete crouchsets550stored5492Canvasdraws;all10standingnormals unchanged60strips550frames. Bothfacing160tick2HKpreview reachesall12frames/contact5/6/hitstop/heldlowguard/releasedrise. Complete sixbuttonbothfacing actualinputpreview reachesallframes/contacts/hitstop/recovery for everylowattack;composites inspected. FreshknownPWA v025network2vs0/v028removedpinCurrentShell/v063pinned065vscurrent166 remain;nofullsuiteclaim. No manualbrowserplaythroughclaim orlegacyreports/historychanges. Independentreadonlyreview review_ibuki_crouch_heavy_kick found no actionableP1/P2; verifiedsourceleg/armcontinuity/distinctionfrom2MK,exactgroundmapping/air-commandisolation,negatives and all27priorrecords/art unchanged. Publish existingPR2/canonicaltree equality/no merge.
