import assert from 'node:assert/strict';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {ResultsScene} from '../dist/assets/scenes/ResultsScene.js';
import {GameApp} from '../dist/assets/core/GameApp.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});let cases=0;
function fixture() {
  const input = new InputManager(), classes = new Set(), start = { textContent: 'START' };
  let layouts = 0;
  const control = Object.create(TouchControls.prototype);
  Object.assign(control, {
    input, recordsMode: false, paused: false,
    settings: { stickScale: 1.4, buttonScale: .7, stickX: 64, stickY: 48, buttonsX: 52, buttonsY: 44 },
    element: {
      querySelector: selector => selector === '.start-button' ? start : null,
      classList: { toggle(k, on) { if (on) classes.add(k); else classes.delete(k); } },
    },
    pointerPoints: new Map(), buttonPointers: new Map(), dpadActions: [], directionPressed: null,
    dpadPointerId: null, drag: null, applySettings() { layouts++; },
  });
  return { input, control, classes, layouts: () => layouts, close: () => input.destroy() };
}
for(const close of ['exit','destroy']){const f=fixture();const scene=new ResultsScene({}, {playStagePulse(){}},[],()=>{},undefined,0,false,active=>f.control.setRecordsMode(active));scene.enter();assert(f.classes.has('records-mode'),'Result entry must select record controls');scene[close]();assert(!f.classes.has('records-mode'));f.close();cases++;}
{const f=fixture(),before=f.control.getSettings();for(const action of ['lp','start','left'])f.input.setTouch(action,true);f.control.setRecordsMode(true);for(const action of ['lp','start','left']){assert.equal(f.input.touchHeld(action),false);assert.equal(f.input.pressed(action),false);}f.input.setTouch('right',true);f.control.setRecordsMode(true);assert.equal(f.input.touchHeld('right'),true,'Idempotent mode update must not interrupt a new touch');f.control.setRecordsMode(false);assert.equal(f.input.touchHeld('right'),false);assert.equal(f.input.pressed('right'),false);assert.deepEqual(f.control.getSettings(),before);assert.equal(f.layouts(),2);f.close();cases++;}
{const f=fixture();const e=new Event('keydown',{cancelable:true});Object.defineProperties(e,{code:{value:'KeyJ'},repeat:{value:false}});window.dispatchEvent(e);f.control.setRecordsMode(true);assert.equal(f.input.held('lp'),true,'Mode changes preserve held keyboard input');assert.equal(f.input.pressed('lp'),false);f.input.setTouch('right',true);f.input.setTouch('right',false);f.input.prepareTick();assert.equal(f.input.pressed('right'),true,'Fresh navigation must work on first tick');f.close();cases++;}
{const f=fixture();let captured;const fake={save:{stageResults:[{stageId:1}]},input:{},audio:{playStagePulse(){}},touch:f.control,scenes:{setScene:async s=>captured=s}};await GameApp.prototype.showResults.call(fake);captured.enter();assert(f.classes.has('records-mode'));captured.exit();captured.destroy();assert(!f.classes.has('records-mode'));assert.equal(f.layouts(),2);f.close();cases++;}
{
  const f = fixture();
  const { getCharacter } = await import('../dist/assets/game/characters.js');
  const p1 = getCharacter('RYU'), p2 = getCharacter('KEN');
  const selection = { p1, p2, p1Art: p1.superArts[0], p2Art: p2.superArts[0], stageId: 1 };
  let captured;
  const app = {
    input: f.input, touch: f.control, audio: new Proxy({}, { get: () => () => {} }),
    enterVersusInput: () => ({}), prepareLiteMatchCharacters() {},
    loadStageModule: async (_group, load) => load(),
    enterLoadedScene: async (create) => { captured = create(); captured.enter(); },
  };
  await GameApp.prototype.startVersus.call(app, selection);
  f.input.setTouch('start', true);
  captured.finishVersusMatch('ko');
  assert(f.classes.has('records-mode'), 'Versus results must show the directional footer');
  assert(!f.classes.has('post-combat-mode'), 'The single-button campaign footer hides Versus navigation');
  assert(!f.input.touchHeld('start'), 'A combat touch cannot leak into Versus results');
  const helpLabels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? text => helpLabels.push(text) : () => {} });
  captured.drawHelp(ctx);
  assert.deepEqual(helpLabels, [], 'Combat help must leave the result footer unobstructed');
  captured.exit();
  captured.destroy();
  assert(!f.classes.has('records-mode'), 'Versus result controls must release when the scene exits');
  f.close();
  cases++;
}
console.log(JSON.stringify({passed:true,cases,lifecycleCases:2,modeInputAndSettings:1,keyboardAndFirstTick:1,gameAppWiring:2}));

const savedScore = {latest: 4650, best: 5000};
for (const view of ['none', 'scores-only', 'mixed']) {
  const save = {
    stageResults: view === 'mixed' ? [{stageId: 5, beltScore: 4600}] : [],
    stageScoreRecords: view === 'none' ? {} : {5: savedScore},
  };
  let scene, returned = false;
  const app = {
    save,
    input: {},
    audio: {playStagePulse() {}},
    touch: {setRecordsMode() {}},
    scenes: {setScene(value) { scene = value; }},
    showTitle() { returned = true; },
  };
  await GameApp.prototype.showResults.call(app);
  if (view === 'none') {
    assert(returned);
    assert.equal(scene, undefined);
    continue;
  }
  assert(scene instanceof ResultsScene);
  assert.deepEqual(scene.scores[5], savedScore);
  const labels = [];
  const ctx = new Proxy({}, {get: (_, key) => key === 'fillText' ? text => labels.push(text) : () => {}});
  scene.drawStageTable(ctx, true);
  assert(labels.includes('4650') && labels.includes('5000'));
  if (view === 'scores-only') {
    labels.length = 0;
    scene.drawTotals(ctx);
    assert.deepEqual(labels, ['NO COMBAT TOTALS YET']);
  }
}
console.log('SAVED_SCORE_ARCHIVE_PASS');
