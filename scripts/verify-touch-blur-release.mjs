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
 globalThis.window=new EventTarget();window.innerWidth=1280;window.innerHeight=720;
 const nodes=new Map(actions.map(action=>{const n=new Element();n.dataset.action=action;return[action,n];}));
 for(const directions of['up left','up right','down left','down right']){const n=new Element();n.dataset.directions=directions;nodes.set(directions,n);}
 const root=new Element(),dpad=new Element(),fight=new Element();dpad.dataset.layoutGroup='stick';fight.dataset.layoutGroup='buttons';
 root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()].filter(n=>n.dataset.action):s==='[data-layout-group]'?[dpad,fight]:[];
 root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);
 globalThis.document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>root,elementFromPoint:()=>document.hit});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];
 const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad,fight};
}
function pointer(node,type,id,x=100,y=100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
const blur=()=>window.dispatchEvent(new Event('blur'));
function released(t){for(const a of actions){assert.equal(t.input.touchHeld(a),false,a+' touch held survives blur');assert.equal(t.input.touchPressed(a),false,a+' stale touch press survives blur');assert.equal(t.input.pressed(a),false,a+' stale combined press survives blur');}assert.equal(t.touch.buttonPointers.size,0);assert.equal(t.touch.dpadPointerId,null);assert.deepEqual(t.touch.dpadActions,[]);assert.equal(t.touch.drag,null);}
let buttonCases=0,dpadCases=0,dragCases=0,mixedSourceControls=0,gameplayCases=0;
for(const a of buttons)for(const end of['pointerup','pointercancel','pointerleave'])for(const second of[false,true])for(const beforeTick of[false,true]){
 const t=setup(),n=t.nodes.get(a);pointer(n,'pointerdown',11);if(second)pointer(n,'pointerdown',22);if(!beforeTick)t.input.endTick();blur();released(t);blur();released(t);
 t.input.endTick();pointer(n,'pointerdown',33);assert(t.input.touchHeld(a));assert(t.input.touchPressed(a));pointer(n,end,11);pointer(n,end,22);assert(t.input.touchHeld(a),'Old pointer cannot release new touch');pointer(n,end,33);assert.equal(t.input.touchHeld(a),false);t.input.destroy();buttonCases++;
}
for(const a of['left','right','up','down','up left','up right','down left','down right'])for(const end of['pointerup','pointercancel','lostpointercapture'])for(const beforeTick of[false,true]){
 const t=setup();document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);if(!beforeTick)t.input.endTick();blur();released(t);t.input.endTick();document.hit=t.nodes.get('left');pointer(t.dpad,'pointermove',11);released(t);
 document.hit=t.nodes.get('right');pointer(t.dpad,'pointerdown',33);assert(t.input.touchHeld('right'));const b=new InputBuffer();b.capture(t.input,100);assert.equal(b.doubleTap('right'),false,'Fresh post-blur touch cannot become false dash');pointer(t.dpad,end,11);assert(t.input.touchHeld('right'));pointer(t.dpad,end,33);assert.equal(t.input.touchHeld('right'),false);t.input.destroy();dpadCases++;
}
for(const group of['stick','buttons'])for(const end of['pointerup','pointercancel']){
 const t=setup(),node=group==='stick'?t.dpad:t.fight,saved=t.touch.getSettings(),previews=[];let commits=0;
 t.touch.setEditMode(true,s=>previews.push(s),()=>commits++);pointer(node,'pointerdown',11,100,100);pointer(window,'pointermove',11,120,90);assert.equal(previews.length,1);
 blur();released(t);
 assert.deepEqual(t.touch.getSettings(),saved,'Losing focus must restore the last completed layout');
 assert.deepEqual(previews.at(-1),saved);
 pointer(window,'pointermove',11,200,200);pointer(window,end,11,200,200);assert.deepEqual(t.touch.getSettings(),saved);assert.equal(previews.length,2);assert.equal(commits,0,'Interrupted drag cannot commit later');
 pointer(node,'pointerdown',33);pointer(window,'pointermove',33,110,95);pointer(window,'pointerup',33);assert.equal(previews.length,3);assert.equal(commits,1);t.input.destroy();dragCases++;
}
for(const a of['left','right','up','down','lp','mp','hp','lk','mk','hk','jump','start']){
 const t=setup(),indexes={left:14,right:15,up:12,down:13,lp:0,mp:1,hp:3,lk:2,mk:4,hk:5,jump:8,start:9};pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[indexes[a]].pressed=true;t.input.prepareTick();
 if(['left','right','up','down'].includes(a)){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(a),'pointerdown',11);
 t.input.endTick();blur();released(t);assert(t.input.held(a),'Touch cleanup must preserve physical gamepad ownership');t.input.prepareTick();assert.equal(t.input.pressed(a),false);t.input.destroy();mixedSourceControls++;
}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const a of['left','right','up','down']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=100;const step=()=>{t.input.prepareTick();f.captureInput(t.input,tick++);f.updatePlayer(t.input,w.rules);t.input.endTick();};
 document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);step();step();blur();released(t);const x=f.x,y=f.y;step();assert.equal(f.x,x);assert.equal(f.y,y);assert.equal(f.dashFrames,0);assert.equal(f.currentMove,null);pointer(t.nodes.get('lp'),'pointerdown',33);pointer(t.nodes.get('lp'),'pointerup',33);step();assert.equal(f.currentMove?.id,f.airborne?airNormalFor(c.id,'lp').id:'5LP');t.input.destroy();gameplayCases++;
}
console.log(JSON.stringify({passed:true,buttonCases,dpadCases,dragCases,mixedSourceControls,gameplayCases,noStuckTouch:true,oldPointerEventsIgnored:true,freshTouchWorks:true,gamepadOwnershipPreserved:true}));

