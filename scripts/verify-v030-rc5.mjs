import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification, deviceCertificationJson, parseDeviceCertificationJson } from '../dist/assets/core/DeviceCertification.js';
import { summarizeRecoveryHistory } from '../dist/assets/core/RecoveryHistory.js';
import { buildReleaseSummary } from '../dist/assets/core/ReleaseSummary.js';

assert.ok(/^0\.0\.(?:30|3[1-9]|[4-9]\d)-rc\.\d+$/.test(RELEASE_CANDIDATE));
assert.ok(Number(GAME_CACHE_NAME.replace('game-cache-v', '')) >= 30);

const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T00:00:00Z'), 'RC5 TEST DEVICE');
for (const key of Object.keys(cert.tests)) cert.tests[key] = { status: 'pass', updatedAt: '2026-09-24T00:00:00Z' };
cert.touchLatency = { samples: [16, 17, 18, 17, 19, 16, 18, 17], averageMs: 17.3, p95Ms: 19, status: 'pass', measuredAt: '2026-09-24T00:00:00Z' };
const exported = deviceCertificationJson(cert, new Date('2026-09-24T00:01:00Z'));
const imported = parseDeviceCertificationJson(exported, RELEASE_CANDIDATE);
assert.equal(imported.ok, true);
assert.equal(imported.record?.deviceLabel, 'RC5 TEST DEVICE');
const wrong = parseDeviceCertificationJson(exported, `${RELEASE_CANDIDATE}-different`);
assert.equal(wrong.ok, false);
assert.match(wrong.message, /CANDIDATE MISMATCH/);

const recovery = summarizeRecoveryHistory([
  { id: '1', candidate: RELEASE_CANDIDATE, occurredAt: '2026-09-24T00:00:00Z', kind: 'session-recovery', outcome: 'success', detail: 'RESTART STAGE 3' },
  { id: '2', candidate: RELEASE_CANDIDATE, occurredAt: '2026-09-24T00:01:00Z', kind: 'rollback', outcome: 'failed', detail: 'NO PREVIOUS CACHE' },
], RELEASE_CANDIDATE);
assert.equal(recovery.total, 2);
assert.equal(recovery.success, 1);
assert.equal(recovery.failed, 1);

const summary = buildReleaseSummary({
  candidate: RELEASE_CANDIDATE,
  save: { source: 'primary', repaired: false, issues: [], schemaVersion: 2, checksumValid: true, backupAvailable: true },
  certification: cert,
  errors: { candidate: RELEASE_CANDIDATE, total: 0, fatal: 0, errors: 0, warnings: 0, entries: [] },
  recovery: { candidate: RELEASE_CANDIDATE, total: 1, success: 1, checks: 0, failed: 0, entries: [] },
  telemetry: { samples: 120, averageFps: 60, lowFps: 58, longFrameRatio: 0, maxFrameMs: 18, heapMb: 120, peakHeapMb: 122, heapTrendMbPerMin: 0.2, stability: 'good', memoryStability: 'good', qualityChanges: 0 },
  serviceWorkerControlled: true, standalone: true, online: true,
}, new Date('2026-09-24T00:02:00Z'));
assert.equal(summary.status, 'ready');
assert.equal(summary.rows.length, 9);

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes('/assets/core/RecoveryHistory.js'));
assert.ok(sw.includes('/assets/core/ReleaseSummary.js'));
assert.ok(sw.includes('/assets/scenes/DiagnosticsScene.js'));

const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(title.includes("'diagnostics'"));
assert.ok(title.includes('const twoColumn = this.options.length >= 12'));
assert.match(title, /V0\.0\.\d+-RC\d+/);

const deviceScene = await readFile(new URL('../src/scenes/DeviceCertificationScene.ts', import.meta.url), 'utf8');
assert.ok(deviceScene.includes('IMPORT CERTIFICATION'));
const updates = await readFile(new URL('../src/core/PwaUpdateManager.ts', import.meta.url), 'utf8');
assert.ok(updates.includes("this.history.record('update-auto-recovery'"));

const result = { candidate: RELEASE_CANDIDATE, cache: GAME_CACHE_NAME, deviceCertImport: 'same-candidate verified', candidateMismatch: 'rejected', recoveryHistory: 'summarized', diagnostics: '3-page crash/recovery/summary', titleLayout: '12-item two-column', releaseSummary: summary.status };
await writeFile(new URL('../RC5_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V030_RC5_PASS', result);
