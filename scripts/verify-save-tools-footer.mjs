import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {SaveToolsScene} from '../dist/assets/scenes/SaveToolsScene.js';
import {GameApp} from '../dist/assets/core/GameApp.js';
const audio={playStagePulse(){},playUiConfirm(){}};
function fixture(){
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pad=null;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});
 const input=new InputManager(),classes=new Set(),nodes=new Map(['lp','mp','hp','start'].map(a=>[a,{textContent:a==='start'?'START':a.toUpperCase()}]));let layouts=0;
 const touch=Object.create(TouchControls.prototype);
 Object.assign(touch,{input,utilityMode:null,settings:{stickScale:1.4,buttonScale:.7,stickX:64,stickY:48,buttonsX:52,buttonsY:44},element:{classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},querySelector(selector){return nodes.get(/data-action="([^"]+)"/.exec(selector)?.[1])??null;}},pointerPoints:new Map(),buttonPointers:new Map(),dpadActions:[],directionPressed:null,dpadPointerId:null,drag:null,applySettings(){layouts++;}});
 let backs=0,exports=0,imports=0;
 const s=new SaveToolsScene(input,audio,{},()=>backs++,active=>touch.setSaveToolsMode(active));
 s.exportFile=async()=>{exports++;};s.openImportPicker=()=>{imports++;};
 const codes={lp:'KeyJ',mp:'KeyK',lk:'KeyU',back:'Escape',start:'KeyP'},buttons={lp:0,mp:1,lk:2,back:8,start:9};
 function press(actions,source){
  for(const a of actions){if(source==='touch'){input.setTouch(a,true);input.setTouch(a,false);}else if(source==='keyboard')for(const type of ['keydown','keyup']){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:codes[a]});window.dispatchEvent(e);}}
  if(source==='gamepad')pad={connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:actions.some(a=>buttons[a]===i)}))};
  input.prepareTick();s.fixedUpdate(1/60);input.endTick();pad=null;
 }
 return{input,touch,s,classes,nodes,press,counts:()=>({backs,exports,imports}),layouts:()=>layouts,close(){s.exit();s.destroy();input.destroy();}};
}
let cases=0;
for(const close of ['exit','destroy']){const f=fixture();try{f.s.enter();assert(f.classes.has('save-tools-mode'),'Save tools entry must activate its compact footer');assert(!f.classes.has('update-mode'));f.s[close]();assert(!f.classes.has('save-tools-mode'));assert.equal(f.layouts(),2);cases++;}finally{f.close();}}
for(const source of ['keyboard','touch','gamepad'])for(const action of ['lp','mp','lk','back','start']){const f=fixture();try{f.s.enter();f.press([action],source);assert.deepEqual(f.counts(),{exports:action==='lp'?1:0,imports:action==='mp'?1:0,backs:action==='lk'||action==='back'||action==='start'&&source==='touch'?1:0});cases++;}finally{f.close();}}
for(const source of ['keyboard','touch','gamepad'])for(const exit of ['lk','back',...(source==='touch'?['start']:[])]){const f=fixture();try{f.s.enter();f.press(['lp','mp',exit],source);assert.deepEqual(f.counts(),{backs:1,exports:0,imports:0},'Back must not start file actions');cases++;}finally{f.close();}}
for(const source of ['keyboard','touch','gamepad']){const f=fixture();try{f.s.enter();f.press(['lp','mp'],source);assert.deepEqual(f.counts(),{backs:0,exports:1,imports:0},'One frame cannot start both file operations');cases++;}finally{f.close();}}
{const f=fixture();try{const before=f.touch.getSettings();for(const a of ['lp','start','left'])f.input.setTouch(a,true);f.touch.setSaveToolsMode(true);for(const a of ['lp','start','left']){assert(!f.input.touchHeld(a));assert(!f.input.pressed(a));}assert.deepEqual([...f.nodes.values()].map(n=>n.textContent),['EXPORT','IMPORT','HP','BACK']);f.input.setTouch('lp',true);f.touch.setSaveToolsMode(true);assert(f.input.touchHeld('lp'));f.touch.setSaveToolsMode(false);assert(!f.input.touchHeld('lp'));assert(!f.input.pressed('lp'));assert.deepEqual(f.touch.getSettings(),before);assert.deepEqual([...f.nodes.values()].map(n=>n.textContent),['LP','MP','HP','START']);cases++;}finally{f.close();}}
{const f=fixture();try{f.touch.setSaveToolsMode(true);f.touch.setUpdateMode(true);f.touch.setSaveToolsMode(false);assert(f.classes.has('update-mode'),'Old mode cleanup cannot clear a newer utility footer');f.touch.setUpdateMode(false);assert(!f.classes.has('update-mode'));cases++;}finally{f.close();}}
{const f=fixture();try{let captured;await GameApp.prototype.showSaveTools.call({input:f.input,audio,touch:f.touch,scenes:{setScene:async scene=>captured=scene}});captured.enter();assert(f.classes.has('save-tools-mode'));captured.exit();captured.destroy();assert(!f.classes.has('save-tools-mode'));cases++;}finally{f.close();}}
console.log(JSON.stringify({passed:true,cases,deviceSources:3,backPriority:true,oneOperationPerTick:true,settingsPreserved:true,noRealFileOperations:true}));