let cancelledLayoutCases=0;
for(const group of ['stick','buttons'])for(const moved of [false,true])for(const extreme of [false,true]){
 const t=setup(),node=group==='stick'?t.dpad:t.fight,previews=[],commits=[];
 if(extreme)t.touch.setSettings({stickX:2048,stickY:1024,buttonsX:2048,buttonsY:1024});
 const before=t.touch.getSettings();t.touch.setEditMode(true,s=>previews.push({...s}),s=>commits.push({...s}));
 pointer(node,'pointerdown',11,100,100);if(moved)pointer(window,'pointermove',11,120,90);
 pointer(window,'pointercancel',99);assert(t.touch.drag,'Other pointer cannot cancel drag');
 pointer(window,'pointercancel',11);assert.equal(t.touch.drag,null);assert.deepEqual(t.touch.getSettings(),before,'Cancelled layout gesture restores all original settings');assert.equal(commits.length,0,'Cancellation cannot save layout');
 if(moved)assert.deepEqual(previews.at(-1),before,'Options preview owner receives restored settings');
 pointer(window,'pointerup',11);assert.equal(commits.length,0,'Stale release cannot save cancelled layout');
 pointer(node,'pointerdown',33,100,100);pointer(window,'pointermove',33,110,95);pointer(window,'pointerup',33);assert.equal(commits.length,1,'Fresh normal drag still saves');t.input.destroy();cancelledLayoutCases++;
}
console.log('CANCELLED_LAYOUT_DRAG_PASS',{cancelledLayoutCases});

let lifecycleCases=0;
for(const event of ['pagehide','hidden'])for(const a of actions)for(const pending of [false,true]){
 const t=setup();
 if(['left','right','up','down'].includes(a)){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(a),'pointerdown',11);
 if(!pending)t.input.endTick();
 if(event==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}
 else window.dispatchEvent(new Event('pagehide'));
 released(t);
 // A stale OS release must not interfere with a fresh post-resume touch.
 document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));t.input.endTick();
 if(['left','right','up','down'].includes(a)){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',33);pointer(t.dpad,'pointerup',11);}
 else {pointer(t.nodes.get(a),'pointerdown',33);pointer(t.nodes.get(a),'pointerup',11);}
 assert(t.input.touchHeld(a),'Fresh touch works after '+event);t.input.destroy();lifecycleCases++;
}
const visible=setup();pointer(visible.nodes.get('lp'),'pointerdown',11);document.dispatchEvent(new Event('visibilitychange'));assert(visible.input.touchHeld('lp'),'Visible notification must preserve live touch');visible.input.destroy();
console.log('TOUCH_PAGE_LIFECYCLE_PASS',{lifecycleCases,visibleNotificationPreservesTouch:true});
const interrupt=event=>{if(event==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}else window.dispatchEvent(new Event('pagehide'));};
let lifecycleDragCases=0,lifecycleGamepadCases=0,lifecycleGameplayCases=0;
for(const event of ['pagehide','hidden','lostpointercapture'])for(const group of ['stick','buttons']){
 const t=setup(),node=group==='stick'?t.dpad:t.fight,saved=t.touch.getSettings();let commits=0;
 t.touch.setEditMode(true,()=>{},()=>commits++);pointer(node,'pointerdown',11);pointer(window,'pointermove',11,120,90);
 if(event==='lostpointercapture')pointer(node,event,11);else interrupt(event);
 released(t);pointer(window,'pointerup',11);
 assert.equal(commits,0,'Interrupted layout cannot commit via stale release');
 assert.deepEqual(t.touch.getSettings(),saved,'Interrupted layout restores the previous coordinates');
 pointer(node,'pointerdown',33);pointer(window,'pointermove',33,110,95);pointer(window,'pointerup',33);assert.equal(commits,1,'Fresh layout drag saves');t.input.destroy();lifecycleDragCases++;
}
for(const event of ['pagehide','hidden'])for(const a of ['right','lp','jump','start']){
 const t=setup(),index={right:15,lp:0,jump:8,start:9}[a];pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[index].pressed=true;t.input.prepareTick();
 if(a==='right'){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(a),'pointerdown',11);t.input.endTick();interrupt(event);released(t);assert(t.input.held(a),'Physical gamepad ownership preserved');t.input.prepareTick();assert(!t.input.pressed(a),'No repeated gamepad edge after interruption');t.input.destroy();lifecycleGamepadCases++;
}
for(const event of ['pagehide','hidden'])for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of [-1,1])for(const mode of ['belt','duel'])for(const action of ['left','right','up','down']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=100;const step=()=>{t.input.prepareTick();f.captureInput(t.input,tick++);f.updatePlayer(t.input,w.rules);t.input.endTick();};document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);step();step();interrupt(event);released(t);const x=f.x,y=f.y;step();assert.equal(f.x,x,'No stuck horizontal movement');assert.equal(f.y,y,'No stuck depth movement');assert.equal(f.dashFrames,0);assert.equal(f.currentMove,null);pointer(t.nodes.get('lp'),'pointerdown',33);pointer(t.nodes.get('lp'),'pointerup',33);step();assert.equal(f.currentMove?.id,f.airborne?airNormalFor(c.id,'lp').id:'5LP');t.input.destroy();lifecycleGameplayCases++;
}
console.log('TOUCH_PAGE_LIFECYCLE_REGRESSION_PASS',{lifecycleDragCases,lifecycleGamepadCases,lifecycleGameplayCases});
