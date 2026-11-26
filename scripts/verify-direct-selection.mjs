import assert from 'node:assert/strict';
import {CharacterSelectScene} from '../dist/assets/scenes/CharacterSelectScene.js';
import {SuperArtSelectScene} from '../dist/assets/scenes/SuperArtSelectScene.js';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
const q={pressed:()=>false,touchPressed:()=>false},audio={unlock:()=>Promise.resolve(),playMenuMove(){},playUiConfirm(){},startFrontendTheme(){},stopFrontendTheme(){}};
let selections=0,arts=0,backs=0;
for(const [i,c]of CHARACTERS.entries()){const chosen=[];const scene=new CharacterSelectScene(q,audio,'RYU',c=>chosen.push(c.id));assert.equal(typeof scene.pointerTap,'function','Character cards must accept intentional direct touch');const x=52+i%4*168+77,y=180+Math.floor(i/4)*198+91;scene.pointerTap(x,y);assert.equal(scene.index,i);assert.equal(chosen.length,0,'First tap previews even initial selected card');scene.pointerTap(x,y);assert.deepEqual(chosen,[c.id]);scene.pointerTap(x,y);assert.equal(chosen.length,1,'Pending route cannot double-confirm');selections++;}
for(const c of CHARACTERS)for(let i=0;i<3;i++){const chosen=[];const scene=new SuperArtSelectScene(q,audio,c,1,a=>chosen.push(a.id),()=>{});assert.equal(typeof scene.pointerTap,'function');scene.pointerTap(900,152+i*160+65);assert.equal(scene.selected,i);assert.equal(chosen.length,0);scene.pointerTap(900,152+i*160+65);assert.deepEqual(chosen,[i+1]);arts++;}
{const scene=new CharacterSelectScene(q,audio,'KEN',()=>{});for(const[x,y]of[[51,200],[210,200],[52,170],[300,370],[1000,200]]){const i=scene.index;scene.pointerTap(x,y);assert.equal(scene.index,i,'Gaps and portrait cannot select a fighter');}}
{const input={...q,pressed:a=>a==='lk'};const s=new CharacterSelectScene(input,audio,'KEN',()=>{},undefined,false,undefined,()=>backs++);s.fixedUpdate(1/60);assert.equal(backs,1);}
let gestureCases=0;const scene={pointerTap:(x,y)=>{scene.last=[x,y];}},app=Object.create(GameApp.prototype);Object.assign(app,{scenes:{activeScene:scene},canvas:{getBoundingClientRect:()=>({left:20,top:10,width:1600,height:1000})},cssWidth:1600,cssHeight:1000,logicalWidth:1280,logicalHeight:720,viewScale:1.25,playbackBlocked:false,loadingOverlay:{classList:{contains:()=>true}},menuPointer:null});
assert.equal(typeof app.handleMenuPointer,'function','Canvas menu gestures must share real render coordinates');
const event=(x,y,id=1)=>({pointerId:id,button:0,clientX:x,clientY:y});
app.handleMenuPointer(event(181.25,398.75),'down');app.handleMenuPointer(event(181.25,398.75),'up');assert.deepEqual(scene.last,[129,271]);gestureCases++;
for(const kind of['cancel','drag','scene','foreign','letterbox']){scene.last=null;app.scenes.activeScene=scene;app.handleMenuPointer(event(181.25,398.75),'down');if(kind==='cancel')app.handleMenuPointer(event(181.25,398.75),'cancel');if(kind==='drag')app.handleMenuPointer(event(250,400),'move');if(kind==='scene')app.scenes.activeScene={pointerTap:()=>assert.fail('Old pointer cannot operate new screen')};if(kind==='foreign'){app.handleMenuPointer(event(300,400,2),'cancel');app.handleMenuPointer(event(300,400,2),'up');assert.equal(scene.last,null);app.handleMenuPointer(event(181.25,398.75),'cancel');}if(kind==='letterbox'){app.handleMenuPointer(event(181.25,398.75),'cancel');app.handleMenuPointer(event(100,20),'down');app.handleMenuPointer(event(100,20),'up');}app.handleMenuPointer(event(181.25,398.75),'up');assert.equal(scene.last,null,kind+' cannot select');gestureCases++;}
console.log('DIRECT_SELECTION_PASS',{selections,arts,backs,gestureCases});

let retryCases=0;
{let attempts=0;const s=new CharacterSelectScene(q,audio,'KEN',()=>{if(++attempts===1)throw Error('save blocked');});s.pointerTap(297,271);s.pointerTap(297,271);assert.equal(s.transitioning,false);assert(s.errorMessage);s.pointerTap(297,271);assert.equal(attempts,2);retryCases++;}
{let attempts=0;const s=new SuperArtSelectScene(q,audio,CHARACTERS[1],1,()=>{if(++attempts===1)throw Error('open blocked');},()=>{});s.pointerTap(900,217);s.pointerTap(900,217);assert.equal(s.transitioning,false);assert(s.errorMessage);s.pointerTap(900,217);assert.equal(attempts,2);retryCases++;}
console.log('DIRECT_SELECTION_RETRY_PASS',{retryCases});

