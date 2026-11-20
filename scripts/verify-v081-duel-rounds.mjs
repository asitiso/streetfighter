// V081: best-of-3 duel rounds — announcer flow, round markers, resets, meter carryover, time/double KO/draw.
import assert from 'node:assert/strict';
import { Stage1Scene, ROUNDS_TO_WIN, ROUND_BREAK_FRAMES, ROUND_ANNOUNCE_FRAMES, ROUND_FIGHT_FRAMES, MAX_DUEL_ROUNDS } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { advanceThroughRoundBreak, winDuelMatch, loseDuelMatch } from './duel-round-helpers.mjs';

const input = { held: () => false, pressed: () => false, released: () => false, resetCommandHistory() {} };
const audioCalls = [];
const audio = new Proxy({}, { get: (_, key) => (...args) => { audioCalls.push(String(key)); } });
const character = getCharacter('RYU');

function reachDuel(stageId = 1) {
  const scene = new Stage1Scene(input, audio, character, character.superArts[0], stageId);
  let tick = 1; scene.introFrames = 0;
  for (let wave = 0; wave < 3; wave += 1) {
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) { scene.world.player.x = scene.areaStarts[wave + 1] + 160; scene.fixedUpdate(1 / 60, tick++); for (let t = 0; t < 60; t += 1) scene.fixedUpdate(1 / 60, tick++); }
  }
  for (let t = 0; t < 400 && scene.phase !== 'duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel');
  return { scene, tick };
}
let checks = 0;

// Round 1 starts immediately (non-blocking ROUND 1 / FIGHT banner) with 0-0 markers.
{
  const { scene } = reachDuel();
  assert.equal(ROUNDS_TO_WIN, 2);
  assert.deepEqual([scene.duelRound, scene.playerRoundWins, scene.enemyRoundWins, scene.roundAnnounceFrames], [1, 0, 0, 0]);
  assert.ok(scene.roundOneBannerFrames > 0, 'round 1 banner shows');
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
