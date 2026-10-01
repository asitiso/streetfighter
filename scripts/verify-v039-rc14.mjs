import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification, DEVICE_CERT_TESTS, certificationSummary } from '../dist/assets/core/DeviceCertification.js';
import { remainingCertificationActions, buildFinalProofBundle } from '../dist/assets/core/FinalProofBundle.js';

assert.ok(/^0\.0\.(?:39|[4-9]\d)-rc\.(?:14|1[5-9]|[2-9]\d+)$/.test(RELEASE_CANDIDATE));
assert.ok(Number(GAME_CACHE_NAME.replace('game-cache-v','')) >= 39);
assert.ok(DEVICE_CERT_TESTS.some((test) => test.id === 'production-review' && test.required));

const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T08:00:00.000Z'), 'RC14 TEST PHONE');
for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T08:01:00.000Z' };
cert.tests['production-review'] = { status: 'check', updatedAt: '2026-09-24T08:02:00.000Z', note: 'target-device review pending' };
cert.touchLatency = { samples: [20,21,22,23,24,25,26,27], averageMs: 23.5, p95Ms: 27, status: 'pass', measuredAt: '2026-09-24T08:03:00.000Z' };

let remaining = remainingCertificationActions(cert).filter((item) => item.status !== 'done');
assert.deepEqual(remaining.map((item) => item.id), ['production-review']);
assert.equal(certificationSummary(cert).total, DEVICE_CERT_TESTS.length + 1);

const baseTelemetry = {
  sampleCount: 36000, sessionSeconds: 610, averageFps: 59.2, lowFps: 52.4, maxFrameMs: 31, longFrameRate: .01,
  heapUsedMb: 120, heapPeakMb: 128, heapGrowthMb: 3, heapTrendMbPerMin: .5, memoryStability: 'good', qualityChanges: 0,
  stability: 'good', baselineFps: 60, recentFps: 56, sustainedDegradationPct: 6.7, sustainedStability: 'good',
};
const errors = { candidate: RELEASE_CANDIDATE, total: 0, fatal: 0, errors: 0, warnings: 0, entries: [] };
const recovery = { candidate: RELEASE_CANDIDATE, total: 2, success: 2, checks: 0, failed: 0, entries: [] };
const safeArea = { supported: true, landscape: true, viewportWidth: 1280, viewportHeight: 720, insets: { top: 0, right: 34, bottom: 21, left: 44 }, canvasInsideSafeArea: true, ready: true, note: 'AUTO: safe area ready' };

let proof = buildFinalProofBundle({
  candidate: RELEASE_CANDIDATE,
  certification: cert,
  telemetry: baseTelemetry,
  errors,
  recovery,
  safeArea,
  environment: { online: false, standalone: true, serviceWorkerControlled: true, userAgent: 'RC14 TEST', viewport: '1280x720' },
  approval: null,
}, new Date('2026-09-24T08:05:00.000Z'));
assert.equal(proof.complete, false);
assert.deepEqual(proof.remaining.map((item) => item.id), ['production-review']);

cert.tests['production-review'] = { status: 'pass', updatedAt: '2026-09-24T08:06:00.000Z' };
remaining = remainingCertificationActions(cert).filter((item) => item.status !== 'done');
assert.equal(remaining.length, 0);
proof = buildFinalProofBundle({
  candidate: RELEASE_CANDIDATE,
  certification: cert,
  telemetry: baseTelemetry,
  errors,
  recovery,
  safeArea,
  environment: { online: false, standalone: true, serviceWorkerControlled: true, userAgent: 'RC14 TEST', viewport: '1280x720' },
  approval: null,
}, new Date('2026-09-24T08:07:00.000Z'));
assert.equal(proof.complete, true);
assert.equal(proof.summary.status, 'pass');

const scene = await readFile(new URL('../src/scenes/DeviceCertificationScene.ts', import.meta.url), 'utf8');
for (const token of ['FINAL CERT RUN / PROOF', 'focusNextRequired', 'FINAL PRODUCTION REVIEW', 'LP PASS / EXPORT PROOF', 'exportFinalProof']) assert.ok(scene.includes(token), `missing RC14 device-cert UI ${token}`);
const app = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['buildFinalProofBundle', 'final-proof.json', 'safeArea: measureSafeArea(this.canvas)', 'approval: this.releaseApproval.snapshot()']) assert.ok(app.includes(token), `missing final-proof integration ${token}`);
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes("'/assets/core/FinalProofBundle.js'"));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(/V0\.0\.(?:39|[4-9]\d)-RC(?:14|1[5-9]|[2-9]\d+)/.test(title));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  requiredDeviceChecks: DEVICE_CERT_TESTS.length + 1,
  guidedNextAction: 'FIRST_NON_PASS_DEVICE_CHECK',
  productionReview: 'FORMAL_REQUIRED_TARGET_DEVICE_VISUAL_AUDIO_REVIEW',
  finalProof: 'CERT+TELEMETRY+SAFE_AREA+ERRORS+RECOVERY+ENVIRONMENT+APPROVAL',
  completeProofWhenAllPass: proof.complete,
  verdict: 'FINAL_CERT_RUN_AND_PROOF_BUNDLE_PASS',
};
await writeFile(new URL('../RC14_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V039_RC14_PASS', result);
