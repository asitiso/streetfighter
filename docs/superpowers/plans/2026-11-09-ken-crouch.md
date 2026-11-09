# Ken Crouch Transition Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved roster motions with Ken crouch entry/hold/reversed exit, establishing the guard for future low attacks.

**Architecture:** Reuse four-source/six-frame crouch recipe [1,2,2,3,3,4],384x448. Normalize against installed standing idle and align both soles to existing baseline, zero profile offsets. Reuse existing Fighter crouch clock/reversal logic; no gameplay timing/input changes. Preserve20prior records/art/bindings/pipeline and existing specials/standing normals. Low attacks keep fallback. Keep13MB Ken entry budget.

**Tech Stack:** TypeScript/Canvas, Python/Pillow, built-in imagegen.

**Spec:** User-approved continuing authored motions for all characters, following seven existing crouch transitions.

## Files
Source/prompt/README in art-source/roster-idle/ken. Shared builder/supplemental fixture own selector, original crouch QA and atomic writes. AnimationSequenceLibrary/AnimationFrameProfiles own crouch registration; existing mapper/clock reused. AssetManager/sw own art/cache146. Crouch/standing/sequence/Ken pipeline verification covers both-facing entry/hold/exit/reversal/hitstop/belt and low-attack fallback.

## Tasks
- [x] Ken crouch availability RED
- [x] Four source poses/exact prompt and unchanged crouch/handoff QA
- [x] Shared selector/fixture, registry/profile/assets/cache146
- [x] Regression checks, clean build, input preview and readonly review
- [x] Commit/update PR2 with identical canonical tree; no merge

## Verification ledger

Observed Ken crouch availability RED before integration and GREEN afterward. First-generation unchanged crouch/pose/handoff limits pass: height ratio0.643917, centroid drop64.170164px, foot center range0.636073px/baseline0,residual0.040933/0.061788. Standing-source reference1,installed idle337px/opaque419,twofootanchor,zerooffsets. Exact built-in source/prompt retained.

Existing clock/mapper reused without gameplay edits. Both-facing input/Canvas tests cover6frames,long idle/hold,reverse,earlyrelease/repress,hitstop,jump,beltmovement and Ken low-attack fallback/recovery through lowguard. Actual-input preview covers entry/hold/reverse/toggle/hitstop/idle. Shared fixture validates sourcegrid/order/standingreference, reversedrising/static/translated/runtime/source/peer rejection, byte-stable reinstall and first/new-file/replacement rollback. All20prior records/art/bindings/pipeline unchanged; readonly review found noP1/P2.

Full standard98/101commands pass; existing PWA v025/v028/v063 expectations fail as before (offline fresh-code policy, removed pinCurrentShell, cachev065 versus currentv146). Clean TypeScript/production build and12final focused checks pass. Release426files/hash78E8349F0926BF7C. Ken entry12915114bytes below unchanged13MBcap; other budgets unchanged.

Existing PR2 receives exact canonical local tree; no merge.
