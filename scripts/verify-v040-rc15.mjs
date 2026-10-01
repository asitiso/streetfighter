import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification, DEVICE_CERT_TESTS } from '../dist/assets/core/DeviceCertification.js';
import { buildReleaseEvidenceFingerprint } from '../dist/assets/core/ReleaseEvidenceFingerprint.js';
import { evaluateReleaseApproval } from '../dist/assets/core/ReleaseApproval.js';
import { buildFinalProofBundle } from '../dist/assets/core/FinalProofBundle.js';
import { compareLatestCertification } from '../dist/assets/core/DeviceCertificationHistory.js';

assert.match(RELEASE_CANDIDATE, /^0\.0\.\d+-rc\.\d+$/);
assert.ok(Number(RELEASE_CANDIDATE.match(/^0\.0\.(\d+)/)?.[1] ?? 0) >= 40);
assert.ok(Number(GAME_CACHE_NAME.replace('game-cache-v','')) >= 40);

function passedCertification() {
  const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T09:00:00Z'), 'RC15 TARGET PHONE');
  for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T09:01:00Z', note: `PASS ${test.id}` };
  cert.touchLatency = { samples: [18,19,20,21,22,23,24,25], averageMs: 21.5, p95Ms: 25, status: 'pass', measuredAt: '2026-09-24T09:02:00Z' };
  cert.lastAcceptance = { status: 'pass', passed: 22, checks: 0, blocked: 0, total: 22, items: [{ id: 'release-gate', label: 'AUTOMATED RELEASE GATE', status: 'pass', detail: 'READY' }] };
  return cert;
}

const cleanErrors = { candidate: RELEASE_CANDIDATE, total: 0, fatal: 0, errors: 0, warnings: 0, entries: [] };
const cert = passedCertification();
const fingerprintA = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: cleanErrors });
const fingerprintB = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: JSON.parse(JSON.stringify(cert)), errors: JSON.parse(JSON.stringify(cleanErrors)) });
assert.equal(fingerprintA, fingerprintB);
assert.match(fingerprintA, /^[0-9A-F]{16}$/);

const storedApproval = { candidate: RELEASE_CANDIDATE, verdict: 'approved', approvedAt: '2026-09-24T09:05:00Z', deviceLabel: cert.deviceLabel, detail: 'SEALED', evidenceFingerprint: fingerprintA };
const comparison = compareLatestCertification([], RELEASE_CANDIDATE, cert);
let approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: cleanErrors, storedApproval, currentFingerprint: fingerprintA });
assert.equal(approval.verdict, 'approved');
assert.match(approval.detail, /SEALED EVIDENCE MATCH/);

const changedCert = JSON.parse(JSON.stringify(cert));
changedCert.tests['production-review'] = { status: 'pass', updatedAt: '2026-09-24T09:06:00Z', note: 'REVIEWED AGAIN' };
const changedFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: changedCert, errors: cleanErrors });
assert.notEqual(changedFingerprint, fingerprintA);
approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: changedCert.lastAcceptance, certification: changedCert, comparison: compareLatestCertification([], RELEASE_CANDIDATE, changedCert), errors: cleanErrors, storedApproval, currentFingerprint: changedFingerprint });
assert.equal(approval.verdict, 'ready-for-approval');
assert.match(approval.detail, /EVIDENCE CHANGED/);

const runtimeError = { candidate: RELEASE_CANDIDATE, total: 1, fatal: 0, errors: 1, warnings: 0, entries: [{ id: 'err1', candidate: RELEASE_CANDIDATE, occurredAt: '2026-09-24T09:07:00Z', kind: 'error', severity: 'error', message: 'late runtime failure', stack: null, source: null, line: null, column: null }] };
const errorFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: runtimeError });
assert.notEqual(errorFingerprint, fingerprintA);
approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: runtimeError, storedApproval, currentFingerprint: errorFingerprint });
assert.equal(approval.verdict, 'blocked');
assert.match(approval.detail, /RUNTIME ERROR/);

const telemetry = { sampleCount: 36000, sessionSeconds: 610, averageFps: 59.2, lowFps: 52.4, maxFrameMs: 31, longFrameRate: .01, heapUsedMb: 120, heapPeakMb: 128, heapGrowthMb: 3, heapTrendMbPerMin: .5, memoryStability: 'good', qualityChanges: 0, stability: 'good', baselineFps: 60, recentFps: 56, sustainedDegradationPct: 6.7, sustainedStability: 'good' };
const recovery = { candidate: RELEASE_CANDIDATE, total: 0, success: 0, checks: 0, failed: 0, entries: [] };
const safeArea = { supported: true, landscape: true, viewportWidth: 1280, viewportHeight: 720, insets: { top: 0, right: 34, bottom: 21, left: 44 }, canvasInsideSafeArea: true, ready: true, note: 'AUTO: safe area ready' };
const environment = { online: true, standalone: true, serviceWorkerControlled: true, userAgent: 'RC15 TEST', viewport: '1280x720' };
let proof = buildFinalProofBundle({ candidate: RELEASE_CANDIDATE, certification: cert, telemetry, errors: cleanErrors, recovery, safeArea, environment, approval: storedApproval }, new Date('2026-09-24T09:10:00Z'));
assert.equal(proof.complete, true);
assert.equal(proof.sealed, true);
assert.equal(proof.evidenceFingerprint, fingerprintA);
proof = buildFinalProofBundle({ candidate: RELEASE_CANDIDATE, certification: changedCert, telemetry, errors: cleanErrors, recovery, safeArea, environment, approval: storedApproval }, new Date('2026-09-24T09:11:00Z'));
assert.equal(proof.complete, true);
assert.equal(proof.sealed, false);

const app = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['buildReleaseEvidenceFingerprint', 'sealed-final-proof', 'RELEASE SEALED', 'storedApproval']) assert.ok(app.includes(token), `missing RC15 app integration ${token}`);
const diagnostics = await readFile(new URL('../src/scenes/DiagnosticsScene.ts', import.meta.url), 'utf8');
for (const token of ['EVIDENCE ${approval.evidenceFingerprint', 'LP seals', 'Fingerprint']) assert.ok(diagnostics.includes(token), `missing RC15 diagnostics UI ${token}`);
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.match(sw, /const CACHE_VERSION = 'game-cache-v\d+'/);
assert.ok(sw.includes("'/assets/core/ReleaseEvidenceFingerprint.js'"));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(title.includes('RELEASE SEAL') || title.includes('EVIDENCE SEAL + STALE GUARD'));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  fingerprint: fingerprintA,
  stableFingerprint: fingerprintA === fingerprintB,
  staleCertificationDetected: changedFingerprint !== fingerprintA,
  runtimeErrorInvalidatesApproval: true,
  sealedProofWhenMatched: true,
  staleProofRejected: true,
  approvalFlow: 'APPROVE_SEAL_AUTO_EXPORT_FINAL_PROOF',
  verdict: 'EVIDENCE_SEAL_AND_STALE_GUARD_PASS',
};
await writeFile(new URL('../RC15_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V040_RC15_PASS', result);
