// V084: training mode — frame data from move data, move lists, dummy actions/guard/parry/stun, infinite toggles,
// combo readout with scaling, input history, menu navigation, and scene-level training (no timer, no round end).
import assert from 'node:assert/strict';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter, CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { comboDamageScale } from '../dist/assets/combat/Fighter.js';
import { TrainingSession, frameDataFor, trainingMoveList, TRAINING_MENU_ROWS, DEFAULT_TRAINING_SETTINGS, KO_REVIVE_FRAMES } from '../dist/assets/training/TrainingSession.js';
import { TrainingSelectScene, TRAINING_SELECT_ROWS } from '../dist/assets/scenes/TrainingSelectScene.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';

const REPORT = process.argv.includes('--report');
const base = { held: () => false, pressed: () => false, released: () => false, historyEpoch: 0, directionChanges: () => [], touchPressed: () => false, resetCommandHistory() {} };
const press = (...keys) => ({ ...base, pressed: (k) => keys.includes(k), held: (k) => keys.includes(k) });
const hold = (...keys) => ({ ...base, held: (k) => keys.includes(k) });
const roster = [...CHARACTERS, ...BOSS_CHARACTERS];
let checks = 0; const report = {};

function training(playerId = 'RYU', dummyId = 'KEN', settings = {}) {
  const w = new CombatWorld(getCharacter(playerId), getCharacter(dummyId), 'duel');
  const s = new TrainingSession();
  Object.assign(s.settings, settings);
  s.attach(w);
  let tick = 1;
  const step = (input = base) => { s.beforeUpdate(); w.update(input, tick++); s.afterUpdate(input); };
  const close = (gap = 70) => { w.enemy.x = w.enemy.previousX = w.player.x + gap; };
  return { w, s, p: w.player, d: w.enemy, step, close };
}
function attack(t, key = 'hp', frames = 40) { t.step(press(key)); for (let i = 0; i < frames; i += 1) t.step(); }

// 1) Frame data comes straight from the move data in code.
{
  for (const c of roster) for (const move of [normalFor('lp', false, c.id), normalFor('hk', false, c.id), normalFor('mk', true, c.id), throwMoveFor(c.id), ...Object.values(specialMovesFor(c.id))].filter((m) => m && typeof m === 'object' && 'startup' in m)) {
    const f = frameDataFor(move);
    assert.equal(f.startup, move.startup, `${c.id} ${move.id} startup`);
    assert.equal(f.active, move.active); assert.equal(f.recovery, move.recovery);
    if (f.onHit !== 'KD' || move.kind !== 'throw') assert.equal(f.onBlock, move.blockStun - (move.active - 1 + move.recovery), `${c.id} ${move.id} on block`);
    assert.equal(f.damage, move.damage);
  }
  const ryuLp = frameDataFor(normalFor('lp', false, 'RYU')), ryuHp = frameDataFor(normalFor('hp', false, 'RYU'));
  assert.ok(ryuLp.startup < ryuHp.startup, 'light punch starts faster than heavy');
  assert.ok(ryuLp.onBlock > ryuHp.onBlock, 'light punch is safer on block');
  report.ryuFrameData = { lp: ryuLp, hp: ryuHp };
  checks++;
}

// 2) Move list per character: normals, throw, specials with motion inputs, and super arts.
{
  for (const c of roster) {
    const list = trainingMoveList(c.id);
    assert.ok(list.length >= 10, `${c.id} move list too short (${list.length})`);
    for (const g of ['NORMAL', 'THROW', 'SPECIAL']) assert.ok(list.some((m) => m.group === g), `${c.id} missing ${g}`);
    for (const m of list) { assert.ok(m.input && m.name, `${c.id} entry has input + name`); assert.ok(Number.isFinite(m.move.startup) && Number.isFinite(m.move.recovery)); }
    assert.ok(list.some((m) => m.group === 'SPECIAL' && /↓↘→/.test(m.input)), `${c.id} quarter circle special`);
    if (CHARACTERS.includes(c)) assert.ok(list.filter((m) => m.group === 'SUPER').length >= 1, `${c.id} super arts`);
    report[c.id] = list.length;
  }
  checks++;
}

