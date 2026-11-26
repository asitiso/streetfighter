// V085: local VERSUS — split keyboard + two gamepads, P2 drives the duel opponent with P1's full move set
// (motions, parry, throws, throw tech, guard), best-of-3 via the round system, win screen menu, select scene.
import assert from 'node:assert/strict';
globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
let pads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads } });
const { InputManager, DEFAULT_KEY_BINDINGS, P1_VERSUS_KEY_BINDINGS, P2_VERSUS_KEY_BINDINGS, keyLabel, keysForAction } = await import('../dist/assets/input/InputManager.js');
const { CombatWorld } = await import('../dist/assets/combat/CombatWorld.js');
const { getCharacter, CHARACTERS } = await import('../dist/assets/game/characters.js');
const { VersusSession, VERSUS_RESULT_MENU_DELAY } = await import('../dist/assets/versus/VersusSession.js');
const { VersusSelectScene } = await import('../dist/assets/scenes/VersusSelectScene.js');
const { Stage1Scene, ROUNDS_TO_WIN } = await import('../dist/assets/scenes/Stage1Scene.js');

const REPORT = process.argv.includes('--report');
let checks = 0; const report = {};
const key = (type, code) => { const e = new Event(type, { cancelable: true }); Object.defineProperties(e, { code: { value: code }, repeat: { value: false } }); window.dispatchEvent(e); };
const pad = (index) => ({ index, connected: true, id: `pad${index}`, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) });
const GAMEPLAY = ['left', 'right', 'up', 'down', 'jump', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'start', 'confirm', 'back'];

function versusWorld(p1Id = 'RYU', p2Id = 'KEN', gap = 200) {
  const p1 = new InputManager({ bindings: P1_VERSUS_KEY_BINDINGS }), p2 = new InputManager({ bindings: P2_VERSUS_KEY_BINDINGS, gamepadSlot: 1 });
  const a = getCharacter(p1Id), b = getCharacter(p2Id);
  const w = new CombatWorld(a, b, 'duel', a.superArts[0], b.superArts[1]);
  w.enemyInput = p2;
  w.player.x = w.player.previousX = 520; w.enemy.x = w.enemy.previousX = 520 + gap;
  let tick = 1; const events = [];
  const step = (script) => { script?.(); p1.prepareTick(); p2.prepareTick(); w.update(p1, tick++); for (const e of w.events) if (!events.includes(e)) events.push(e); p1.endTick(); p2.endTick(); };
  const run = (frames, at = {}) => { for (let i = 0; i < frames; i += 1) step(() => { for (const [ty, c] of at[i] ?? []) key(ty, c); }); };
  return { p1, p2, w, P: w.player, E: w.enemy, step, run, events, close() { p1.destroy(); p2.destroy(); } };
}

// 1) Split keyboard layouts: no shared keys, every action bound for both players, arrows belong to P2.
{
  const codes1 = new Set(P1_VERSUS_KEY_BINDINGS.map(([c]) => c)), codes2 = new Set(P2_VERSUS_KEY_BINDINGS.map(([c]) => c));
  for (const c of codes1) assert.ok(!codes2.has(c), `key ${c} bound for both players`);
  for (const a of GAMEPLAY) { assert.ok(keysForAction(P1_VERSUS_KEY_BINDINGS, a).length, `P1 ${a}`); assert.ok(keysForAction(P2_VERSUS_KEY_BINDINGS, a).length, `P2 ${a}`); }
  assert.ok(!codes1.has('ArrowLeft') && codes2.has('ArrowLeft'));
  assert.deepEqual([keyLabel('KeyJ'), keyLabel('Numpad4'), keyLabel('ArrowUp'), keyLabel('Delete')], ['J', 'NUM 4', '↑', 'DEL']);
  const p1 = new InputManager({ bindings: P1_VERSUS_KEY_BINDINGS }), p2 = new InputManager({ bindings: P2_VERSUS_KEY_BINDINGS, gamepadSlot: 1 });
  key('keydown', 'ArrowRight'); key('keydown', 'KeyA'); key('keydown', 'Numpad6'); key('keydown', 'KeyJ');
  assert.equal(p2.held('right'), true); assert.equal(p1.held('right'), false);
  assert.equal(p1.held('left'), true); assert.equal(p2.held('left'), false);
  assert.equal(p2.held('hp'), true); assert.equal(p1.held('lp'), true); assert.equal(p2.held('lp'), false);
  for (const c of ['ArrowRight', 'KeyA', 'Numpad6', 'KeyJ']) key('keyup', c);
  // Leaving VERSUS restores the single-player layout (arrows back on P1).
  p1.setKeyBindings(DEFAULT_KEY_BINDINGS); key('keydown', 'ArrowLeft'); assert.equal(p1.held('left'), true); key('keyup', 'ArrowLeft');
  p1.destroy(); p2.destroy();
  checks++;
}

