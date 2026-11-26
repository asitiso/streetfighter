// V081: best-of-3 duel rounds — announcer flow, round markers, resets, meter carryover, time/double KO/draw.
import assert from 'node:assert/strict';
import { Stage1Scene, ROUNDS_TO_WIN, ROUND_BREAK_FRAMES, ROUND_ANNOUNCE_FRAMES, ROUND_FIGHT_FRAMES, MAX_DUEL_ROUNDS } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { advanceThroughBeltLoot, advanceThroughRoundBreak, winDuelMatch, loseDuelMatch } from './duel-round-helpers.mjs';

const input = { held: () => false, pressed: () => false, released: () => false, resetCommandHistory() {} };
const audioCalls = [];
const audio = new Proxy({}, { get: (_, key) => (...args) => { audioCalls.push(String(key)); } });
const character = getCharacter('RYU');

function reachDuel(stageId = 1, scene = new Stage1Scene(input, audio, character, character.superArts[0], stageId)) {
  let tick = 1; scene.introFrames = 0;
  for (let wave = 0; wave < 3; wave += 1) {
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) { scene.world.player.x = scene.areaStarts[wave + 1] + 160; scene.fixedUpdate(1 / 60, tick++); for (let t = 0; t < 60; t += 1) scene.fixedUpdate(1 / 60, tick++); }
  }
  tick = advanceThroughBeltLoot(scene, tick);
  for (let t = 0; t < 400 && scene.phase !== 'duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel');
  return { scene, tick };
}
let checks = 0;

{
  const labels = (scene, draw) => {
    const out = [];
    const ctx = new Proxy({}, { get: (target, key) => target[key] ?? (key === 'fillText' ? text => out.push(text) : () => {}) });
    scene[draw](ctx);
    return out;
  };
  for (const [phase, draw] of [['transition', 'drawTransition'], ['final-transition', 'drawFinalTransition']]) {
    const scene = new Stage1Scene(input, audio, character, character.superArts[0], 5);
    scene.drawBossVersusCloseup = () => {};
    scene.phase = phase;
    scene.phaseFrames = 1;
    const locked = labels(scene, draw);
    assert(locked.includes('GET READY') && !locked.includes('FIGHT!'), 'The paused boss entrance must not advertise live combat');
    scene.enterBossMatch(phase === 'transition' ? 'duel' : 'final-duel');
    assert.deepEqual(labels(scene, 'drawRoundOverlay'), ['FIGHT!'], 'The very first live frame announces combat');
    scene.roundAnnounceFrames = 1;
    const nextRound = labels(scene, 'drawRoundOverlay');
    assert(nextRound.includes('GET READY') && !nextRound.includes('FIGHT!'), 'The later round cue waits for the release tick');
    scene.tickRoundAnnounce();
    assert.equal(scene.roundAnnounceFrames, 0);
    assert.deepEqual(labels(scene, 'drawRoundOverlay'), ['FIGHT!']);
    scene.destroy();
    checks++;
  }
}

// Commands may start before the last six ticks, while only late buttons are reserved.
{
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
  for (const phase of ['transition', 'final-transition', 'duel', 'final-duel']) for (const timing of ['early', 'late']) {
    const controls = new InputManager();
    const scene = new Stage1Scene(controls, audio, character, character.superArts[0], 5);
    scene.introFrames = 0;
    if (phase.startsWith('final')) scene.prepareFinalDuel();
    else scene.prepareDuel();
    scene.phase = phase;
    if (phase.endsWith('transition')) scene.phaseFrames = 11;
    else scene.roundAnnounceFrames = 11;
    const p = scene.world.player;
    let tick = 1;
    const step = () => { controls.prepareTick(); scene.fixedUpdate(1 / 60, tick++); controls.endTick(); };
    const punch = () => { controls.setTouch('lp', true); controls.setTouch('lp', false); };
    controls.setTouchDirections(['down']); step();
    controls.setTouchDirections(['down', 'right']); step();
    controls.setTouchDirections(['right']); if (timing === 'early') punch(); step();
    controls.setTouchDirections([]); for (let n = 0; n < 4; n++) step();
    controls.setTouchDirections(['right']); if (timing === 'late') punch(); step();
    controls.setTouchDirections([]); for (let n = 0; n < 3; n++) step();
    assert.equal(p.currentMove, null, 'Announcement keeps combat frozen');
    assert.equal(scene.stageTime, 99);
    step();
    assert.equal(p.currentMove?.id, timing === 'late' ? 'RYU_PRIMARY' : undefined, phase + '/' + timing);
    assert(scene.stageTime < 99);
    controls.destroy();
    scene.destroy();
    checks++;
  }
}

