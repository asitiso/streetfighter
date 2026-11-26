import assert from 'node:assert/strict';
import {EndingScene} from '../dist/assets/scenes/EndingScene.js';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {SceneManager} from '../dist/assets/core/SceneManager.js';
import {SessionRecoveryStore} from '../dist/assets/core/SessionRecovery.js';
import {getCharacter} from '../dist/assets/game/characters.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};const c=getCharacter('KEN'),art=c.superArts[1],audio={playStagePulse(){}},resume={time:3.5,stateFrame:112,animationFrame:112},result={stageId:5,clearSeconds:42,defeatedEnemies:10,damageDealt:900,damageTaken:10,maxComboHits:4,maxComboDamage:200,parries:2,redParries:1,supersUsed:1,throwsLanded:1};const flush=()=>new Promise(setImmediate);let cases=0;
{const s=new EndingScene({pressed:()=>false,touchPressed:()=>false},audio,c,art,[result],()=>{},undefined,resume,true);s.enter();assert.equal(s.time,resume.time,'Recovery must retain reveal progress');assert.equal(s.hero.stateFrame,resume.stateFrame);assert.equal(s.hero.animationFrame,resume.animationFrame);assert.match(s.returnError,/RETRY/);s.exit();s.enter();assert.equal(s.returnError,'');s.destroy();cases++;}
{let passed;const s=new EndingScene({pressed:k=>k==='start',touchPressed:()=>false},audio,c,art,[],r=>{passed=r;});s.enter();s.fixedUpdate(1/60);assert.deepEqual(passed,{time:s.time,stateFrame:s.hero.stateFrame,animationFrame:s.hero.animationFrame});const before=s.time;passed.time=99;assert.equal(s.time,before,'Snapshot must not mutate live scene');s.destroy();cases++;}
{let active=true,calls=0,logged=0;const s=new EndingScene({pressed:k=>active&&k==='start',touchPressed:()=>false},audio,c,art,[],async()=>{if(++calls===1)throw Error('return failure');},()=>{logged++;throw Error('diagnostic failure');});s.enter();s.fixedUpdate(1/60);await flush();assert.equal(s.returning,false);assert.match(s.returnError,/RETRY/);assert.equal(logged,1);active=false;for(let i=0;i<8;i++)s.fixedUpdate(1/60);assert.equal(calls,1);active=true;s.fixedUpdate(1/60);await flush();assert.equal(calls,2);assert.equal(s.returnError,'');s.destroy();cases++;}
const dummy=enter=>({enter:enter??(()=>{}),exit(){},destroy(){},resize(){},fixedUpdate(){},render(){}});
function app(){memory.clear();const r=new SessionRecoveryStore('test');r.begin();const a={input:{pressed:()=>false,touchPressed:()=>false},audio,touch:{setEndingMode(){}},save:{completedStages:[1,2,3,4,5],stageResults:[result]},recovery:r,scenes:new SceneManager(),errors:{record(){}},persist:async patch=>{Object.assign(a.save,patch);},enterLoadedScene(createScene){return this.scenes.setScene(createScene());},loadStageModule:async()=>({EndingScene})};return a;}
for(const mode of ['active','empty','newer','diagnostic']){const a=app(),error=Error('title failed'),newer=dummy();a.showTitle=async()=>{a.recovery.checkpoint('title',null,null,null);if(mode==='active')throw error;const failed=a.scenes.setScene(dummy(()=>{throw error;}));if(mode==='newer')void a.scenes.setScene(newer);await failed;};if(mode==='diagnostic')a.errors.record=()=>{throw Error('diagnostic failure');};await GameApp.prototype.showEnding.call(a,c,art);const old=a.scenes.current;await assert.rejects(old.onFinish(resume),e=>e===error);await a.scenes.transitionTail;if(mode==='newer'){assert.equal(a.scenes.current,newer);}else if(mode==='active'){assert.equal(a.scenes.current,old);/* onError is emitted by active EndingScene's guarded failure handler */}else{const fresh=a.scenes.current;assert.equal(fresh.constructor.name,'EndingScene');assert.notEqual(fresh,old);assert.equal(fresh.time,resume.time);assert.equal(fresh.hero.animationFrame,resume.animationFrame);assert.deepEqual(fresh.totals,old.totals);assert.match(fresh.returnError,/RETRY/);assert.equal(a.recovery.activeRoute(),'ending');}cases++;}
{
  const a = app();
  let endingReady = false;
  let completionWrites = 0;
  const persist = a.persist;
  a.persist = async patch => { completionWrites++; await persist(patch); };
  a.loadStageModule = async () => endingReady ? { EndingScene } : null;
  a.showTitle = async () => a.recovery.checkpoint('title', null, null, null);
  a.showEnding = GameApp.prototype.showEnding.bind(a);
  a.recoveryHistory = { record() {} };

  await a.showEnding(c, art);
  assert.equal(completionWrites, 1, 'The first ending route must persist campaign completion');
  assert.equal(a.recovery.activeRoute(), 'title');
  const expectedCheckpoint = { route: 'ending', stage: 5, character: c.id, superArt: art.id };
  const checkpointDetails = () => {
    const { route, stage, character, superArt } = a.recovery.snapshot().checkpoint ?? {};
    return { route, stage, character, superArt };
  };
  assert.deepEqual(checkpointDetails(), expectedCheckpoint, 'Leaving the failed loader must leave RESUME ENDING available');
  const reload = () => {
    a.recovery.markClean('pagehide');
    a.recovery = new SessionRecoveryStore('test');
    a.recovery.begin();
  };
  reload();
  assert.deepEqual(checkpointDetails(), expectedCheckpoint, 'Reloading from title must preserve the pending ending');
  reload();
  assert.deepEqual(checkpointDetails(), expectedCheckpoint, 'The pending ending must survive repeated reloads');
  await GameApp.prototype.recoverInterruptedSession.call(a);
  assert.deepEqual(checkpointDetails(), expectedCheckpoint, 'Leaving another failed recovery preserves the same ending');
  assert.equal(completionWrites, 1, 'A saved campaign must not depend on another completion write during recovery');

  endingReady = true;
  await GameApp.prototype.recoverInterruptedSession.call(a);
  assert.equal(a.scenes.current.character.id, c.id);
  assert.equal(a.scenes.current.superArt.id, art.id);
  assert.equal(a.recovery.snapshot().available, false);
  assert.deepEqual(a.save.stageResults, [result]);
  assert.equal(completionWrites, 1, 'Opening the restored ending still requires no repeat write');
  reload();
  assert.equal(a.recovery.snapshot().available, false, 'A viewed ending must not reappear on the next launch');
  cases++;
}
console.log(JSON.stringify({passed:true,cases,resumePhase:1,snapshot:1,activeDiagnosticRetry:1,gameAppControls:4,loadBackRecovery:1}));

