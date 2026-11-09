# Six-character crouching heavy attacks

> **For agentic workers:** Use superpowers:executing-plans for inline implementation.

**Goal:** Author exact grounded 2HP for Alex, Dudley, Makoto, Yun, Urien and Gill.
**Architecture:** Reuse existing crouching-attack normalization, loading, phase mapper and tests. Six drawings produce ten stored frames; no new dependency or change to combat timing.
**Tech Stack:** TypeScript/Canvas, built-in image generation and existing Python atlas QA.
**Spec:** Continuing all-character motion request and art-source/roster-idle/README.md.

## Global constraints
- Exact 2HP mapping for these six only. Preserve LP/MP and air/unsupported fallback.
- Source order [1,1,2,3,4,4,5,5,6,6]; startup 0–3, contact 4–5, recovery 6–9.
- Current labels guide art: Alex lariat, Dudley cross, Makoto fierce karate thrust, Yun shoulder, Urien smash, Gill chop.
- Full low crouch at one body scale, both feet planted. Reference installed crouch frame 5.
- Heavy semantic numeric limits apply; contact index 5 matches held contact.
- Extend fixed shoulder/forearm contact band to heavy arm strikes using heavy reach 38..145. Yun shoulder uses upper-body contact centroid drive 7..62 instead of pretending the shoulder is an extended fist. Other shape/root/articulation gates stay shared.
- Record strike/shoulder semantic profile in batch and manifest; reject mismatches at runtime QA.
- Update existing PR #2; do not merge.

## Approaches
Continue existing authored atlases: immediately improves frequent attacks with little maintenance. Reusing LP/MP art would leave the heavy gesture missing. A skeletal animation migration would require a new asset workflow and is outside this increment.

## Review focus
1. Character identity, especially genuine shoulder versus extended punch.
2. Actual active frames reach both stored contact frames; hit stop and move duration unchanged.
3. Low recovery with down held/released, then reverse rise.
4. Crouch replacement validates all installed punch peers; failed writes restore/remove files.
5. Band excludes head-only motion; planted feet reject whole-body sliding/floating.

## Task
- [x] Extend shared actual-input test and observe missing 2HP fail.
- [x] Generate six articulated source sheets and save exact prompts.
- [x] Extend shared builder/registry/mapping/loading, semantic profiles and cache v117; install only after all six pass.
- [x] Fresh build, relevant JS, 18 runtime kinds, 36 corrupt-peer directions and semantic negatives.
- [x] Inspect actual-input preview, request read-only review, fix findings, commit and update PR #2 with identical tree.

Ruling: retain the established heavy articulation/distinct-contact limits instead of lowering them for compact crouching attacks. Refine the source silhouettes/torso drive; the same installed low-guard scale and grounded-foot checks apply.

Verification: missing 2HP failed before implementation. Fresh TypeScript checks and clean build (368 release files), 34 relevant JavaScript checks, 18 runtime installation kinds, 36 corrupt-peer directions, runtime profile mismatch, write rollback and semantic negatives all passed. Shared crouching punches cover 150 stored frames and 1,528 Canvas draws; actual-input preview reaches all 10 heavy frames and ends idle for every character. Read-only code/source/preview review found no P1/P2 issues. Delivery updates existing PR #2 without merging.
