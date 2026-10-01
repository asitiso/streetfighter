# V068 — KEN IDLE AUTHORING DROP-ZONE

## Goal
Make the next real Ken Idle HQ pass operationally simple: author six genuine high-resolution poses, drop them into one folder, run one command, and let the existing gates decide whether the motion is safe to promote.

## Added in this batch

### 1. One-folder authoring packet
Added `scripts/prepare-ken-authoring-bundle.py` and generated:

- `art-source/ken/authoring-packets/idle/README.md`
- `art-source/ken/authoring-packets/idle/FRAME_MANIFEST.json`
- `art-source/ken/authoring-packets/idle/_AUTHORING_BOARD.png`
- `_references/ken_master_new_original_v01.png`
- `_references/ken_exactpose_reference.png`

The Idle board defines six authored poses:
1. neutral
2. inhale
3. chest-rise
4. weight-shift
5. exhale
6. return-to-neutral

### 2. Ready-to-use inbox
`npm run prepare:ken:idle` now also seeds:

`art-source/ken/inbox/idle/`

with underscore-prefixed authoring guides. The ingest loader ignores those files, so the only manual step is to add:

`01.png` ... `06.png`

Then run:

`npm run ingest:ken:idle`

### 3. Directory-local sequence settings
A motion folder may now contain `sequence.json`. This removes the need to maintain a second sidecar file elsewhere. Background-extraction settings are honored for both sheet and per-frame-directory sources.

### 4. Opaque-source safety gate
Large canvas size can no longer fake HQ source resolution. Fully opaque frame sources are rejected unless a supported background-extraction path was explicitly requested. Production authored sources should be transparent PNGs.

### 5. Guide files cannot accidentally become animation frames
Files whose names begin with `_` are excluded from directory frame loading. This prevents `_MASTER_REFERENCE.png` or `_AUTHORING_BOARD.png` from being counted among the six runtime frames.

## New commands

- `npm run prepare:ken:idle`
- `npm run ingest:ken:idle`
- `npm run verify:ken-authoring`

`verify:ken-pipeline` now includes the authoring-packet verification.

## Verification
Passed:

- `KEN_AUTHORING_PACKET_PASS`
- `KEN_INGEST_ORCHESTRATOR_PASS`
- `KEN_IDLE_SEMANTIC_QA_PASS`
- `KEN_SOURCE_GATES_PASS`
- TypeScript typecheck
- Ken pose-variance measurement
- `KEN_AUTHORED_PIPELINE_VERIFY_PASS`
- `V063_RC38_PASS`

The long combined `verify:ken-pipeline` reached a successful build and then hit the execution-time ceiling; its remaining pose/pipeline/RC38 checks were run separately and passed.

## Runtime status
No fake promotion was performed.

- Ken target frames: 126F
- Ken runtime-enabled authored frames: **0F**
- Existing transform-derived sequences remain gated
- Idle remains pending until six genuinely authored HQ frames are supplied

## Next exact action
Create six transparent Ken Idle source frames at body height >= 240 px (600 px+ preferred), save them as:

`art-source/ken/inbox/idle/01.png` ... `06.png`

Then execute `npm run ingest:ken:idle`. If all source, pose, loop, root, foot and semantic gates pass, Idle will be promoted automatically and transactionally.
