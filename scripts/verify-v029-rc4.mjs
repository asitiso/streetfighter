import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { RuntimeErrorJournal } from '../dist/assets/core/RuntimeErrorJournal.js';
import { SessionRecoveryStore, SESSION_RECOVERY_KEY } from '../dist/assets/core/SessionRecovery.js';
import { createDeviceCertification, DEVICE_CERT_TESTS, latencyStats, deviceCertificationJson } from '../dist/assets/core/DeviceCertification.js';
import { buildAcceptanceMatrix } from '../dist/assets/core/AcceptanceMatrix.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { decideFinalCandidate } from '../dist/assets/core/FinalCandidateDecision.js';
import { buildReleaseReport, RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME, CAMPAIGN_OFFLINE_URLS, OFFLINE_TRANSITIONS } from '../dist/assets/core/AssetManager.js';
import { simulatePreviousReleaseUpgrade } from '../dist/assets/core/UpdatePolicy.js';
import { RELEASE_PROFILES } from '../dist/assets/core/ReleaseProfiles.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() });

const candidate = RELEASE_CANDIDATE;
const candidateMatch = /^0\.0\.(\d+)-rc\.(\d+)$/.exec(candidate);
assert.ok(candidateMatch && Number(candidateMatch[1]) >= 29, 'RC4 guarantees must remain valid in later candidates');
const cacheMatch = /^game-cache-v(\d+)$/.exec(GAME_CACHE_NAME);
assert.ok(cacheMatch && Number(cacheMatch[1]) >= 29, 'RC4 cache policy must remain valid in later candidates');

// Interrupted stage must become recoverable, while a clean session must not.
localStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify({
  candidate, sessionId: 'old-session', status: 'active', route: 'stage-3', stage: 3,
  character: 'CHUN-LI', superArt: 2, startedAt: '2026-09-24T05:00:00.000Z', updatedAt: '2026-09-24T05:10:00.000Z', cleanReason: null,
}));
const recovery = new SessionRecoveryStore(candidate);
const interrupted = recovery.begin();
assert.equal(interrupted.available, true);
assert.equal(interrupted.checkpoint?.stage, 3);
assert.equal(interrupted.label, 'RESTART STAGE 3');
recovery.checkpoint('title', null, null, null);
assert.equal(recovery.snapshot().available, true, 'title checkpoint must not erase pending interrupted recovery');
assert.equal(recovery.consumeRecovery()?.character, 'CHUN-LI');
recovery.markClean('test');
const cleanNext = new SessionRecoveryStore(candidate).begin();
assert.equal(cleanNext.available, false);

// Candidate-scoped runtime journal should retain warning/error/fatal counts.
const journal = new RuntimeErrorJournal(candidate);
journal.clearCandidate();
journal.record('load', new Error('temporary stage fetch'), 'warning');
journal.record('error', new Error('recoverable runtime error'), 'error');
journal.record('boot', new Error('fatal boot'), 'fatal');
const errorSnapshot = journal.snapshot();
assert.deepEqual([errorSnapshot.warnings, errorSnapshot.errors, errorSnapshot.fatal], [1, 1, 1]);
journal.clearCandidate();
const cleanErrors = journal.snapshot();
assert.equal(cleanErrors.total, 0);

const cert = createDeviceCertification(candidate, new Date('2026-09-24T09:00:00.000Z'), 'RC4 TEST PHONE');
for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T09:01:00.000Z' };
const touch = latencyStats([12,13,14,15,16,17,18,19]);
cert.touchLatency = { samples: [12,13,14,15,16,17,18,19], ...touch, measuredAt: '2026-09-24T09:02:00.000Z' };
const exported = JSON.parse(deviceCertificationJson(cert, new Date('2026-09-24T09:03:00.000Z')));
assert.equal(exported.candidate, candidate);
assert.equal(exported.summary.status, 'pass');
assert.equal(exported.record.deviceLabel, 'RC4 TEST PHONE');

