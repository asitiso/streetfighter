# Ryu authored standing punches implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Add full authored exact grounded5LP/5HP for Ryu, preserving its original cel-shaded identity and existing support art.
**Architecture:** Extend the limited Ryu selector/shared attack builder and existing tests. No importer, dependency or duplicated per-character recipe. Use6source poses each; existing default7F LP and10F HP order/semantic gates.
**Tech Stack:** TypeScript/Canvas,built-in imagegen, existing pose/semantic/handoff/rollback pipeline.
**Spec:** Continuing all-character motion request and Ryu's staged-disabled normal slots.

## Constraints and choices
- Create distinct jab and heavy rear straight sources, with neutral/preparation/half-extension/contact/retraction/recovered drawings. Reusing staged rigid images would not add the requested articulation.
- LP7F order[1,2,3,4,5,5,6], startup0–2/contact3/recovery4–6.
- HP10F order[1,1,2,3,4,4,5,5,5,6], startup0–3/contact4–5/recovery6–9.
-640x448 cells render320x224 at same body scale as existing384x448 sprites. Anatomical scale/opaque sole433 reference installed idle; both-foot horizontal anchor.
- Existing standing light/heavy semantic and idle handoff limits unchanged; no lowered gates or original/master edits.
- Exact Ryu5LP/5HP mapping only. Preserve hadoken/shoryuken special IDs; exclude kicks/crouch/commands/target variants and physical air.
- Extend Ryu selector only these2kinds; other unsupported kinds still fail. Preserve staged-disabled special strips/binding and support records.
- Ryu total111/active87/full87/bridge0 across13records(11active); six-roster191F each unchanged. Cache123, no net new runtime file paths.
- Update existing PR2, never merge.

## Tasks
- [x] Extend real standing-input test, observe missing Ryu punch fail; reproduce broad Ryu button mapping issue before fix.
- [x] Generate2sheets and save exact built-in prompts.
- [x] Extend selector, registry/phases/loader/mapping; install only after both sources pass unchanged gates.
- [x] Extend existing Ryu partial-ingest fixture for6kinds, new totals/staged-special preservation, wide cells, static/guard substitutions, root baseline and rollback/source/peer rejection.
- [x] Fresh TypeScript/production build,34JS,22default runtime kinds+6Ryu kinds,9Python checks.
- [ ] Inspect actual-input preview, read-only review, fix findings, commit and update PR2 with matching tree.

Verification ledger: real standing-input check failed on missing authored Ryu LP. Exact-move test then reproduced broad fallback accepting Ryu5MP as stand-light. Ryu now explicitly maps only5LP/5HP plus its prior special IDs. A Canvas translation check reproduced legacy staging-anchor drift after promotion; both new Ryu punch anchor arrays are zeroed while other profiles/gameplay remain unchanged.

Semantic ledger: a new guard-contact substitution test failed because whole-strip reach could come from a different frame. Ryu punches now additionally require actual contact3 (LP) and both4/5 (HP) to advance within the same existing24..105/38..145px reach limits. Default six-character semantic policy remains unchanged; no threshold was relaxed.

Source/review ledger: both first-generation sheets passed unchanged original standing/handoff limits and the added actual-contact reach checks. Source sheets/prompts saved, both strips installed. The125tick real-input preview reaches all7LP/all10HP frames and actual contact3/4/5 in both facings, freezes during hit stop and ends each repeated-attack scenario in idle. Read-only code/source/hash/static-preview review found no remaining P1/P2.

Fresh verification: TypeScript and clean production build passed; release integrity394files hash8C0BF364691B6005. All34JavaScript checks,22default runtime kinds,6Ryu runtime kinds and9Python regression checks passed. Standing input covers7characters/38strips/347stored frames/1768Canvas draws; default movement9652draws. Static/guard substitutions, peer corruption, source rejection, baseline and first/replacement rollback checks passed.
