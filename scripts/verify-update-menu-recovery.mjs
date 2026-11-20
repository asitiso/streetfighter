import assert from 'node:assert/strict';
import { PwaUpdateScene } from '../dist/assets/scenes/PwaUpdateScene.js';
import { PwaUpdateManager } from '../dist/assets/core/PwaUpdateManager.js';
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>{throw new DOMException('Registration unavailable','SecurityError');},controller:null}}});
const input={pressed:()=>false,touchPressed:()=>false};
const scene=new PwaUpdateScene(input,{playStagePulse(){},playUiConfirm(){}},new PwaUpdateManager('local-test'),()=>{});
await assert.doesNotReject(()=>scene.check(),'A registration failure must return control to the update menu');
assert.equal(scene.busy,false,'Failed update check must unlock BACK and RETRY');
assert.match(scene.message,/FAILED/);
console.log(JSON.stringify({passed:true,realRegistrationFailure:true}));
import { InputManager } from '../dist/assets/input/InputManager.js';
const flush=()=>new Promise(setImmediate);
const status={supported:true,currentCache:'game-cache-test',previousCache:'game-cache-previous',controlled:false,waiting:false,installing:false,lastAction:'READY',rollbackActive:null,pendingRecovery:false};
const audio={playStagePulse(){},playUiConfirm(){}};
let cases=1;
function fixture(kind,source='keyboard'){
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 const timers=[];window.setTimeout=fn=>{timers.push(fn);return timers.length;};window.location={reload(){throw Error('No real reload permitted in fixture');}};
 let pad=null;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});
 const input=new InputManager();let pressed=false,back=0,calls=0,fail=true,release;
 let outcome={applied:false,message:'READY'};
 const gate=new Promise((resolve,reject)=>{release={resolve,reject};});
 const updates={status:async()=>({...status,rollbackActive:kind==='restore'?'game-cache-previous':null})};
 const method={check:'checkForUpdate',apply:'applyWaitingUpdate',rollback:'rollbackPrevious',restore:'restoreCurrent'}[kind];
 updates[method]=()=>{calls++;return fail?Promise.reject(Error('injected update failure')):Promise.resolve(kind==='check'?status:outcome);};
 const scene=new PwaUpdateScene(input,audio,updates,()=>back++);
 const action=kind==='check'?'lp':kind==='apply'?'mp':'hp';
 const codes={lp:'KeyJ',mp:'KeyK',hp:'KeyL',back:'Escape'},buttons={lp:0,mp:1,hp:3,back:8};
 function edge(action){
  if(source==='touch') {input.setTouch(action==='back'?'start':action,true);input.setTouch(action==='back'?'start':action,false);}
  else if(source==='gamepad'){pad={connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===buttons[action]}))};}
  else {for(const type of ['keydown','keyup']){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:codes[action]});window.dispatchEvent(e);}}
  input.prepareTick();scene.fixedUpdate(1/60);input.endTick();pad=null;
 }
 return {scene,updates,method,input,timers,action,edge,get calls(){return calls;},get backs(){return back;},recover(){fail=false;},setOutcome(value){outcome=value;},gate,release,close(){input.destroy();}};
}
for(const kind of ['check','apply','rollback','restore'])for(const source of ['keyboard','touch','gamepad']){
 const f=fixture(kind,source);try{
  f.scene.enter();await flush();f.edge(f.action);await flush();
  assert.equal(f.calls,1);assert.equal(f.scene.busy,false);assert.match(f.scene.message,/FAILED/);assert.equal(f.timers.length,0);
  for(let i=0;i<3;i++){f.input.prepareTick();f.scene.fixedUpdate(1/60);f.input.endTick();}await flush();assert.equal(f.calls,1,'A failed operation waits for a fresh press');
  f.recover();f.edge(f.action);await flush();assert.equal(f.calls,2);assert.equal(f.scene.busy,false);assert.equal(f.scene.message,'READY');
  f.edge('back');assert.equal(f.backs,1,'Back works after recovery');cases++;
 }finally{f.close();}
}
for(const kind of ['check','apply','rollback','restore'])for(const fault of ['sync','deferred','status']){
 const f=fixture(kind);try{
  f.scene.enter();await flush();
  if(fault==='sync')f.updates[f.method]=()=>{throw Error('injected sync failure');};
  if(fault==='deferred')f.updates[f.method]=()=>f.gate;
  if(fault==='status'){f.recover();f.updates.status=async()=>{throw Error('injected status failure');};if(kind==='check')f.updates[f.method]=async()=>{throw Error('injected check status failure');};}
  f.edge(f.action);
  if(fault==='deferred'){assert.equal(f.scene.busy,true);f.edge(f.action);f.release.reject(Error('injected delayed failure'));}
  await flush();assert.equal(f.scene.busy,false);assert.match(f.scene.message,/FAILED/);assert.equal(f.timers.length,0);
  f.edge('back');assert.equal(f.backs,1);cases++;
 }finally{f.close();}
}
// Simultaneous menu edges choose BACK before any update operation.
for(const exit of ['back','lk','touch-start']){
 const f=fixture('check');try{f.scene.enter();await flush();
  for(const action of ['lp','mp','hp'])f.input.setTouch(action,true);
  f.input.setTouch(exit==='touch-start'?'start':exit,true);f.scene.fixedUpdate(1/60);await flush();
  assert.equal(f.backs,1);assert.equal(f.calls,0);assert.equal(f.timers.length,0);cases++;
 }finally{f.close();}
}
// One frame can trigger at most one operation; successful apply keeps its reload.
{const f=fixture('apply');try{f.scene.enter();await flush();f.recover();f.setOutcome({applied:true,message:'APPLIED'});
 f.input.setTouch('mp',true);f.input.setTouch('hp',true);f.scene.fixedUpdate(1/60);await flush();
 assert.equal(f.calls,1);assert.equal(f.timers.length,1);assert.equal(f.scene.busy,false);cases++;
}finally{f.close();}}
{const f=fixture('check');try{f.updates.status=async()=>{throw Error('injected refresh failure');};f.scene.enter();await flush();assert.match(f.scene.message,/FAILED/);f.edge('back');assert.equal(f.backs,1);cases++;}finally{f.close();}}
console.log(JSON.stringify({passed:true,cases,deviceSources:3,failedActionsRecover:true,backPriority:true,noRealUpdateOrReload:true}));
let refreshRaceCases=0;
for(const late of ['success','failure'])for(const actionFails of [false,true]){
 const f=fixture('check');try{
  f.updates.status=()=>f.gate;f.scene.enter();
  if(!actionFails)f.recover();
  f.edge(f.action);await flush();const expected=f.scene.message;
  if(actionFails)assert.match(expected,/CHECK FAILED/);else assert.equal(expected,'READY');
  if(late==='success')f.release.resolve({...status,lastAction:'STALE INITIAL STATUS',rollbackActive:'stale-cache'});
  else f.release.reject(Error('late initial refresh failure'));
  await flush();assert.equal(f.scene.message,expected,'Initial refresh must not overwrite newer operation feedback');
  assert.equal(f.scene.status?.rollbackActive??null,null,'Initial refresh cannot publish stale rollback state');
  f.edge('back');assert.equal(f.backs,1);refreshRaceCases++;
 }finally{f.close();}
}
console.log(JSON.stringify({passed:true,refreshRaceCases,initialRefreshCannotOverwriteAction:true}));
import { TouchControls } from '../dist/assets/ui/TouchControls.js';
import { GameApp } from '../dist/assets/core/GameApp.js';
function touchFixture(){
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 const input=new InputManager(),classes=new Set(),nodes=new Map(['lp','mp','hp','start'].map(a=>[a,{textContent:a==='start'?'START':a.toUpperCase()}]));let layouts=0;
 const touch=Object.create(TouchControls.prototype);
 Object.assign(touch,{input,utilityMode:null,settings:{stickScale:1.4,buttonScale:.7,stickX:64,stickY:48,buttonsX:52,buttonsY:44},element:{classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},querySelector(selector){return nodes.get(/data-action="([^"]+)"/.exec(selector)?.[1])??null;}},pointerPoints:new Map(),buttonPointers:new Map(),dpadActions:[],directionPressed:null,dpadPointerId:null,drag:null,applySettings(){layouts++;}});
 return{input,touch,classes,nodes,layouts:()=>layouts,close:()=>input.destroy()};
}
let footerCases=0;
for(const close of ['exit','destroy']){
 const f=touchFixture();try{const s=new PwaUpdateScene(f.input,audio,{status:async()=>status},()=>{},active=>f.touch.setUpdateMode(active));s.enter();
 assert(f.classes.has('update-mode'),'Update entry must replace the combat controls with its footer');s[close]();assert(!f.classes.has('update-mode'));footerCases++;
 }finally{f.close();}
}
{const f=touchFixture();try{
 const before=f.touch.getSettings();for(const a of ['lp','start','left'])f.input.setTouch(a,true);
 f.touch.setUpdateMode(true);for(const a of ['lp','start','left']){assert.equal(f.input.touchHeld(a),false);assert.equal(f.input.pressed(a),false);}
 assert.deepEqual([...f.nodes.values()].map(n=>n.textContent),['CHECK','APPLY','HP','BACK']);
 f.input.setTouch('lp',true);f.touch.setUpdateMode(true);assert(f.input.touchHeld('lp'),'Repeated mode updates do not swallow a live tap');
 f.touch.setUpdateMode(false);assert(!f.input.touchHeld('lp'));assert(!f.input.pressed('lp'));assert.deepEqual(f.touch.getSettings(),before);
 assert.deepEqual([...f.nodes.values()].map(n=>n.textContent),['LP','MP','HP','START']);assert.equal(f.layouts(),2);footerCases++;
}finally{f.close();}}
{const f=touchFixture();try{let captured;
 await GameApp.prototype.showPwaUpdate.call({input:f.input,audio,updates:{status:async()=>status},touch:f.touch,scenes:{setScene:async s=>captured=s}});
 captured.enter();assert(f.classes.has('update-mode'));captured.exit();captured.destroy();assert(!f.classes.has('update-mode'));assert.equal(f.layouts(),2);footerCases++;
}finally{f.close();}}
console.log(JSON.stringify({passed:true,footerCases,lifecycleAndGameAppWired:true,combatSettingsPreserved:true}));
