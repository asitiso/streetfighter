import { TitleScene } from '../dist/assets/scenes/TitleScene.js';
import { StageSelectScene } from '../dist/assets/scenes/StageSelectScene.js';

class StubInput {
  constructor() { this.keys = new Set(); }
  set(...keys) { this.keys = new Set(keys); }
  pressed(key) { return this.keys.has(key); }
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
if (chosen !== 'continue') fail(`expected continue action, got ${chosen}`);

const stageInput = new StubInput();
let selectedStage = 0; let backed = false;
const stageScene = new StageSelectScene(stageInput, audio, 3, (stage) => { selectedStage = stage; }, () => { backed = true; });
stageInput.set('down'); stageScene.fixedUpdate(1 / 60);
for (let i = 0; i < 6; i += 1) { stageInput.set(); stageScene.fixedUpdate(1 / 60); }
stageInput.set('start'); stageScene.fixedUpdate(1 / 60);
if (selectedStage !== 4) fail(`expected stage 4 selection, got ${selectedStage}`);
stageInput.set(); stageScene.fixedUpdate(1 / 60);
stageInput.set('lk'); stageScene.fixedUpdate(1 / 60);
if (!backed) fail('stage select back action missing');

console.log('CAMPAIGN_MENU_VERIFY_PASS', { titleAction: chosen, selectedStage, back: backed, menuMoves: audio.moves });
