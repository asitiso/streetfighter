import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { hudModeProfile, stageLightingProfile, projectileTrailProfile, attackTrailProfile } from '../dist/assets/render/CombatPresentationProfiles.js';
import { loadingProfile } from '../dist/assets/core/LoadingProfiles.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';

const candidateMinor = Number(/0\.0\.(\d+)-rc\./.exec(RELEASE_CANDIDATE)?.[1] ?? 0);
const cacheMinor = Number(/game-cache-v(\d+)/.exec(GAME_CACHE_NAME)?.[1] ?? 0);
assert.ok(candidateMinor >= 34);
assert.ok(cacheMinor >= 34);

const beltHud = hudModeProfile('belt');
const duelHud = hudModeProfile('duel');
const bossHud = hudModeProfile('duel', true);
assert.equal(beltHud.mode, 'belt');
assert.equal(duelHud.mode, 'duel');
assert.equal(bossHud.mode, 'boss');
assert.ok(bossHud.enemyPanelWidth > duelHud.enemyPanelWidth);
assert.notEqual(beltHud.playerPanelWidth, duelHud.playerPanelWidth);

const lights = [1,2,3,4,5].map(stageLightingProfile);
assert.equal(new Set(lights.map((l) => `${l.key}|${l.rim}|${l.shadowOffsetX}|${l.beamCount}`)).size, 5);
assert.ok(lights.every((l) => l.beamCount >= 2));

const ryu = getCharacter('RYU');
const ibuki = getCharacter('IBUKI');
const gill = getCharacter('GILL');
const ryuMoves = specialMovesFor(ryu, ryu.superArts[0]);
const ibukiMoves = specialMovesFor(ibuki, ibuki.superArts[0]);
const gillMoves = specialMovesFor(gill, gill.superArts[0]);
const trails = [
  projectileTrailProfile(ryuMoves.primary, 'RYU'),
  projectileTrailProfile(ibukiMoves.primary, 'IBUKI'),
  projectileTrailProfile(gillMoves.primary, 'GILL'),
];
assert.ok(new Set(trails.map((t) => t.style)).size >= 3);
assert.ok(attackTrailProfile(ryuMoves.mobility).segments > 0);

const loaders = ['stage-1','stage-2','stage-3','stage-4','stage-5','ending'].map((g) => loadingProfile(g));
assert.ok(loaders.every((p) => p.route.includes('→')));
assert.equal(new Set(loaders.map((p) => p.route)).size, 6);

const stageSource = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
for (const token of ['drawBeltHud', 'drawDuelHud', 'drawBossHud', 'drawStageLighting', 'drawFighterStageShadow', 'projectileTrailProfile', 'attackTrailProfile']) assert.ok(stageSource.includes(token), `missing RC9 stage token ${token}`);
for (const token of ['playDuelTransition', 'playStageClear', 'playFinalKo']) assert.ok(stageSource.includes(token), `missing RC9 audio call ${token}`);
const endingSource = await readFile(new URL('../src/scenes/EndingScene.ts', import.meta.url), 'utf8');
assert.ok(endingSource.includes('playEndingTransition'));
const audioSource = await readFile(new URL('../src/core/AudioManager.ts', import.meta.url), 'utf8');
for (const token of ['playStageIntro', 'playDuelTransition', 'playStageClear', 'playFinalKo', 'playEndingTransition']) assert.ok(audioSource.includes(token), `missing RC9 audio method ${token}`);
const appSource = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
assert.ok(appSource.includes('loading-route'));
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
assert.ok(sw.includes('/assets/render/CombatPresentationProfiles.js'));

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  hudModes: [beltHud.mode, duelHud.mode, bossHud.mode],
  stageLighting: lights.map((l, i) => ({ stage: i + 1, key: l.key, rim: l.rim, shadowOffsetX: l.shadowOffsetX, beams: l.beamCount })),
  projectileTrails: trails.map((t) => t.style),
  loadingRoutes: loaders.map((p) => p.route),
  audioTransitions: ['STAGE_INTRO', 'DUEL', 'STAGE_CLEAR', 'FINAL_KO', 'ENDING'],
  verdict: 'MODE_HUD_LIGHTING_TRAILS_AUDIO_PASS',
};
await writeFile(new URL('../RC9_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V034_RC9_PASS', result);
