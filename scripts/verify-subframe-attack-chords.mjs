import assert from 'node:assert/strict';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { throwMoveFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';
globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); let pad;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pad ? [pad] : [] } });
const roster = [...CHARACTERS, ...BOSS_CHARACTERS], codes = { lp: 'KeyJ', mp: 'KeyK', hp: 'KeyL', lk: 'KeyU', mk: 'KeyI', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }, buttons = { lp: 0, mp: 1, hp: 3, lk: 2 };
function fixture(c, face, mode, source) {
 pad = source === 'gamepad' ? { axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) } : null;
 const input = new InputManager(), world = new CombatWorld(c, c, mode), f = world.player;
 f.x = f.previousX = 600; f.facing = face; f.superGauge = 50;
 let tick = 100, starts = 0; const startMove = f.startMove.bind(f); f.startMove = (...a) => { starts++; return startMove(...a); };
 const edge = (a, held) => {
  if (source === 'keyboard') { const e = new Event(held ? 'keydown' : 'keyup', { cancelable: true }); Object.defineProperties(e, { code: { value: codes[a] }, repeat: { value: false } }); window.dispatchEvent(e); }
  else if (source === 'gamepad' && a in buttons) pad.buttons[buttons[a]].pressed = held;
  else input.setTouch(a, held);
 };
 const motion = () => { const forward = face === 1 ? 'right' : 'left'; edge('down', true); edge(forward, true); edge('down', false); };
 const step = () => { input.prepareTick(); f.captureInput(input, tick++); f.updatePlayer(input, world.rules); input.endTick(); };
 const chord = (pair, release) => { for (const a of pair) edge(a, true); for (const [i,a] of pair.entries()) if (release === 'both' || release === String(i)) edge(a, false); };
 return { input, world, f, edge, motion, step, chord, starts: () => starts, close() { input.destroy(); } };
}
let cases = 0, controls = 0;
for (const c of roster) for (const face of [-1, 1]) for (const mode of ['belt', 'duel']) for (const source of ['touch', 'keyboard']) for (const release of ['both', '0', '1', 'neither']) for (const pair of [['lp','lk'], ['lp','mp'], ['lp','hp'], ['mp','hp']]) {
 const t = fixture(c, face, mode, source), isThrow = pair[1] === 'lk'; if (!isThrow) t.motion();
 t.chord(pair, release); t.step();
 const expected = isThrow ? throwMoveFor(c.id).id : specialMovesFor(c.id).exPrimary.id;
 assert.equal(t.f.currentMove?.id, expected, [c.id,face,mode,source,release,pair].join('/') + ' chord survives release before capture');
 assert.equal(t.f.superGauge, isThrow ? 50 : 25); assert.equal(t.starts(), 1);
 for (let i = 0; i < 3; i++) t.step(); assert.equal(t.starts(), 1, 'Held buttons cannot repeat move'); t.close(); cases++;
}
for (const c of roster) for (const face of [-1, 1]) for (const mode of ['belt', 'duel']) for (const isThrow of [false, true]) {
 const t = fixture(c, face, mode, 'gamepad'); if (!isThrow) t.motion(); t.chord(isThrow ? ['lp','lk'] : ['lp','mp'], 'neither'); t.step();
 assert.equal(t.f.currentMove?.id, isThrow ? throwMoveFor(c.id).id : specialMovesFor(c.id).exPrimary.id); t.close(); controls++;
}
for (const c of roster) for (const face of [-1, 1]) for (const mode of ['belt','duel']) {
 for (const kind of ['one-punch', 'insufficient', 'stale-press', 'wrong-pair', 'air-throw', 'air-ex', 'preheld-throw']) {
  const t = fixture(c, face, mode, 'touch');
  if (kind === 'air-throw' || kind === 'air-ex') { t.f.airborne = true; t.f.jumpHeight = 80; t.f.jumpVelocity = 2; }
  if (['one-punch', 'insufficient', 'stale-press', 'air-ex'].includes(kind)) t.motion();
  if (kind === 'insufficient') t.f.superGauge = 24;
  if (kind === 'stale-press') { t.edge('lp', true); t.edge('lp', false); t.input.prepareTick(); t.f.captureInput(t.input, 99); t.input.endTick(); t.chord(['mp'], 'both'); }
  else if (kind === 'preheld-throw') { t.chord(['lp','lk'], 'neither'); t.input.endTick(); }
  else t.chord(kind === 'one-punch' ? ['lp'] : kind === 'wrong-pair' ? ['lp','mk'] : kind === 'air-throw' ? ['lp','lk'] : ['lp','mp'], 'both');
  t.step();
  if (kind === 'preheld-throw') assert.equal(t.f.currentMove, null);
  else if (kind.startsWith('air-')) assert.equal(t.f.currentMove?.id, airNormalFor(c.id,'lp').id);
  else if (kind === 'wrong-pair') assert.notEqual(t.f.currentMove?.id, throwMoveFor(c.id).id);
  else { assert.equal(t.f.currentMove?.id, specialMovesFor(c.id).primary.id); assert.equal(t.f.superGauge, kind === 'insufficient' ? 24 : 50); }
  t.close(); controls++;
 }
}
console.log(JSON.stringify({passed:true,cases,controls,roster:10,facings:2,modes:2,shortChordSources:2,exPairs:3,releaseVariants:4,gamepadPreserved:true,noHeldRepeat:true,airAndGaugeGuards:true}));
