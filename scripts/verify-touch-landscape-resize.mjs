import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {InputBuffer} from '../dist/assets/combat/InputBuffer.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
const actions=['left','right','up','down','lp','mp','hp','lk','mk','hk','jump','start'],buttons=actions.slice(4);let pads=[];
class Element extends EventTarget{dataset={};style={setProperty(){}};classList={toggle(){}};setPointerCapture(){};closest(){return this;}}
function setup(){
 globalThis.window=new EventTarget();window.innerWidth=1280;window.innerHeight=720;window.shifted=false;window.geometryOffset=0;
 const nodes=new Map(actions.map(action=>{const n=new Element();n.dataset.action=action;return[action,n];}));
 for(const directions of['up left','up right','down left','down right']){const n=new Element();n.dataset.directions=directions;nodes.set(directions,n);}
 const root=new Element(),dpad=new Element(),fight=new Element();dpad.dataset.layoutGroup='stick';fight.dataset.layoutGroup='buttons';
 root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()].filter(n=>n.dataset.action):s==='[data-layout-group]'?[dpad,fight]:[];
 root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);
 globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];
 const rect=()=>{const p=(window.shifted?300:50)+window.geometryOffset;return{left:p,top:p,right:p+200,bottom:p+200,width:200,height:200};};for(const node of nodes.values())node.getBoundingClientRect=rect;dpad.getBoundingClientRect=rect;const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad,fight};
}
function pointer(node,type,id,x=window.shifted?400:100,y=window.shifted?400:100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
const resize=()=>{window.shifted=true;window.dispatchEvent(new Event('resize'));};
function released(t){for(const a of actions){assert.equal(t.input.touchHeld(a),false,a+' touch held survives resize');assert.equal(t.input.touchPressed(a),false,a+' stale touch press survives resize');assert.equal(t.input.pressed(a),false,a+' stale combined press survives resize');}assert.equal(t.touch.buttonPointers.size,0);assert.equal(t.touch.dpadPointerId,null);assert.deepEqual(t.touch.dpadActions,[]);assert.equal(t.touch.drag,null);assert.equal(t.touch.pointerPoints.size,0);}
let buttonCases=0,dpadCases=0,dragCases=0,mixedSourceControls=0,gameplayCases=0,unchangedGeometryControls=0;for(const offset of[0,1])for(const action of actions){const t=setup();if(['left','right','up','down'].includes(action)){document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(action),'pointerdown',11);t.input.endTick();const epoch=t.input.historyEpoch;window.geometryOffset=offset;window.dispatchEvent(new Event('resize'));assert(t.input.touchHeld(action),'Unchanged control geometry preserves real held touch');assert.equal(t.input.historyEpoch,epoch);t.input.destroy();unchangedGeometryControls++;}
for(const a of buttons)for(const end of['pointerup','pointercancel','pointerleave'])for(const second of[false,true])for(const beforeTick of[false,true]){
 const t=setup(),n=t.nodes.get(a);pointer(n,'pointerdown',11);if(second)pointer(n,'pointerdown',22);if(!beforeTick)t.input.endTick();resize();released(t);resize();released(t);
 t.input.endTick();pointer(n,'pointerdown',33);assert(t.input.touchHeld(a));assert(t.input.touchPressed(a));pointer(n,end,11);pointer(n,end,22);assert(t.input.touchHeld(a),'Old pointer cannot release new touch');pointer(n,end,33);assert.equal(t.input.touchHeld(a),false);t.input.destroy();buttonCases++;
}
for(const a of['left','right','up','down','up left','up right','down left','down right'])for(const end of['pointerup','pointercancel','lostpointercapture'])for(const beforeTick of[false,true]){
 const t=setup();document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);if(!beforeTick)t.input.endTick();resize();released(t);t.input.endTick();document.hit=t.nodes.get('left');pointer(t.dpad,'pointermove',11);released(t);
 document.hit=t.nodes.get('right');pointer(t.dpad,'pointerdown',33);assert(t.input.touchHeld('right'));const b=new InputBuffer();b.capture(t.input,100);assert.equal(b.doubleTap('right'),false,'Fresh post-resize touch cannot become false dash');pointer(t.dpad,end,11);assert(t.input.touchHeld('right'));pointer(t.dpad,end,33);assert.equal(t.input.touchHeld('right'),false);t.input.destroy();dpadCases++;
}
for(const group of['stick','buttons'])for(const end of['pointerup','pointercancel']){
 const t=setup(),node=group==='stick'?t.dpad:t.fight,saved=t.touch.getSettings(),previews=[];let commits=0;
 t.touch.setEditMode(true,settings=>previews.push(settings),()=>commits++);
 pointer(node,'pointerdown',11,100,100);pointer(window,'pointermove',11,120,90);
 assert.equal(previews.length,1);assert.notDeepEqual(previews[0],saved);
 resize();released(t);
 assert.deepEqual(t.touch.getSettings(),saved,'Resizing must restore the last completed layout');
 assert.deepEqual(previews.at(-1),saved,'Options must receive the rolled-back layout');
 pointer(window,'pointermove',11,200,200);pointer(window,end,11,200,200);
 assert.deepEqual(t.touch.getSettings(),saved);assert.equal(previews.length,2);assert.equal(commits,0,'Interrupted drag cannot commit later');
 pointer(node,'pointerdown',33);pointer(window,'pointermove',33,110,95);pointer(window,'pointerup',33);
 assert.equal(previews.length,3);assert.equal(commits,1);t.input.destroy();dragCases++;
}
for(const a of['left','right','up','down','lp','mp','hp','lk','mk','hk','jump','start']){
 const t=setup(),indexes={left:14,right:15,up:12,down:13,lp:0,mp:1,hp:3,lk:2,mk:4,hk:5,jump:8,start:9};pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[indexes[a]].pressed=true;t.input.prepareTick();
 if(['left','right','up','down'].includes(a)){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(a),'pointerdown',11);
 t.input.endTick();resize();released(t);assert(t.input.held(a),'Touch cleanup must preserve physical gamepad ownership');t.input.prepareTick();assert.equal(t.input.pressed(a),false);t.input.destroy();mixedSourceControls++;
}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const a of['left','right','up','down']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=100;const step=()=>{t.input.prepareTick();f.captureInput(t.input,tick++);f.updatePlayer(t.input,w.rules);t.input.endTick();};
 document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);step();step();resize();released(t);const x=f.x,y=f.y;step();assert.equal(f.x,x);assert.equal(f.y,y);assert.equal(f.dashFrames,0);assert.equal(f.currentMove,null);pointer(t.nodes.get('lp'),'pointerdown',33);pointer(t.nodes.get('lp'),'pointerup',33);step();assert.equal(f.currentMove?.id,f.airborne?airNormalFor(c.id,'lp').id:'5LP');t.input.destroy();gameplayCases++;
}
let movedPointerControls=0,changedCellControls=0;for(const action of buttons){const t=setup(),node=t.nodes.get(action);pointer(node,'pointerdown',11);t.input.endTick();pointer(node,'pointermove',11,400,400);const epoch=t.input.historyEpoch;resize();assert(t.input.touchHeld(action),'Latest pointer position still matches relocated button');assert.equal(t.input.historyEpoch,epoch);pointer(node,'pointerup',11);assert.equal(t.touch.pointerPoints.size,0);t.input.destroy();movedPointerControls++;}for(const action of['left','right','up','down','up left','up right','down left','down right']){const t=setup();document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);t.input.endTick();const epoch=t.input.historyEpoch;document.hit=t.nodes.get(action==='left'?'right':'left');window.dispatchEvent(new Event('resize'));released(t);assert(t.input.historyEpoch>epoch,'Changed pad cell invalidates old command intent');t.input.destroy();changedCellControls++;}
let keyboardControls=0,keyboardPendingControls=0;for(const [action,code]of Object.entries({left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO',jump:'Space',start:'KeyP'})){const t=setup();const key=type=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);};key('keydown');if(['left','right','up','down'].includes(action)){document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(action),'pointerdown',11);t.input.endTick();resize();assert.equal(t.input.touchHeld(action),false);assert(t.input.held(action),'Physical keyboard hold survives touch cancellation');assert.equal(t.input.pressed(action),false);key('keyup');assert.equal(t.input.held(action),false);t.input.destroy();keyboardControls++;const u=setup();const e=new Event('keydown',{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);const epoch=u.input.historyEpoch;resize();assert.equal(u.input.historyEpoch,epoch,'No active touch: keep non-touch command history');assert(u.input.pressed(action),'No active touch: keep pending physical key press');u.input.destroy();keyboardPendingControls++;}
let selectiveResizeCases = 0;
for (const moved of ['dpad', 'attack']) {
  const t = setup();
  const punch = t.nodes.get('lp');
  const stableControl = moved === 'dpad' ? punch : t.dpad;
  const stableBounds = stableControl.getBoundingClientRect();
  stableControl.getBoundingClientRect = () => stableBounds;
  document.hit = t.nodes.get('right');
  pointer(t.dpad, 'pointerdown', 11);
  pointer(punch, 'pointerdown', 22);
  for (const type of ['keydown', 'keyup']) {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'code', { value: 'KeyK' });
    window.dispatchEvent(event);
  }

  resize();
  const keep = moved === 'dpad' ? 'lp' : 'right';
  const cancel = moved === 'dpad' ? 'right' : 'lp';
  assert(t.input.touchHeld(keep) && t.input.pressed(keep), moved + ' resize must preserve the other finger');
  assert(!t.input.touchHeld(cancel) && !t.input.pressed(cancel), moved + ' resize must cancel only the displaced finger');
  assert(t.input.pressed('mp'), moved + ' resize must preserve the pending keyboard tap');
  t.input.destroy();
  selectiveResizeCases++;
}
console.log(JSON.stringify({passed:true,movedPointerControls,changedCellControls,unchangedGeometryControls,keyboardControls,keyboardPendingControls,buttonCases,dpadCases,dragCases,mixedSourceControls,gameplayCases,selectiveResizeCases,noStuckTouch:true,oldPointerEventsIgnored:true,freshTouchWorks:true,gamepadOwnershipPreserved:true}));
