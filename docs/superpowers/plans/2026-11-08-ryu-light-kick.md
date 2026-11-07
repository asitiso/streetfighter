# Ryu standing kicks implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-roster authored motion with Ryu exact grounded5LK/5MK/5HK.
**Architecture:** Reuse the existing standing light-kick recipe, semantic/handoff/rollback pipeline and input tests. Six independent drawings per action use8/10/12stored frames, contact3/4–5/5–6 and recovery4/6/7. Original semantic thresholds remain unchanged. Rear support sole anchors the planted root.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python/Pillow asset pipeline.
**Spec:** Continuing all-character smoother motion request, existing PR2 remains open/unmerged.

## Choices/constraints
Creating knee-up/half-extension/half-withdrawal poses gives visible articulation; copying a punch or warping one sprite does not. Reuse the existing recipe mechanism rather than new tools. 640x448cells, same installed-idle anatomical scale/opaque433sole. Only exact grounded5LK/5MK/5HK; other unfinished moves retain fallback. Preserve all previous records/art and original HQ source binding, staged specials24F. Totals149stored/125active/17records(15active), cache125. Default six-roster191F remains unchanged.

## Review focus
No kick/punch/command/air identity mixing; all8/10/12frames and contacts reachable at actual timing; stable rear root and no second anchor offset; static/guard/punch/translated-support substitutions rejected; new-file/replacement rollback and previous records/files preserved.

## Tasks
- [x] Extend real input test and observe missing5LK and5MK failure.
- [x] Generate/save three six-pose sources with exact prompts; pass original quality/handoff gates.
- [x] Extend Ryu selector/recipe, registry/loading/exact mapping/profile and fixture.
- [x] Fresh build, standard checks and asset regressions; actual input preview and independent review.
- [x] Commit and update existing PR2 with exact matching tree; never merge.

Known baseline: full standard81commands previously had3PWA failures (v025-resilience,v028-rc3,v063-rc38); preserve/report these unless this increment resolves them with evidence. No full-suite-green claim.

Ruling: extend this increment to all three grounded Ryu kicks because LK passed first-generation QA and the same established6-pose pipeline can complete the entire standing normal set without new tools. MK10F order[1,1,2,3,4,4,5,5,6,6], contact4/5; HK12F[1,1,2,3,3,4,4,5,5,6,6,6], contact5/6. Keep original kick/knee/heavy numeric limits. New final totals149stored/125active/17records(15active), selector10kinds, cache125. Include all three new-file rollback/preservation and negative tests. Exact5MK/5HK added after new RED input test. First LK-only standard run is interim; rerun final suite after broader registry changes.

Source ledger: LP/MP/HP already authored; this increment adds18new independent drawings in3sheets for30stored kick frames. LK and MK passed first-generation unchanged pose/semantic/handoff gates. HK first source failed forward reach14px; imagegen refined only contact angle/forward reach, original exact target and edit prompt retained. Final HK reach48px/footheight251px passes original38..190/200..300 limits. LK reach70/height137; MK63/195. All3rear-support horizontal range<1px, baseline range0. No numeric threshold relaxed. Actual input checks now42strips/385storedF/1966Canvas draws and all3Ryu kick contacts/hitstop/idle recovery pass.

RED/GREEN ledger: a guard/punch substituted at MK second actual-contact frame5 passed the original single-contact semantic helper. Added a Ryu-only contact audit for LK3/MK4–5/HK5–6, applying the same original per-kind reach, foot-height and one-support limits at every actual contact; default six-roster helpers/limits unchanged.

Final evidence: fresh TypeScript/production build passed;398release files hash24C38356BAD1456B. All22default plus10Ryu runtime kinds passed. Final standard81commands:78pass/3unchanged PWA failures (v025-resilience,v028-rc3,v063-rc38), explicitly reported in PR. Nine fresh focused JS input/render/combat/build checks passed. Standing input42strips/385storedF/1966Canvas draws; every LK8/MK10/HK12frame and actualcontact in both facings, hitstop and idle recovery verified. Extended partial-ingest fixture and all contact negatives passed, independently repeated by reviewer. Final review found no P1/P2; original prior records and source binding unchanged. Built-in imagegen only, all final source/prompts and exact HK edit target saved. Current delivery commit and lease-protected PR2 update use identical Git trees; PR stays unmerged.
