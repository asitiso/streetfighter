import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.window=new EventTarget();let pads=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);assert(e.defaultPrevented);}
function padFor(action){const p={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};if(action==='left')p.axes[0]=-1;if(action==='right')p.axes[0]=1;if(action==='up')p.axes[1]=-1;if(action==='down')p.axes[1]=1;if(action==='back')p.buttons[8].pressed=true;if(action==='start')p.buttons[9].pressed=true;return p;}
const aliases=[['left','ArrowLeft','KeyA'],['right','ArrowRight','KeyD'],['up','ArrowUp','KeyW'],['down','ArrowDown','KeyS'],['back','Escape','Backspace'],['start','KeyP','Pause']];
let cases=0,sourceControls=0,gameplayCases=0,failures=[];
for(const [action,a,b]of aliases)for(const reverse of [false,true])for(const releaseFirst of [false,true])for(const separateTicks of [false,true])for(const source of ['keyboard','touch','gamepad']){
 pads=[];const input=new InputManager(),keys=reverse?[b,a]:[a,b];key('keydown',keys[0]);assert(input.held(action));assert(input.pressed(action));if(separateTicks)input.endTick();key('keydown',keys[1]);assert(input.held(action));if(separateTicks)assert.equal(input.pressed(action),false,'Alias is not a new action edge');
 if(source==='touch')input.setTouch(action,true);if(source==='gamepad'){pads=[padFor(action)];input.prepareTick();}input.endTick();key('keydown',keys[1]);assert.equal(input.pressed(action),false,'Repeated keydown cannot press twice');const released=releaseFirst?keys[0]:keys[1],remaining=releaseFirst?keys[1]:keys[0];key('keyup',released);
 if(!input.held(action)||input.released(action))failures.push(action+' '+reverse+' '+releaseFirst+' '+separateTicks+' '+source+' released while another key held');input.endTick();key('keyup',remaining);if(source==='keyboard'){assert.equal(input.held(action),false);if(!input.released(action))failures.push(action+' final physical release edge missing');}else{assert(input.held(action));assert.equal(input.released(action),false);if(source==='touch')input.setTouch(action,false);else{pads=[];input.prepareTick();}assert.equal(input.held(action),false);assert(input.released(action));sourceControls++;}input.destroy();cases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const reverse of [false,true])for(const releaseFirst of [false,true]){
 pads=[];const input=new InputManager(),w=new CombatWorld(c,getCharacter('RYU'),'duel'),f=w.player,e=w.enemy,back=facing===1?'left':'right',pair=aliases.find(a=>a[0]===back).slice(1),keys=reverse?pair.reverse():pair;f.x=f.previousX=500;f.facing=facing;key('keydown',keys[0]);input.endTick();key('keydown',keys[1]);input.endTick();key('keyup',keys[releaseFirst?0:1]);const x=f.x,hp=f.hp;f.updatePlayer(input,w.rules);if(!(facing===1?f.x<x:f.x>x))failures.push(c.id+' remaining back key did not move player');e.x=f.x+facing*45;e.y=f.y;e.facing=-facing;e.startMove(normalFor('mp',false,'RYU'));e.moveFrame=e.currentMove.startup;w.resolveAttack(e,f,input);if(f.hp!==hp||f.state!=='block')failures.push(c.id+' remaining back key did not guard');input.destroy();gameplayCases++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('KEYBOARD_ALIAS_PASS',{aliases:6,cases,sourceControls,gameplayCases,physicalKeyOwnership:true,repeatAndActionEdgesPreserved:true,touchAndGamepadPreserved:true});
