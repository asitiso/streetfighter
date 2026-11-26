import assert from'node:assert/strict';import{StageSelectScene}from'../dist/assets/scenes/StageSelectScene.js';import{SceneManager}from'../dist/assets/core/SceneManager.js';const q={pressed:()=>false,touchPressed:()=>false},audio={unlock:async()=>{},playMenuMove(){},playUiConfirm(){}};let cases=0;for(let stage=1;stage<=5;stage++){const modes=[],confirmed=[],scene=new StageSelectScene(q,audio,stage,s=>confirmed.push(s),()=>{},undefined,false,active=>modes.push(active));scene.enter();assert.deepEqual(modes,[true],'Stage selection must enter compact controls');scene.fixedUpdate(1/60);assert.equal(confirmed.length,0);scene.input={...q,pressed:k=>k==='confirm'};scene.fixedUpdate(1/60);assert.deepEqual(confirmed,[stage]);scene.exit();scene.destroy();assert.deepEqual(modes,[true,false,false]);cases++;}
{const modes=[],manager=new SceneManager(),selection=new StageSelectScene(q,audio,4,()=>{},()=>{},undefined,false,active=>modes.push(active));await manager.setScene(selection);await manager.setScene({enter(){},exit(){},destroy(){},resize(){},fixedUpdate(){},render(){}});assert.deepEqual(modes,[true,false,false]);cases++;}
{const modes=[],manager=new SceneManager(),selection=new StageSelectScene(q,audio,5,()=>{},()=>{},undefined,false,active=>modes.push(active));await manager.setScene(selection);await assert.rejects(manager.setScene({enter(){throw Error('controlled load failure');},exit(){},destroy(){},resize(){},fixedUpdate(){},render(){}}));await manager.recoverIfEmpty(()=>new StageSelectScene(q,audio,5,()=>{},()=>{},undefined,true,active=>modes.push(active)));assert.equal(manager.activeScene.index,4);assert.match(manager.activeScene.errorMessage,/RETRY/);assert.equal(modes.at(-1),true);cases++;}
console.log('STAGE_SELECT_CONTROLS_PASS',{cases,stages:5,lifecycle:true,recovery:true});
let cancelPriorityCases=0;
for(const stage of [1,2,3,4,5])for(const confirm of ['confirm','lp','mp','hp','touch-start'])for(const back of ['back','lk','hk']){
 const input={pressed:a=>a===confirm||a===back,touchPressed:a=>confirm==='touch-start'&&a==='start'};let plays=0,returns=0;const s=new StageSelectScene(input,audio,stage,()=>plays++,selected=>{returns++;assert.equal(selected,stage);});s.fixedUpdate(1/60);s.fixedUpdate(1/60);assert.equal(plays,0,'Back must cancel simultaneous stage launch');assert.equal(returns,1,'One pending return only');cancelPriorityCases++;
}
console.log('STAGE_CANCEL_PRIORITY_PASS',{cancelPriorityCases});
import { GameApp } from '../dist/assets/core/GameApp.js';
import { getCharacter } from '../dist/assets/game/characters.js';
const fighter = getCharacter('RYU');
for (const replayStage of [1, 2, 3, 4, 5]) {
  const campaignStage = replayStage === 5 ? 2 : 5;
  const app = Object.create(GameApp.prototype);
  const save = { stageSelectUnlocked: true, currentStage: campaignStage, completedStages: [1, 2, 3, 4, 5], stageResults: [] };
  const recorded = [];
  Object.assign(app, {
    input: q, audio: { ...audio, playStagePulse() {} }, save, touch: { setSelectionMode() {}, setPostCombatMode() {}, setPaused() {} },
    scenes: new SceneManager(),
    loadStageModule: async (_group, load) => load(),
    enterLoadedScene: async (create) => { await app.scenes.setScene(create()); },
    recordStageResult: async (result) => { recorded.push(result); },
  });
  await app.startStageNumber(replayStage, fighter, fighter.superArts[0], false, true);
  const replay = app.scenes.activeScene;
  const labels = [];
  const canvas = new Proxy({}, {
    get: (_, key) => key === 'fillText' ? text => labels.push(text)
      : key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {},
  });
  replay.phase = 'clear';
  replay.phaseFrames = 0;
  replay.drawStageClear(canvas);
  assert(labels.includes('STAGE CLEAR'), 'Replay clears one stage');
  assert(labels.some(label => label.includes('RETURNING TO STAGE SELECT')), 'Replay clear must name its actual destination');
  assert(labels.every(label => !/NEXT STAGE READY|ENDING ROUTE OPEN|TRANSFERRING TO ENDING/.test(label)),
    'Replay must not advertise a campaign transition');
  replay.routeError = 'SAVE FAILED';
  labels.length = 0;
  replay.drawStageClear(canvas);
  assert(labels.every(label => !label.includes('RETURNING TO STAGE SELECT')), 'A failed clear cannot claim to be returning');
  await replay.onClear({ stageId: replayStage });
  assert.equal(app.scenes.activeScene.index + 1, replayStage, 'Replay returns focus to the just-cleared stage');
  assert.deepEqual(recorded, [{ stageId: replayStage }]);
  assert.equal(save.currentStage, campaignStage, 'Replay must preserve campaign position');
  await app.showStageSelect();
  assert.equal(app.scenes.activeScene.index + 1, campaignStage, 'Opening from title still uses the campaign position');
}
console.log('STAGE_REPLAY_SELECTION_PASS', { stages: 5 });

let replayLayoutCases = 0;
for (const stage of [1, 2, 3, 4, 5]) {
  const scene = new StageSelectScene(q, audio, stage, () => {}, () => {}, undefined, true);
  scene.enter();
  for (const compact of [false, true]) {
    const rows = [];
    const labels = new Map();
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'roundRect' ? (x, y, w, h) => rows.push(y + h)
        : key === 'fillText' ? (label, x, y) => labels.set(label, y)
        : key === 'createLinearGradient' ? () => ({addColorStop() {}})
        : () => {},
    });
    scene.render({ctx, width: 1280, height: 720, compactTouchControls: compact});
    assert.equal(rows.length, 5);
    assert.equal(rows.at(-1), compact ? 538 : 583);
    assert.equal(labels.get(compact ? '← → SELECT • CONFIRM: PLAY • BACK: TITLE' : 'ARROWS: SELECT • CONFIRM: PLAY • BACK: TITLE'),
      compact ? 527 : 570);
    assert.equal(labels.get('OPEN FAILED • RETRY OR CHOOSE ANOTHER STAGE'), 166);
    assert(labels.has('STAGE ' + stage));
    replayLayoutCases++;
  }
  scene.exit();
}
console.log('COMPACT_STAGE_REPLAY_FOOTER_PASS', {replayLayoutCases});
