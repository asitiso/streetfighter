import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createPortableSave, decodePortableSave, DEFAULT_SAVE, checksumSave } from '../dist/assets/save/SaveManager.js';
import { GAME_CACHE_NAME, CAMPAIGN_OFFLINE_URLS, OFFLINE_TRANSITIONS } from '../dist/assets/core/AssetManager.js';
import { planCacheUpgrade, simulatePreviousReleaseUpgrade } from '../dist/assets/core/UpdatePolicy.js';
import { buildReleaseReport, RELEASE_CANDIDATE, releaseReportJson } from '../dist/assets/core/ReleaseReport.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { RELEASE_PROFILES } from '../dist/assets/core/ReleaseProfiles.js';

const save = { ...DEFAULT_SAVE, currentStage: 4, completedStages: [1,2,3], selectedCharacter: 'CHUN-LI', selectedSuperArt: 2, hasCampaignStarted: true };
const pkg = createPortableSave(save, new Date('2026-09-24T06:00:00.000Z'));
assert.equal(pkg.checksum, checksumSave(pkg.data));
const decoded = decodePortableSave(JSON.stringify(pkg));
assert.equal(decoded.save.currentStage, 4);
assert.equal(decoded.save.selectedCharacter, 'CHUN-LI');
const tampered = structuredClone(pkg);
tampered.data.currentStage = 5;
assert.throws(() => decodePortableSave(JSON.stringify(tampered)), /CHECKSUM MISMATCH/);
assert.throws(() => decodePortableSave('{bad json'), /INVALID JSON/);

assert.match(GAME_CACHE_NAME, /^game-cache-v\d+$/);
const update = simulatePreviousReleaseUpgrade(GAME_CACHE_NAME, 'ssc-save-data-v1');
assert.equal(update.safe, true);
assert.ok(update.staleGameCaches.includes('game-cache-v024'));
assert.ok(update.staleGameCaches.includes('game-cache-v025'));
assert.ok(update.preservedCaches.includes(GAME_CACHE_NAME));
assert.ok(update.preservedCaches.includes('browser-runtime-cache'));
const unsafe = planCacheUpgrade(['game-cache-v025'], GAME_CACHE_NAME, 'game-cache-v026');
assert.equal(unsafe.safe, false);

assert.equal(OFFLINE_TRANSITIONS.length, 5);
for (const transition of OFFLINE_TRANSITIONS) {
  assert.ok(transition.urls.length >= 1, `${transition.label} must have offline urls`);
  for (const url of transition.urls) {
    assert.ok(CAMPAIGN_OFFLINE_URLS.includes(url), `${transition.label} url missing from campaign set: ${url}`);
    const disk = new URL(`../dist${url}`, import.meta.url);
    assert.ok(existsSync(disk), `deferred offline file missing: ${url}`);
  }
}
assert.ok(CAMPAIGN_OFFLINE_URLS.includes('/assets/scenes/EndingScene.js'));
assert.ok(CAMPAIGN_OFFLINE_URLS.includes('/assets/game/EndingProfiles.js'));

const telemetry = {
  sampleCount: 900, sessionSeconds: 15, averageFps: 60, lowFps: 58, maxFrameMs: 19,
  longFrameRate: 0.002, heapUsedMb: 120, heapPeakMb: 150, heapGrowthMb: 2,
  heapTrendMbPerMin: 8, memoryStability: 'good', qualityChanges: 0, stability: 'good',
};
const gate = evaluateReleaseGate({
  saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true,
  landscape: true, offlineCampaignReady: true, networkOnline: true, cacheSaveSeparated: true,
  loadingRecoveryReady: true, serviceWorkerUpdateSafe: true, portableSaveReady: true,
  offlineTransitionsReady: true, updateSimulationSafe: true, releaseReportReady: true, telemetry,
});
assert.equal(gate.verdict, 'ready');
const report = buildReleaseReport({
  gate, profile: RELEASE_PROFILES.standard, telemetry,
  saveHealth: { source: 'primary', repaired: false, issues: [], backupReady: true, schemaVersion: 2 },
  offline: { supported: true, ready: true, cached: CAMPAIGN_OFFLINE_URLS.length, total: CAMPAIGN_OFFLINE_URLS.length, missing: [] },
  transitions: { ready: true, readyCount: 5, total: 5, transitions: OFFLINE_TRANSITIONS.map((item) => ({ id: item.id, label: item.label, ready: true, missing: [] })) },
  updatePlan: update, serviceWorkerControlled: true, standalone: true, landscape: true, online: true,
}, new Date('2026-09-24T06:30:00.000Z'));
assert.equal(report.candidate, RELEASE_CANDIDATE);
assert.equal(report.verdict, 'ready');
assert.ok(releaseReportJson(report).includes('\"offline\"'));
assert.match(RELEASE_CANDIDATE, /^0\.0\.\d+-rc\.\d+$/);

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes("key.startsWith('game-cache-')") || sw.includes('key.startsWith(GAME_CACHE_PREFIX)'));
assert.ok(!sw.includes('indexedDB'));
const gameApp = readFileSync(new URL('../dist/assets/core/GameApp.js', import.meta.url), 'utf8');
for (const name of ['Stage1Scene','Stage2Scene','Stage3Scene','Stage4Scene','Stage5Scene','EndingScene']) {
  assert.ok(gameApp.includes(`import(\`../scenes/${name}.js\`)`) || gameApp.includes(`import('../scenes/${name}.js')`) || gameApp.includes(`import(\"../scenes/${name}.js\")`), `${name} must remain dynamic import`);
}
const pkgJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkgJson.version, RELEASE_CANDIDATE);

console.log('V026_RC_PASS', {
  candidate: RELEASE_CANDIDATE,
  portableSave: 'checksum verified',
  staleCaches: update.staleGameCaches.length,
  offlineTransitions: OFFLINE_TRANSITIONS.length,
  deferredFiles: CAMPAIGN_OFFLINE_URLS.length,
  releaseGate: gate.verdict,
});
