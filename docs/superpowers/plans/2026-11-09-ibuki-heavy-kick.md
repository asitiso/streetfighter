# Ibuki Standing Spinning Heavy Kick Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Complete Ibuki six standing normals with grounded5HK matching SPIN KICK.

**Architecture:** Six drawings show neutral, turn/chamber, partial spinning extension, high heel contact, folded rotational withdrawal and recovered guard. Reuse12stored640x448frame recipe [1,1,2,3,3,4,4,5,5,6,6,6],startup0–4/contact5–6/recovery7–11. Idle342px/opaque429,rear-support anchor,zero offsets. Preserve20prior records/art/bindings/pipeline and gameplay/mappings. Keep existing13MB Ibuki entry budget. Original numeric high-kick gates remain unchanged; source/visual review checks shoulder/hip turning.

**Tech Stack:** TypeScript/Canvas, Python/Pillow, built-in imagegen.

**Spec:** User-approved continuing authored roster motions; existing Ibuki5HK label SPIN KICK.

## Files
Source/prompt/README in art-source/roster-idle/ibuki. Shared builder/fixture own recipe, contact audits and atomic writes. AnimationSequenceLibrary/AnimationFrameProfiles/AnimationTimingMapper own exact5HK routing/rendering. AssetManager/sw register art/cache145. Standing/sequence tests and both-facing/six-button input previews verify complete actions and preload.

## Tasks
- [x] Exact5HK mapping RED
- [x] Six source poses/exact prompts and unchanged QA; inspect turn and heel contact
- [x] Shared recipe/selector/contact audit/fixture, runtime/assets/cache145
- [x] Regression checks, clean build, both-facing and six-button preview, readonly review
- [x] Commit/update PR2 with identical canonical tree; no merge

## Verification ledger

Observed exact5HK mapping RED before implementation and GREEN afterward. First-generation unchanged pose/action/handoff limits pass: residual average0.058158/peak0.101594, contact58pxreach/247pxheight at both5/6, support center range1.064195px/baseline0. Idle342px/opaque429,rear-support anchor,zero offsets. Source shows back shoulder/gi/hip rotation, heel contact, folded withdrawal and neutral recovery; exact built-in source/prompt saved. Source gutter alpha max1/corners0; existing extraction removes low-alpha residue and runtime composites are clean.

Shared fixture rejects guard/punch/low-kick contacts, displaced support roots/baselines, static/translated/runtime/source/peer errors. Medium/high envelopes intentionally overlap. Reinstall byte-stable and first/new-file/replacement rollback pass. Both-facing HK12frames and six-button actual-input preview reach everyframe/contact/hitstop/idle including final HK recovery. All20prior records/art/bindings unchanged; independent readonly review found noP1/P2.

Full standard97/100commands pass; existing PWA v025/v028/v063 expectations fail as before (offline fresh-code policy, removed pinCurrentShell, cachev065 versus currentv145). Clean TypeScript/production build and12final focused checks pass. Release425files/hashF02A5DF5E1F26709. Ibuki entry9955024bytes below unchanged13MBcap; other budgets unchanged.

All ten characters have authored six-button standing sets;60strips/550frames/2744Canvasdraws checked. Existing PR2 receives exact canonical local tree; no merge.

Ruling: Retain the exact generated prompt including its original trailing space on line3; exclude only that source artifact from whitespace checking. All other staged files pass whitespace checks.
