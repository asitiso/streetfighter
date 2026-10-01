import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { stagePresentationProfile, hitSparkProfile } from '../dist/assets/render/FinalPresentationProfiles.js';
import { loadingProfile } from '../dist/assets/core/LoadingProfiles.js';

const candidateMinor = Number(/0\.0\.(\d+)-rc\./.exec(RELEASE_CANDIDATE)?.[1] ?? 0);
const cacheMinor = Number(/game-cache-v(\d+)/.exec(GAME_CACHE_NAME)?.[1] ?? 0);
assert.ok(candidateMinor >= 33);
assert.ok(cacheMinor >= 33);

const stages = [1,2,3,4,5].map(stagePresentationProfile);
assert.equal(new Set(stages.map((p) => `${p.hudAccent}|${p.gradeTop}|${p.locationCode}`)).size, 5);
assert.ok(stages.every((p) => p.objective.length > 10 && p.introSubtitle.length > 5));

const sparkEvents = [
  { type: 'hit', power: 40 },
  { type: 'hit', power: 100 },
  { type: 'air-hit', power: 60 },
  { type: 'command-hit', power: 80 },
  { type: 'target-hit', power: 70 },
  { type: 'counter', power: 90 },
  { type: 'block', power: 60 },
  { type: 'throw-escape', power: 0 },
];
const sparks = sparkEvents.map((event) => hitSparkProfile(event));
assert.ok(new Set(sparks.map((p) => p.shape)).size >= 5);
assert.ok(hitSparkProfile({ type: 'hit', power: 100 }).length > hitSparkProfile({ type: 'hit', power: 40 }).length);

const groups = ['stage-1','stage-2','stage-3','stage-4','stage-5','ending'];
const loaders = groups.map((group) => loadingProfile(group));
assert.equal(new Set(loaders.map((p) => p.title)).size, 6);
assert.equal(new Set(loaders.map((p) => p.accent)).size, 6);

const stageSource = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
for (const token of ['drawStageColorGrade', 'stagePresentationProfile', 'hitSparkProfile', 'introEyebrow']) assert.ok(stageSource.includes(token), `missing stage presentation ${token}`);
assert.ok(stageSource.includes('FINAL DUEL // GILL') || stageSource.includes('drawBossHud'), 'missing final boss HUD presentation');
const audioSource = await readFile(new URL('../src/core/AudioManager.ts', import.meta.url), 'utf8');
for (const token of ["bossShift", "level === 'final' ? 1.55", 'musicTarget', 'sfxTarget']) assert.ok(audioSource.includes(token), `missing audio polish ${token}`);
const appSource = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['loadingProfile', 'loading-kicker', 'loading-detail']) assert.ok(appSource.includes(token), `missing loading polish ${token}`);
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.ok(css.includes('@keyframes loading-sweep'));
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes('/assets/render/FinalPresentationProfiles.js'));
assert.ok(sw.includes('/assets/core/LoadingProfiles.js'));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  stageProfiles: stages.map((p) => ({ stage: p.stageId, code: p.locationCode, accent: p.hudAccent, objective: p.objective })),
  sparkShapes: sparks.map((p) => p.shape),
  loadingCards: loaders.map((p) => ({ kicker: p.kicker, title: p.title })),
  bossMix: 'FINAL_STAGE_INTENSITY_AND_BOSS_SHIFT',
  verdict: 'HUD_COLOR_GRADE_FX_BOSS_MIX_PASS',
};
await writeFile(new URL('../RC8_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V033_RC8_PASS', result);
