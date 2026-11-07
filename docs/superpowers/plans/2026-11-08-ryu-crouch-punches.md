# Ryu crouch and crouching punches implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Continue approved all-roster smoother authored motions with Ryu crouch entry/hold/reverse-rise and exact2LP/2MP/2HP.
**Architecture:** Reuse existing visual crouch clock, phase mapper, shared builder and partial-ingest/handoff fixture.4new crouch poses ->6stored frames [1,2,2,3,3,4].6new drawings per punch ->7/8/10frames, contact3/3/4–5, recovery4/4/6. Low attack anatomical scale references installed held crouch frame5, planted two-foot root and opaque433sole. No new tools/dependencies/gameplay changes.
**Tech Stack:** TypeScript/Canvas, built-in imagegen, existing Python/Pillow quality pipeline.
**Spec:** User continued all-character motion/art completion. Update existing PR2, never merge.

## Choices and constraints
Actual knee/hip folding and half-extension/withdrawal drawings materially improve continuity over scaling standing art. Reuse existing Ryu selector/recipes, extend only crouch/three punches. Six-roster defaults unchanged. Preserve original source binding, prior17records/art and2staged specials24F. New totals180stored/156active/21records(19active), cache126. Crouch384x448, attacks640x448, same349px standing anatomical scale; held-low height set by actual crouch. Exact grounded2LP/2MP/2HP only; kicks/command/air/target fallback preserved. Every actual contact must satisfy existing reach/low-height/root limits without weakening thresholds.

## Review focus
Long-idle entry, rapid reversal, hitstop and belt-depth input; held/released-down attacks recover low before rise; no scaling low guard to standing height; actual contact alignment/air exclusion; static/standing/head-only/guard-contact and displaced-foot negatives; connected-peer/source rejection, rollback and all prior record/file preservation.

## Tasks
- [x] Extend actual crouch/punch input tests and observe missing Ryu art/mapping failures.
- [x] Generate/save four source sheets/exact prompts; install only after unchanged semantic/handoff gates pass.
- [x] Extend selector/LP recipe, registry/profiles/loading/exactmapping and existing partial-ingest fixture.
- [x] Fresh build/standard suite and asset regressions, actual-input previews and independent review.
- [x] Commit/update PR2 with matching tree; keep open/unmerged.

Baseline standard suite has3existingPWA failures(v025-resilience,v028-rc3,v063-rc38); report them explicitly if unchanged. No full-suite-green claim.

Ruling/loading RED: New stored art exceeded historical12MB total-on-disk pilot check(12,491,374bytes), revealing two unused staged specials still prefetched. Keep their files/records intact, remove1,854,080bytes of disabled-special requests, and enforce the unchanged12MB cap against actual prefetched Ryu art, with enabled/disabled group-membership assertions. New active art10,637,294bytes is slightly smaller than prior all-prefetched art despite31addedframes. A separate RED proves crouch was omitted from movement decoding; include crouch in existing movement preload to prepare it before first down input. No new loader or threshold increase.

Contact RED: ordinary guard substitutions were already rejected, but moving HP contact into startup frame1 while substituting a low guard at actual contact4 passed old whole-strip/default-contact QA. Ryu-only low punch audit now checks every actual3/3/4–5 contact using the same existing bounds and fixed arm-band metrics; six-roster defaults unchanged. Correct low baseline provenance says installed-crouch. Refresh new crouch reciprocal peer QA after installing its attacks; preserve original17records/files.

Source/input evidence:22new drawings/31stored frames across4first-generation sheets all pass unchanged original gates. Crouch ratio0.730659, centroiddrop51.57, baseline433, heldheight255; low punchscale references heldframe5. Actual crouch input7characters/42storedF/84Canvasdraws; low attacks7characters/355storedF/3620draws; standing42strips/385F/1966draws.160tick repeated-attack preview reaches all crouch/low-punch frames and contact positions in both facings, freezes in hitstop, exercises held/released down and ends idle. Independent review found noP1/P2, verified alloriginal17records/art hashes, sourceprovenance, mapping/clock/loading and netprefetch reduction56,392bytes.

Final validation: fresh typecheck/clean production passed;402release files hash7DF58AE46374091D. Standard81commands78pass/3unchanged PWA failures(v025-resilience,v028-rc3,v063-rc38), reported explicitly.22default+14Ryu runtime checks and extended partial-ingest fixture passed.11fresh focused JS checks passed. NoP1/P2 in independent review; original17records/art preserved, exact source bindings and safe prefetch reduction confirmed. Delivery commit and PR2 use matching Git trees; keep PR open/unmerged.
