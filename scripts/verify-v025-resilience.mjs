import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_SAVE,
  SAVE_DB_NAME,
  SAVE_SCHEMA_VERSION,
  sanitizeGameSave,
  encodeSaveRecord,
  decodeSaveRecord,
  recoverSaveRecords,
} from '../dist/assets/save/SaveManager.js';
import { AssetManager, ASSET_GROUPS, GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { RuntimeTelemetry } from '../dist/assets/core/RuntimeTelemetry.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { SessionRecoveryStore } from '../dist/assets/core/SessionRecovery.js';

const corrupted = sanitizeGameSave({
  ...DEFAULT_SAVE,
  currentStage: 99,
  selectedCharacter: 'INVALID',
  selectedSuperArt: 9,
  completedStages: [1, 2, 99, 2],
  audioEnabled: 'yes',
  hasCampaignStarted: true,
  touchOpacity: 5,
});
assert.equal(corrupted.save.currentStage, 5);
assert.equal(corrupted.save.selectedCharacter, 'RYU');
assert.equal(corrupted.save.selectedSuperArt, 1);
assert.deepEqual(corrupted.save.completedStages, [1, 2]);
assert.equal(corrupted.save.hasCampaignStarted, true, 'valid fields must survive repair');
assert.equal(corrupted.save.touchOpacity, 1);
assert.ok(corrupted.issues.length >= 4);

const clean = { ...DEFAULT_SAVE, currentStage: 4, selectedCharacter: 'IBUKI', hasCampaignStarted: true };
const record = encodeSaveRecord(clean, 1234);
assert.equal(record.schemaVersion, SAVE_SCHEMA_VERSION);
assert.equal(decodeSaveRecord(record)?.save.selectedCharacter, 'IBUKI');
const tampered = structuredClone(record);
tampered.data.currentStage = 1;
assert.equal(decodeSaveRecord(tampered), null, 'checksum tampering must be rejected');
const recovered = recoverSaveRecords(tampered, record);
assert.equal(recovered.health.source, 'backup');
assert.equal(recovered.save.currentStage, 4);
assert.ok(recovered.health.issues.includes('PRIMARY CORRUPT'));
const truncated = recoverSaveRecords({}, record);
assert.equal(truncated.health.source, 'backup', 'an empty primary must not replace a valid backup with defaults');
assert.equal(truncated.save.currentStage, 4);
assert.equal(truncated.save.selectedCharacter, 'IBUKI');
const legacy = decodeSaveRecord({ ...clean, schemaVersion: undefined });
assert.equal(legacy?.legacy, true);
assert.equal(legacy?.save.currentStage, 4);

const originalLocalStorage = globalThis.localStorage;
const recoveryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => recoveryStorage.get(key) ?? null,
  setItem: (key, value) => { recoveryStorage.set(key, String(value)); },
  removeItem: (key) => { recoveryStorage.delete(key); },
  clear: () => recoveryStorage.clear(),
  key: (index) => [...recoveryStorage.keys()][index] ?? null,
  get length() { return recoveryStorage.size; },
};
const recoveryA = new SessionRecoveryStore('RC-TEST');
recoveryA.begin();
recoveryA.checkpoint('stage-3', 3, 'RYU', 1);
const recoveryB = new SessionRecoveryStore('RC-TEST');
recoveryB.begin();
const recoveredSession = recoveryB.snapshot();
assert.equal(recoveredSession.available, true, 'active stage checkpoint must survive a page exit');
assert.equal(recoveredSession.checkpoint?.stage, 3);
if (originalLocalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalLocalStorage;

const gameAppSource = readFileSync(new URL('../dist/assets/core/GameApp.js', import.meta.url), 'utf8');
assert.ok(!gameAppSource.includes("recovery.markClean('pagehide')"), 'pagehide must not erase active recovery checkpoint');

const assetManagerSource = readFileSync(new URL('../dist/assets/core/AssetManager.js', import.meta.url), 'utf8');
assert.ok(assetManagerSource.includes("navigator.onLine !== false"), 'online asset loading must distinguish fresh-code mode');
assert.ok(assetManagerSource.includes("url.startsWith('/assets/')") && assetManagerSource.includes("url.endsWith('.js')"), 'online JS assets must prefer network freshness');

const originalCaches = globalThis.caches;
const originalFetch = globalThis.fetch;
const cacheMap = new Map();
for (const url of ASSET_GROUPS['stage-2']) cacheMap.set(url, new Response('cached-module', { status: 200, headers: { 'content-type': 'text/javascript' } }));
globalThis.caches = {
  open: async () => ({
    match: async (request) => cacheMap.get(typeof request === 'string' ? request : request.url)?.clone(),
    put: async (request, response) => { cacheMap.set(typeof request === 'string' ? request : request.url, response.clone()); },
  }),
};
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls += 1; throw new TypeError('simulated network cut'); };
const offlineAssets = new AssetManager();
await offlineAssets.loadGroup('stage-2');
assert.equal(offlineAssets.hasGroup('stage-2'), true);
assert.equal(networkCalls, 0, 'cache-first stage load should not touch failed network when cached');
const cut = await offlineAssets.verifyNetworkCutFallback(ASSET_GROUPS['stage-2']);
assert.equal(cut.ready, true);