// A boss retry goes directly to round 1 of that match, using its original entry resources.
for (const [stageId, boss, reason] of [[1, 'DUDLEY', 'ko'], [2, 'YUN', 'double-ko'], [3, 'MAKOTO', 'time-over'], [4, 'DUDLEY', 'ko'], [5, 'URIEN', 'ko'], [5, 'GILL', 'ko']]) {
  let pressed = '', stageRestarts = 0, resets = 0;
  const postCombat = [];
  const retryInput = { ...input, pressed: action => action === pressed, resetCommandHistory() { resets++; } };
  const scene = new Stage1Scene(retryInput, audio, character, character.superArts[0], stageId,
    undefined, () => { stageRestarts++; }, undefined, active => postCombat.push(active));
  scene.world.player.hp = 672;
  scene.world.player.superGauge = 41;
  scene.world.belt.score = 3200;
  scene.world.totalPlayerDamage = 230;
  let { tick } = reachDuel(stageId, scene);
  if (boss === 'GILL') {
    tick = winDuelMatch(scene, tick);
    assert.equal(scene.phase, 'final-transition');
    scene.world.player.hp = 517;
    scene.world.player.superGauge = 76;
    for (let n = 0; n < 400 && scene.phase === 'final-transition'; n++) scene.fixedUpdate(1 / 60, tick++);
  }
  const phase = boss === 'GILL' ? 'final-duel' : 'duel';
  const entryStats = scene.stageResult();
  const entryResources = [scene.world.player.hp, scene.world.player.superGauge];
  assert.deepEqual(entryResources, boss === 'GILL' ? [517, 76] : [672, 41]);
  for (let attempt = 0; attempt < 2; attempt++) {
    const oldWorld = scene.world;
    scene.world.totalPlayerDamage += 530;
    scene.world.player.superGauge = 1;
    if (boss === 'GILL') scene.gillPhase = 3;
    if (reason === 'time-over') {
      scene.enemyRoundWins = 1;
      scene.world.player.hp = 50;
      scene.stageTime = 0;
    } else if (reason === 'double-ko') {
      scene.playerRoundWins = scene.enemyRoundWins = 1;
      scene.world.player.hp = scene.world.enemy.hp = 0;
    } else {
      tick = loseDuelMatch(scene, tick);
    }
    if (scene.phase === phase) scene.fixedUpdate(1 / 60, tick++);
    assert.equal(scene.phase, 'defeat');
    assert.equal(scene.defeatReason, reason);
    // Cover queued START during the KO and a fresh attack after the fade.
    if (attempt === 0) {
      pressed = 'start';
      scene.fixedUpdate(1 / 60, tick++);
      pressed = '';
    } else {
      while (scene.defeatFrames > 0) scene.fixedUpdate(1 / 60, tick++);
      scene.fixedUpdate(1 / 60, tick++);
      assert.equal(scene.phase, 'defeat', 'Defeat must wait for a fresh input');
      pressed = 'lp';
    }
    const beforeReset = resets;
    for (let n = 0; n < 130 && scene.phase === 'defeat'; n++) scene.fixedUpdate(1 / 60, tick++);
    pressed = '';
    assert.equal(scene.phase, phase, 'Retry skips the three waves and boss transition');
    assert.equal(scene.world.enemy.character.id, boss);
    assert.notEqual(scene.world, oldWorld);
    assert.deepEqual([scene.world.player.hp, scene.world.player.superGauge], entryResources);
    assert.deepEqual(scene.stageResult(), entryStats, 'Failed attempts add no time, score or combat stats');
    assert.deepEqual([scene.duelRound, scene.playerRoundWins, scene.enemyRoundWins, scene.stageTime], [1, 0, 0, 99]);
    assert.equal(scene.world.projectiles.length, 0);
    assert.equal(scene.world.events.length, 0);
    assert.equal(scene.gillPhase, 1);
    assert.equal(postCombat.at(-1), false, 'Normal touch controls return immediately');
    assert.equal(resets, beforeReset + 1, 'Retry button cannot carry into combat');
    assert.equal(stageRestarts, 0);
  }
  checks++;
}


