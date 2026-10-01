import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createPortableSave, decodePortableSave, DEFAULT_SAVE, checksumSave, sanitizeGameSave, SAVE_DB_NAME } from '../dist/assets/save/SaveManager.js';
import { GAME_CACHE_NAME, CAMPAIGN_OFFLINE_URLS, OFFLINE_TRANSITIONS } from '../dist/assets/core/AssetManager.js';
import { runOfflineCampaignHarness } from '../dist/assets/core/OfflineCampaignHarness.js';
import { runReleaseUpgradeHarness } from '../dist/assets/core/ReleaseUpgradeHarness.js';
import { buildAcceptanceMatrix } from '../dist/assets/core/AcceptanceMatrix.js';
import { buildReleaseReport, RELEASE_CANDIDATE, releaseReportJson } from '../dist/assets/core/ReleaseReport.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { RELEASE_PROFILES } from '../dist/assets/core/ReleaseProfiles.js';

const fullSave = sanitizeGameSave({
  ...DEFAULT_SAVE,
  currentStage: 5,
  completedStages: [1,2,3,4],
  selectedCharacter: 'YUN',
  selectedSuperArt: 3,
  stageSelectUnlocked: true,
  hasCampaignStarted: true,
  audioEnabled: false,
  vibrationEnabled: false,
  touchStickScale: 1.18,
  touchButtonScale: .91,
  touchOpacity: .66,
  stageResults: [
    { stageId: 1, clearSeconds: 611, defeatedEnemies: 11, damageDealt: 3200, damageTaken: 420, maxComboHits: 8, maxComboDamage: 611, parries: 12, redParries: 2, supersUsed: 4, throwsLanded: 3 },
    { stageId: 2, clearSeconds: 655, defeatedEnemies: 13, damageDealt: 3550, damageTaken: 512, maxComboHits: 10, maxComboDamage: 690, parries: 15, redParries: 1, supersUsed: 5, throwsLanded: 4 },
  ],
}).save;

// Export -> reset -> import: imported state must be byte-equivalent after normalization.
const portable = createPortableSave(fullSave, new Date('2026-09-24T07:00:00.000Z'));
const exportedText = JSON.stringify(portable, null, 2);
const resetState = sanitizeGameSave({ ...DEFAULT_SAVE, completedStages: [], stageResults: [] }).save;
assert.notEqual(checksumSave(resetState), checksumSave(fullSave));
const restored = decodePortableSave(exportedText).save;
assert.deepEqual(restored, fullSave);
assert.equal(checksumSave(restored), checksumSave(fullSave));

// A previous-cache -> RC2 cache update must never modify the save fingerprint.
const fingerprint = checksumSave(fullSave);
const upgrade = runReleaseUpgradeHarness(
  ['game-cache-v024', 'game-cache-v025', 'game-cache-v026', GAME_CACHE_NAME, 'browser-runtime-cache'],
  GAME_CACHE_NAME,
  SAVE_DB_NAME,
  fingerprint,
);
assert.equal(upgrade.plan.safe, true);
assert.equal(upgrade.savePreserved, true);
assert.equal(upgrade.saveFingerprintAfter, fingerprint);
assert.equal(upgrade.currentCachePresent, true);
assert.equal(upgrade.staleCachesRemoved, true);
assert.ok(upgrade.afterCaches.includes('browser-runtime-cache'));
for (const old of ['game-cache-v024','game-cache-v025','game-cache-v026']) assert.ok(!upgrade.afterCaches.includes(old));

// Full offline campaign harness: reader is backed only by bytes from dist, with no network path.
const offlineBytes = new Map();
for (const url of CAMPAIGN_OFFLINE_URLS) {
  const disk = new URL(`../dist${url}`, import.meta.url);
  assert.ok(existsSync(disk), `offline file missing on disk: ${url}`);
  offlineBytes.set(url, new Uint8Array(await readFile(disk)));
}
const offline = await runOfflineCampaignHarness(async (url) => offlineBytes.get(url) ?? null);
assert.equal(offline.ready, true);
assert.equal(offline.traversed, 5);
assert.equal(offline.total, 5);
assert.deepEqual(offline.steps.map((step) => step.id), ['1-2','2-3','3-4','4-5','5-ending']);
const brokenBytes = new Map(offlineBytes);
brokenBytes.delete(OFFLINE_TRANSITIONS[4].urls[0]);
const brokenOffline = await runOfflineCampaignHarness(async (url) => brokenBytes.get(url) ?? null);
assert.equal(brokenOffline.ready, false);
assert.equal(brokenOffline.steps.at(-1).ready, false);

