// V083: smarter duel AI — fireball answers, anti-air, whiff punish, footsies, per-stage difficulty, determinism.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter, CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { stageAiLevel, aiTuning, setAiDifficultySetting, getAiDifficultySetting, MAX_AI_LEVEL } from '../dist/assets/combat/AiDifficulty.js';
import { sanitizeGameSave, encodeSaveRecord, decodeSaveRecord, checksumSave, DEFAULT_SAVE } from '../dist/assets/save/SaveManager.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';

const REPORT = process.argv.includes('--report');
const q = { held: () => false, pressed: () => false, released: () => false, historyEpoch: 0, directionChanges: () => [] };
const roster = [...CHARACTERS, ...BOSS_CHARACTERS];
let checks = 0;
const report = {};

function duel(enemyId, level, gap, playerId = 'RYU') {
  const w = new CombatWorld(getCharacter(playerId), getCharacter(enemyId), 'duel');
  const p = w.player, e = w.enemy;
  p.x = p.previousX = 400; e.x = e.previousX = 400 + gap; e.y = e.previousY = p.y;
  p.facing = 1; e.facing = -1; e.setAiLevel(level); e.aiCooldown = 30;
  let tick = 0;
  const step = (input = q) => w.update(input, tick++);
  return { w, p, e, step };
}

if (process.argv.includes('--trace')) {
  Math.random = () => { throw new Error('AI must not use Math.random'); };
  const { p, e, step } = duel('GILL', 6, 240); const rows = [];
  for (let t = 0; t < 240; t += 1) {
    step(t % 40 === 5 ? { ...q, pressed: (k) => k === 'up', held: (k) => k === 'up' } : q);
    rows.push([Math.round(e.x * 100), e.state, e.currentMove?.id ?? '', p.hp, e.hp]);
  }
  console.log(JSON.stringify({ rows, stats: e.aiBrainStats }));
  process.exit(0);
}

// 1) Difficulty curve: stage 1 easiest -> Gill hardest, option shifts by one level, tuning is monotonic.
{
  assert.deepEqual([1, 2, 3, 4, 5].map((s) => stageAiLevel(s, false, 'normal')), [1, 2, 3, 4, 5]);
  assert.equal(stageAiLevel(5, true, 'normal'), MAX_AI_LEVEL);
  assert.deepEqual([stageAiLevel(1, false, 'easy'), stageAiLevel(3, false, 'easy'), stageAiLevel(5, true, 'easy')], [1, 2, 5]);
  assert.deepEqual([stageAiLevel(1, false, 'hard'), stageAiLevel(5, false, 'hard'), stageAiLevel(5, true, 'hard')], [2, 6, 6]);
  for (let l = 2; l <= MAX_AI_LEVEL; l += 1) {
    const a = aiTuning(l - 1), b = aiTuning(l);
    assert.ok(b.reactionDelay < a.reactionDelay && b.fireballChance > a.fireballChance && b.antiAirChance > a.antiAirChance && b.whiffPunishChance > a.whiffPunishChance);
  }
  assert.equal(setAiDifficultySetting('bogus'), 'normal');
  checks++;
}

// 2) Fireball answers: jump over / block / parry / counter-fireball, chosen per character; higher level = less damage.
function fireballTrial(enemyId, level, gap) {
  const { w, p, e, step } = duel(enemyId, level, gap);
  const hp = e.hp;
  w.spawnScriptedProjectile(p, specialMovesFor('RYU').primary);
  for (let t = 0; t < 90 && (w.projectiles.some((x) => x.owner === p) || e.airborne || e.state === 'attack'); t += 1) { p.aiCooldown = 99; step(); }
  return { hit: e.hp < hp && e.state !== 'block', stats: e.aiBrainStats };
}
{
  const totals = { 0: 0, 1: 0, 6: 0 }, kinds = new Map();
  for (const c of roster) for (const gap of [230, 260, 290, 320, 350]) for (const level of [0, 1, 6]) {
    const r = fireballTrial(c.id, level, gap);
    if (r.hit) totals[level] += 1;
    if (level === 6) for (const k of ['fireballJump', 'fireballBlock', 'fireballParry', 'fireballCounter']) if (r.stats[k]) kinds.set(`${c.id}:${k}`, true);
  }
  const used = new Set([...kinds.keys()].map((k) => k.split(':')[1]));
  report.fireball = { hitsTaken: totals, answers: [...used] };
  assert.ok(used.size >= 3, `level 6 uses several fireball answers: ${[...used]}`);
  assert.ok(![...kinds.keys()].some((k) => k.startsWith('ALEX:fireballCounter')), 'characters without a projectile never counter-fireball');
  if (REPORT) console.log([...kinds.keys()].join(' '));
  assert.ok([...kinds.keys()].some((k) => k.endsWith(':fireballCounter')), 'projectile characters counter-fireball');
  assert.ok(totals[6] < totals[1] && totals[6] < totals[0], `harder AI eats fewer fireballs ${JSON.stringify(totals)}`);
  checks++;
}

