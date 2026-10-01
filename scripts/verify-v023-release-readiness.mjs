import assert from 'node:assert/strict';
import { chooseInitialQuality } from '../dist/assets/core/RuntimeQuality.js';
import { ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';

assert.equal(chooseInitialQuality({ deviceMemory: 2, hardwareConcurrency: 2, dpr: 2, pixelCount: 1920*1080, mobile: true }), 'low');
assert.equal(chooseInitialQuality({ deviceMemory: 4, hardwareConcurrency: 6, dpr: 2, pixelCount: 1280*720, mobile: true }), 'balanced');
assert.equal(chooseInitialQuality({ deviceMemory: 8, hardwareConcurrency: 8, dpr: 1, pixelCount: 1920*1080, mobile: false }), 'high');
assert.ok(ASSET_GROUPS['stage-2'].some((url) => url.endsWith('Stage2Scene.js')));
assert.ok(ASSET_GROUPS['stage-5'].some((url) => url.endsWith('Stage5Scene.js')));
assert.ok(ASSET_GROUPS['ending'].some((url) => url.endsWith('EndingScene.js')));
assert.ok(ASSET_GROUPS['ending'].some((url) => url.endsWith('EndingProfiles.js')));
assert.ok(ASSET_GROUPS['app-shell'].some((url) => url.endsWith('title-keyart.png')));
assert.ok(ASSET_GROUPS['app-shell'].some((url) => url.endsWith('roster-mural.png')));
console.log('V023_RELEASE_READINESS_PASS', {
  lowDevice: 'low', mobileDefault: 'balanced', desktopHigh: 'high', stage2Prefetch: ASSET_GROUPS['stage-2'], endingPrefetch: ASSET_GROUPS.ending,
});
