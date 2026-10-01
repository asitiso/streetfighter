import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification } from '../dist/assets/core/DeviceCertification.js';
import { compareLatestCertification, parseCertificationForHistory } from '../dist/assets/core/DeviceCertificationHistory.js';
import { buildReproPackage } from '../dist/assets/core/ReproPackage.js';
import { evaluateReleaseApproval } from '../dist/assets/core/ReleaseApproval.js';

assert.ok(/^0\.0\.(?:3[1-9]|[4-9]\d)-rc\.(?:[6-9]|[1-9]\d+)$/.test(RELEASE_CANDIDATE), `expected RC6+ candidate, got ${RELEASE_CANDIDATE}`);
assert.ok(Number(GAME_CACHE_NAME.replace('game-cache-v','')) >= 31);

function passCert(candidate, p95 = 22, label = 'PIXEL TEST DEVICE') {
  const cert = createDeviceCertification(candidate, new Date('2026-09-24T00:00:00Z'), label);
  for (const id of Object.keys(cert.tests)) cert.tests[id] = { status: 'pass', updatedAt: '2026-09-24T00:00:00Z' };
  cert.touchLatency = { samples: [16,18,20,19,21,17,22,18], averageMs: 18.9, p95Ms: p95, status: 'pass', measuredAt: '2026-09-24T00:00:00Z' };
  return cert;
}

const previous = passCert('0.0.30-rc.5', 24);
const current = passCert(RELEASE_CANDIDATE, 28);
const historyEntries = [{ id: 'old', candidate: previous.candidate, deviceLabel: previous.deviceLabel, capturedAt: '2026-09-24T01:00:00Z', source: 'upgrade', record: previous }];
const comparison = compareLatestCertification(historyEntries, RELEASE_CANDIDATE, current);
assert.equal(comparison.previousCandidate, '0.0.30-rc.5');
assert.equal(comparison.regression, false);
const slower = passCert(RELEASE_CANDIDATE, 60);
assert.equal(compareLatestCertification(historyEntries, RELEASE_CANDIDATE, slower).regression, true);

const historyPayload = JSON.stringify({ app: 'SIDE-SCROLL CHRONICLES', candidate: previous.candidate, exportedAt: '2026-09-24T01:00:00Z', summary: {}, record: previous });
const parsedHistory = parseCertificationForHistory(historyPayload);
assert.equal(parsedHistory.ok, true);
assert.equal(parsedHistory.record?.candidate, '0.0.30-rc.5');

const acceptance = { status: 'pass', passed: 21, checks: 0, blocked: 0, total: 21, items: [] };
current.lastAcceptance = acceptance;
const errors = { candidate: RELEASE_CANDIDATE, total: 1, fatal: 0, errors: 1, warnings: 0, entries: [{ id:'e1', candidate: RELEASE_CANDIDATE, occurredAt:'2026-09-24T00:00:00Z', kind:'load', severity:'error', message:'stage import failed', stack:'stack', source:'stage-4', line:null, column:null }] };
const repro = buildReproPackage({ candidate: RELEASE_CANDIDATE, errors, recovery: { candidate: RELEASE_CANDIDATE, total:0, success:0, checks:0, failed:0, entries:[] }, certification: current, telemetry: { samples:120, averageFps:60, lowFps:58, longFrameRatio:0, maxFrameMs:18, heapMb:120, peakHeapMb:122, heapTrendMbPerMin:0.1, stability:'good', memoryStability:'good', qualityChanges:0 }, save: { source:'primary', repaired:false, issues:[], schemaVersion:2, checksumValid:true, backupAvailable:true }, currentRoute:'stage-4', online:false, standalone:true }, new Date('2026-09-24T01:30:00Z'));
assert.equal(repro.primaryError?.message, 'stage import failed');
assert.equal(repro.environment.route, 'stage-4');
assert.equal(repro.environment.online, false);

const cleanErrors = { candidate: RELEASE_CANDIDATE, total:0, fatal:0, errors:0, warnings:0, entries:[] };
const approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance, certification: current, comparison, errors: cleanErrors });
assert.equal(approval.verdict, 'ready-for-approval');
const blankCert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T00:00:00Z'), 'NEW DEVICE');
const noCert = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance, certification: blankCert, comparison: compareLatestCertification([], RELEASE_CANDIDATE, blankCert), errors: cleanErrors });
assert.equal(noCert.verdict, 'requires-device-cert');
const regressed = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance, certification: slower, comparison: compareLatestCertification(historyEntries, RELEASE_CANDIDATE, slower), errors: cleanErrors });
assert.equal(regressed.verdict, 'blocked');

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
for (const moduleName of ['DeviceCertificationHistory.js','ReproPackage.js','ReleaseApproval.js']) assert.ok(sw.includes(`/assets/core/${moduleName}`));
const diagnostics = await readFile(new URL('../src/scenes/DiagnosticsScene.ts', import.meta.url), 'utf8');
for (const label of ['DEVICE HISTORY','RC COMPARE','FINAL APPROVAL','ERROR REPRO PACKAGE EXPORTED']) assert.ok(diagnostics.includes(label));
const certSource = await readFile(new URL('../src/core/DeviceCertification.ts', import.meta.url), 'utf8');
assert.ok(certSource.includes("parsed.candidate !== this.candidate"));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(/V0\.0\.(?:3[1-9]|[4-9]\d)-RC(?:[6-9]|[1-9]\d+)/.test(title));

const result = { candidate: RELEASE_CANDIDATE, cache: GAME_CACHE_NAME, deviceHistory: 'cross-RC archive supported', rcComparison: comparison.detail, regressionDetection: 'verified', reproPackage: 'verified', finalApproval: approval.verdict, uncertifiedApproval: noCert.verdict, regressionApproval: regressed.verdict };
await writeFile(new URL('../RC6_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V031_RC6_PASS', result);
