import { readFileSync, statSync } from 'node:fs';
import { ART_ASSET_PATHS } from '../dist/assets/render/ImageAssets.js';
import assert from 'node:assert/strict';
import { chooseInitialQuality } from '../dist/assets/core/RuntimeQuality.js';
import { ASSET_GROUPS, CAMPAIGN_OFFLINE_URLS } from '../dist/assets/core/AssetManager.js';

assert.equal(chooseInitialQuality({ deviceMemory: 2, hardwareConcurrency: 2, dpr: 2, pixelCount: 1920*1080, mobile: true }), 'low');
assert.equal(chooseInitialQuality({ deviceMemory: 4, hardwareConcurrency: 6, dpr: 2, pixelCount: 1280*720, mobile: true }), 'balanced');
assert.equal(chooseInitialQuality({ deviceMemory: 8, hardwareConcurrency: 8, dpr: 1, pixelCount: 1920*1080, mobile: false }), 'high');
assert.ok(ASSET_GROUPS['stage-2'].some((url) => url.endsWith('Stage2Scene.js')));
assert.ok(ASSET_GROUPS['stage-5'].some((url) => url.endsWith('Stage5Scene.js')));
assert.ok(ASSET_GROUPS['ending'].some((url) => url.endsWith('EndingScene.js')));
assert.ok(ASSET_GROUPS['ending'].some((url) => url.endsWith('EndingProfiles.js')));
const worker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
for (const [key, group] of [['title-keyart', 'app-shell'], ['roster-mural', 'app-shell'], ['ending-keyart', 'ending']]) {
  const url = ART_ASSET_PATHS[key];
  const original = '/art/' + key + '.png';
  assert.equal(url, '/art/' + key + '.webp');
  assert(ASSET_GROUPS[group].includes(url));
  assert(!ASSET_GROUPS[group].includes(original));
  if (group === 'app-shell') assert(worker.includes("'" + url + "'"), 'The service worker must prepare the startup artwork');
  else assert(CAMPAIGN_OFFLINE_URLS.includes(url), 'Offline campaign must prepare the ending artwork');
  const webp = readFileSync(new URL('../dist' + url, import.meta.url));
  assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
  assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  assert(webp.length < statSync(new URL('../public' + original, import.meta.url)).size / 4);
}
console.log('V023_RELEASE_READINESS_PASS', {
  lowDevice: 'low', mobileDefault: 'balanced', desktopHigh: 'high', stage2Prefetch: ASSET_GROUPS['stage-2'], endingPrefetch: ASSET_GROUPS.ending,
});
