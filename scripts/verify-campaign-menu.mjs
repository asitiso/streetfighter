import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { TitleScene } from '../dist/assets/scenes/TitleScene.js';
import { StageSelectScene } from '../dist/assets/scenes/StageSelectScene.js';
import { GameApp } from '../dist/assets/core/GameApp.js';

class StubInput {
  constructor() { this.keys = new Set(); }
  set(...keys) { this.keys = new Set(keys); }
  pressed(key) { return this.keys.has(key); }
  touchPressed(key) { return this.keys.has(`touch:${key}`); }
  held() { return false; }
  released() { return false; }
}
class StubAudio {
  moves = 0; confirms = 0;
  unlock() { return Promise.resolve(); }
  playMenuMove() { this.moves += 1; }
  playUiConfirm() { this.confirms += 1; }
}
const fail = (message) => { console.error('CAMPAIGN_MENU_FAIL', message); process.exit(1); };
globalThis.window = { setTimeout(fn) { fn(); return 0; } };

const input = new StubInput();
const audio = new StubAudio();
let chosen = '';
const title = new TitleScene(input, audio, [
  { id: 'new-game', label: 'NEW GAME', detail: '', enabled: true, action: () => { chosen = 'new'; } },
  { id: 'continue', label: 'CONTINUE', detail: '', enabled: true, action: () => { chosen = 'continue'; } },
  { id: 'stage-select', label: 'STAGE SELECT', detail: '', enabled: false, action: () => { chosen = 'stage'; } },
]);
input.set('down'); title.fixedUpdate(1 / 60);
for (let i = 0; i < 6; i += 1) { input.set(); title.fixedUpdate(1 / 60); }
input.set('start'); title.fixedUpdate(1 / 60);
await Promise.resolve(); await Promise.resolve();
if (chosen !== '') fail('combat pause input P/START leaked into title confirm');
input.set('confirm'); title.fixedUpdate(1 / 60);
await Promise.resolve(); await Promise.resolve();
if (chosen !== 'continue') fail(`expected continue action, got ${chosen}`);

const stageInput = new StubInput();
let selectedStage = 0; let backed = false;
const stageScene = new StageSelectScene(stageInput, audio, 3, (stage) => { selectedStage = stage; }, () => { backed = true; });
stageInput.set('down'); stageScene.fixedUpdate(1 / 60);
for (let i = 0; i < 6; i += 1) { stageInput.set(); stageScene.fixedUpdate(1 / 60); }
stageInput.set('confirm'); stageScene.fixedUpdate(1 / 60);
if (selectedStage !== 4) fail(`expected stage 4 selection, got ${selectedStage}`);

const lockedStageInput = new StubInput();
let stageConfirmCount = 0;
selectedStage = 0;
const lockedStageScene = new StageSelectScene(lockedStageInput, audio, 3, (stage) => { selectedStage = stage; stageConfirmCount += 1; }, () => { backed = true; });
lockedStageInput.set('confirm'); lockedStageScene.fixedUpdate(1 / 60);
lockedStageInput.set('confirm'); lockedStageScene.fixedUpdate(1 / 60);
if (selectedStage !== 3 || stageConfirmCount !== 1) fail(`stage select double-confirm guard failed: stage=${selectedStage}, count=${stageConfirmCount}`);

const backInput = new StubInput();
const backScene = new StageSelectScene(backInput, audio, 3, () => {}, () => { backed = true; });
backInput.set('back'); backScene.fixedUpdate(1 / 60);
if (!backed) fail('stage select back action missing');

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const appSource = readFileSync(join(distRoot, 'assets/core/GameApp.js'), 'utf8');
let wiredSelection; let replayArguments; let backCalls = 0;
const fighter = { character: { id: 'KEN' }, art: { id: 2 } };
const wiredApp = {
  input: stageInput, audio, save: { stageSelectUnlocked: true, currentStage: 3 },
  scenes: { setScene: async (scene) => { wiredSelection = scene; } },
  savedFighter: () => fighter,
  startStageNumber: async (...args) => { replayArguments = args; },
  showTitle: async () => { backCalls += 1; },
};
await GameApp.prototype.showStageSelect.call(wiredApp);
const replayResult = wiredSelection.confirm(4);
if (typeof replayResult?.then !== 'function') fail('stage selection must return replay Promise');
await replayResult;
if (replayArguments?.[0] !== 4 || replayArguments[1] !== fighter.character || replayArguments[2] !== fighter.art || replayArguments[3] !== false || replayArguments[4] !== true) fail('stage select does not enter isolated replay mode');
const backResult = wiredSelection.back(4);
if (typeof backResult?.then !== 'function') fail('stage back must return title Promise');
await backResult;
if (backCalls !== 1) fail('stage back must dispatch title once');
if (!appSource.includes('replay ? this.showStageSelect()')) fail('replay clear does not return to stage select');
if (!appSource.includes('if (!replay)')) fail('replay mode still mutates campaign progression');

console.log('CAMPAIGN_MENU_VERIFY_PASS', { titleAction: chosen, pauseInputSeparated: true, selectedStage, stageConfirmCount, back: backed, isolatedReplay: true, menuMoves: audio.moves });