// 2) Two gamepads: first connected pad drives P1, second drives P2; touch stays P1-only.
{
  const p1 = new InputManager({ bindings: P1_VERSUS_KEY_BINDINGS }), p2 = new InputManager({ bindings: P2_VERSUS_KEY_BINDINGS, gamepadSlot: 1 });
  const a = pad(0), b = pad(2); pads = [a, null, b];
  b.axes[0] = -1; b.buttons[3].pressed = true; a.buttons[0].pressed = true;
  p1.prepareTick(); p2.prepareTick();
  assert.equal(p2.held('left'), true); assert.equal(p2.held('hp'), true); assert.equal(p2.held('lp'), false);
  assert.equal(p1.held('lp'), true); assert.equal(p1.held('left'), false);
  p1.endTick(); p2.endTick();
  pads = [b]; p1.prepareTick(); p2.prepareTick();
  assert.equal(p1.held('left'), true, 'single pad belongs to P1'); assert.equal(p2.held('left'), false);
  p1.setTouch('right', true); assert.equal(p1.held('right'), true); assert.equal(p2.held('right'), false, 'touch is P1-only');
  p1.setTouch('right', false); pads = [];
  p1.prepareTick(); p2.prepareTick(); p1.destroy(); p2.destroy();
  checks++;
}

// 3) P2 walks, jumps and uses normals; the CPU brain stays off.
{
  const t = versusWorld(); const x0 = t.E.x;
  t.run(60); assert.equal(t.E.x, x0, 'no input -> P2 stands still (no AI)'); assert.equal(t.E.aiLevel, 0);
  t.run(20, { 0: [['keydown', 'ArrowLeft']], 19: [['keyup', 'ArrowLeft']] }); assert.ok(t.E.x < x0 - 30, 'P2 walks forward');
  const t3 = versusWorld(); let air = false;
  for (let i = 0; i < 30; i += 1) { t3.run(1, i === 0 ? { 0: [['keydown', 'ArrowUp']] } : i === 2 ? { 0: [['keyup', 'ArrowUp']] } : {}); if (t3.E.airborne) air = true; }
  assert.ok(air, 'P2 jumps');
  const t4 = versusWorld(); let move = null;
  for (let i = 0; i < 6; i += 1) { t4.run(1, i === 0 ? { 0: [['keydown', 'Numpad6']] } : i === 1 ? { 0: [['keyup', 'Numpad6']] } : {}); move ??= t4.E.currentMove; }
  assert.equal(move?.button, 'hp', 'P2 heavy punch');
  for (const x of [t, t3, t4]) x.close();
  checks++;
}