import {SceneManager} from '../dist/assets/core/SceneManager.js';
{const a=Object.create(GameApp.prototype);Object.assign(a,{input:q,audio,save:{selectedCharacter:'KEN'},assets:{prefetchGroup(){}},errors:{record(){}},touch:{setSelectionMode(){}},scenes:new SceneManager()});a.showTitle=async()=>{await a.scenes.setScene({enter(){throw Error('title open failed');},exit(){},destroy(){},resize(){},fixedUpdate(){},render(){}});};await a.showCharacterSelect();a.scenes.activeScene.pointerTap(129,469);a.scenes.activeScene.input={...q,pressed:k=>k==='lk'};a.scenes.activeScene.fixedUpdate(1/60);for(let n=0;n<8;n++)await new Promise(setImmediate);assert(a.scenes.activeScene instanceof CharacterSelectScene,'Failed BACK route after exit must restore usable selection');assert.equal(a.scenes.activeScene.index,4,'Recovery keeps cursor character');a.scenes.activeScene.exit();a.scenes.activeScene.destroy();console.log('DIRECT_SELECTION_BACK_RECOVERY_PASS');}

import{TitleScene}from'../dist/assets/scenes/TitleScene.js';
import {ART_ASSET_PATHS, PLAYABLE_PORTRAIT_KEYS, unloadArtAsset} from '../dist/assets/render/ImageAssets.js';
const portraitUrls = PLAYABLE_PORTRAIT_KEYS.map(key => ART_ASSET_PATHS[key]);
const warmUrls = [];
for (const key of ['title-keyart', ...PLAYABLE_PORTRAIT_KEYS]) unloadArtAsset(key);
globalThis.Image = class {
  naturalWidth = 64;
  set src(url) { warmUrls.push(url); queueMicrotask(() => this.onload?.()); }
  get src() { return ''; }
};
const title = new TitleScene(q, audio, []);
title.enter();
assert(warmUrls.includes(ART_ASSET_PATHS['title-keyart']));
for (const url of portraitUrls) assert(!warmUrls.includes(url), 'Title defers fighter portraits');
title.exit();
const roster = new CharacterSelectScene(q, audio, 'KEN', () => {});
roster.enter();
for (const url of portraitUrls) assert(warmUrls.includes(url), 'Character selection prepares ' + url);
roster.exit();
console.log('SELECTION_PORTRAIT_PREWARM_PASS');


import{TouchControls}from'../dist/assets/ui/TouchControls.js';
globalThis.document={elementFromPoint:()=>null};const menuPad=Object.create(TouchControls.prototype);Object.assign(menuPad,{selectionMode:true,recordsMode:false,element:{contains:()=>true,querySelector:()=>({getBoundingClientRect:()=>({left:0,top:0,width:152,height:44})})}});assert.deepEqual(menuPad.dpadActionsAt(76,7),[],'Menu arrow gutter must not manufacture UP');assert.deepEqual(menuPad.dpadActionsAt(76,37),[],'Menu arrow gutter must not manufacture DOWN');menuPad.selectionMode=false;assert.deepEqual(menuPad.dpadActionsAt(76,7),['up'],'Battle pad keeps diagonal gutter support');console.log('SELECTION_ARROW_GUTTER_PASS');

scene.last=null;app.scenes.activeScene=scene;app.menuPointer=null;app.handleMenuPointer(event(181.25,398.75),'down');app.handleMenuPointer({...event(300,400,2),isPrimary:false},'down');app.handleMenuPointer(event(181.25,398.75),'up');assert.equal(scene.last,null,'Ambiguous two-finger canvas gesture cannot confirm first card');console.log('DIRECT_SELECTION_MULTITOUCH_PASS');

