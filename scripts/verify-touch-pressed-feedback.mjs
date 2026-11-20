import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {InputBuffer} from '../dist/assets/combat/InputBuffer.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
const actions=['left','right','up','down','lp','mp','hp','lk','mk','hk','jump','start'],buttons=actions.slice(4);let pads=[];
class Element extends EventTarget{dataset={};style={setProperty(){}};classes=new Set();classList={toggle:(name,force)=>{if(force)this.classes.add(name);else this.classes.delete(name);},contains:name=>this.classes.has(name)};setPointerCapture(){};closest(){return this;}}
function setup(){
 globalThis.window=new EventTarget();window.innerWidth=1280;window.innerHeight=720;window.shifted=false;window.geometryOffset=0;
 const nodes=new Map(actions.map(action=>{const n=new Element();n.dataset.action=action;return[action,n];}));
 for(const directions of['up left','up right','down left','down right']){const n=new Element();n.dataset.directions=directions;nodes.set(directions,n);}
 const root=new Element(),dpad=new Element(),fight=new Element();dpad.dataset.layoutGroup='stick';fight.dataset.layoutGroup='buttons';
 root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()].filter(n=>n.dataset.action):s==='[data-directions]'?[...nodes.values()].filter(n=>n.dataset.directions):s==='[data-layout-group]'?[dpad,fight]:[];
 root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);
 globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];
 const rect=()=>{const p=(window.shifted?300:50)+window.geometryOffset;return{left:p,top:p,right:p+200,bottom:p+200,width:200,height:200};};for(const node of nodes.values())node.getBoundingClientRect=rect;dpad.getBoundingClientRect=rect;const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad,fight};
}
function pointer(node,type,id,x=window.shifted?400:100,y=window.shifted?400:100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}

const shown=t=>[...t.nodes].filter(([k,n])=>n.classes.has('pressed')).map(([k])=>k).sort();let buttonCases=0,directionCases=0,resetCases=0;
for(const action of buttons){const t=setup(),n=t.nodes.get(action);pointer(n,'pointerdown',11);assert.deepEqual(shown(t),[action]);pointer(n,'pointerdown',22);pointer(n,'pointerup',11);assert.deepEqual(shown(t),[action],'Second finger retains pressed feedback');pointer(n,'pointercancel',99);assert.deepEqual(shown(t),[action],'Unowned cancellation cannot clear feedback');pointer(n,'pointerup',22);assert.deepEqual(shown(t),[]);pointer(n,'pointerdown',33);pointer(n,'lostpointercapture',22);assert.deepEqual(shown(t),[action]);pointer(n,'lostpointercapture',33);assert.deepEqual(shown(t),[]);t.input.destroy();buttonCases++;}
const directions=['left','right','up','down','up left','up right','down left','down right'];
for(const from of directions)for(const to of directions){const t=setup();document.hit=t.nodes.get(from);pointer(t.dpad,'pointerdown',11);assert.deepEqual(shown(t),[from]);document.hit=t.nodes.get(to);pointer(t.dpad,'pointermove',11);assert.deepEqual(shown(t),[to],'Highlight follows captured pad cell');pointer(t.dpad,'pointerup',99);assert.deepEqual(shown(t),[to]);document.hit=undefined;pointer(t.dpad,'pointermove',11,150,150);assert.deepEqual(shown(t),[],'Neutral center clears feedback');pointer(t.dpad,'pointerup',11);assert.deepEqual(shown(t),[]);t.input.destroy();directionCases++;}
for(const action of [...buttons,...directions])for(const reset of ['all','blur','pause','hide','edit','resize']){const t=setup();if(directions.includes(action)){document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(action),'pointerdown',11);assert.deepEqual(shown(t),[action]);if(reset==='all')t.touch.releaseAll();if(reset==='blur')window.dispatchEvent(new Event('blur'));if(reset==='pause')t.touch.setPaused(true);if(reset==='hide')t.touch.setVisible(false);if(reset==='edit')t.touch.setEditMode(true);if(reset==='resize'){window.shifted=true;window.dispatchEvent(new Event('resize'));}assert.deepEqual(shown(t),[],reset+' clears feedback');t.input.destroy();resetCases++;}
{const t=setup(),e=new Event('keydown',{cancelable:true});Object.defineProperty(e,'code',{value:'KeyJ'});Object.defineProperty(e,'repeat',{value:false});window.dispatchEvent(e);assert(t.input.held('lp'));assert.deepEqual(shown(t),[],'Keyboard hold does not invent a finger');pointer(t.nodes.get('lp'),'pointerdown',11);pointer(t.nodes.get('lp'),'pointerup',11);assert(t.input.held('lp'));assert.deepEqual(shown(t),[],'Final finger release clears feedback even while keyboard holds action');t.input.destroy();}
console.log(JSON.stringify({passed:true,buttonCases,directionCases,resetCases,mixedSourceControl:1}));
