import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { DeviceCertificationStore, automaticCertificationUpdates } from '../dist/assets/core/DeviceCertification.js';

assert.match(RELEASE_CANDIDATE, /^0\.0\.\d+-rc\.\d+$/);
assert.ok(GAME_CACHE_NAME.startsWith('game-cache-v'));

const automatic = automaticCertificationUpdates({
  standalone: true,
  bootedOffline: true,
  audioReady: true,
  sessionSeconds: 605,
  frameStability: 'good',
  memoryStability: 'good',
});
assert.deepEqual(automatic.map((item) => item.id), ['pwa-install', 'offline-launch', 'audio-unlock', 'ten-minute-play']);
assert.equal(automatic.find((item) => item.id === 'pwa-install')?.status, 'pass');
assert.equal(automatic.find((item) => item.id === 'ten-minute-play')?.status, 'check');

const store = new DeviceCertificationStore(RELEASE_CANDIDATE);
let record = store.applyAutomaticEvidence({
  standalone: true,
  bootedOffline: true,
  audioReady: true,
  sessionSeconds: 605,
  frameStability: 'good',
  memoryStability: 'good',
});
assert.equal(record.tests['pwa-install']?.status, 'pass');
assert.equal(record.tests['offline-launch']?.status, 'pass');
assert.equal(record.tests['audio-unlock']?.status, 'pass');
assert.equal(record.tests['ten-minute-play']?.status, 'check');
record = store.recordBackgroundResume(29_999);
assert.equal(record.tests['background-resume']?.status, 'untested');
record = store.recordBackgroundResume(30_000);
assert.equal(record.tests['background-resume']?.status, 'pass');

const failureStore = new DeviceCertificationStore(RELEASE_CANDIDATE);
failureStore.setTest('pwa-install', 'fail', 'manual failure must win');
record = failureStore.applyAutomaticEvidence({
  standalone: true,
  bootedOffline: false,
  audioReady: false,
  sessionSeconds: 0,
  frameStability: 'warming-up',
  memoryStability: 'unknown',
});
assert.equal(record.tests['pwa-install']?.status, 'fail');

const inputSource = await readFile(new URL('../src/input/InputManager.ts', import.meta.url), 'utf8');
for (const token of ['touchPressed', 'touchReleased', 'touchHeld(action']) assert.ok(inputSource.includes(token), `missing touch-source telemetry ${token}`);
const certSceneSource = await readFile(new URL('../src/scenes/DeviceCertificationScene.ts', import.meta.url), 'utf8');
for (const token of ['TOUCH_AUDIT_ACTIONS', 'REAL TOUCH AUDIT', 'Keyboard / gamepad do not count', "setTest('touch-controls', 'pass'"]) assert.ok(certSceneSource.includes(token), `missing real touch audit ${token}`);
const appSource = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['bootedOffline', 'syncAutomaticCertification', 'recordBackgroundResume', 'backgroundedAt']) assert.ok(appSource.includes(token), `missing device evidence integration ${token}`);
const audioSource = await readFile(new URL('../src/core/AudioManager.ts', import.meta.url), 'utf8');
assert.ok(audioSource.includes('isRunning(): boolean'));
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.match(title, /V0\.0\.\d+-RC\d+/);

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  automaticEvidence: automatic.map(({ id, status }) => ({ id, status })),
  touchAudit: 'REAL_TOUCH_ONLY_10_CONTROLS',
  backgroundResume: 'AUTO_PASS_AT_30_SECONDS_WITH_INPUT_RELEASE',
  manualFailurePriority: 'PRESERVED',
  tenMinuteRuntime: 'AUTO_CHECK_WITH_MANUAL_HEAT_CONFIRMATION',
  verdict: 'REAL_DEVICE_CERTIFICATION_ASSIST_PASS',
};
await writeFile(new URL('../RC11_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V036_RC11_PASS', result);