// 3) Fireball clash: opposing fireballs cancel.
{
  const { w, p, e, step } = duel('KEN', 0, 360);
  w.spawnScriptedProjectile(p, specialMovesFor('RYU').primary);
  w.spawnScriptedProjectile(e, specialMovesFor('KEN').primary);
  for (let t = 0; t < 40 && w.projectiles.length; t += 1) { p.aiCooldown = 99; e.aiCooldown = 99; step(); }
  assert.equal(w.projectilesClashed, 1); assert.equal(w.projectiles.length, 0);
  checks++;
}

// 4) Anti-air: jump-ins get swatted (DP or anti-air normal), much more at high level.
function jumpInTrial(enemyId, level, gap) {
  const { p, e, step } = duel(enemyId, level, gap);
  const hp = p.hp;
  step({ ...q, pressed: (k) => k === 'up', held: (k) => k === 'up' });
  for (let t = 0; t < 70 && (p.airborne || p.state === 'jump'); t += 1) { p.x += 3.6; step(); if (p.hp < hp) break; }
  const s = e.aiBrainStats;
  return { swatted: p.hp < hp, tried: s.antiAir + s.antiAirNormal > 0, normal: s.antiAirNormal > 0 };
}
{
  const rate = {}; let normals = 0;
  for (const level of [1, 6]) {
    let swats = 0, n = 0;
    for (const c of roster) for (const gap of [150, 175, 200, 225]) { const r = jumpInTrial(c.id, level, gap); n += 1; if (r.tried) swats += 1; if (r.normal) normals += 1; }
    rate[level] = swats / n;
  }
  report.antiAir = { ...rate, normals };
  assert.ok(rate[6] >= .6 && rate[6] > rate[1] + .2, `anti-air rates ${JSON.stringify(rate)}`);
  assert.ok(normals > 0, 'close jump-ins are sometimes answered with an anti-air normal');
  checks++;
}

// 5) Whiff punish: a missed heavy at the edge of range gets punished within the reaction window.
function whiffTrial(enemyId, level, extra) {
  const { p, e, step } = duel(enemyId, level, 0);
  const hk = normalFor('hk', false, 'RYU');
  e.x = e.previousX = p.x + hk.hitbox.forward * p.character.reach + extra; // just outside the heavy's reach
  const hp = p.hp;
  p.startMove(hk);
  for (let t = 0; t < 60; t += 1) { step(); if (p.hp < hp) break; }
  return { punished: e.aiBrainStats.whiffPunish > 0, landed: p.hp < hp };
}
{
  const rate = {};
  for (const level of [1, 6]) {
    let n = 0, punished = 0, landed = 0;
    for (const c of roster) for (const extra of [5, 15, 25, 35]) { const r = whiffTrial(c.id, level, extra); n += 1; if (r.punished) punished += 1; if (r.landed) landed += 1; }
    rate[level] = { punished: punished / n, landed: landed / n };
  }
  report.whiff = rate;
  assert.ok(rate[6].punished > rate[1].punished + .2 && rate[6].landed > 0, `whiff punish ${JSON.stringify(rate)}`);
  checks++;
}

