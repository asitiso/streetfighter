# V069 — KEN WALK + HANDOFF QA PROGRESS

## Goal
Continue the authored-only Ken animation pipeline without promoting transform-derived frames. This batch closes two gaps before real HQ source art arrives:

1. Idle must hand off cleanly to the base renderer and, later, to authored Walk.
2. Walk 12F must prove that it is a real alternating gait rather than duplicated/affine-transformed stills.

## Added

### 1. Ken handoff semantic audit
New files:

- `scripts/audit-ken-handoff-semantics.py`
- `scripts/verify-ken-handoff-qa.py`
- `public/art/animation-hq/ken/handoff-audit.json`

The audit checks:

- Idle frame 01 -> approved Ken HQ base sprite
- Idle frame 06 -> approved Ken HQ base sprite
- Authored Idle frame 06 -> authored Walk frame 01 when both are active
- Authored Walk frame 12 -> authored Idle frame 01 when both are active

Metrics:

- silhouette IoU
- root/centroid distance
- grounded-foot center delta
- silhouette area/scale ratio

This prevents an authored Idle from looking good in isolation but popping when gameplay enters or leaves Walk.

### 2. Dynamic verifier state
`verify-ken-authored-pipeline.mjs` no longer assumes Ken Idle must always remain disabled. It now accepts either state:

- gated: runtime promotion must remain false
- active: pose QA + semantic QA + handoff QA must all pass

The same dynamic rule is now applied to Walk.

### 3. QA screen handoff status
`/animation-qa.html?character=KEN` now includes `HANDOFF QA`.

Idle can show:

- `BASE BRIDGE PASS / FAIL`
- `WALK PENDING`
- `IDLE↔WALK PASS / FAIL`

This makes transition problems visible without reading JSON or running scripts manually.

### 4. Ken Walk 12F semantic QA
New file:

- `scripts/verify-ken-walk-semantic-qa.py`

`install-authored-ken-sequence.py` now applies Walk-specific semantic checks:

- frame 12 -> frame 01 loop closure
- frame 01 vs frame 07 opposite-contact difference
- real root/cadence motion
- no single-frame root jump
- body-volume stability
- real foot travel
- real stance-width change
- authored pose residual minimum/maximum

Important measured difference:

- current transform-derived Ken Walk frame 01 vs frame 07 IoU: **1.000000** -> rejected
- authored Ryu Walk frame 01 vs frame 07 IoU: **0.731888** -> accepted reference behavior
- authored Ryu Walk foot-center range: **101.031447 px**
- authored Ryu Walk affine residual average: **0.076941**

### 5. Runtime semantic audit expanded
`public/art/animation-hq/ken/semantic-audit.json` now contains both:

- Idle
- Walk

Current Ken Walk correctly fails authored/runtime promotion because:

- opposite contact difference: FAIL
- root travel present: FAIL
- stance changes: FAIL
- authored motion average/peak: FAIL

### 6. Walk authoring drop-zone
Added full 12-frame authoring packet:

- `art-source/ken/authoring-packets/walk/README.md`
- `art-source/ken/authoring-packets/walk/FRAME_MANIFEST.json`
- `art-source/ken/authoring-packets/walk/_AUTHORING_BOARD.png`
- exact Ken master references

Ready drop folder:

`art-source/ken/inbox/walk/`

Expected source files:

`01.png` ... `12.png`

New commands:

- `npm run prepare:ken:walk`
- `npm run ingest:ken:walk`
- `npm run verify:ken-walk`
- `npm run audit:ken-handoff`
- `npm run verify:ken-handoff`

## Current runtime state

No fake promotion was performed.

- Ken target: **126F**
- authored runtime enabled: **0F**
- current transform-derived Ken sequences rejected: **13 / 13**
- attack staging frames: **69F**

## Verification
Passed:

- `KEN_AUTHORING_PACKET_PASS` — Idle + Walk packets
- `KEN_INGEST_ORCHESTRATOR_PASS`
- `KEN_IDLE_SEMANTIC_QA_PASS`
- `KEN_WALK_SEMANTIC_QA_PASS`
- `KEN_HANDOFF_QA_PASS`
- `KEN_SOURCE_GATES_PASS`
- TypeScript typecheck
- build / release-integrity generation
- strict Ken pose variance audit
- runtime Idle + Walk semantic audit
- `KEN_AUTHORED_PIPELINE_VERIFY_PASS`
- `V063_RC38_PASS`

The combined `verify:ken-pipeline` reached and passed build, then hit the execution-time ceiling. Its remaining pose/pipeline verification steps were run separately and passed.

## Next exact action

1. Put genuine Ken Idle HQ frames into `art-source/ken/inbox/idle/01.png` ... `06.png`.
2. Run `npm run ingest:ken:idle`.
3. If promoted, the new handoff gate also verifies that Idle can safely return to the approved Ken base renderer while Walk is pending.
4. Then author `art-source/ken/inbox/walk/01.png` ... `12.png` and run `npm run ingest:ken:walk`.
5. Once both are active, the same handoff gate automatically switches to bidirectional `Idle ↔ Walk` validation.
