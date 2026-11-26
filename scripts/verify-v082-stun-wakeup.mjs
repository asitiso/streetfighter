// V082: SF3-style stun gauge / dizzy and wake-up options (quick rise, tech roll, wake invulnerability, reversals).
import assert from 'node:assert/strict';
import {
  Fighter, stunGainFor, STUN_MAX_BASE, STUN_DECAY_DELAY, DIZZY_FRAMES, WAKE_INVULN_FRAMES, QUICK_RISE_INPUT_WINDOW, QUICK_RISE_REMAINING, TECH_ROLL_FRAMES, TECH_ROLL_SPEED,
} from '../dist/assets/combat/Fighter.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { advanceThroughBeltLoot, advanceThroughRoundBreak } from './duel-round-helpers.mjs';

const quiet = { held: () => false, pressed: () => false, released: () => false };
const press = (...keys) => ({ ...quiet, pressed: (k) => keys.includes(k), held: (k) => keys.includes(k) });
const duelRules = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel').rules;
const heavy = normalFor('hp', false, 'RYU');
const sweep = normalFor('hk', true, 'RYU');
let checks = 0;

function pair(victimId = 'KEN') {
  const attacker = new Fighter(getCharacter('RYU'), 'player', 500, 500, 1);
  const victim = new Fighter(getCharacter(victimId), 'enemy', 560, 500, -1);
  return { attacker, victim };
}
function settle(f, rules = duelRules, limit = 400) {
  for (let t = 0; t < limit && (f.state === 'hit' || f.state === 'knockdown' || f.hitStop > 0); t += 1) f.updatePlayer(quiet, rules);
}
/** Hit with heavy punches (refilling life, recovering between hits) until the gauge fills and dizzy starts. */
function makeDizzy(f, attacker, rules = duelRules, update = (x) => x.updatePlayer(quiet, rules)) {
  for (let n = 0; n < 200 && !f.dizzy; n += 1) {
    f.hp = f.maxHp; f.receiveHit(heavy, attacker, false);
    for (let t = 0; t < 120 && !f.dizzy && (f.state === 'hit' || f.hitStop > 0 || f.stun >= f.stunMax); t += 1) update(f);
  }
  assert.ok(f.dizzy, 'gauge fill must cause dizzy');
}

// 1) Stun gain formula and accumulation; gauge capped; decay only after a delay without hits.
{
  assert.ok(stunGainFor(heavy) > stunGainFor(normalFor('lp', false, 'RYU')), 'heavier hits stun more');
  assert.ok(stunGainFor(heavy, true) > stunGainFor(heavy), 'counter hits stun more');
  const { attacker, victim } = pair();
  assert.equal(victim.stun, 0); assert.equal(victim.stunMax, Math.round(STUN_MAX_BASE * victim.combatProfile.healthScale));
  victim.receiveHit(heavy, attacker, false);
  const afterHit = victim.stun; assert.ok(afterHit > 0 && afterHit < victim.stunMax, `stun after one hit ${afterHit}`);
  assert.ok(Math.abs(victim.stunRatio - afterHit / victim.stunMax) < 1e-9);
  settle(victim);
  for (let t = 0; t < STUN_DECAY_DELAY - 5; t += 1) victim.updatePlayer(quiet, duelRules);
  assert.ok(victim.stun >= afterHit - 1e-9, 'no decay during the delay');
  for (let t = 0; t < 120; t += 1) victim.updatePlayer(quiet, duelRules);
  assert.ok(victim.stun < afterHit, 'gauge decays when not hit');
  for (let t = 0; t < 600; t += 1) victim.updatePlayer(quiet, duelRules);
  assert.equal(victim.stun, 0, 'gauge fully drains');
  checks++;
}

