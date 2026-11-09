# Ryu retreat and reaction support implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Add authored backward walk10F, hit8F, guard5F and parry6F for Ryu, addressing its frequent base-motion gap.
**Architecture:** Reuse existing roster builder with an explicit limited --character RYU option for these four kinds. Default six-character batch remains unchanged. Preserve Ryu approved source binding, existing authored idle/walk/dash/air and staged-disabled attacks; count enabled/full/bridge records correctly.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python pose/semantic/handoff/atomic write pipeline.
**Spec:** Continuing all-character motion request and original Ryu identity/neutral guard; existing approved runtime idle.

## Choices and constraints
- Generate four new sheets (6retreat/6hit/4guard/4parry poses) matching original crisp cel-shaded Ryu sprite style, white gi/red headband/gloves/bare feet.
- Retain384x448 cells/output192x224; scale references installed idle guard349px; default six-character behavior stays unchanged.
- Same existing WALK_BACK/HIT/GUARD/PARRY pose/semantic/handoff limits; no relaxed thresholds, no master/original registry edits.
- Exact original original-source metadata remains bound; records keep exact generated source/order/normalization/SHA.
- CLI selector permits RYU only for these four support motions; invalid kinds must fail before writes.
- FrameTotal111 includes staged assets; enabled/full70F across9active records, bridge0, thirteen records total. Six roster totals stay191each.
- Metadata totals distinguish disabled records (regression test first), preserve order and atomic rollback.
- Cache122, only two net new runtime files (guard/parry), replacement retreat/hit files remain paths.
- Update existing PR2, never merge.

## Work
- [x] Extend real-input retreat/hit/defense checks and observe missing Ryu authored retreat fail.
- [x] Test disabled/full/bridge total accounting before implementing helper/selector.
- [x] Generate and save four sheets/exact prompts using built-in imagegen.
- [x] Extend shared builder safely, install only after all four source gate checks pass; enable/load registry.
- [x] Extend partial-manifest rollback/source/peer/selector checks and preserve staged attacks/master binding.
- [x] Fresh build34JS,22six-roster runtime kinds plus4Ryu kinds, existing8Python checks plus Ryu partial-manifest checks.
- [x] Inspect actual-input composited preview and read-only review; no remaining P1/P2.
- [x] Commit verified changes and update existing PR2 with identical local/remote tree.

## Review focus
Ryu style/scale consistency, disabled/staged record accounting, selector cannot replace idle8F with six-frame default, complete guard/parry/hit differences, grounded/air hit-stop clock, block exclusion and actual defense timing, parent corruption/rollback.

Verification ledger: real-input test failed on missing RYU retreat; disabled-record accounting test failed on absent helper before implementation. All four first-generation sources passed existing quality/handoff gates. Actual short-block test caught ease-out playback skipping absorption with uniform default weights; Ryu guard now uses the existing six-roster linear guard policy, without changing gameplay block stun or other character timing.

Additional root ledger: installed Ryu idle has opaque sole baseline433 while shared normalized support initially used420–421, causing about6rendered pixels of vertical mismatch. A regression test reproduced it. Ryu support now records/aligns to its installed idle opaque sole baseline, preserving anatomical scale, source art and all numeric quality limits. The six-character default normalization is unchanged.

Final verification: TypeScript/noEmit, clean production build and394file release integrity,34relevant JS,22default six-roster runtime kinds plus4explicitRyu kinds,9Python ingestion/semantic checks passed. After sole-baseline alignment, Ryu4runtime/partial-manifest tests and all34JS were rerun and passed. Default six-character sources, runtime artifacts and normalization are unchanged. Real movement/reaction/defense covers9,652Canvas draws; hit-clock regression now includes all10characters. The120tick actual-input preview ends all4scenarios in idle, reaches all8hit frames and includes ground/repeated/air hits and normal/red parry. Representative static frames preserve complete hands/feet and distinct recoil/shield/deflection poses. Final read-only review found no remaining P1/P2.