// 3) Dummy actions: stand stays grounded, crouch holds down, jump keeps jumping, CPU uses its brain.
{
  const st = training(); for (let i = 0; i < 90; i += 1) st.step();
  assert.equal(st.d.airborne, false); assert.notEqual(st.d.state, 'crouch');
  const cr = training('RYU', 'KEN', { action: 'crouch' }); for (let i = 0; i < 20; i += 1) cr.step();
  assert.equal(cr.d.state, 'crouch', 'crouch dummy crouches');
  const jp = training('RYU', 'KEN', { action: 'jump' }); let airFrames = 0, takeoffs = 0, wasAir = false;
  for (let i = 0; i < 240; i += 1) { jp.step(); if (jp.d.airborne) airFrames++; if (jp.d.airborne && !wasAir) takeoffs++; wasAir = jp.d.airborne; }
  assert.ok(airFrames > 120 && takeoffs >= 3, `jump dummy repeats jumps (${takeoffs})`);
  const cpu = training('RYU', 'KEN', { action: 'cpu' }); assert.equal(cpu.d.aiLevel, 3);
  const x0 = cpu.d.x; let acted = false; for (let i = 0; i < 300; i += 1) { cpu.step(); if (cpu.d.state === 'attack' || Math.abs(cpu.d.x - x0) > 40) acted = true; }
  assert.ok(acted, 'CPU dummy moves/attacks on its own');
  assert.equal(st.d.aiLevel, 0);
  report.dummyJump = { airFrames, takeoffs };
  checks++;
}

// 4) Guard settings: none gets hit, all blocks, after-first-hit blocks the follow-up but not the opener.
{
  const none = training(); none.close(); const hp0 = none.d.hp; attack(none);
  assert.ok(none.d.hp < hp0 || none.s.combo.best >= 1, 'BLOCK NONE takes the hit');
  const all = training('RYU', 'KEN', { block: 'all' }); all.close(); const hp1 = all.d.hp; let blocked = false;
  all.step(press('hp')); for (let i = 0; i < 40; i += 1) { all.step(); if (all.d.state === 'block') blocked = true; }
  assert.ok(blocked, 'BLOCK ALL guards'); assert.equal(all.d.hp, hp1, 'normals do no chip');
  const after = training('RYU', 'KEN', { block: 'after-first-hit' }); after.close(); const hp2 = after.d.hp;
  after.step(press('mp')); let firstHit = false, guarded = false, recovered = -1;
  for (let i = 0; i < 90; i += 1) {
    const idle = after.d.state === 'idle' && after.p.state === 'idle' && after.p.hitStop === 0;
    if (firstHit && recovered < 0 && idle) { recovered = i; after.close(); after.step(press('mp')); } else after.step();
    if (after.d.hp < hp2) firstHit = true;
    if (recovered >= 0 && after.d.state === 'block') guarded = true;
  }
  report.afterFirstHit = { recovered, guarded };
  assert.ok(firstHit, 'first hit lands'); assert.ok(guarded, 'dummy blocks after the first hit');
  for (let i = 0; i < 200; i += 1) after.step();
  const hp3 = after.d.hp; after.close(); attack(after, 'hp');
  assert.ok(after.d.hp < hp3 || after.s.combo.hits >= 1, 'guard timer expires and the next opener hits again');
  checks++;
}

// 5) Parry toggle: the dummy parries instead of taking the hit.
{
  const pr = training('RYU', 'KEN', { parry: true }); pr.close(); const hp = pr.d.hp; let parried = 0;
  const events = []; pr.step(press('hp'));
  for (let i = 0; i < 40; i += 1) { pr.step(); for (const e of pr.w.events ?? []) events.push(e); if (pr.d.state === 'parry') parried++; }
  assert.equal(pr.d.hp, hp, 'parry dummy takes no damage');
  assert.ok(parried > 0 || events.some((e) => /PARRY/i.test(String(e.label ?? e.text ?? ''))), 'dummy parried');
  checks++;
}

// 6) Stun toggle: stun off keeps the gauge empty; stun on builds it.
{
  const on = training(), off = training('RYU', 'KEN', { stun: false }); off.s.applySettings();
  let maxOn = 0, maxOff = 0;
  for (const t of [on, off]) for (let k = 0; k < 4; k += 1) { t.close(); t.step(press('hp')); for (let i = 0; i < 45; i += 1) { t.step(); if (t === on) maxOn = Math.max(maxOn, t.d.stun); else maxOff = Math.max(maxOff, t.d.stun); } }
  assert.equal(on.d.stunEnabled, true); assert.equal(off.d.stunEnabled, false);
  assert.ok(maxOn > 0, 'stun builds with stun on'); assert.equal(maxOff, 0, 'stun off keeps the gauge empty');
  report.stun = { maxOn, maxOff };
  checks++;
}

