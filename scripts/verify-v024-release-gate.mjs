import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectReleaseProfile, RELEASE_PROFILES } from '../dist/assets/core/ReleaseProfiles.js';
import { RuntimeTelemetry } from '../dist/assets/core/RuntimeTelemetry.js';
import { evaluateReleaseGate } from '../dist/assets/core/ReleaseGate.js';
import { CAMPAIGN_OFFLINE_URLS, GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';

assert.equal(detectReleaseProfile({ deviceMemory: 2, hardwareConcurrency: 2, dpr: 3, pixelCount: 1920*1080, mobile: true }), 'entry');
assert.equal(detectReleaseProfile({ deviceMemory: 4, hardwareConcurrency: 6, dpr: 2, pixelCount: 1280*720, mobile: true }), 'standard');
assert.equal(detectReleaseProfile({ deviceMemory: 8, hardwareConcurrency: 8, dpr: 1, pixelCount: 1920*1080, mobile: false }), 'performance');
assert.equal(RELEASE_PROFILES.entry.recommendedQuality, 'low');
assert.equal(RELEASE_PROFILES.standard.recommendedQuality, 'balanced');
assert.equal(RELEASE_PROFILES.performance.recommendedQuality, 'high');

const telemetry = new RuntimeTelemetry();
for (let i = 0; i < 600; i += 1) telemetry.sampleFrame(1/60);
const stable = telemetry.snapshot();
assert.equal(stable.stability, 'good');
assert.ok(stable.averageFps > 59 && stable.averageFps < 61);
assert.ok(stable.longFrameRate < .001);

const ready = evaluateReleaseGate({ saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true, landscape: true, offlineCampaignReady: true, telemetry: stable });
assert.equal(ready.verdict, 'ready');
const check = evaluateReleaseGate({ saveReady: true, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: false, landscape: true, offlineCampaignReady: false, telemetry: stable });
assert.equal(check.verdict, 'check');
assert.ok(check.warnings.includes('OFFLINE CAMPAIGN NOT PREPARED'));
const blocked = evaluateReleaseGate({ saveReady: false, appShellReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true, landscape: true, offlineCampaignReady: true, telemetry: stable });
assert.equal(blocked.verdict, 'blocked');
assert.ok(blocked.blockers.includes('SAVE'));

assert.match(GAME_CACHE_NAME, /^game-cache-v\d+$/);
assert.equal(new Set(CAMPAIGN_OFFLINE_URLS).size, CAMPAIGN_OFFLINE_URLS.length);
for (const required of ['Stage1Scene.js','Stage2Scene.js','Stage3Scene.js','Stage4Scene.js','Stage5Scene.js','EndingScene.js','EndingProfiles.js']) {
  assert.ok(CAMPAIGN_OFFLINE_URLS.some((url) => url.endsWith(required)), `offline campaign must include ${required}`);
}

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
const shell = sw.slice(sw.indexOf('const APP_SHELL'), sw.indexOf("self.addEventListener('install'"));
for (const deferred of ['Stage2Scene.js','Stage3Scene.js','Stage4Scene.js','Stage5Scene.js','EndingScene.js']) assert.ok(!shell.includes(deferred), `${deferred} must stay deferred`);

const gameApp = readFileSync(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
assert.ok(gameApp.includes('showLoadFailure'));
assert.ok(gameApp.includes('RETRY'));
assert.ok(gameApp.includes('BACK TO TITLE'));
assert.ok(gameApp.includes('telemetry.sampleFrame'));

console.log('V024_RELEASE_GATE_PASS', {
  profiles: ['entry','standard','performance'],
  stableFps: stable.averageFps.toFixed(1),
  offlineFiles: CAMPAIGN_OFFLINE_URLS.length,
  verdicts: [ready.verdict, check.verdict, blocked.verdict],
});
