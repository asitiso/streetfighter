import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { bossHudPhaseProfile, fxPolishProfile, stageDepthProfile, transitionPolishProfile } from '../dist/assets/render/FinalPolishProfiles.js';

const candidateMinor = Number(/0\.0\.(\d+)-rc\./.exec(RELEASE_CANDIDATE)?.[1] ?? 0);
const cacheMinor = Number(/game-cache-v(\d+)/.exec(GAME_CACHE_NAME)?.[1] ?? 0);
assert.ok(candidateMinor >= 35);
assert.ok(cacheMinor >= 35);

const bossPhases = [1,2,3].map((phase) => bossHudPhaseProfile(phase, phase === 1 ? .8 : phase === 2 ? .5 : .2));
assert.equal(new Set(bossPhases.map((p) => `${p.label}|${p.subtitle}|${p.accent}|${p.pulseSpeed}`)).size, 3);
assert.ok(bossPhases[2].pulseSpeed > bossPhases[0].pulseSpeed);

const depth = [1,2,3,4,5].map(stageDepthProfile);
assert.equal(new Set(depth.map((p) => `${p.farFactor}|${p.nearFactor}|${p.accent}`)).size, 5);
assert.ok(depth.every((p) => p.farFactor < 1 && p.nearFactor > 1));

const hitFx = fxPolishProfile({ type: 'hit', power: 45 });
const superFx = fxPolishProfile({ type: 'super-impact', power: 180 });
const parryFx = fxPolishProfile({ type: 'red-parry', power: 0 });
assert.ok(superFx.size > hitFx.size);
assert.ok(superFx.afterglow > hitFx.afterglow);
assert.ok(parryFx.baseTtl >= hitFx.baseTtl);

const transitions = [1,2,3,4,5].map(transitionPolishProfile);
assert.ok(transitions.every((p) => p.duelPrepareAt < p.duelFrames));
assert.ok(transitions[4].introFrames >= transitions[0].introFrames);
assert.ok(transitions[4].finalClearFrames > transitions[0].clearDispatchAt);

const stageSource = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
for (const token of ['bossHudPhaseProfile', 'drawDepthParallax', 'fxPolishProfile', 'transitionPolishProfile', "trail.style === 'flame'", "trail.style === 'cold'", "trail.style === 'rush'", "trail.style === 'heavy'"]) {
  assert.ok(stageSource.includes(token), `missing RC10 stage polish ${token}`);
}
const audioSource = await readFile(new URL('../src/core/AudioManager.ts', import.meta.url), 'utf8');
for (const token of ['bossLayerGain', 'bossLayerSource', 'bossLayerTarget', 'playEndingTransition', 'linearRampToValueAtTime']) assert.ok(audioSource.includes(token), `missing RC10 audio layer ${token}`);
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes('/assets/render/FinalPolishProfiles.js'));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.ok(/V0\.0\.\d+-RC\d+/.test(title));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  bossHud: bossPhases.map((p) => ({ label: p.label, subtitle: p.subtitle, accent: p.accent })),
  parallaxStages: depth.map((p, i) => ({ stage: i + 1, far: p.farFactor, near: p.nearFactor })),
  fx: { hit: hitFx, super: superFx, redParry: parryFx },
  transitionFrames: transitions,
  audioLayering: 'BELT_DUEL_FINAL_CROSSFADE_AND_BOSS_HARMONIC_LAYER',
  verdict: 'BOSS_HUD_PARALLAX_FX_TIMING_AUDIO_LAYERS_PASS',
};
await writeFile(new URL('../RC10_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V035_RC10_PASS', result);
