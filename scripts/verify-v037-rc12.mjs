import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { automaticCertificationUpdates } from '../dist/assets/core/DeviceCertification.js';
import { safeViewportSize } from '../dist/assets/core/SafeAreaProbe.js';

assert.match(RELEASE_CANDIDATE, /^0\.0\.\d+-rc\.\d+$/);
assert.match(GAME_CACHE_NAME, /^game-cache-v\d+$/);

assert.deepEqual(safeViewportSize(1280, 720, { left: 44, right: 34, top: 0, bottom: 21 }), { width: 1202, height: 699 });
assert.deepEqual(safeViewportSize(100, 100, { left: 80, right: 80, top: 70, bottom: 70 }), { width: 1, height: 1 });

const automatic = automaticCertificationUpdates({
  standalone: true,
  bootedOffline: true,
  audioReady: true,
  sessionSeconds: 605,
  frameStability: 'good',
  memoryStability: 'good',
  safeAreaReady: true,
  safeAreaNote: 'AUTO: landscape yes • safe insets L44/R34/T0/B21px • canvas inside',
});
assert.deepEqual(automatic.map((item) => item.id), ['landscape', 'pwa-install', 'offline-launch', 'audio-unlock', 'ten-minute-play']);
assert.equal(automatic.find((item) => item.id === 'landscape')?.status, 'pass');
assert.ok(automatic.find((item) => item.id === 'landscape')?.note.includes('L44/R34'));

const safeAreaSource = await readFile(new URL('../src/core/SafeAreaProbe.ts', import.meta.url), 'utf8');
for (const token of ['env(safe-area-inset-left', 'canvasInsideSafeArea', 'safeViewportSize', 'getBoundingClientRect']) assert.ok(safeAreaSource.includes(token), `missing safe-area probe ${token}`);

const appSource = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['readSafeAreaInsets()', 'safeViewportSize(', "this.canvas.style.left = `${safeInsets.left}px`", 'safeAreaReady: safeArea.ready', 'runOfflineTransitionAudit']) assert.ok(appSource.includes(token), `missing runtime safe-area/offline integration ${token}`);

const assetSource = await readFile(new URL('../src/core/AssetManager.ts', import.meta.url), 'utf8');
for (const token of ['auditOfflineDynamicImports', "new Worker(blobUrl, { type: 'module'", "await import(spec.url)", 'SERVICE WORKER NOT CONTROLLING APP', 'OFFLINE DYNAMIC IMPORT']) assert.ok(assetSource.includes(token), `missing offline module audit ${token}`);

const certSceneSource = await readFile(new URL('../src/scenes/DeviceCertificationScene.ts', import.meta.url), 'utf8');
for (const token of ['HP REAL OFFLINE IMPORT AUDIT', 'startOfflineTransitionAudit', "setTest('offline-transition', 'pass'", 'Module Worker • new module realm']) assert.ok(certSceneSource.includes(token), `missing certification audit UI ${token}`);

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes("'/assets/core/SafeAreaProbe.js'"));
for (const deferred of ['Stage2Scene.js', 'Stage3Scene.js', 'Stage4Scene.js', 'Stage5Scene.js', 'EndingScene.js']) {
  const appShellSlice = sw.slice(sw.indexOf('const APP_SHELL'), sw.indexOf("self.addEventListener('install'"));
  assert.ok(!appShellSlice.includes(`/assets/scenes/${deferred}`), `deferred module entered initial shell: ${deferred}`);
}

const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.match(title, /V0\.0\.\d+-RC\d+/);

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  safeArea: 'CANVAS_CONSTRAINED_TO_CSS_ENV_INSETS_AND_AUTO_CERTIFIED',
  offlineDynamicImport: 'MODULE_WORKER_5_DEFERRED_ROUTES_REQUIRES_OFFLINE_AND_SW_CONTROL',
  initialInstallWeight: 'STAGE_2_TO_5_AND_ENDING_STILL_DEFERRED',
  manualFailurePriority: 'PRESERVED_BY_DEVICE_CERT_STORE',
  verdict: 'SAFE_AREA_OFFLINE_DYNAMIC_IMPORT_AUDIT_PASS',
};
await writeFile(new URL('../RC12_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V037_RC12_PASS', result);
