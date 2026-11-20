import assert from 'node:assert/strict';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { TitleScene } from '../dist/assets/scenes/TitleScene.js';
import { CharacterSelectScene } from '../dist/assets/scenes/CharacterSelectScene.js';
import { SuperArtSelectScene } from '../dist/assets/scenes/SuperArtSelectScene.js';
import { StageSelectScene } from '../dist/assets/scenes/StageSelectScene.js';
import { EndingScene } from '../dist/assets/scenes/EndingScene.js';
import { ResultsScene } from '../dist/assets/scenes/ResultsScene.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { SceneManager } from '../dist/assets/core/SceneManager.js';
import { CHARACTERS } from '../dist/assets/game/characters.js';
globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
let pad;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [pad] } });
const audio = { unlock: () => Promise.resolve(), playStagePulse() {}, playUiConfirm() {}, playMenuMove() {}, playHit() {}, playParry() {} };
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function device() {
 pad = { axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
 const input = new InputManager();
 const edge = (source, down, repeat = false) => {
  if (source === 'touch') input.setTouch('start', down);
  else if (source === 'gamepad') pad.buttons[9].pressed = down;
  else { const e = new Event(down ? 'keydown' : 'keyup', { cancelable: true }); Object.defineProperties(e, { code: { value: source }, repeat: { value: repeat } }); window.dispatchEvent(e); }
 };
 return { input, edge };
}
function sceneFor(kind, input, done) {
 const c = CHARACTERS[0];
 if (kind === 'ending') return new EndingScene(input, audio, c, c.superArts[0], [], done);
 if (kind === 'title') return new TitleScene(input, audio, [{ id: 'new-game', label: 'NEW GAME', detail: '', enabled: true, action: done }]);
 if (kind === 'character') return new CharacterSelectScene(input, audio, c.id, done);
 if (kind === 'art') return new SuperArtSelectScene(input, audio, c, 2, done, () => assert.fail('wrong back route'));
 if (kind === 'stage') return new StageSelectScene(input, audio, 3, done, () => assert.fail('wrong back route'));
 return new ResultsScene(input, audio, [], done);
}
let cases = 0, controls = 0;
for (const kind of ['title', 'character', 'art', 'stage', 'results', 'ending']) for (const source of ['KeyP', 'Pause', 'gamepad']) {
 const { input, edge } = device(); let calls = 0;
 edge(source, true); input.prepareTick(); input.endTick();
 const s = sceneFor(kind, input, () => calls++); s.enter();
 edge('touch', true); edge('touch', false); input.prepareTick(); s.fixedUpdate(1 / 60); input.endTick(); await flush();
 assert.equal(calls, 1, kind + '/' + source + ' fresh touch START retains its own edge');
 for (let i = 0; i < 20; i++) { input.prepareTick(); s.fixedUpdate(1 / 60); input.endTick(); await flush(); }
 assert.equal(calls, 1, 'Return/confirm remains unique'); s.exit(); s.destroy(); input.destroy(); cases++;
}
for (const kind of ['title', 'character', 'art', 'stage', 'results']) for (const source of ['KeyP', 'Pause']) {
 const { input, edge } = device(); let calls = 0; const s = sceneFor(kind, input, () => calls++); s.enter();
 edge(source, true); input.prepareTick(); s.fixedUpdate(1 / 60); input.endTick(); await flush();
 assert.equal(calls, 0, 'Existing menu keyboard pause-key separation must remain'); s.exit(); s.destroy(); input.destroy(); controls++;
}
for (const kind of ['title', 'character', 'art', 'stage', 'results', 'ending']) {
 const { input, edge } = device(); let calls = 0; edge('touch', true); input.prepareTick(); input.endTick();
 const s = sceneFor(kind, input, () => calls++); s.enter();
 for (let i = 0; i < 20; i++) { input.prepareTick(); s.fixedUpdate(1 / 60); input.endTick(); await flush(); }
 assert.equal(calls, 0, 'Pre-held touch START cannot confirm a new screen'); s.exit(); s.destroy(); input.destroy(); controls++;
}
{
 const { input, edge } = device(), manager = new SceneManager(); const c = CHARACTERS[0]; let routes = 0;
 const stage = new Stage1Scene(input, audio, c, c.superArts[0], 1); stage.introFrames = 0;
 const art = new SuperArtSelectScene(input, audio, c, 1, () => { routes++; return manager.setScene(stage); }, () => assert.fail('back'));
 const character = new CharacterSelectScene(input, audio, c.id, () => { routes++; return manager.setScene(art); });
 const title = sceneFor('title', input, () => { routes++; return manager.setScene(character); }); await manager.setScene(title);
 const step = async () => { input.prepareTick(); manager.fixedUpdate(1 / 60, 1); input.endTick(); await flush(); };
 for (const [index, next] of [character, art, stage].entries()) {
  edge('touch', true); await step(); assert.equal(manager.current, next); assert.equal(routes, index + 1);
  for (let i = 0; i < 10; i++) await step(); assert.equal(manager.current, next); assert.equal(routes, index + 1); assert.equal(stage.paused, false);
  edge('touch', false); await step();
 }
 edge('touch', true); await step(); assert.equal(stage.paused, true, 'Fresh START still pauses combat');
 manager.current.exit(); manager.current.destroy(); input.destroy(); controls++;
}
console.log(JSON.stringify({ passed: true, cases, controls, menus: 6, independentTouchEdge: true, keyboardMenuPauseSeparation: true, preHeldTouchIgnored: true, realSceneManagerBoundary: true, combatPausePreserved: true }));
