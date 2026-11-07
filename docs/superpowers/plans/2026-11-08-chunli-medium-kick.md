# Chun-Li Standing Medium Kick Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue the approved all-character motion work with a dedicated grounded Chun-Li medium kick.

**Architecture:** Reuse the existing importer, recipe, semantic audit and runtime.  Six drawings become10frames [1,1,2,3,4,4,5,5,6,6],640x448, startup0–3/contact4–5/recovery6–9. Exact grounded5MK only; idle337px/opaque422, rear-support anchoring and zero offsets. Preserve20prior records/art/bindings and gameplay. Keep original pose/action/handoff gates. Measure eager entry bytes; if new original-quality art exceeds13MB explicitly budget14MB for Chun-Li only and document rather than reduce quality or change loading behavior.

**Tech Stack:** TypeScript/Canvas, Python/Pillow and built-in imagegen.

**Spec:** User-approved continuation of authored roster motions, following the existing Ken/Ryu medium-kick recipe.

## Files

Source/prompt and README live in art-source/roster-idle/chunli. The shared builder and supplemental ingest fixture own normalization, semantic checks and atomic writes. AnimationSequenceLibrary/AnimationFrameProfiles/AnimationTimingMapper own exact5MK rendering; AssetManager/sw own asset registration/cache140. Standing and sequence verification cover inputs/phases/preload totals.

## Tasks

- [x] Mapping RED
- [x] Built-in source and exact prompt; unchanged QA
- [x] Shared recipe/selector/fixture, runtime/assets/cache140
- [x] Full suite, clean build, both-facing preview and readonly review
- [x] Commit and update existing PR2 with equal canonical trees; no merge

## Verification ledger

Observed exact5MK mapping RED before implementation and GREEN after integration. First-generation source passes unchanged pose/action/handoff limits; actual contacts4/5 and planted support pass. Shared ingestion fixture covers wrong actions/support, source/runtime/peer errors, byte-stable reinstall and first/new-file/replacement rollback. Both-facing actual-input preview reaches all10frames/contact/hitstop/idle. All20prior records and hashes remain unchanged. Read-only review found noP1/P2.

Full standard92/95commands pass; existing PWA v025/v028/v063 expectations remain failing (offline fresh-code policy, removed pinCurrentShell, pinned cachev065 versus currentv140). Clean TypeScript/production build and12final focused checks pass. Release integrity420files/hashA66AFFB7DB143340.

Ruling: Chun-Li-only13MB→14MB budget — source-quality429664byte strip raises entry to13228008bytes; retain quality and eager-loading behavior. Other budgets and all numeric semantic limits unchanged.

Existing PR2 receives the exact canonical local tree; no merge.
