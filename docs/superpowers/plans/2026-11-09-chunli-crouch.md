# Chun-Li Crouch Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Author Chun-Li crouch entry/hold/reversal as the next approved roster increment.

**Architecture:** Four authored poses2columns2rows ->6stored384x448frames[1,2,2,3,3,4],linear60fps,hold5/reverse4→0,zerooffsets. Reuse installed idle337px/opaque422/twofootbaseline and original crouch gates. Preserve22priorrecords/art/bindings/pipeline/gameplay; lowattacks stillfallback but recoverlowbefore rising. Chun-Li14MBbudget mayexplicitlyincrease15MBif original-qualitystrip requires; otherbudgetsunchanged. Cache153.

**Design:** Continue existing authored roster workflow and generic crouch clock; no duplicate renderer/importer. Four real knee/hip compression drawings make subsequent low normals read coherently.

## Tasks
- [x] Chun-Li crouch availability RED
- [x] Four sourceposes/exactprompt/originalnumericQA
- [x] Shared selector/fixture/registry/profile/assets/cache153;9charactertransition coverage and lowattackfallback recovery
- [x] Affected ingestion/source/runtime checks plus cleanbuild/12focusedtests/actualinputpreview/readonlyreview
- [x] Commit/update existingPR2 with canonicaltreeequality/no merge

## Verification scope
Run newCHUNLIcrouch plusCHUNLI5HK/guard andKENcrouch ingestionfixtures;12finalfocusedchecks and three knownPWA tests. Fullsuite notrerun; historical102/105result precedesKen2MK/2HK. Numeric qualitygates remain unchanged.

## Verification ledger

Availability RED observed beforeimplementation. First built-in source passes original numeric gates0.041217/0.067137; height ratio.724036/drop55.554513px/centerX7.641124px/footcenter.650363px/baseline0. Installedidle337px/opaque422/twofoot/zerooffsets. Both-facing input verifies all6frames/hold/reversal/root stability,rapidtoggle/hitstop/jump/beltmovement and lowattackfallback recoverybefore rising. Transition coverage9characters/54stored/108Canvasdraws. Lowattack eightcomplete sets440stored/4460draws unchanged.

22priorrecords and WebPbytes equalbase; new212active/full/23records,293678bytes,entry13992282under unchanged14MBcap/cache153. CHUNLIcrouch/5HK/guard andKENcrouch ingestionfixtures pass source/runtime/peer/semanticfailure,byte-stable reinstall,first/new-file/replacementrollback. Freshclean TypeScript/production/release build433files/hashCDC5F5D13418C988 and12finalfocusedchecks pass. Three existingPWA v025/v028/v063 tests freshlyfail samecache-first/pinCurrentShell/cachev065-versusv153causes. Fullsuite notrerun; no browserplaythroughclaimed. Independentreadonlyreview review_chunli_crouch foundnoactionableP1/P2 and verifiedprior22bindings. No generatedlegacyreports/history modified. PublishexistingPR2/canonicaltreeequality/no merge.
