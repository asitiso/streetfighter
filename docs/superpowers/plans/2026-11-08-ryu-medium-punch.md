# Ryu medium punch implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-character authored motion work with exact Ryu5MP.
**Architecture:** Reuse existing medium strike recipe, semantic QA, paired handoff and partial-manifest installer. Six new drawings use [1,2,3,4,5,5,6,6] for8stored frames, contact3/recovery4. Ryu-only actual-contact gate retains light-strike numeric limits. No new tools/dependencies/gameplay changes.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, Python/Pillow existing pipeline.
**Spec:** User continuation of all-character smoother authored motion; existing PR2 remains unmerged.

## Choices and constraints
Distinct source drawings materially improve articulation over copying LP/HP. Use existing recipe mechanism rather than duplicate a builder. 640x448 cells, same idle anatomical scale/opaque433sole, both-foot anchoring, exact grounded5MP only. Preserve all old Ryu records and staged specials; cache124. New totals119stored/95active/14records,12active.

## Review focus
Exact MP versus command/crouch/kick/air identity; all8frames and contact reachable; no root offset; static/guard contact rejected; existing records/source binding preserved and rollback.

## Tasks
- [x] Extend actual input test; observe missing5MP fail.
- [x] Generate/save six-pose source and exact prompt; pass unchanged semantic/handoff gates.
- [x] Add Ryu recipe/registry/loading/exactmapping and extend partial-ingest fixture.
- [ ] Fresh production/typecheck/standard suite and focused asset regression, actual input preview, review.
- [ ] Commit/update existing PR2 with matching tree; never merge.

Ledger: Actual5MP input test failed with null before implementation and passes after exact mapping/registry. Six new poses passed original pose/semantic/handoff gates; actual contact reach64px. A background-only imagegen edit was retained with its exact input target and prompt; alpha zero gutters independently confirmed despite stored RGB. MP first-install fixture removes record/file, validates new-file rollback and preservation of all previous records/art. Guard-contact and static negatives include MP.

Ruling: Full standard verify expanded to81commands, first run77passed/4failed. One failure exposed older384px-only Ryu variance cropping; corrected explicit widths and ECC canvas shape, added crop/real punch variance regression and reran successfully. Three remaining pre-existing PWA checks are outside this animation increment: verify-v025-resilience assumes cached JS bypasses network without an offline navigator; verify-v028-rc3 expects removed pinCurrentShell/install-wait behavior; verify-v063-rc38 pins game-cache-v065 while current assets usev124. No thresholds or product PWA behavior changed to silence these failures. These must be reported, not called a fully green suite.

Review: independent readonly review found omitted MP guard-negative coverage; corrected. Updated review found no P1/P2, independently passed standing-input/registry checks. Actual-input125tick repeated-MP preview has both facings, contact/hit-stop and ends idle.

Final validation: fresh typecheck/production pass,395release files hash8341809DA7F66B8F. All22default and7Ryu runtime kinds pass. Extended fixture passes with MP guard/static negatives and all-prior-art preservation.9focused JS checks pass; standing covers39strips/355frames/1810draws. Standard81commands:77initially passed, variance fixed and fresh-pass ->78pass/3existing PWA failures retained and reported. Remaining scope is explicitly documented; no full-suite-green claim.
