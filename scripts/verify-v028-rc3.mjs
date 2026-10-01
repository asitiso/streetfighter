import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeviceCertification, DEVICE_CERT_TESTS, certificationSummary, latencyStats } from '../dist/assets/core/DeviceCertification.js';
import { selectPreviousGameCache } from '../dist/assets/core/PwaUpdateManager.js';
import { buildAcceptanceMatrix } from '../dist/assets/core/AcceptanceMatrix.js';
import { buildReleaseReport, RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { RELEASE_PROFILES } from '../dist/assets/core/ReleaseProfiles.js';
import { GAME_CACHE_NAME, CAMPAIGN_OFFLINE_URLS, OFFLINE_TRANSITIONS } from '../dist/assets/core/AssetManager.js';
import { simulatePreviousReleaseUpgrade } from '../dist/assets/core/UpdatePolicy.js';

const fast = latencyStats([13,15,16,14,17,18,15,16]);
assert.equal(fast.status, 'pass');
assert.ok((fast.p95Ms ?? 999) <= 80);
const borderline = latencyStats([75,80,84,91,105,111,118,120]);
assert.equal(borderline.status, 'check');
const slow = latencyStats([121,128,133,139,144,151,160,170]);
assert.equal(slow.status, 'fail');

const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T08:00:00.000Z'), 'TEST PHONE • 8C • 8GB');
for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T08:05:00.000Z' };
cert.touchLatency = { samples: [13,15,16,14,17,18,15,16], ...fast, measuredAt: '2026-09-24T08:06:00.000Z' };
const summary = certificationSummary(cert);
assert.equal(summary.status, 'pass');
assert.equal(summary.passed, summary.total);
assert.equal(summary.total, DEVICE_CERT_TESTS.length + 1);

assert.equal(selectPreviousGameCache(['game-cache-v024','game-cache-v027','game-cache-v026'], 'game-cache-v028'), 'game-cache-v027');
assert.equal(selectPreviousGameCache(['browser-runtime-cache'], 'game-cache-v028'), null);
assert.match(GAME_CACHE_NAME, /^game-cache-v\d+$/);

const telemetry = {
  sampleCount: 1800, sessionSeconds: 30, averageFps: 60, lowFps: 57, maxFrameMs: 21,
  longFrameRate: 0.003, heapUsedMb: 124, heapPeakMb: 148, heapGrowthMb: 2,
  heapTrendMbPerMin: 4, memoryStability: 'good', qualityChanges: 0, stability: 'good',
};
const gate = evaluateReleaseGate({
  saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true,
  landscape: true, offlineCampaignReady: true, networkOnline: false, cacheSaveSeparated: true,
  loadingRecoveryReady: true, serviceWorkerUpdateSafe: true, portableSaveReady: true,
  offlineTransitionsReady: true, updateSimulationSafe: true, releaseReportReady: true, telemetry,
  saveHealth: { source: 'primary', repaired: false, backupReady: true, issues: [] },
});
assert.equal(gate.verdict, 'ready');
const offline = { supported: true, ready: true, cached: CAMPAIGN_OFFLINE_URLS.length, total: CAMPAIGN_OFFLINE_URLS.length, missing: [] };
const transitions = { ready: true, readyCount: 5, total: 5, transitions: OFFLINE_TRANSITIONS.map((row) => ({ id: row.id, label: row.label, ready: true, missing: [] })) };
const updatePlan = simulatePreviousReleaseUpgrade(GAME_CACHE_NAME, 'ssc-save-data-v1');
const saveHealth = { source: 'primary', repaired: false, issues: [], backupReady: true, schemaVersion: 2 };
const matrix = buildAcceptanceMatrix({
  gate, saveHealth, portableSaveReady: true, updatePlan, offline, transitions, loadingRecoveryReady: true,
  serviceWorkerSupported: true, serviceWorkerControlled: true, standalone: true, landscape: true, telemetry,
  deviceCertification: cert,
});
assert.equal(matrix.status, 'pass');
assert.ok(matrix.items.some((row) => row.id === 'device-certification' && row.status === 'pass'));
assert.ok(matrix.items.some((row) => row.id === 'touch-latency' && row.status === 'pass'));

const report = buildReleaseReport({
  gate, profile: RELEASE_PROFILES.performance, telemetry, saveHealth, offline, transitions, updatePlan,
  serviceWorkerControlled: true, standalone: true, landscape: true, online: false, acceptanceMatrix: matrix,
  deviceCertification: cert,
}, new Date('2026-09-24T08:10:00.000Z'));
assert.equal(report.candidate, RELEASE_CANDIDATE);
assert.equal(report.deviceCertification?.touchLatency.status, 'pass');
assert.equal(report.acceptanceMatrix.status, 'pass');

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes("type === 'SKIP_WAITING'"));
assert.ok(sw.includes("type === 'ROLLBACK_PREVIOUS'"));
assert.ok(sw.includes("type === 'GET_UPDATE_STATUS'"));
assert.ok(sw.includes("type === 'RESTORE_CURRENT'"));
assert.ok(sw.includes('ROLLBACK_MARKER'));
assert.ok(sw.includes('pinCurrentShell'));
assert.ok(sw.includes('APP_SHELL.includes(pathname)'));
assert.ok(sw.includes("type === 'RESTORE_CURRENT'"));
assert.ok(sw.includes('previousGameCache'));
const installBlock = sw.slice(sw.indexOf("self.addEventListener('install'"), sw.indexOf("self.addEventListener('activate'"));
assert.ok(!installBlock.includes('self.skipWaiting()'), 'update worker must wait for in-app apply');
assert.ok(!sw.includes('indexedDB'));
for (const module of ['DeviceCertification.js','TouchLatencyProbe.js','PwaUpdateManager.js','DeviceCertificationScene.js','PwaUpdateScene.js']) {
  assert.ok(sw.includes(module), `${module} missing from app shell`);
}

const app = readFileSync(new URL('../dist/assets/core/GameApp.js', import.meta.url), 'utf8');
assert.ok(app.includes('DEVICE CERT'));
assert.ok(app.includes('PWA UPDATE'));
const title = readFileSync(new URL('../dist/assets/scenes/TitleScene.js', import.meta.url), 'utf8');
assert.match(title, /V0\.0\.\d+-RC\d+/);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.version, RELEASE_CANDIDATE);

console.log('V028_RC3_PASS', {
  candidate: RELEASE_CANDIDATE,
  certification: `${summary.passed}/${summary.total}`,
  touchP95: fast.p95Ms,
  acceptance: `${matrix.passed}/${matrix.total}`,
  previousCache: selectPreviousGameCache(['game-cache-v027','game-cache-v026'], GAME_CACHE_NAME),
  rollbackProtocol: 'ready',
});