import{InputManager}from'../dist/assets/input/InputManager.js';import{CHARACTERS}from'../dist/assets/game/characters.js';
let allAttackReturnCases=0;
const attackKeys={lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO'},attackPad={lp:0,mp:1,hp:3,lk:2,mk:4,hk:5};
for(const character of CHARACTERS)for(const selectedArt of character.superArts)for(const button of ['lp','mp','hp','lk','mk','hk'])for(const source of ['keyboard','gamepad'])for(const failure of ['sync','async']){
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();const pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>source==='gamepad'?[pad]:[]}});const input=new InputManager();let calls=0;const s=new EndingScene(input,audio,character,selectedArt,[result],()=>{calls++;if(calls===1){if(failure==='sync')throw Error('controlled ending return failure');return Promise.reject(Error('controlled ending return failure'));}},undefined,resume);s.enter();
 const step=()=>{input.prepareTick();s.fixedUpdate(1/60);input.endTick();};const press=async()=>{if(source==='keyboard'){for(const type of ['keydown','keyup']){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{code:{value:attackKeys[button]},repeat:{value:false}});window.dispatchEvent(e);}step();}else{pad.buttons[attackPad[button]].pressed=true;step();pad.buttons[attackPad[button]].pressed=false;step();}await flush();};
 await press();assert.equal(calls,1,'Advertised attack returns from ending: '+button+'/'+source);assert(!s.returning);assert.match(s.returnError,/RETRY/);for(let n=0;n<3;n++)step();assert.equal(calls,1,'Failure waits for a fresh input');await press();assert.equal(calls,2,'Fresh attack retries ending return');assert(s.returning);await press();assert.equal(calls,2,'Pending return cannot duplicate');s.exit();s.destroy();input.destroy();allAttackReturnCases++;
}
console.log('ENDING_ALL_ATTACK_RETURN_PASS',{allAttackReturnCases,sources:['keyboard','gamepad'],buttons:6,syncAndAsyncFailureRetry:true,noHeldRepeat:true});