// 6) Footsies: while cooling down the AI dances at poke range (walks both ways) instead of walking into the player.
{
  let back = 0, forward = 0, minGap = Infinity;
  for (const c of roster) {
    const { p, e, step } = duel(c.id, 4, 170);
    for (let t = 0; t < 150; t += 1) { e.aiCooldown = Math.max(e.aiCooldown, 5); p.aiCooldown = 99; const x = e.x; step(); const d = e.x - x; if (d > .5) back += 1; else if (d < -.5) forward += 1; minGap = Math.min(minGap, Math.abs(e.x - p.x)); }
    assert.ok(e.aiBrainStats.footsieSteps > 0, `${c.id} footsies`);
  }
  report.footsies = { back, forward, minGap };
  assert.ok(back > 20 && forward > 20 && minGap > 55, `footsie spacing ${JSON.stringify(report.footsies)}`);
  checks++;
}

// 7) Deterministic: a fresh process replays the same Gill fight frame-for-frame, and decisions never use Math.random.
{
  const run = () => execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--trace'], { encoding: 'utf8' });
  const first = run();
  assert.ok(first.length > 1000);
  assert.equal(run(), first);
  checks++;
}

// 8) Scene wiring: the duel boss gets its stage level, shifted by the CPU difficulty option; legacy AI stays level 0 elsewhere.
function reachDuel(stageId) {
  const input = { ...q, resetCommandHistory() {} }, audio = new Proxy({}, { get: () => () => {} }), ryu = getCharacter('RYU');
  const scene = new Stage1Scene(input, audio, ryu, ryu.superArts[0], stageId);
  let tick = 1; scene.introFrames = 0;
  for (let wave = 0; wave < 3; wave += 1) {
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) { scene.world.player.x = scene.areaStarts[wave + 1] + 160; scene.fixedUpdate(1 / 60, tick++); for (let t = 0; t < 60; t += 1) scene.fixedUpdate(1 / 60, tick++); }
  }
  for (let t = 0; t < 400 && scene.phase !== 'duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel');
  return scene;
}
{
  assert.equal(new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt').enemy.aiLevel, 0);
  setAiDifficultySetting('normal'); assert.equal(reachDuel(1).world.enemy.aiLevel, 1);
  assert.equal(reachDuel(3).world.enemy.aiLevel, 3);
  setAiDifficultySetting('hard'); assert.equal(reachDuel(1).world.enemy.aiLevel, 2);
  setAiDifficultySetting('easy'); assert.equal(reachDuel(4).world.enemy.aiLevel, 3);
  setAiDifficultySetting('normal'); assert.equal(getAiDifficultySetting(), 'normal');
  checks++;
}

// 9) Save: difficulty persists, junk is repaired, and saves written before this option still load.
{
  assert.equal(sanitizeGameSave({ ...DEFAULT_SAVE, aiDifficulty: 'hard' }).save.aiDifficulty, 'hard');
  const junk = sanitizeGameSave({ ...DEFAULT_SAVE, aiDifficulty: 'insane' });
  assert.equal(junk.save.aiDifficulty, 'normal'); assert.ok(junk.issues.includes('AI DIFFICULTY'));
  const record = encodeSaveRecord({ ...DEFAULT_SAVE, aiDifficulty: 'easy', currentStage: 3 }, 1);
  assert.equal(decodeSaveRecord(record)?.save.aiDifficulty, 'easy');
  const { aiDifficulty: _d, ...old } = { ...DEFAULT_SAVE, currentStage: 4 };
  const legacy = { schemaVersion: DEFAULT_SAVE.schemaVersion, savedAt: 1, checksum: checksumSave(old), data: old };
  const decoded = decodeSaveRecord(legacy);
  assert.ok(decoded, 'pre-difficulty save record still validates'); assert.equal(decoded.save.currentStage, 4); assert.equal(decoded.save.aiDifficulty, 'normal');
  assert.equal(decodeSaveRecord({ ...legacy, checksum: 'deadbeef' }), null, 'tampered records still rejected');
  checks++;
}

if (REPORT) console.log(JSON.stringify(report, null, 1));
console.log('V083_SMART_AI_PASS', { checks, ...report.fireball?.hitsTaken && { fireballHitsTaken: report.fireball.hitsTaken } });