// 2) Full gauge -> dizzy (after the reeling ends), gauge empties, birds/stars state lasts DIZZY_FRAMES.
// 3) Mashing shortens the dizzy.
{
  const { attacker, victim } = pair();
  makeDizzy(victim, attacker);
  assert.equal(victim.state, 'hit'); assert.equal(victim.stun, 0); assert.equal(victim.dizzyCount, 1);
  assert.ok(victim.dizzyFramesRemaining > DIZZY_FRAMES - 5, `dizzy length ${victim.dizzyFramesRemaining}`);
  let idle = 0; while (victim.dizzy && idle < 400) { victim.updatePlayer(quiet, duelRules); idle += 1; }
  const other = pair(); makeDizzy(other.victim, other.attacker);
  const mashKeys = ['lp', 'lk', 'left', 'right'];
  let mashed = 0; while (other.victim.dizzy && mashed < 400) { other.victim.updatePlayer(press(mashKeys[mashed % 4]), duelRules); mashed += 1; }
  assert.ok(idle >= DIZZY_FRAMES - 5, `unmashed dizzy ${idle}`);
  assert.ok(mashed < idle * .5, `mashing must recover faster: mashed ${mashed} vs idle ${idle}`);
  checks += 2;
}

// 4) Hitting a dizzy fighter wakes them, starts a fresh combo and cannot re-stun inside that combo.
{
  const { attacker, victim } = pair(); makeDizzy(victim, attacker);
  victim.receiveHit(heavy, attacker, false);
  assert.equal(victim.dizzy, false, 'hit breaks dizzy'); assert.equal(victim.comboHitsTaken, 1, 'punish combo starts unscaled');
  for (let i = 0; i < 12; i += 1) { victim.hp = victim.maxHp; victim.receiveHit(heavy, attacker, false); }
  assert.equal(victim.stun, 0, 'stun locked during the punish combo');
  settle(victim); victim.receiveHit(heavy, attacker, false);
  assert.ok(victim.stun > 0, 'stun accumulates again after the combo ends');
  checks++;
}

// 5) Player stun disabled in belt sections, enabled in duels; enemies always stunnable.
{
  const belt = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
  assert.equal(belt.player.stunEnabled, false); assert.equal(belt.enemy.stunEnabled, true);
  belt.player.receiveHit(heavy, belt.enemy, false); assert.equal(belt.player.stun, 0);
  const duel = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
  assert.equal(duel.player.stunEnabled, true);
  checks++;
}

// 6) AI-controlled bosses (Urien, Gill) can be dizzied and mash out faster than an idle dizzy.
for (const boss of BOSS_CHARACTERS) {
  const world = new CombatWorld(getCharacter('RYU'), boss, 'duel');
  const ai = world.enemy, target = world.player; target.x = ai.x - 400;
  assert.ok(ai.stunMax >= STUN_MAX_BASE, `${boss.id} stun max ${ai.stunMax}`);
  makeDizzy(ai, target, world.rules, (f) => f.updateAi(target, world.rules));
  let frames = 0; while (ai.dizzy && frames < 400) { ai.updateAi(target, world.rules); frames += 1; }
  assert.ok(frames < DIZZY_FRAMES && frames > 60, `${boss.id} AI mash-out ${frames}`);
  checks++;
}

// 7) Grounded knockdown and wake-up frames are invulnerable; world attacks whiff.
function knockDown(victim, attacker) {
  victim.receiveHit(sweep, attacker, false);
  assert.equal(victim.state, 'knockdown');
  for (let t = 0; t < 40 && (victim.hitStop > 0 || victim.airborne); t += 1) victim.updatePlayer(quiet, duelRules);
}
{
  const { attacker, victim } = pair(); knockDown(victim, attacker);
  assert.equal(victim.isInvulnerable(), true, 'downed body cannot be hit');
  const world = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
  const p = world.player, e = world.enemy; e.x = p.x + 60; e.y = p.y; e.facing = -1; p.facing = 1;
  knockDown(e, p); const hp = e.hp;
  p.startMove(heavy); p.moveFrame = heavy.startup; world.resolveAttack(p, e, quiet);
  assert.equal(e.hp, hp, 'OTG attack whiffs');
  let t = 0; while (victim.state === 'knockdown' && t < 80) { victim.updatePlayer(quiet, duelRules); t += 1; }
  assert.ok(victim.wakeInvulnerableFrames > 0 && victim.wakeInvulnerableFrames <= WAKE_INVULN_FRAMES && victim.isInvulnerable(), 'wake-up invulnerability starts on rising');
  for (let i = 0; i < WAKE_INVULN_FRAMES; i += 1) victim.updatePlayer(quiet, duelRules);
  assert.equal(victim.isInvulnerable(), false, 'invulnerability expires');
  checks++;
}

