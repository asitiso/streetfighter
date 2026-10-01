# V073 — KEN STANDING ATTACKS AUTHORED QA

## Scope
Ken `Stand Light 7F` and `Stand Heavy 10F` are now first-class authored sequences in the RC39 Ken ingest/QA pipeline. Combat timing, damage, hitbox, hitstop and cancel data were not changed.

## New authoring packets
- `art-source/ken/authoring-packets/stand-light` — 7 transparent HQ source frames
- `art-source/ken/authoring-packets/stand-heavy` — 10 transparent HQ source frames
- Matching inbox/dropzones are seeded under `art-source/ken/inbox/...`

## Semantic gates
### Stand Light 7F
Required arc: neutral → anticipation → startup → contact → follow-through → recovery → neutral bridge.
The gate checks authored affine residual, contact silhouette, hand reach, root drive, planted feet, stance stability and recovery handoff.

Current staging rejection:
- affine residual avg/max: `0.001745` / `0.002213`
- reach range: `14.0 px` (minimum `24.0 px`)
- foot-center range: `77.489282 px` (maximum `38.0 px`)
- verdict: `REJECTED`

### Stand Heavy 10F
Required arc: neutral → load → hip turn → drive → pre-contact → contact → follow-through → recoil → recovery → neutral bridge.
The gate additionally expects a larger reach/torque phase while still preventing rigid whole-body sliding.

Current staging rejection:
- affine residual avg/max: `0.001664` / `0.002263`
- reach range: `26.0 px` (minimum `38.0 px`)
- foot-center range: `155.140262 px` (maximum `58.0 px`)
- verdict: `REJECTED`

## Handoff QA
Added gated `BASE↔LIGHT` and `BASE↔HEAVY` checks. They only become blocking when the corresponding authored sequence is actually promoted.

## Runtime QA
`semantic-audit.json` now includes both standing attacks. `animation-qa.html` displays their semantic result and handoff status just like movement/defense sequences.

## Commands
- `npm run prepare:ken:stand-light`
- `npm run prepare:ken:stand-heavy`
- `npm run ingest:ken:stand-light`
- `npm run ingest:ken:stand-heavy`
- `npm run verify:ken-standing-attacks`

## Verification
PASS:
- TypeScript typecheck
- production build / release integrity
- 11 Ken authoring packets
- standing-attack semantic fixtures
- source/pose gates
- runtime semantic audit
- handoff QA
- animation-sequence verifier
- Ken authored pipeline verifier
- RC38 regression verifier

## Runtime state
Ken remains intentionally gated at `0` enabled authored frames until genuine HQ source frames pass the authoring gates. The existing transform-derived attack strips are still staging/reference only.

## Verdict
`KEN_STANDING_ATTACKS_AUTHORED_GATE_PASS`