if (originalCaches === undefined) delete globalThis.caches; else globalThis.caches = originalCaches;
if (originalFetch === undefined) delete globalThis.fetch; else globalThis.fetch = originalFetch;

const stableMemory = new RuntimeTelemetry();
for (let second = 0; second <= 30; second += 1) {
  for (let frame = 0; frame < 60; frame += 1) stableMemory.sampleFrame(1 / 60);
  if (second % 5 === 0) stableMemory.noteHeapSample(100 + second * .1);
}
assert.equal(stableMemory.snapshot().memoryStability, 'good');

const leakingMemory = new RuntimeTelemetry();
for (let second = 0; second <= 30; second += 1) {
  for (let frame = 0; frame < 60; frame += 1) leakingMemory.sampleFrame(1 / 60);
  if (second % 5 === 0) leakingMemory.noteHeapSample(100 + second * 4);
}
const leak = leakingMemory.snapshot();
assert.equal(leak.memoryStability, 'poor');
assert.ok((leak.heapTrendMbPerMin ?? 0) > 45);

const stable = stableMemory.snapshot();
const ready = evaluateReleaseGate({
  saveReady: true,
  appShellReady: true,
  serviceWorkerSupported: true,
  serviceWorkerControlled: true,
  landscape: true,
  offlineCampaignReady: true,
  networkOnline: false,
  cacheSaveSeparated: true,
  loadingRecoveryReady: true,
  serviceWorkerUpdateSafe: true,
  saveHealth: { source: 'primary', repaired: false, backupReady: true, issues: [] },
  telemetry: stable,
});
assert.equal(ready.verdict, 'ready', 'offline + prepared cache should still be release-ready');
const memoryBlocked = evaluateReleaseGate({
  saveReady: true,
  appShellReady: true,
  serviceWorkerSupported: true,
  serviceWorkerControlled: true,
  landscape: true,
  offlineCampaignReady: true,
  cacheSaveSeparated: true,
  loadingRecoveryReady: true,
  serviceWorkerUpdateSafe: true,
  telemetry: leak,
});
assert.equal(memoryBlocked.verdict, 'blocked');
assert.ok(memoryBlocked.blockers.includes('MEMORY GROWTH'));
const unsafeUpdate = evaluateReleaseGate({
  saveReady: true,
  appShellReady: true,
  serviceWorkerSupported: true,
  serviceWorkerControlled: true,
  landscape: true,
  offlineCampaignReady: true,
  cacheSaveSeparated: false,
  loadingRecoveryReady: true,
  serviceWorkerUpdateSafe: false,
  telemetry: stable,
});
assert.equal(unsafeUpdate.verdict, 'blocked');
assert.ok(unsafeUpdate.blockers.includes('UPDATE SAVE SAFETY'));

assert.equal(SAVE_DB_NAME, 'ssc-save-data-v1', 'save DB must remain stable across cache updates');
assert.ok(GAME_CACHE_NAME.startsWith('game-cache-v')); 
assert.notEqual(SAVE_DB_NAME, GAME_CACHE_NAME);
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(!sw.includes('indexedDB'), 'service worker update must never mutate IndexedDB saves');
assert.ok(sw.includes("key.startsWith('game-cache-')") || sw.includes('key.startsWith(GAME_CACHE_PREFIX)'), 'activate cleanup must be limited to game caches');
assert.ok(sw.includes("type === 'GET_VERSION'"));

console.log('V025_RESILIENCE_PASS', {
  repairedFields: corrupted.issues.length,
  saveSchema: SAVE_SCHEMA_VERSION,
  cache: GAME_CACHE_NAME,
  networkCut: cut.ready,
  interruptedSessionRecovery: recoveredSession.checkpoint?.stage,
  freshStageCodeOnline: true,
  memoryTrendMbPerMin: leak.heapTrendMbPerMin?.toFixed(1),
  releaseGate: ready.verdict,
});
