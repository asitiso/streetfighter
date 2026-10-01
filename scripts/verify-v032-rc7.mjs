import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { stageVisualProfile, combatFxDensity, qualityDetailCount } from '../dist/assets/render/FinalVisualProfiles.js';
import { stageAudioMixProfile, combatDuckAmount, combatDuckDuration } from '../dist/assets/core/AudioMixProfiles.js';

const candidateMinor = Number(/0\.0\.(\d+)-rc\./.exec(RELEASE_CANDIDATE)?.[1] ?? 0);
const cacheMinor = Number(/game-cache-v(\d+)/.exec(GAME_CACHE_NAME)?.[1] ?? 0);
assert.ok(candidateMinor >= 32);
assert.ok(cacheMinor >= 32);

const visualProfiles = [1,2,3,4,5].map(stageVisualProfile);
assert.equal(new Set(visualProfiles.map((p) => `${p.accent}|${p.glow}|${p.floorReflect}|${p.midDetail}`)).size, 5);
assert.ok(visualProfiles.every((p) => p.midDetail >= p.farDetail));
assert.ok(qualityDetailCount(20, .5) < qualityDetailCount(20, 1));
assert.ok(combatFxDensity('high', 120) > combatFxDensity('balanced', 120));
assert.ok(combatFxDensity('balanced', 120) > combatFxDensity('low', 120));

const audioProfiles = [1,2,3,4,5].map(stageAudioMixProfile);
assert.equal(new Set(audioProfiles.map((p) => `${p.music}|${p.ambience}|${p.brightness}|${p.lowEnd}`)).size, 5);
assert.ok(combatDuckAmount('super') < combatDuckAmount('heavy-hit'));
assert.ok(combatDuckAmount('ko') < combatDuckAmount('super'));
assert.ok(combatDuckDuration('ko') > combatDuckDuration('heavy-hit'));

const stageSource = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
for (const token of ['drawStageSetDressing', 'drawFighterReadabilityAccent', 'stageVisualProfile', 'combatFxDensity']) assert.ok(stageSource.includes(token), `missing ${token}`);
for (const token of ['SUBWAY','NIGHT FOOD','商店街','BOXING GYM','INNER SANCTUM']) assert.ok(stageSource.includes(token), `stage identity missing ${token}`);
const audioSource = await readFile(new URL('../src/core/AudioManager.ts', import.meta.url), 'utf8');
for (const token of ['musicBus','ambienceBus','sfxBus','duckCombat','combatDuckAmount']) assert.ok(audioSource.includes(token), `audio mix missing ${token}`);
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes('/assets/core/AudioMixProfiles.js'));
assert.ok(sw.includes('/assets/render/FinalVisualProfiles.js'));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(/V0\.0\.\d+-RC\d+/.test(title));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  stageVisualProfiles: visualProfiles.map((p) => ({ stage: p.id, label: p.label, midDetail: p.midDetail, atmosphere: p.atmosphericDensity })),
  fxDensity: { high: combatFxDensity('high', 120), balanced: combatFxDensity('balanced', 120), low: combatFxDensity('low', 120) },
  audioMixProfiles: audioProfiles,
  ducking: { heavyHit: combatDuckAmount('heavy-hit'), parry: combatDuckAmount('parry'), super: combatDuckAmount('super'), ko: combatDuckAmount('ko') },
  verdict: 'FINAL_VISUAL_AUDIO_PASS',
};
await writeFile(new URL('../RC7_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V032_RC7_PASS', result);