// 8) Quick rise (tap down) stands up sooner; tech roll (down+back) also rolls away from the attacker.
function framesToStand(firstFrameInput) {
  const { attacker, victim } = pair(); knockDown(victim, attacker);
  const x = victim.x; let t = 0;
  victim.updatePlayer(firstFrameInput ?? quiet, duelRules);
  while (victim.state === 'knockdown' && t < 80) { victim.updatePlayer(quiet, duelRules); t += 1; }
  for (let i = 0; i < TECH_ROLL_FRAMES; i += 1) victim.updatePlayer(quiet, duelRules);
  return { t, dx: victim.x - x, victim };
}
{
  const normal = framesToStand();
  const quick = framesToStand(press('down'));
  assert.ok(quick.t <= QUICK_RISE_REMAINING && quick.t < normal.t, `quick rise ${quick.t} vs ${normal.t}`);
  assert.equal(quick.victim.quickRiseCount, 1);
  const roll = framesToStand(press('down', 'right')); // victim faces -1, so back is right
  assert.ok(roll.dx >= TECH_ROLL_FRAMES * TECH_ROLL_SPEED - 1, `tech roll moved ${roll.dx}`);
  assert.ok(Math.abs(quick.dx) < 1, 'plain quick rise stays in place');
  checks++;
}

{
  for (const ticks of [QUICK_RISE_INPUT_WINDOW - 1, QUICK_RISE_INPUT_WINDOW]) {
    const { attacker, victim } = pair();
    knockDown(victim, attacker);
    victim.stateFrame = -60; // Isolate the input-window cutoff from normal standing recovery.
    for (let i = 0; i < ticks; i += 1) victim.updatePlayer(quiet, duelRules);
    const allowed = ticks < QUICK_RISE_INPUT_WINDOW;
    assert.equal(victim.canQuickRiseOnNextTick, allowed);
    victim.updatePlayer(press('down'), duelRules);
    assert.equal(victim.quickRiseCount, Number(allowed), 'The displayed cutoff agrees with actual input');
    checks++;
  }
}

{
  for (const [name, height, first, reset, expectedRoll] of [
    ['early down near landing', 14, press('down'), false, false],
    ['early diagonal near landing', 14, press('down', 'right'), false, true],
    ['far from landing', 90, press('down'), false, null],
    ['input epoch changed before landing', 14, press('down'), true, null],
  ]) {
    const { attacker, victim } = pair();
    knockDown(victim, attacker);
    victim.airborne = true; victim.jumpHeight = height; victim.jumpVelocity = -5;
    victim.updatePlayer({ ...first, historyEpoch: 1 }, duelRules);
    assert.equal(victim.quickRiseCount, 0, name + ' waits for ground contact');
    while (victim.airborne) victim.updatePlayer({ ...quiet, historyEpoch: reset ? 2 : 1 }, duelRules);
    assert.equal(victim.quickRiseCount, Number(expectedRoll !== null), name);
    assert.equal(victim.techRolling, expectedRoll === true, name);
    checks++;
  }
}

{
  for (const [name, stop, buttons, restartEpoch, expected] of [
    ['grounded down during final hit stop', 4, ['down'], false, 'rise'],
    ['grounded diagonal during final tick', 1, ['down', 'right'], false, 'roll'],
    ['outside the hit-stop buffer', 5, ['down'], false, null],
    ['epoch reset while frozen', 2, ['down', 'right'], true, null],
  ]) {
    const { attacker, victim } = pair();
    knockDown(victim, attacker);
    victim.hitStop = stop;
    const before = victim.stateFrame;
    victim.updatePlayer({ ...press(...buttons), historyEpoch: 1 }, duelRules);
    while (victim.hitStop > 0) victim.updatePlayer({ ...quiet, historyEpoch: restartEpoch ? 2 : 1 }, duelRules);
    assert.equal(victim.quickRiseCount, 0, name + ' cannot interrupt hit stop');
    assert.equal(victim.stateFrame, before, name + ' cannot tick down the frozen pose');
    victim.updatePlayer({ ...quiet, historyEpoch: restartEpoch ? 2 : 1 }, duelRules);
    assert.equal(victim.quickRiseCount, Number(expected !== null), name);
    assert.equal(victim.techRolling, expected === 'roll', name);
    checks++;
  }
}