// 4) Motion inputs for P2 (facing left: ↓ ↙ ← + P) from the keyboard and from the second gamepad.
{
  const watch = (t) => { t.seen = { projectiles: 0, specials: new Set() }; return () => { if (t.w.projectiles.some((p) => p.owner === t.E)) t.seen.projectiles++; if (t.E.currentMove && !t.E.currentMove.button) t.seen.specials.add(t.E.currentMove.id); }; };
  const kb = versusWorld('RYU', 'KEN', 320); const kbWatch = watch(kb);
  const at = { 0: [['keydown', 'ArrowDown']], 3: [['keydown', 'ArrowLeft']], 6: [['keyup', 'ArrowDown']], 9: [['keydown', 'Numpad4']], 10: [['keyup', 'Numpad4'], ['keyup', 'ArrowLeft']] };
  for (let i = 0; i < 40; i += 1) { kb.run(1, { 0: at[i] ?? [] }); kbWatch(); }
  const gp = versusWorld('RYU', 'KEN', 320); const gpWatch = watch(gp); const b = pad(1); pads = [pad(0), b];
  const seq = [[0, 1], [-1, 1], [-1, 1], [-1, 0], [-1, 0]];
  for (let i = 0; i < 40; i += 1) {
    const [x, y] = seq[Math.floor(i / 3)] ?? [0, 0]; b.axes[0] = x; b.axes[1] = y; b.buttons[0].pressed = i === 12 || i === 13;
    gp.step(); gpWatch();
  }
  pads = [];
  report.motion = { keyboard: { projectileFrames: kb.seen.projectiles, specials: [...kb.seen.specials] }, gamepad: { projectileFrames: gp.seen.projectiles, specials: [...gp.seen.specials] } };
  assert.ok(kb.seen.projectiles > 0, `P2 keyboard hadoken ${JSON.stringify(report.motion)}`);
  assert.ok(gp.seen.projectiles > 0, `P2 gamepad hadoken ${JSON.stringify(report.motion)}`);
  kb.close(); gp.close();
  checks++;
}

// 5) P2 guard (hold back = right) and parry (tap forward = left) against P1's heavy punch.
{
  // Cornered so walking back cannot leave range (guard is judged at contact, like P1's).
  const g = versusWorld('RYU', 'KEN', 80); g.P.x = g.P.previousX = g.w.rules.arenaRight - 82; g.E.x = g.E.previousX = g.w.rules.arenaRight - 8; const hp = g.E.hp; let blocked = false;
  const gAt = { 0: [['keydown', 'KeyL']], 1: [['keyup', 'KeyL']], 2: [['keydown', 'ArrowRight']], 39: [['keyup', 'ArrowRight']] };
  for (let i = 0; i < 40; i += 1) { g.run(1, { 0: gAt[i] ?? [] }); if (g.E.state === 'block') blocked = true; }
  assert.ok(blocked, 'P2 blocks by holding back'); assert.equal(g.E.hp, hp);
  const pr = versusWorld('RYU', 'KEN', 80); const hp2 = pr.E.hp;
  pr.run(40, { 0: [['keydown', 'KeyL']], 1: [['keyup', 'KeyL']], 5: [['keydown', 'ArrowLeft']], 6: [['keyup', 'ArrowLeft']] });
  assert.ok(pr.events.some((e) => e.type === 'parry' || e.type === 'red-parry'), 'P2 parries'); assert.equal(pr.E.hp, hp2);
  g.close(); pr.close();
  checks++;
}

// 6) Throws: P2 throws P1 (LP+LK), and P2 techs P1's throw.
{
  const th = versusWorld('RYU', 'KEN', 60); const hp = th.P.hp; let threw = false;
  for (let i = 0; i < 60; i += 1) { th.run(1, i === 0 ? { 0: [['keydown', 'Numpad4'], ['keydown', 'Numpad7']] } : i === 1 ? { 0: [['keyup', 'Numpad4'], ['keyup', 'Numpad7']] } : {}); if (th.E.currentMove?.level === 'throw') threw = true; }
  assert.ok(threw, 'P2 starts a throw'); assert.ok(th.P.hp < hp, 'P1 takes throw damage');
  const tech = versusWorld('RYU', 'KEN', 60);
  tech.run(40, { 0: [['keydown', 'KeyJ'], ['keydown', 'KeyU']], 1: [['keyup', 'KeyJ'], ['keyup', 'KeyU']], 2: [['keydown', 'Numpad4'], ['keydown', 'Delete'], ['keydown', 'Insert']], 3: [['keyup', 'Numpad4'], ['keyup', 'Delete'], ['keyup', 'Insert']] });
  assert.ok(tech.events.some((e) => e.type === 'throw-escape'), 'P2 throw tech');
  report.throws = { p1HpAfterThrow: th.P.hp, max: th.P.maxHp };
  th.close(); tech.close();
  checks++;
}

