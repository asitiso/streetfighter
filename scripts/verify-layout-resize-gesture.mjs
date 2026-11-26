import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls,resolveTouchLayout} from '../dist/assets/ui/TouchControls.js';
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
 globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];
 const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad,fight};
}
function pointer(node,type,id,x=100,y=100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{currentTarget:{value:node},pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
let gestureCases=0,heldControls=0,gameplayCases=0;
for(const group of['stick','buttons'])for(const moved of[false,true])for(const size of[[1024,720],[1280,600],[640,360]])for(const end of['pointerup','pointercancel','lostpointercapture'])for(const second of[false,true]){
 const t = setup();
 const node = group === 'stick' ? t.dpad : t.fight;
 t.touch.setSettings({stickX: 60, stickY: 42, buttonsX: 56, buttonsY: 35});
 const original = t.touch.getSettings();
 const previews = [];
 let commits = 0;
 t.touch.setEditMode(true, settings => previews.push(settings), () => commits++);
 pointer(node, 'pointerdown', 11, 100, 100);
 if (moved) pointer(window, 'pointermove', 11, 116, 92);
 if (second) pointer(node, 'pointerdown', 22, 200, 200);
 assert.equal(previews.length, Number(moved));

 [window.innerWidth, window.innerHeight] = size;
 window.dispatchEvent(new Event('resize'));
 assert.equal(t.touch.drag, null, 'Resize invalidates the old gesture');
 assert(t.touch.editing);
 assert.deepEqual(t.touch.getSettings(), original, 'Resize restores the settings from before the drag');
 if (moved) assert.deepEqual(previews[1], original, 'Options receives the restored preview');
 const previewCount = 2 * Number(moved);
 assert.equal(previews.length, previewCount);
 assert.equal(commits, 0, 'Resize alone cannot write layout');

 pointer(window, 'pointermove', 11, 360, 260);
 pointer(window, 'pointermove', 22, 360, 260);
 pointer(end === 'lostpointercapture' ? node : window, end, 11);
 pointer(node, 'lostpointercapture', 22);
 assert.equal(previews.length, previewCount);
 assert.equal(commits, 0);
 assert.deepEqual(t.touch.getSettings(), original, 'Late pre-resize events cannot change layout');

 pointer(node, 'pointerdown', 33, 200, 200);
 assert.equal(t.touch.drag.pointerId, 33);
 pointer(window, 'pointermove', 33, 204, 196);
 pointer(window, 'pointerup', 11);
 assert.equal(t.touch.drag.pointerId, 33);
 pointer(window, 'pointerup', 33);
 assert.equal(commits, 1);
 assert.equal(previews.length, previewCount + 1);
 t.input.destroy();
 gestureCases++;
}
for(const a of['left','right','up','down','up left','up right','down left','down right','lp','mp','hp','lk','mk','hk','jump','start'])for(const size of[[1024,720],[640,360]]){
 const t=setup();if(a.includes(' ')||['left','right','up','down'].includes(a)){document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(a),'pointerdown',11);t.input.endTick();const held=actions.filter(k=>t.input.touchHeld(k)),epoch=t.input.historyEpoch;
 window.innerWidth=size[0];window.innerHeight=size[1];window.dispatchEvent(new Event('resize'));assert.deepEqual(actions.filter(k=>t.input.touchHeld(k)),held,'Normal game touch must stay held across resize');assert.equal(t.input.historyEpoch,epoch);for(const k of actions)assert.equal(t.input.pressed(k),false,'Resize cannot create a fresh input');if(a.includes(' ')||['left','right','up','down'].includes(a))assert.equal(t.touch.dpadPointerId,11);else assert(t.touch.buttonPointers.get(a).has(11));t.input.destroy();heldControls++;
}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const action of['left','right']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=100;const step=()=>{t.input.prepareTick();f.captureInput(t.input,tick++);f.updatePlayer(t.input,w.rules);t.input.endTick();};document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);step();const x=f.x;window.innerWidth=1024;window.dispatchEvent(new Event('resize'));step();assert((f.x-x)*(action==='left'?-1:1)>0,'Held movement keeps responding after resize');assert.equal(f.currentMove,null);assert.equal(f.dashFrames,0);pointer(t.dpad,'pointerup',11);const stopped=f.x;step();assert.equal(f.x,stopped);t.input.destroy();gameplayCases++;
}
console.log(JSON.stringify({passed:true,gestureCases,heldControls,gameplayCases,oldDragCancelled:true,noResizeCommit:true,freshPointerWorks:true,normalGameTouchPreserved:true,commandEpochUnchanged:true}));