// 7) Infinite health/meter, KO revive with infinite health off.
{
  const t = training(); t.d.hp = 5; t.step(); assert.ok(t.d.hp >= Math.round(t.d.maxHp * .35) - 1, 'health floor');
  t.p.superGauge = 0; t.step(); assert.equal(t.p.superGauge, t.p.superGaugeMax, 'meter refills');
  for (let i = 0; i < 60; i += 1) t.step(); assert.equal(t.d.hp, t.d.maxHp, 'health refills in neutral');
  const fin = training('RYU', 'KEN', { infiniteHealth: false, infiniteMeter: false });
  fin.p.superGauge = 0; fin.step(); assert.equal(fin.p.superGauge, 0, 'meter not refilled when off');
  fin.d.hp = 0; for (let i = 0; i < KO_REVIVE_FRAMES + 5; i += 1) fin.step();
  assert.equal(fin.d.hp, fin.d.maxHp, 'KO dummy is revived'); assert.notEqual(fin.d.state, 'ko');
  checks++;
}

// 8) Reset position restores the neutral layout.
{
  const t = training(); t.p.x = 200; t.d.x = 220; t.d.hp = 10; t.p.facing = -1;
  t.s.resetPositions();
  const mid = (t.w.rules.arenaLeft + t.w.rules.arenaRight) / 2;
  assert.equal(t.p.x, mid - 130); assert.equal(t.d.x, mid + 130); assert.equal(t.p.facing, 1); assert.equal(t.d.facing, -1);
  assert.equal(t.d.hp, t.d.maxHp); assert.equal(t.s.combo.hits, 0);
  checks++;
}

// 9) Combo readout: hits, damage and scaling for a real chain.
{
  // Real inputs through InputManager: cr.MK xx ↓↘→+LP (special cancel) is a 2-hit combo.
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
  const { InputManager } = await import('../dist/assets/input/InputManager.js');
  const input = new InputManager();
  const key = (type, code) => { const e = new Event(type, { cancelable: true }); Object.defineProperties(e, { code: { value: code }, repeat: { value: false } }); window.dispatchEvent(e); };
  const t = training(); t.close(70);
  const script = { 0: [['keydown', 'ArrowDown'], ['keydown', 'KeyI']], 1: [['keyup', 'KeyI']], 3: [['keydown', 'ArrowRight']], 6: [['keyup', 'ArrowDown']], 9: [['keydown', 'KeyJ']], 10: [['keyup', 'KeyJ'], ['keyup', 'ArrowRight']] };
  for (let i = 0; i < 90; i += 1) { for (const [ty, c] of script[i] ?? []) key(ty, c); input.prepareTick(); t.step(input); input.endTick(); }
  input.destroy();
  assert.deepEqual(t.s.history.slice(1, 5).map((h) => h.direction + h.buttons.join('')), ['→LP', '→', '↘', '↓MK'], 'input history shows the motion');
  assert.ok(t.s.combo.best >= 2, `combo readout counts a chain (${t.s.combo.best})`);
  assert.ok(t.s.combo.bestDamage > 0);
  assert.equal(comboDamageScale(t.s.combo.best, {}), Math.max(.3, Math.min(1, 1 - Math.max(0, t.s.combo.best - 2) * .1)));
  // Scaling readout follows comboDamageScale for a synthetic 5-hit string.
  const s5 = training(); s5.close(60);
  for (let k = 0; k < 5; k += 1) { s5.s.beforeUpdate(); s5.d.hp -= 10; Object.defineProperty(s5.d, 'comboHitsTaken', { value: k + 1, configurable: true }); s5.d.state = 'hit'; s5.s.afterUpdate(base); }
  assert.equal(s5.s.combo.hits, 5); assert.equal(s5.s.combo.damage, 50); assert.equal(s5.s.combo.scale, comboDamageScale(5, {}));
  assert.ok(s5.s.combo.scale < 1);
  report.combo = { best: t.s.combo.best, damage: t.s.combo.bestDamage, scale5: s5.s.combo.scale };
  checks++;
}

// 10) Input history: directions and buttons are recorded newest first with hold frames.
{
  const t = training();
  for (let i = 0; i < 5; i += 1) t.step(hold('down'));
  t.step(hold('down', 'right')); t.step(press('right', 'hp'));
  const [a, b, c] = t.s.history;
  assert.deepEqual(a.buttons, ['HP']); assert.equal(a.direction, '→');
  assert.equal(b.direction, '↘'); assert.equal(c.direction, '↓'); assert.equal(c.frames, 5);
  assert.ok(t.s.lastMove, 'last move tracked for the frame data bar');
  for (let i = 0; i < 30; i += 1) t.step(press(i % 2 ? 'lp' : 'lk'));
  assert.ok(t.s.history.length <= 14);
  checks++;
}