// 7) Super arts: each player's pick is used; P2's super works from P2 input.
{
  const t = versusWorld('RYU', 'CHUNLI', 200);
  assert.equal(t.P.selectedSuperArt.id, 1); assert.equal(t.E.selectedSuperArt.id, 2);
  assert.equal(t.E.superGaugeMax, getCharacter('CHUNLI').superArts[1].gauge * getCharacter('CHUNLI').superArts[1].stocks);
  t.close();
  checks++;
}

// 8) Scene: best-of-3 using the round system, P1/P2 tags, win screen menu (either player), rematch / select / title.
const stub = () => ({ held: () => false, pressed: () => false, released: () => false, historyEpoch: 0, directionChanges: () => [], touchPressed: () => false, resetCommandHistory() {} });
function versusScene(winnerSide, exits) {
  const p1 = stub(), p2 = stub(), audio = new Proxy({}, { get: () => () => {} });
  const a = getCharacter('RYU'), b = getCharacter('RYU');
  const sel = { p1: a, p1Art: a.superArts[2], p2: b, p2Art: b.superArts[0], stageId: 2 };
  const session = new VersusSession(sel, p2, (target) => exits.push(target));
  const scene = new Stage1Scene(p1, audio, a, sel.p1Art, 2);
  scene.startVersus(session);
  let tick = 1; const stepN = (n) => { for (let i = 0; i < n; i += 1) scene.fixedUpdate(1 / 60, tick++); };
  return { p1, p2, scene, session, stepN };
}
{
  const exits = []; const v = versusScene('p1', exits);
  assert.equal(v.scene.phase, 'duel'); assert.equal(v.scene.world.enemy.aiLevel, 0); assert.equal(v.scene.world.enemyInput, v.p2);
  assert.equal(v.scene.world.player.selectedSuperArt.id, 3);
  v.stepN(5); const stage0 = v.scene.stageTime; v.stepN(60); assert.ok(v.scene.stageTime < stage0, 'round timer runs in versus');
  for (let r = 0; r < ROUNDS_TO_WIN; r += 1) {
    v.scene.world.enemy.hp = 0; v.stepN(1);
    if (r < ROUNDS_TO_WIN - 1) { assert.equal(v.session.result, null); v.stepN(600); assert.equal(v.scene.world.enemy.hp, v.scene.world.enemy.maxHp, 'next round refills life'); assert.equal(v.scene.world.enemyInput, v.p2, 'P2 keeps control next round'); }
  }
  assert.deepEqual(v.session.result && [v.session.result.winner, v.session.result.p1Rounds, v.session.result.p2Rounds], ['p1', 2, 0]);
  assert.deepEqual(v.session.score, { p1: 1, p2: 0 });
  v.p2.pressed = (k) => k === 'down'; v.stepN(5); assert.equal(v.session.menuIndex, 0, 'menu waits for the banner');
  v.p2.pressed = () => false; v.stepN(VERSUS_RESULT_MENU_DELAY);
  v.p2.pressed = (k) => k === 'down'; v.stepN(1); v.p2.pressed = () => false; assert.equal(v.session.menuIndex, 1, 'P2 can drive the menu');
  v.p1.pressed = (k) => k === 'confirm'; v.stepN(1); v.p1.pressed = () => false; await new Promise(setImmediate);
  assert.deepEqual(exits, ['select']);
  assert.equal(v.scene.phase, 'duel', 'no campaign clear/defeat routing');
  // P2 wins 2-1 (time over decides the middle round) and the rematch option is first.
  const exits2 = []; const w = versusScene('p2', exits2);
  w.scene.world.player.hp = 0; w.stepN(1); w.stepN(600);
  w.scene.world.enemy.hp = 200; w.scene.stageTime = .01; w.stepN(2); assert.equal(w.session.result, null); w.stepN(600);
  w.scene.world.player.hp = 0; w.stepN(1);
  assert.deepEqual([w.session.result.winner, w.session.result.p1Rounds, w.session.result.p2Rounds], ['p2', 1, 2]);
  w.stepN(VERSUS_RESULT_MENU_DELAY); w.p2.pressed = (k) => k === 'lp'; w.stepN(1); await new Promise(setImmediate);
  assert.deepEqual(exits2, ['rematch']);
  // P2 START pauses the match.
  const pz = versusScene('p1', []); pz.stepN(3); pz.p2.pressed = (k) => k === 'start'; pz.stepN(1); pz.p2.pressed = () => false;
  const x = pz.scene.world.enemy.x, t0 = pz.scene.stageTime; pz.stepN(30); assert.equal(pz.scene.stageTime, t0, 'P2 start pauses');
  report.scene = { p1: v.session.result, p2: w.session.result };
  checks++;
}