// Round 1 starts immediately with a non-blocking FIGHT banner and 0-0 markers.
{
  const { scene } = reachDuel();
  assert.equal(ROUNDS_TO_WIN, 2);
  assert.deepEqual([scene.duelRound, scene.playerRoundWins, scene.enemyRoundWins, scene.roundAnnounceFrames], [1, 0, 0, 0]);
  assert.ok(scene.roundStartBannerFrames > 0, 'round 1 banner shows');
  checks++;
}

// KO -> round break -> ROUND 2 announce -> FIGHT -> fresh round with full life, reset positions, carried meter.
{
  const duel = reachDuel(); const scene = duel.scene; let tick = duel.tick;
  scene.world.player.hp = 400; scene.world.player.superGauge = 77; scene.world.enemy.superGauge = 31;
  scene.world.player.x = 1100; scene.world.enemy.x = 1150;
  const oldWorld = scene.world;
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel', 'first KO does not end the match');
  assert.deepEqual([scene.playerRoundWins, scene.enemyRoundWins, scene.lastRoundWinner, scene.lastRoundReason], [1, 0, 'player', 'ko']);
  assert.equal(scene.roundBreakFrames, ROUND_BREAK_FRAMES);
  const timer = scene.stageTime;
  for (let t = 0; t < ROUND_BREAK_FRAMES - 1; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.world, oldWorld, 'break keeps the KO tableau'); assert.equal(scene.stageTime, timer, 'timer frozen in break');
  scene.fixedUpdate(1 / 60, tick++);
  assert.notEqual(scene.world, oldWorld, 'new round rebuilt the duel');
  assert.equal(scene.duelRound, 2); assert.equal(scene.roundAnnounceFrames, ROUND_ANNOUNCE_FRAMES);
  assert.equal(scene.roundCallout(), 'ROUND 2');
  const p = scene.world.player, e = scene.world.enemy;
  assert.equal(p.hp, p.maxHp); assert.equal(e.hp, e.maxHp);
  assert.equal(p.superGauge, 77, 'player meter carries over'); assert.equal(e.superGauge, 31, 'enemy meter carries over');
  assert.ok(p.x < e.x && Math.abs(p.x - 360) < 1 && Math.abs(e.x - 880) < 1, `positions reset ${p.x} ${e.x}`);
  assert.equal(scene.stageTime, 99, 'round timer reset');
  for (let t = 0; t < ROUND_ANNOUNCE_FRAMES - ROUND_FIGHT_FRAMES; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.ok(audioCalls.includes('playDuelTransition'), 'FIGHT cue played');
  assert.equal(scene.stageTime, 99, 'timer frozen during announcer');
  tick = advanceThroughRoundBreak(scene, tick);
  scene.fixedUpdate(1 / 60, tick++);
  assert.ok(scene.stageTime < 99, 'timer runs after FIGHT');
  // Second KO wins the match.
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'clear'); assert.equal(scene.playerRoundWins, 2);
  checks++;
}

// Losing round 1 is not game over; 1-1 calls FINAL ROUND; losing the final round is defeat.
{
  let { scene, tick } = reachDuel();
  scene.world.player.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel'); assert.deepEqual([scene.playerRoundWins, scene.enemyRoundWins], [0, 1]);
  tick = advanceThroughRoundBreak(scene, tick);
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  for (let t = 0; t < ROUND_BREAK_FRAMES; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.roundCallout(), 'FINAL ROUND');
  tick = advanceThroughRoundBreak(scene, tick);
  scene.world.player.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'defeat'); assert.equal(scene.defeatReason, 'ko');
  checks++;
}