for (const [stage, wave, reset, rehit, expected] of [
  [2, 0, false, false, true], [2, 1, false, false, true], [2, 2, false, false, false],
  [3, 0, false, false, false], [2, 0, true, false, false], [2, 1, false, true, false],
]) {
  const hero = getCharacter('RYU');
  const scene = new Stage1Scene(quiet, {}, hero, hero.superArts[0], stage);
  scene.spawnBeltWave(wave);
  const { player: victim, enemy: attacker, rules } = scene.world;
  knockDown(victim, attacker);
  victim.airborne = true;
  victim.jumpHeight = 48;
  victim.jumpVelocity = -3;
  assert(victim.canPrepareQuickRise);
  victim.updatePlayer({ ...press('down'), historyEpoch: 1 }, rules);
  assert.equal(victim.quickRiseCount, 0);
  if (rehit) victim.receiveHit(sweep, attacker, false);
  let ticks = 0;
  while (victim.airborne && ticks++ < 60) victim.updatePlayer({ ...quiet, historyEpoch: reset ? 2 : 1 }, rules);
  assert(!victim.airborne && ticks > 4 && ticks < 60);
  assert.equal(victim.quickRiseCount, Number(expected), `Early landing input in stage ${stage}, wave ${wave + 1}, reset ${reset}, new hit ${rehit}`);
  if (expected) assert.equal(victim.stateFrame, -(QUICK_RISE_REMAINING - 1));
  checks++;
}

// 9) Wake-up reversal: a special entered in the last knockdown frames comes out on the first standing frame.
{
  const { attacker, victim } = pair('RYU'); knockDown(victim, attacker);
  while (victim.stateFrame < -5) victim.updatePlayer(quiet, duelRules);
  // Victim faces -1: forward is left. Input D, DF, F + LP.
  let tick = 1000;
  for (const held of [['down'], ['down', 'left'], ['left']]) { const i = { ...quiet, held: (k) => held.includes(k) }; victim.captureInput(i, tick++); victim.updatePlayer(i, duelRules); }
  const fire = { ...quiet, held: (k) => k === 'left' || k === 'lp', pressed: (k) => k === 'lp' };
  victim.captureInput(fire, tick++); victim.updatePlayer(fire, duelRules);
  let t = 0; while (victim.state === 'knockdown' && t < 20) { victim.updatePlayer(quiet, duelRules); t += 1; }
  assert.equal(victim.state, 'attack', `reversal state ${victim.state}`);
  assert.equal(victim.currentMove?.id, specialMovesFor('RYU').primary.id, 'buffered special fires on wake');
  checks++;
}

// 10) Stun resets between duel rounds (a new round builds a fresh world).
{
  const input = { ...quiet, resetCommandHistory() {} };
  const audio = new Proxy({}, { get: () => () => {} });
  const ryu = getCharacter('RYU');
  const scene = new Stage1Scene(input, audio, ryu, ryu.superArts[0], 1);
  let tick = 1; scene.introFrames = 0;
  for (let wave = 0; wave < 3; wave += 1) {
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) { scene.world.player.x = scene.areaStarts[wave + 1] + 160; scene.fixedUpdate(1 / 60, tick++); for (let t = 0; t < 60; t += 1) scene.fixedUpdate(1 / 60, tick++); }
  }
  tick = advanceThroughBeltLoot(scene, tick);
  for (let t = 0; t < 400 && scene.phase !== 'duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel');
  scene.world.enemy.receiveHit(heavy, scene.world.player, false); scene.world.player.receiveHit(heavy, scene.world.enemy, false);
  assert.ok(scene.world.enemy.stun > 0 && scene.world.player.stun > 0);
  scene.world.enemy.hp = 0; scene.fixedUpdate(1 / 60, tick++);
  tick = advanceThroughRoundBreak(scene, tick);
  assert.equal(scene.duelRound, 2);
  assert.deepEqual([scene.world.player.stun, scene.world.enemy.stun, scene.world.enemy.dizzy], [0, 0, false], 'stun resets for the next round');
  checks++;
}

console.log('V082_STUN_WAKEUP_PASS', { checks, dizzyFrames: DIZZY_FRAMES, wakeInvuln: WAKE_INVULN_FRAMES });