// 9) Select scene: simultaneous picks, Super Art choice, stage pick once both are ready, P1 back -> title.
{
  const p1 = stub(), p2 = stub(); let started = null, backs = 0;
  const sel = new VersusSelectScene(p1, p2, new Proxy({}, { get: () => () => {} }), (s) => { started = s; }, () => { backs++; });
  sel.enter();
  const press = (inp, k) => { inp.pressed = (x) => x === k; sel.fixedUpdate(1 / 60); inp.pressed = () => false; };
  press(p1, 'right'); press(p2, 'left'); press(p2, 'left');
  assert.equal(sel.selection.p1.id, CHARACTERS[1].id); assert.equal(sel.selection.p2.id, CHARACTERS[CHARACTERS.length - 1].id);
  press(p1, 'confirm'); press(p1, 'right'); press(p1, 'right'); press(p1, 'confirm');
  assert.equal(sel.picks.p1.step, 'ready'); assert.equal(sel.selection.p1Art.id, 3);
  press(p1, 'left'); assert.equal(sel.selection.p1.id, CHARACTERS[1].id, 'ready P1 is locked');
  press(p2, 'lp'); press(p2, 'lp'); assert.equal(sel.bothReady, true);
  press(p2, 'right'); press(p2, 'right'); assert.equal(sel.stageId, 3);
  press(p2, 'lk'); assert.equal(sel.bothReady, false, 'back un-readies'); press(p1, 'confirm'); press(p2, 'confirm');
  press(p1, 'start'); await new Promise(setImmediate);
  assert.equal(started?.stageId, 3); assert.equal(started.p2Art.id, 1); assert.equal(started.p1Art.id, 3);
  const sel2 = new VersusSelectScene(p1, p2, new Proxy({}, { get: () => () => {} }), () => {}, () => { backs++; }, started);
  assert.equal(sel2.selection.p1.id, started.p1.id, 'character select remembers picks'); assert.equal(sel2.stageId, 3);
  p1.pressed = (x) => x === 'back'; sel2.fixedUpdate(1 / 60); p1.pressed = () => false; await new Promise(setImmediate);
  assert.equal(backs, 1);
  checks++;
}

// Both players get the same input window before the next round goes live.
for (const remaining of [1, 3, 6, 7]) {
  const { p1, p2, scene, stepN } = versusScene('p1', []);
  scene.startNextDuelRound();
  stepN(scene.roundAnnounceFrames - remaining);
  const { player, enemy } = scene.world;
  const clock = scene.stageTime;
  p1.pressed = (action) => action === 'lp';
  p2.pressed = (action) => action === 'hp';
  stepN(1);
  p1.pressed = p2.pressed = () => false;
  stepN(remaining - 1);
  assert.equal(player.currentMove, null, 'P1 must stay idle while the announcement is active');
  assert.equal(enemy.currentMove, null, 'P2 must stay idle while the announcement is active');
  assert.equal(scene.stageTime, clock, 'The timer must stay frozen during the announcement');
  stepN(1);
  assert.equal(player.currentMove?.button, remaining <= 6 ? 'lp' : undefined, 'P1 ready-window behavior');
  assert.equal(enemy.currentMove?.button, remaining <= 6 ? 'hp' : undefined, 'P2 must buffer the same late tap as P1');
  checks++;
}

if (REPORT) console.log(JSON.stringify(report, null, 1));
console.log(`V085_VERSUS_PASS checks=${checks}`);
