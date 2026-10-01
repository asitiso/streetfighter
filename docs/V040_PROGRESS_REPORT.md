# Side-Scroll Chronicles — v0.0.40-rc.15 Progress Report

## RC15 focus

RC15 does not add new combat content. Its purpose is to make the final release evidence trustworthy after the operator approves it. RC14 could export one proof bundle, but it did not make it obvious when the underlying certification/error evidence changed after approval. RC15 adds an evidence fingerprint, release seal, stale-proof guard, and automatic sealed-proof export.

## 1. Release Evidence Fingerprint

A new `ReleaseEvidenceFingerprint` module generates a deterministic 64-bit FNV-1a fingerprint from the candidate-scoped evidence that matters to release approval:

- release candidate
- target-device label
- every device-certification test status, note and update time
- touch-latency samples / average / p95 / status
- latest Acceptance Matrix state and item results
- current runtime error journal summary and entries

Object keys are normalized before hashing, so identical evidence produces the same fingerprint even after JSON round-trips.

RC15 automated acceptance verifies identical evidence produces an identical 16-character uppercase fingerprint.

## 2. Approval is now a sealed snapshot, not a loose flag

`ReleaseApprovalRecord` now stores `evidenceFingerprint`.

When the operator approves the candidate, the current fingerprint is saved together with the candidate, device label and approval timestamp.

On every later approval evaluation:

- matching fingerprint → `APPROVED` remains valid
- changed fingerprint → approval becomes `READY FOR APPROVAL` with `EVIDENCE CHANGED • RE-APPROVAL REQUIRED`
- new runtime errors → release is `BLOCKED`
- certification / acceptance regressions still block approval using the existing gates

This prevents an old approval from silently remaining valid after certification notes, checks, latency evidence, Acceptance Matrix results, or runtime errors have changed.

## 3. Automatic sealed Final Proof export

Approving the release now immediately exports the current final proof.

If the stored approval fingerprint matches the current evidence, the proof contains:

- `complete: true` when all required certification checks are complete
- `sealed: true`
- the exact `evidenceFingerprint`
- the approval record that sealed that fingerprint

The automatic approved export uses a `sealed-final-proof` filename so the operator can distinguish it from an ordinary unsealed evidence export.

The existing `final-proof.json` naming path is also preserved for backward compatibility with the historical RC acceptance suite and manual export workflow.

## 4. Stale proof guard

`FinalProofBundle` recomputes the fingerprint when the proof is created. It does not trust the stored approval flag by itself.

A proof is sealed only when:

1. the device certification is complete,
2. no required certification action remains,
3. the stored approval is approved, and
4. the stored approval fingerprint exactly matches the newly computed evidence fingerprint.

RC15 acceptance mutates the production-review evidence after approval and verifies that the new proof remains complete but is no longer sealed.

It also injects a late runtime error and verifies that release approval becomes blocked.

## 5. Diagnostics visibility

The Release Approval diagnostics page now displays the active evidence fingerprint.

The operator can directly distinguish:

- current sealed evidence
- changed/stale evidence that requires approval again
- blocked evidence with runtime errors

The UI explicitly explains that LP seals the current evidence fingerprint and exports the proof, while the approved state confirms that the current fingerprint still matches.

## 6. Regression verification

Final `npm run verify`: PASS.

Preserved acceptance highlights:

- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1 → 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- 50-minute Virtual Marathon: PASS
- Gill 3 Phase HUD: PASS
- 5-stage Parallax: PASS
- Super / Red-Parry timing hierarchy: PASS
- BELT → DUEL → FINAL audio crossfade: PASS
- RC11 real-touch / background-resume certification: PASS
- RC12 Safe Area / offline Module Worker dynamic-import audit: PASS
- RC13 10-minute sustained-performance audit: PASS
- RC14 Final Cert Run / Production Review / Final Proof Bundle: PASS
- RC15 Evidence Seal / stale guard / sealed proof export: PASS

RC15 acceptance specifically verifies:

- deterministic evidence fingerprint
- certification change invalidates the old seal
- late runtime error invalidates approval
- matched evidence produces a sealed proof
- stale evidence cannot produce a sealed proof

## 7. PWA / deployment verification

Candidate: `0.0.40-rc.15`

PWA cache: `game-cache-v040`

Title footer: `V0.0.40-RC15 • EVIDENCE SEAL + STALE GUARD`

`ReleaseEvidenceFingerprint.js`, `ReleaseApproval.js`, and `FinalProofBundle.js` are available in the production build. Stage 2–5 and Ending remain deferred and are not promoted into the initial App Shell.

Direct HTTP verification returned 200 for:

- `/`
- `/assets/main.js`
- `/assets/core/ReleaseEvidenceFingerprint.js`
- `/assets/core/ReleaseApproval.js`
- `/assets/core/FinalProofBundle.js`
- `/assets/scenes/DiagnosticsScene.js`
- `/assets/scenes/DeviceCertificationScene.js`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

## V0.1 status

V0.1 COMPLETE is still not declared.

The code-side release gate is now considerably harder to accidentally invalidate after approval. The remaining work is real target-device execution: run the guided final certification on the installed phone, complete the offline transition audit, confirm the 10-minute physical heat result, and perform the final visual/audio production review.

Once those real-device checks are complete, the approval action can seal that exact evidence state and immediately export a sealed final proof. If anything material changes afterward, RC15 automatically requires re-approval instead of silently carrying the old approval forward.