// 11) Menu navigation: rows cycle, values adjust, move list pages, reset/select/exit callbacks.
{
  const exits = []; const w = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel'); const s = new TrainingSession((t) => exits.push(t)); s.attach(w);
  assert.deepEqual(s.settings, DEFAULT_TRAINING_SETTINGS);
  s.toggleMenu(); assert.equal(s.menuOpen, true);
  s.updateMenu(press('right')); assert.equal(s.settings.action, 'crouch');
  s.updateMenu(press('right')); s.updateMenu(press('right')); assert.equal(s.settings.action, 'cpu'); assert.equal(w.enemy.aiLevel, 3);
  s.updateMenu(press('down')); s.updateMenu(press('right')); assert.equal(s.settings.block, 'all');
  s.updateMenu(press('right')); assert.equal(s.settings.block, 'after-first-hit');
  s.updateMenu(press('up')); assert.equal(s.menuIndex, 0); s.updateMenu(press('up')); assert.equal(TRAINING_MENU_ROWS[s.menuIndex], 'exit');
  s.menuIndex = TRAINING_MENU_ROWS.indexOf('moveList'); s.updateMenu(press('confirm')); assert.equal(s.moveListOpen, true);
  s.updateMenu(press('right')); assert.equal(s.moveListPage, 1 % Math.ceil(trainingMoveList('RYU').length / 17));
  s.updateMenu(press('back')); assert.equal(s.moveListOpen, false); assert.equal(s.menuOpen, true);
  const resets = s.resets; s.menuIndex = TRAINING_MENU_ROWS.indexOf('reset'); s.updateMenu(press('confirm')); assert.equal(s.resets, resets + 1); assert.equal(s.menuOpen, false);
  s.menuIndex = TRAINING_MENU_ROWS.indexOf('select'); s.activate(); s.menuIndex = TRAINING_MENU_ROWS.indexOf('exit'); s.activate();
  assert.deepEqual(exits, ['select', 'title']);
  // Select scene: any fighter vs any dummy including bosses.
  let started; const selInput = { ...base }; const sel = new TrainingSelectScene(selInput, new Proxy({}, { get: () => () => {} }), (x) => { started = x; }, () => {});
  assert.equal(sel.dummies.length, roster.length); assert.deepEqual([...TRAINING_SELECT_ROWS], ['player', 'dummy', 'stage', 'start', 'back']);
  sel.index = 1; for (let i = 0; i < sel.dummies.length; i += 1) { if (sel.selection.dummy.id === 'GILL') break; sel.adjust(1); }
  assert.equal(sel.selection.dummy.id, 'GILL'); sel.index = 2; sel.adjust(-1); assert.equal(sel.stageId, 5);
  sel.index = 3; Object.assign(selInput, press('confirm')); sel.fixedUpdate(1 / 60); await new Promise(setImmediate);
  assert.equal(started?.dummy.id, 'GILL'); assert.equal(started.stageId, 5);
  checks++;
}

// 12) Scene: training duel has no timer and never ends the round, START opens the menu and freezes play.
{
  const input = { ...base }, audio = new Proxy({}, { get: () => () => {} }), ryu = getCharacter('RYU');
  const scene = new Stage1Scene(input, audio, ryu, ryu.superArts[0], 3);
  const s = new TrainingSession(); scene.startTraining(s, getCharacter('GILL'));
  assert.equal(scene.phase, 'duel'); assert.equal(scene.trainingSession, s); assert.equal(scene.world.enemy.character.id, 'GILL');
  const timer0 = scene.stageTime; assert.equal(typeof timer0, 'number'); let tick = 1;
  for (let i = 0; i < 300; i += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.stageTime, timer0, 'timer frozen in training');
  s.settings.infiniteHealth = false; scene.world.enemy.hp = 0;
  for (let i = 0; i < KO_REVIVE_FRAMES + 30; i += 1) scene.fixedUpdate(1 / 60, tick++);
  assert.equal(scene.phase, 'duel', 'KO does not end training'); assert.equal(scene.world.enemy.hp, scene.world.enemy.maxHp);
  const startInput = { ...base, pressed: (k) => k === 'start' || k === 'pause', touchPressed: () => false };
  Object.assign(input, startInput); scene.fixedUpdate(1 / 60, tick++); Object.assign(input, base);
  assert.equal(s.menuOpen, true, 'START opens the training menu');
  const fx = scene.world.player.x; Object.assign(input, hold('right')); for (let i = 0; i < 20; i += 1) scene.fixedUpdate(1 / 60, tick++); Object.assign(input, base);
  assert.equal(scene.world.player.x, fx, 'menu freezes play');
  checks++;
}

if (REPORT) console.log(JSON.stringify(report, null, 1));
console.log(`V084_TRAINING_PASS checks=${checks}`);