const telemetry = {
  sampleCount: 1800, sessionSeconds: 30, averageFps: 60, lowFps: 57, maxFrameMs: 21,
  longFrameRate: 0.003, heapUsedMb: 122, heapPeakMb: 146, heapGrowthMb: 1,
  heapTrendMbPerMin: 2, memoryStability: 'good', qualityChanges: 0, stability: 'good',
};
const saveHealth = { source: 'primary', repaired: false, issues: [], backupReady: true, schemaVersion: 2 };
const updatePlan = simulatePreviousReleaseUpgrade(GAME_CACHE_NAME, 'ssc-save-data-v1');
assert.equal(updatePlan.safe, true);
assert.ok(updatePlan.staleGameCaches.includes('game-cache-v028'));
const offline = { supported: true, ready: true, cached: CAMPAIGN_OFFLINE_URLS.length, total: CAMPAIGN_OFFLINE_URLS.length, missing: [] };
const transitions = { ready: true, readyCount: 5, total: 5, transitions: OFFLINE_TRANSITIONS.map((row) => ({ id: row.id, label: row.label, ready: true, missing: [] })) };
const gate = evaluateReleaseGate({
  saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true, landscape: true,
  offlineCampaignReady: true, networkOnline: false, cacheSaveSeparated: true, loadingRecoveryReady: true,
  serviceWorkerUpdateSafe: true, portableSaveReady: true, offlineTransitionsReady: true, updateSimulationSafe: true,
  releaseReportReady: true, runtimeFatalFree: true, runtimeErrorFree: true, sessionRecoveryReady: true,
  updateAutoRecoveryReady: true, telemetry, saveHealth,
});
assert.equal(gate.verdict, 'ready');
const matrix = buildAcceptanceMatrix({
  gate, saveHealth, portableSaveReady: true, updatePlan, offline, transitions, loadingRecoveryReady: true,
  serviceWorkerSupported: true, serviceWorkerControlled: true, standalone: true, landscape: true, telemetry,
  deviceCertification: cert, errorJournal: cleanErrors, sessionRecoveryReady: true, updateAutoRecoveryReady: true,
});
assert.equal(matrix.status, 'pass');
assert.ok(matrix.items.some((row) => row.id === 'runtime-errors' && row.status === 'pass'));
assert.ok(matrix.items.some((row) => row.id === 'session-recovery' && row.status === 'pass'));
assert.ok(matrix.items.some((row) => row.id === 'update-auto-recovery' && row.status === 'pass'));

const final = decideFinalCandidate({ gate, matrix, certification: cert, errors: cleanErrors, sessionRecoveryReady: true, updateRecoveryReady: true });
assert.equal(final.verdict, 'rc-ready');
const uncertified = createDeviceCertification(candidate);
assert.equal(decideFinalCandidate({ gate, matrix, certification: uncertified, errors: cleanErrors, sessionRecoveryReady: true, updateRecoveryReady: true }).verdict, 'device-cert-required');
const fatalErrors = { ...cleanErrors, total: 1, fatal: 1, entries: [{ id:'x', candidate, occurredAt:new Date().toISOString(), kind:'boot', severity:'fatal', message:'x', stack:null, source:null, line:null, column:null }] };
assert.equal(decideFinalCandidate({ gate, matrix, certification: cert, errors: fatalErrors, sessionRecoveryReady: true, updateRecoveryReady: true }).verdict, 'blocked');

const report = buildReleaseReport({
  gate, profile: RELEASE_PROFILES.performance, telemetry, saveHealth, offline, transitions, updatePlan,
  serviceWorkerControlled: true, standalone: true, landscape: true, online: false, acceptanceMatrix: matrix,
  deviceCertification: cert, errorJournal: cleanErrors, finalCandidate: final,
}, new Date('2026-09-24T09:04:00.000Z'));
assert.equal(report.finalCandidate?.verdict, 'rc-ready');
assert.equal(report.errorJournal?.fatal, 0);

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
for (const module of ['RuntimeErrorJournal.js','SessionRecovery.js','FinalCandidateDecision.js']) assert.ok(sw.includes(module), `${module} missing from app shell`);
assert.ok(!sw.includes('indexedDB'));
const main = readFileSync(new URL('../dist/assets/main.js', import.meta.url), 'utf8');
assert.ok(main.includes('recoverFailedBoot'));
assert.ok(main.includes("record('boot'"));
const updateSource = readFileSync(new URL('../dist/assets/core/PwaUpdateManager.js', import.meta.url), 'utf8');
assert.ok(updateSource.includes('UPDATE_ATTEMPT_KEY'));
assert.ok(updateSource.includes('AUTO RECOVERY'));
assert.ok(updateSource.includes('ROLLBACK_PREVIOUS'));
const appSource = readFileSync(new URL('../dist/assets/core/GameApp.js', import.meta.url), 'utf8');
assert.ok(appSource.includes('RECOVER SESSION'));
assert.ok(appSource.includes('device-cert.json') || appSource.includes('final-proof.json')); // RC14 final proof supersedes standalone cert export
const title = readFileSync(new URL('../dist/assets/scenes/TitleScene.js', import.meta.url), 'utf8');
assert.ok(title.includes('V0.0.'), 'title should retain visible release-candidate version');

const result = {
  candidate, acceptance: `${matrix.passed}/${matrix.total}`, finalVerdict: final.verdict,
  sessionRecovery: 'stage restart ready', deviceCertExport: 'ready', updateAutoRecovery: 'armed', crashJournal: 'candidate-scoped',
};
writeFileSync(new URL('../RC4_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V029_RC4_PASS', result);
