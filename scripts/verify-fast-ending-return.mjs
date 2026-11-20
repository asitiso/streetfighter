import assert from 'node:assert/strict';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { EndingScene } from '../dist/assets/scenes/EndingScene.js';
import { CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
let pad;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [pad] } });
const audio = { playStagePulse() {} };
const codes = { start: 'KeyP', confirm: 'Enter', back: 'Escape', lp: 'KeyJ', lk: 'KeyU' };
const buttons = { start: 9, confirm: 9, back: 8, lp: 0, lk: 2 };
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
function fixture(character = CHARACTERS[0], finish) {
  pad = { axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const input = new InputManager(); let calls = 0;
  const scene = new EndingScene(input, audio, character, character.superArts[0], [], () => { calls++; return finish?.(); });
  scene.enter();
  const step = () => { input.prepareTick(); scene.fixedUpdate(1 / 60); input.endTick(); };
  const edge = (action, source, down) => {
    if (source === 'touch') input.setTouch(action, down);
    else if (source === 'gamepad') pad.buttons[buttons[action]].pressed = down;
    else { const e = new Event(down ? 'keydown' : 'keyup', { cancelable: true }); Object.defineProperties(e, { code: { value: codes[action] }, repeat: { value: false } }); window.dispatchEvent(e); }
  };
  return { input, scene, step, edge, calls: () => calls, close() { scene.exit(); scene.destroy(); input.destroy(); } };
}
let cases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) for (const source of ['touch', 'keyboard', 'gamepad']) for (const action of ['start', 'confirm', 'back', 'lp', 'lk']) {
  const f = fixture(character);
  f.edge(action, source, true); f.step();
  assert.equal(f.calls(), 1, character.id + '/' + source + '/' + action + ' must return on first tick');
  for (let i = 0; i < 20; i++) f.step();
  f.edge(action, source, false); f.step(); f.edge(action, source, true); f.step();
  assert.equal(f.calls(), 1, 'Pending/successful return cannot dispatch again'); f.close(); cases++;
}
let controls = 0;
for (const mode of ['reject', 'throw']) {
  let reject;
  const f = fixture(undefined, () => { if (f.calls() === 1) { if (mode === 'throw') throw Error('route'); return new Promise((_, j) => { reject = j; }); } });
  f.edge('start', 'touch', true); f.edge('start', 'touch', false); f.step();
  if (mode === 'reject') { f.edge('lp', 'touch', true); f.edge('lp', 'touch', false); f.step(); assert.equal(f.calls(), 1); reject(Error('route')); }
  await flush(); assert.match(f.scene.returnError, /FAILED/); assert.equal(f.scene.returning, false);
  for (let i = 0; i < 20; i++) f.step(); assert.equal(f.calls(), 1);
  f.edge('start', 'touch', true); f.edge('start', 'touch', false); f.step(); await flush(); assert.equal(f.calls(), 2); assert.equal(f.scene.returnError, ''); f.close(); controls++;
}
for (const lifecycle of ['exit', 'destroy']) {
  let reject; const f = fixture(undefined, () => new Promise((_, j) => { reject = j; }));
  f.edge('start', 'touch', true); f.edge('start', 'touch', false); f.step();
  f.scene[lifecycle](); f.scene.enter(); reject(Error('old route')); await flush();
  assert.equal(f.scene.returnError, ''); assert.equal(f.scene.returning, false);
  f.edge('start', 'touch', true); f.edge('start', 'touch', false); f.step(); assert.equal(f.calls(), 2); f.close(); controls++;
}
{
 const f = fixture(); f.edge('lp', 'touch', true); f.input.endTick(); for (let i = 0; i < 420; i++) f.step(); assert.equal(f.calls(), 0, 'Held input must not skip ending'); f.close(); controls++;
}
{
 const f = fixture(); const labels = []; const ctx = new Proxy({}, { get: (o, k) => k === 'fillText' ? text => labels.push(text) : (() => {}), set: (o,k,v) => {o[k]=v;return true;} });
 f.scene.drawPrompt(ctx); assert(labels.some(t => /START/.test(t))); f.close(); controls++;
}
console.log(JSON.stringify({ passed: true, cases, controls, firstTickReturn: true, heldDoesNotSkip: true, failureRetry: true, staleCallbackIgnored: true }));
