import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.hidden=false;let pads=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
const keys=[['KeyJ','lp'],['KeyK','mp'],['KeyL','hp'],['KeyU','lk'],['KeyI','mk'],['KeyO','hk'],['Space','jump'],['Enter','confirm'],['KeyP','start']];
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
function lose(kind){if(kind==='hidden'){document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}else window.dispatchEvent(new Event(kind));}
function setup(){const input=new InputManager(),touch=Object.assign(Object.create(TouchControls.prototype),{input,buttonPointers:new Map(),pointerPoints:new Map(),drag:null,dpadPointerId:null,dpadActions:[]});const release=()=>touch.releaseAll();document.addEventListener('visibilitychange',release);window.addEventListener('pagehide',release);return {input,close(){input.destroy();document.removeEventListener('visibilitychange',release);window.removeEventListener('pagehide',release);}};}
let cases=0,gameplayCases=0,auxiliaryControls=0,freshPressChecks=0,failures=[];
for(const [code,action]of keys)for(const kind of ['blur','pagehide','hidden'])for(const source of ['released-keyboard','mixed','touch-only']){
 if(action==='confirm'&&source!=='released-keyboard')continue;document.hidden=false;pads=[];const session=setup(),input=session.input;if(source!=='touch-only'){key('keydown',code);if(source==='released-keyboard')key('keyup',code);}if(source!=='released-keyboard')input.setTouch(action,true);assert(input.pressed(action));lose(kind);
 if(input.pressed(action)||input.touchPressed(action))failures.push(code+' '+kind+' '+source+' retains pending press');if(kind!=='blur')assert.equal(input.held(action),false,'App background touch release completes');else if(source!=='released-keyboard')assert(input.touchHeld(action),'Plain blur retains independent held touch ownership');
 input.endTick();input.setTouch(action,false);input.endTick();document.hidden=false;key('keydown',code);assert(input.pressed(action));key('keyup',code);freshPressChecks++;session.close();cases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const kind of ['pagehide','hidden'])for(const source of ['released-keyboard','mixed','touch-only']){
 document.hidden=false;pads=[];const session=setup(),input=session.input,w=new CombatWorld(c,getCharacter('RYU'),'duel'),f=w.player;if(source!=='touch-only'){key('keydown','KeyJ');if(source==='released-keyboard')key('keyup','KeyJ');}if(source!=='released-keyboard')input.setTouch('lp',true);lose(kind);f.updatePlayer(input,w.rules);if(f.currentMove!==null||f.state!=='idle')failures.push(c.id+' '+kind+' '+source+' phantom attack on resume');session.close();gameplayCases++;
}
for(const source of ['touch','gamepad'])for(const kind of ['blur','pagehide','hidden']){
 document.hidden=false;pads=[];const input=new InputManager();if(source==='touch')input.setTouch('lp',true);else{pads=[{axes:[0,0],buttons:[{pressed:true}]}];input.prepareTick();}lose(kind);assert(input.held('lp'),'Keep independently held device');if(input.pressed('lp')||input.touchPressed('lp'))failures.push(source+' '+kind+' replays old edge');input.endTick();if(source==='touch'){input.setTouch('lp',false);input.endTick();input.setTouch('lp',true);}else{pads=[];input.prepareTick();input.endTick();pads=[{axes:[0,0],buttons:[{pressed:true}]}];input.prepareTick();}assert(input.pressed('lp'));input.destroy();auxiliaryControls++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('BACKGROUND_INPUT_EDGE_PASS',{cases,gameplayCases,auxiliaryControls,freshPressChecks,noPhantomActions:true,heldDeviceOwnershipPreserved:true});
