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
let cases=0,resetControls=0;
for(const first of['stick','buttons'])for(const second of['stick','buttons'])for(const end of['pointerup','pointercancel','lostpointercapture'])for(const ignoredEnd of['pointerup','pointercancel','lostpointercapture']){
 const t=setup(),node=group=>group==='stick'?t.dpad:t.fight;let previews=0,commits=[];t.touch.setEditMode(true,()=>previews++,s=>commits.push({...s}));const original=t.touch.getSettings();
 pointer(node(first),'pointerdown',11,100,100);pointer(window,'pointermove',11,116,92);assert.equal(previews,1);const initial=t.touch.getSettings(),drag={...t.touch.drag};
 pointer(node(second),'pointerdown',22,300,200);assert.deepEqual(t.touch.drag,drag,'Second finger cannot steal active layout drag');pointer(window,'pointermove',22,340,220);assert.equal(previews,1);assert.deepEqual(t.touch.getSettings(),initial);
 pointer(ignoredEnd==='lostpointercapture'?node(second):window,ignoredEnd,22);assert.deepEqual(t.touch.drag,drag);assert.equal(commits.length,0);
 pointer(window,'pointermove',11,124,88);const expected={...original};expected[first==='stick'?'stickX':'buttonsX']+=(first==='stick'?24:-24);expected[first==='stick'?'stickY':'buttonsY']+=12;
 assert.deepEqual(t.touch.getSettings(),expected,'Owner continues from its original anchor');assert.equal(previews,2);pointer(end==='lostpointercapture'?node(first):window,end,11);assert.equal(t.touch.drag,null);const cancelled=end!=='pointerup',endedSettings=cancelled?original:expected,endedPreviews=cancelled?3:2;assert.deepEqual(commits,cancelled?[]:[expected]);assert.deepEqual(t.touch.getSettings(),endedSettings,'Owner cancellation restores original layout');
 pointer(window,'pointermove',22,360,240);assert.equal(previews,endedPreviews);assert.deepEqual(t.touch.getSettings(),endedSettings,'Ignored finger cannot silently become owner after release');
 pointer(node(second),'pointerdown',33,200,200);pointer(window,'pointermove',33,204,196);assert.equal(t.touch.drag.pointerId,33);pointer(window,'pointerup',11);pointer(node(second),'lostpointercapture',22);assert.equal(t.touch.drag.pointerId,33);pointer(window,'pointerup',33);assert.equal(commits.length,cancelled?1:2);assert.equal(previews,endedPreviews+1);t.input.destroy();cases++;
}
for(const group of['stick','buttons'])for(const reset of['blur','hide','exit-edit']){
 const t=setup(),node=group==='stick'?t.dpad:t.fight;let commits=0;t.touch.setEditMode(true,()=>{},()=>commits++);pointer(node,'pointerdown',11);pointer(node,'pointerdown',22);if(reset==='blur')window.dispatchEvent(new Event('blur'));if(reset==='hide')t.touch.setVisible(false);if(reset==='exit-edit')t.touch.setEditMode(false);pointer(window,'pointermove',11,200,200);pointer(window,'pointermove',22,200,200);pointer(node,'lostpointercapture',11);pointer(node,'lostpointercapture',22);assert.equal(t.touch.drag,null);assert.equal(commits,0);t.input.destroy();resetControls++;
}
let visibleAnchorCases=0;
for(const group of['stick','buttons'])for(const safe of[{left:0,right:0,bottom:0},{left:36,right:24,bottom:12}])for(const move of[false,true])for(const origin of[{x:120,y:48},{x:373.2,y:131.2}]){
 const t=setup(),node=group==='stick'?t.dpad:t.fight;t.touch.setSettings({stickX:486,stickY:216,buttonsX:486,buttonsY:216});window.innerWidth=640;window.innerHeight=360;const before=t.touch.getSettings();t.touch.setSettings(before);assert.deepEqual(t.touch.getSettings(),before,'Reloading settings in a smaller viewport preserves logical offsets');let reads=0,styles=0,commits=[];
 node.getBoundingClientRect=()=>{reads++;const left=group==='stick'?origin.x+safe.left:640-origin.x-safe.right-200;return{left,right:left+200,bottom:360-origin.y-safe.bottom,top:360-48-safe.bottom-140,width:200,height:140};};
 globalThis.getComputedStyle=()=>{styles++;return{getPropertyValue:k=>(safe[k.slice(7)]??0)+'px'};};
 try{t.touch.setEditMode(true,()=>{},v=>commits.push({...v}));pointer(node,'pointerdown',11,200,200);assert(Math.abs(t.touch.drag.baseX-origin.x)<.001,'Drag starts at visible clamped horizontal offset');assert(Math.abs(t.touch.drag.baseY-origin.y)<.001,'Drag starts at visible clamped vertical offset');assert.deepEqual(t.touch.getSettings(),before,'Pointer down alone preserves desired settings');pointer(node,'pointerdown',22);assert.equal(reads,1);assert.equal(styles,1,'Ignored pointer must not measure layout');if(!move)pointer(window,'pointermove',11,200,200);if(move){pointer(window,'pointermove',11,group==='stick'?184:216,208);assert(Math.abs(t.touch.getSettings()[group==='stick'?'stickX':'buttonsX']-(origin.x-16))<.001);assert(Math.abs(t.touch.getSettings()[group==='stick'?'stickY':'buttonsY']-(origin.y-8))<.001);}assert.equal(reads,1);assert.equal(styles,1,'Move never re-measures layout');pointer(window,'pointerup',11);assert.equal(commits.length,1);if(!move)assert.deepEqual(commits[0],before,'Unmoved drag must not rewrite preferences');visibleAnchorCases++;}finally{delete globalThis.getComputedStyle;t.input.destroy();}
}
const range=setup();range.touch.setSettings({stickX:-1,stickY:-1,buttonsX:1e9,buttonsY:1e9});assert.equal(range.touch.getSettings().stickX,0);assert.equal(range.touch.getSettings().stickY,0);assert.equal(range.touch.getSettings().buttonsX,2048);assert.equal(range.touch.getSettings().buttonsY,1024);range.input.destroy();
let fittedDragCases=0;
for(const group of['stick','buttons'])for(const sign of[-1,1]){
 const t=setup(),node=group==='stick'?t.dpad:t.fight;window.innerWidth=640;window.innerHeight=360;t.touch.setSettings({stickX:2048,stickY:1024,buttonsX:2048,buttonsY:1024,stickScale:1.4,buttonScale:1.4});
 const rect=()=>{const r=resolveTouchLayout(t.touch.getSettings(),640,360,{left:0,right:0,top:0,bottom:0}),width=group==='stick'?r.padSize*r.stickScale:r.fightWidth*r.buttonScale,height=group==='stick'?r.padSize*r.stickScale:(r.fightHeight-10)*r.buttonScale,left=group==='stick'?r.stickX:640-r.buttonsX-width,bottom=360-(group==='stick'?r.stickY:r.buttonsY);return{left,right:left+width,top:bottom-height,bottom,width,height};};node.getBoundingClientRect=rect;globalThis.getComputedStyle=()=>({getPropertyValue:()=> '0px'});
 try{let commits=0;t.touch.setEditMode(true,()=>{},v=>{commits++;t.touch.setSettings(v);});const before=rect();pointer(node,'pointerdown',11,200,200);pointer(window,'pointermove',11,200+sign*16,200);const first=rect();assert((first.left-before.left)*sign>=-1e-6,'Fitted layout must not move opposite to finger');pointer(window,'pointermove',11,200+sign*32,200);const second=rect();assert((second.left-first.left)*sign>=-1e-6,'Continuing fitted drag is monotonic');pointer(window,'pointerup',11);const after=rect();assert(Math.abs(after.left-second.left)<1e-6,'Commit cannot snap fitted control');assert.equal(commits,1);assert.equal(t.touch.getSettings().stickScale,1.4);assert.equal(t.touch.getSettings().buttonScale,1.4);fittedDragCases++;}finally{delete globalThis.getComputedStyle;t.input.destroy();}
}
console.log(JSON.stringify({passed:true,cases,resetControls,visibleAnchorCases,fittedDragCases,savedSchemaRanges:true,firstPointerOwnsDrag:true,sameAndOtherGroups:true,ignoredPointerInert:true,ownerAnchorPreserved:true,newPointerWorks:true,commitOncePerDrag:true,cancelledDragRestored:true,cancellationNeverCommits:true}));