let backgroundGestureCases=0;
for(const kind of ['hidden','pagehide','portrait'])for(const repeated of [false,true]){
 globalThis.window={matchMedia:()=>({matches:kind==='portrait'&&blocked})};globalThis.document={hidden:false};let blocked=false;
 Object.assign(app,{pageHidden:false,playbackBlocked:false,menuPointer:null,touch:{releaseAll(){}},input:{prepareTick(){},resetCommandHistory(){},endTick(){}},audio:{setBackgrounded(){}},loop:{start(){},stop(){}}});app.scenes.activeScene=scene;scene.last=null;
 app.handleMenuPointer(event(181.25,398.75),'down');blocked=true;if(kind==='hidden')document.hidden=true;if(kind==='pagehide')app.pageHidden=true;app.syncPlayback();if(repeated)app.syncPlayback();
 blocked=false;document.hidden=false;app.pageHidden=false;app.syncPlayback();app.handleMenuPointer(event(181.25,398.75),'up');assert.equal(scene.last,null,kind+' must invalidate pre-background menu touch');
 app.handleMenuPointer(event(181.25,398.75,3),'down');app.syncPlayback();app.handleMenuPointer(event(181.25,398.75,3),'up');assert.deepEqual(scene.last,[129,271],'Fresh post-resume tap works even across unblocked playback refresh');backgroundGestureCases++;
}
console.log('DIRECT_SELECTION_BACKGROUND_PASS',{backgroundGestureCases});
let superArtCancelPriorityCases=0;
for(const c of CHARACTERS)for(const art of [1,2,3])for(const confirm of ['confirm','lp','mp','hp','touch-start'])for(const back of ['back','lk']){
 let confirmations=0,returns=0;const input={pressed:a=>a===confirm||a===back,touchPressed:a=>confirm==='touch-start'&&a==='start'};
 const s=new SuperArtSelectScene(input,audio,c,art,()=>confirmations++,selected=>{returns++;assert.equal(selected.id,art);});s.fixedUpdate(1/60);
 assert.equal(confirmations,0,'Back must cancel simultaneous super-art confirmation');assert.equal(returns,1,'Back returns to fighter selection once');s.fixedUpdate(1/60);assert.equal(returns,1,'Pending return is not duplicated');superArtCancelPriorityCases++;
}
console.log('SUPER_ART_CANCEL_PRIORITY_PASS',{superArtCancelPriorityCases});let superArtConfirmControls=0;
for(const c of CHARACTERS)for(const art of [1,2,3])for(const confirm of ['confirm','lp','mp','hp','touch-start']){
 let confirmations=0;const input={pressed:a=>a===confirm,touchPressed:a=>confirm==='touch-start'&&a==='start'};const s=new SuperArtSelectScene(input,audio,c,art,selected=>{confirmations++;assert.equal(selected.id,art);},()=>assert.fail('Confirm-only cannot return'));s.fixedUpdate(1/60);s.fixedUpdate(1/60);assert.equal(confirmations,1,'Normal confirm remains immediate and single');superArtConfirmControls++;
}
console.log('SUPER_ART_CONFIRM_CONTROL_PASS',{superArtConfirmControls});
let compactRosterCases = 0;
for (const character of CHARACTERS) {
  const scene = new CharacterSelectScene(q, audio, character.id, () => {});
  for (const compact of [false, true]) {
    const labels = new Map();
    const gradient = {addColorStop() {}};
    const ctx = new Proxy({}, {
      get: (_, key) => key === 'fillText' ? (value, x, y) => labels.set(value, {x, y})
        : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient
        : () => {},
    });
    scene.render({ctx, width: 1280, height: 720, compactTouchControls: compact});
    assert.deepEqual(['SPD', 'PWR', 'RCH'].map(label => labels.get(label)?.y),
      compact ? [518, 533, 548] : [630, 647, 664]);
    assert.equal(labels.has('TAP A FIGHTER • CONFIRM TO CONTINUE'), compact);
    const style = labels.get(character.country + '  •  ' + character.style);
    const badge = ['POWER FIGHTER', 'SPEED FIGHTER', 'FOOTSIE FIGHTER', 'ALL-ROUNDER'].map(value => labels.get(value)).find(Boolean);
    if (compact) assert(badge.y <= style.y - 12, 'Compact badge stays above the style line');
    compactRosterCases++;
  }
}
console.log('COMPACT_ROSTER_FOOTER_PASS', {compactRosterCases});

let superArtFooterCases = 0;
for (const character of CHARACTERS) {
  const confirmed = [];
  const scene = new SuperArtSelectScene(q, audio, character, 1, art => confirmed.push(art.id), () => {});
  const stats = [];
  const gradient = {addColorStop() {}};
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'fillText' ? (label, x, y) => {
      if (label.startsWith('STOCK ×')) stats.push(y);
    } : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient
      : () => {},
  });

  scene.render({ctx, width: 1280, height: 720, compactTouchControls: true});
  assert.deepEqual(stats, [241, 377, 513]);
  scene.pointerTap(1090, 424);
  assert.equal(scene.selected, 2, 'Tap follows the displayed third card');
  assert.deepEqual(confirmed, [], 'First tap only selects');
  scene.pointerTap(1090, 545);
  assert.deepEqual(confirmed, [], 'The area below the compact card cannot confirm');

  stats.length = 0;
  scene.render({ctx, width: 1280, height: 720});
  assert.deepEqual(stats, [247, 407, 567]);
  scene.pointerTap(1090, 545);
  assert.deepEqual(confirmed, [3], 'Normal panel and hit area return together');
  superArtFooterCases++;
}
console.log('COMPACT_SUPER_ART_FOOTER_PASS', {superArtFooterCases});