// Time over per round uses the life-ratio judgement; equal life is a draw (both score).
{
  let { scene, tick } = reachDuel();
  scene.world.enemy.aiCooldown = 9999;
  scene.world.player.hp = scene.world.player.maxHp * .6; scene.world.enemy.hp = scene.world.enemy.maxHp * .4; scene.stageTime = .001;
  scene.fixedUpdate(1 / 60, tick++);
  assert.deepEqual([scene.phase, scene.lastRoundWinner, scene.lastRoundReason, scene.playerRoundWins], ['duel', 'player', 'time', 1]);
  tick = advanceThroughRoundBreak(scene, tick);
  scene.world.player.hp = scene.world.player.maxHp * .5; scene.world.enemy.hp = scene.world.enemy.maxHp * .5; scene.stageTime = .001;
  scene.fixedUpdate(1 / 60, tick++);
  // 1-0 + draw = 2-1: the player reaches two wins and takes the match on time.
  assert.equal(scene.phase, 'clear');
  const behind = reachDuel(); scene = behind.scene; tick = behind.tick;
  scene.world.player.hp = scene.world.player.maxHp * .2; scene.world.enemy.hp = scene.world.enemy.maxHp * .9; scene.stageTime = .001;
  scene.fixedUpdate(1 / 60, tick++);
  assert.deepEqual([scene.phase, scene.lastRoundWinner, scene.enemyRoundWins], ['duel', 'enemy', 1]);
  tick = advanceThroughRoundBreak(scene, tick);
  scene.world.player.hp = scene.world.player.maxHp * .2; scene.world.enemy.hp = scene.world.enemy.maxHp * .9; scene.stageTime = .001;
  scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'defeat'); assert.equal(scene.defeatReason, 'time-over');
  checks++;
}

// Double KO: both score; at 1-1 another double KO is a DRAW GAME (challenger loses).
{
  let { scene, tick } = reachDuel();
  scene.world.player.hp = 0; scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.deepEqual([scene.phase, scene.lastRoundWinner, scene.lastRoundReason, scene.playerRoundWins, scene.enemyRoundWins], ['duel', 'draw', 'double-ko', 1, 1]);
  tick = advanceThroughRoundBreak(scene, tick);
  assert.equal(scene.duelRound, 2);
  scene.world.player.hp = 0; scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'defeat'); assert.equal(scene.defeatReason, 'double-ko');
  checks++;
}

// Round cap: repeated time-over draws after round 1 cannot loop forever.
{
  let { scene, tick } = reachDuel();
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++); tick = advanceThroughRoundBreak(scene, tick); // 1-0
  scene.world.player.hp = 0; scene.fixedUpdate(1 / 60, tick++); tick = advanceThroughRoundBreak(scene, tick); // 1-1
  assert.ok(scene.duelRound <= MAX_DUEL_ROUNDS);
  checks++;
}

// Stage 5: Urien best-of-3 hands off to Gill, whose match also needs two rounds and resets the score.
{
  let { scene, tick } = reachDuel(5);
  tick = winDuelMatch(scene, tick);
  assert.equal(scene.phase, 'final-transition');
  for (let t = 0; t < 400 && scene.phase !== 'final-duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'final-duel'); assert.deepEqual([scene.duelRound, scene.playerRoundWins, scene.enemyRoundWins], [1, 0, 0]);
  assert.equal(scene.world.enemy.character.id, 'GILL');
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'final-duel'); tick = advanceThroughRoundBreak(scene, tick);
  assert.equal(scene.world.enemy.character.id, 'GILL'); assert.equal(scene.world.enemy.hp, scene.world.enemy.maxHp);
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'final-ko');
  const loss = reachDuel(5); tick = loseDuelMatch(loss.scene, loss.tick);
  assert.equal(loss.scene.phase, 'defeat');
  checks++;
}

console.log('V081_DUEL_ROUNDS_PASS', { checks, roundsToWin: ROUNDS_TO_WIN, breakFrames: ROUND_BREAK_FRAMES, announceFrames: ROUND_ANNOUNCE_FRAMES });