const telemetry = {
  sampleCount: 1200, sessionSeconds: 20, averageFps: 60, lowFps: 58, maxFrameMs: 20,
  longFrameRate: 0.002, heapUsedMb: 126, heapPeakMb: 151, heapGrowthMb: 2,
  heapTrendMbPerMin: 4, memoryStability: 'good', qualityChanges: 0, stability: 'good',
};
const gate = evaluateReleaseGate({
  saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true,
  landscape: true, offlineCampaignReady: true, telemetry,
  saveHealth: { source: 'primary', repaired: false, backupReady: true, issues: [] },
  networkOnline: false, cacheSaveSeparated: true, loadingRecoveryReady: true,
  serviceWorkerUpdateSafe: true, portableSaveReady: true, offlineTransitionsReady: true,
  updateSimulationSafe: true, releaseReportReady: true,
});
assert.equal(gate.verdict, 'ready');
const offlineStatus = { supported: true, ready: true, cached: CAMPAIGN_OFFLINE_URLS.length, total: CAMPAIGN_OFFLINE_URLS.length, missing: [] };
const transitionStatus = { ready: true, readyCount: 5, total: 5, transitions: OFFLINE_TRANSITIONS.map((t) => ({ id: t.id, label: t.label, ready: true, missing: [] })) };
const saveHealth = { source: 'primary', repaired: false, issues: [], backupReady: true, schemaVersion: 2 };
const matrix = buildAcceptanceMatrix({
  gate, saveHealth, portableSaveReady: true, updatePlan: upgrade.plan, offline: offlineStatus,
  transitions: transitionStatus, loadingRecoveryReady: true, serviceWorkerSupported: true,
  serviceWorkerControlled: true, standalone: true, landscape: true, telemetry,
});
assert.equal(matrix.status, 'pass');
assert.equal(matrix.blocked, 0);
assert.equal(matrix.checks, 0);
assert.equal(matrix.passed, matrix.total);
assert.ok(matrix.items.some((row) => row.id === 'offline-5-ending' && row.status === 'pass'));

const report = buildReleaseReport({
  gate, profile: RELEASE_PROFILES.performance, telemetry, saveHealth,
  offline: offlineStatus, transitions: transitionStatus, updatePlan: upgrade.plan,
  serviceWorkerControlled: true, standalone: true, landscape: true, online: false,
  acceptanceMatrix: matrix,
}, new Date('2026-09-24T07:30:00.000Z'));
assert.equal(report.candidate, RELEASE_CANDIDATE);
assert.equal(report.acceptanceMatrix.status, 'pass');
assert.equal(report.acceptanceMatrix.total, matrix.total);
assert.ok(releaseReportJson(report).includes('"acceptanceMatrix"'));

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(!sw.includes('indexedDB'));
const app = readFileSync(new URL('../dist/assets/core/GameApp.js', import.meta.url), 'utf8');
for (const name of ['Stage1Scene','Stage2Scene','Stage3Scene','Stage4Scene','Stage5Scene','EndingScene']) {
  assert.match(app, new RegExp(`import\\([\\\"\\\']\\.\\./scenes/${name}\\.js[\\\"\\\']\\)`), `${name} must remain dynamic import`);
}
const pkgJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkgJson.version, RELEASE_CANDIDATE);

console.log('V027_RC2_PASS', {
  candidate: RELEASE_CANDIDATE,
  saveRoundTrip: 'export-reset-import exact restore',
  updateCachesRemoved: upgrade.plan.staleGameCaches.length,
  offlineTransitions: `${offline.traversed}/${offline.total}`,
  deferredFiles: CAMPAIGN_OFFLINE_URLS.length,
  acceptance: `${matrix.passed}/${matrix.total} pass`,
});
