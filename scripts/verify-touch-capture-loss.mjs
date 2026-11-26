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
 globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];
 const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad,fight};
}
function pointer(node,type,id,x=100,y=100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
const layoutOnly=process.argv.includes('--layout-only'),keys={lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO',jump:'Space',start:'KeyP'},padButtons={lp:0,mp:1,hp:3,lk:2,mk:4,hk:5,jump:8,start:9};
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
let buttonCases=0,dragCases=0,dpadControls=0,resetControls=0,gameplayCases=0;
if(!layoutOnly)for(const a of buttons)for(const reverse of[false,true])for(const second of[false,true])for(const duplicate of['pointerup','pointercancel','pointerleave','lostpointercapture'])for(const source of['touch','keyboard','gamepad']){
 const t=setup(),n=t.nodes.get(a),ids=reverse?[22,11]:[11,22];pointer(n,'pointerdown',ids[0]);if(second)pointer(n,'pointerdown',ids[1]);
 if(source==='keyboard')key('keydown',keys[a]);if(source==='gamepad'){pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[padButtons[a]].pressed=true;t.input.prepareTick();}t.input.endTick();
 pointer(n,'lostpointercapture',99);assert(t.input.touchHeld(a),'Unowned capture loss cannot release button');pointer(n,'lostpointercapture',ids[0]);assert.equal(t.input.touchHeld(a),second,'Only captured pointer ownership may remain');pointer(n,duplicate,ids[0]);assert.equal(t.input.touchHeld(a),second,'Duplicate event cannot release another finger');if(second)pointer(n,'lostpointercapture',ids[1]);assert.equal(t.input.touchHeld(a),false);assert.equal(t.touch.buttonPointers.has(a),false);if(source!=='touch')assert(t.input.held(a),'Other physical input ownership retained');
 t.input.endTick();pointer(n,'pointerdown',33);assert(t.input.touchHeld(a));assert(t.input.touchPressed(a));pointer(n,'lostpointercapture',ids[0]);pointer(n,duplicate,ids[1]);assert(t.input.touchHeld(a),'Old capture event cannot release new finger');pointer(n,'lostpointercapture',33);assert.equal(t.input.touchHeld(a),false);t.input.destroy();buttonCases++;
}
for(const group of['stick','buttons'])for(const duplicate of['pointerup','pointercancel','lostpointercapture']){
 const t = setup();
 const node = group === 'stick' ? t.dpad : t.fight;
 const original = t.touch.getSettings();
 const previews = [];
 const commits = [];
 t.touch.setEditMode(true, settings => previews.push(settings), settings => commits.push(settings));

 pointer(node, 'pointerdown', 11);
 pointer(window, 'pointermove', 11, 120, 90);
 assert.equal(previews.length, 1);
 assert.notDeepEqual(t.touch.getSettings(), original);
 pointer(node, 'lostpointercapture', 99);
 assert(t.touch.drag);
 assert.equal(commits.length, 0);

 pointer(node, 'lostpointercapture', 11);
 assert.equal(t.touch.drag, null);
 assert.deepEqual(previews[1], original, 'Capture loss restores the previous preview');
 assert.deepEqual(t.touch.getSettings(), original);
 pointer(window, 'pointermove', 11, 200, 200);
 pointer(duplicate === 'lostpointercapture' ? node : window, duplicate, 11);
 assert.equal(previews.length, 2, 'Duplicate ends do not preview again');
 assert.equal(commits.length, 0, 'Capture loss never commits a drag');

 pointer(node, 'pointerdown', 33);
 pointer(window, 'pointermove', 33, 110, 95);
 const saved = t.touch.getSettings();
 pointer(node, 'lostpointercapture', 11);
 assert.equal(t.touch.drag.pointerId, 33, 'A late end cannot cancel the new owner');
 pointer(window, 'pointerup', 33);
 pointer(node, 'lostpointercapture', 33);
 assert.deepEqual(commits, [saved], 'A normal release commits once');
 assert.deepEqual(t.touch.getSettings(), saved);
 assert.equal(previews.length, 3);
 t.input.destroy();
 dragCases++;
}
for(const group of['stick','buttons'])for(const reset of['blur','hide','exit-edit']){
 const t=setup(),node=group==='stick'?t.dpad:t.fight;let commits=0;t.touch.setEditMode(true,()=>{},()=>commits++);pointer(node,'pointerdown',11);pointer(window,'pointermove',11,120,90);if(reset==='blur')window.dispatchEvent(new Event('blur'));if(reset==='hide')t.touch.setVisible(false);if(reset==='exit-edit')t.touch.setEditMode(false);pointer(node,'lostpointercapture',11);assert.equal(commits,0,'Cancelled drag must not commit after reset');assert.equal(t.touch.drag,null);t.input.destroy();resetControls++;
}
if(!layoutOnly)for(const a of['left','right','up','down','up left','up right','down left','down right']){
 const t=setup();document.hit=t.nodes.get(a);pointer(t.dpad,'pointerdown',11);pointer(t.dpad,'lostpointercapture',11);for(const d of['left','right','up','down'])assert.equal(t.input.touchHeld(d),false);assert.equal(t.touch.dpadPointerId,null);t.input.destroy();dpadControls++;
}
if(!layoutOnly)for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const a of buttons){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player,n=t.nodes.get(a);f.x=f.previousX=500;f.facing=face;f.superGauge=100;pointer(n,'pointerdown',11);t.input.endTick();pointer(n,'lostpointercapture',11);assert.equal(t.input.touchHeld(a),false);
 const punch=['lp','mp','hp'].includes(a),next=punch?(a==='lp'?'mp':'lp'):'lp';if(punch){const forward=face===1?'right':'left';t.input.setTouchDirections(['down']);t.input.setTouchDirections(['down',forward]);t.input.setTouchDirections([forward]);}
 pointer(t.nodes.get(next),'pointerdown',33);pointer(t.nodes.get(next),'pointerup',33);t.input.prepareTick();f.captureInput(t.input,100);f.updatePlayer(t.input,w.rules);assert.equal(f.currentMove?.id,punch?specialMovesFor(c.id).primary.id:'5LP','Lost pointer cannot supply ghost EX or throw chord');assert.equal(f.superGauge,100);t.input.destroy();gameplayCases++;
}
console.log(JSON.stringify({passed:true,buttonCases,dragCases,dpadControls,resetControls,gameplayCases,lastFingerOwnsRelease:true,duplicateEndIgnored:true,commitOnce:true,interruptedDragRestored:true,freshPointerWorks:true,noGhostChord:true}));

// An aborted owned dpad gesture must not complete a command after a fresh touch.
// Normal pointerup and its later lost-capture notification retain legal motions.
let canceledMotionCases=0,physicalOwnershipControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const sampled of[false,true])for(const endType of['pointercancel','lostpointercapture','pointerup']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player,F=face===1?'right':'left';f.x=f.previousX=500;f.facing=face;
 document.hit=t.nodes.get('down');pointer(t.dpad,'pointerdown',11);document.hit=t.nodes.get('down '+F);pointer(t.dpad,'pointermove',11);
 if(sampled){t.input.prepareTick();f.captureInput(t.input,100);f.updatePlayer(t.input,w.rules);t.input.endTick();}
 const epoch=t.input.historyEpoch;pointer(t.dpad,endType,99);assert.equal(t.input.historyEpoch,epoch,'Unowned ending must not reset commands');
 pointer(t.dpad,endType,11);document.hit=t.nodes.get(F);pointer(t.dpad,'pointerdown',33);const freshEpoch=t.input.historyEpoch;
 pointer(t.dpad,'lostpointercapture',11);assert.equal(t.input.historyEpoch,freshEpoch,'Old capture loss must not reset a new gesture');
 pointer(t.nodes.get('lp'),'pointerdown',44);pointer(t.nodes.get('lp'),'pointerup',44);t.input.prepareTick();f.captureInput(t.input,101);f.updatePlayer(t.input,w.rules);
 assert.equal(f.currentMove?.id,endType==='pointerup'?specialMovesFor(c.id).primary.id:'5LP',c.id+'/'+face+'/'+mode+'/'+sampled+'/'+endType+' stale command');
 assert.equal(t.input.historyEpoch,epoch+(endType==='pointerup'?0:1));t.input.destroy();canceledMotionCases++;
}
for(const endType of['pointercancel','lostpointercapture']){
 const t=setup();key('keydown','KeyJ');pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[1].pressed=true;t.input.prepareTick();
 pointer(t.nodes.get('hk'),'pointerdown',44);document.hit=t.nodes.get('down');pointer(t.dpad,'pointerdown',11);pointer(t.dpad,endType,11);
 assert(t.input.held('lp')&&t.input.pressed('lp'),'Cancelled pad cannot discard pending keyboard attack');assert(t.input.held('mp')&&t.input.pressed('mp'),'Gamepad ownership survives');assert(t.input.touchHeld('hk')&&t.input.pressed('hk'),'Other finger attack survives');
 t.input.destroy();physicalOwnershipControls++;
}
console.log(JSON.stringify({canceledMotionCases,physicalOwnershipControls,normalPointerupRetainsMotion:true,ownedCancelDiscardsPartialMotion:true}));

let directionEdgeCases = 0;
for (const endType of ['pointercancel', 'lostpointercapture', 'pointerup']) {
  for (const prior of ['none', 'keyboard', 'touch']) {
    const t = setup();
    const character = CHARACTERS[0];
    const world = new CombatWorld(character, character, 'duel');
    document.hit = t.nodes.get('up');
    if (prior === 'keyboard') {
      key('keydown', 'ArrowUp');
      key('keyup', 'ArrowUp');
    }
    if (prior === 'touch') {
      pointer(t.dpad, 'pointerdown', 11);
      pointer(t.dpad, 'pointerup', 11);
    }
    pointer(t.dpad, 'pointerdown', 22);
    document.hit = t.nodes.get('right');
    pointer(t.dpad, 'pointermove', 22);
    pointer(t.dpad, endType, 22);

    const completed = endType === 'pointerup';
    const shouldJump = completed || prior !== 'none';
    assert.equal(t.input.pressed('right'), completed, endType + ' pending direction');
    assert.equal(t.input.touchPressed('up'), completed || prior === 'touch', endType + ' pending touch source');
    world.update(t.input, 1);
    assert.equal(world.player.airborne, shouldJump, endType + '/' + prior + ' duel jump');
    t.input.destroy();
    directionEdgeCases++;
  }
}
console.log(JSON.stringify({ directionEdgeCases, abortedDirectionsCannotJump: true }));

let canceledButtonPressCases=0,canceledButtonMoveCases=0;
for(const action of buttons)for(const endType of['pointercancel','pointerleave','lostpointercapture'])for(const source of['none','keyboardTap','gamepadTap','heldKeyboard','heldGamepad','priorTouchTap','twoAllCancelled','normalThenCancel']){
 const t=setup(),n=t.nodes.get(action),code=keys[action],padIndex=padButtons[action];
 const pad=held=>{pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[padIndex].pressed=held;t.input.prepareTick();};
 if(source==='heldKeyboard'){key('keydown',code);t.input.endTick();}if(source==='heldGamepad'){pad(true);t.input.endTick();}
 if(source==='priorTouchTap'){pointer(n,'pointerdown',1);pointer(n,'pointerup',1);}
 pointer(n,'pointerdown',11);
 if(source==='keyboardTap'){key('keydown',code);key('keyup',code);}if(source==='gamepadTap'){pad(true);pad(false);}
 if(source==='twoAllCancelled'||source==='normalThenCancel'){pointer(n,'pointerdown',22);pointer(n,source==='normalThenCancel'?'pointerup':endType,11);assert(t.input.touchHeld(action));pointer(n,endType,22);}else pointer(n,endType,11);
 const valid=['keyboardTap','gamepadTap','priorTouchTap','normalThenCancel'].includes(source);
 assert.equal(t.input.pressed(action),valid,action+'/'+endType+'/'+source+' pending press');assert.equal(t.input.touchPressed(action),source==='priorTouchTap'||source==='normalThenCancel');assert.equal(t.input.touchHeld(action),false);
 if(source==='heldKeyboard'||source==='heldGamepad')assert(t.input.held(action),'Held physical source survives cancellation');
 t.input.endTick();pointer(n,'pointerdown',33);pointer(n,endType,11);pointer(n,'pointerup',33);assert(t.input.touchPressed(action),'Fresh normal tap remains valid');t.input.destroy();canceledButtonPressCases++;
}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel']){
 const t=setup(),w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.superGauge=100;pointer(t.nodes.get('lp'),'pointerdown',11);pointer(t.nodes.get('lp'),'pointercancel',11);const F=face===1?'right':'left';
 t.input.setTouchDirections(['down']);t.input.setTouchDirections(['down',F]);t.input.setTouchDirections([F]);pointer(t.nodes.get('mp'),'pointerdown',22);pointer(t.nodes.get('mp'),'pointerup',22);
 f.captureInput(t.input,100);f.updatePlayer(t.input,w.rules);assert.equal(f.currentMove?.id,specialMovesFor(c.id).primary.id,'Cancelled LP cannot manufacture EX');assert.equal(f.superGauge,100);t.input.destroy();canceledButtonMoveCases++;
}
console.log(JSON.stringify({canceledButtonPressCases,canceledButtonMoveCases,physicalShortTapsPreserved:true,completedTouchTapsPreserved:true}));

let heldPhysicalCompletedTouchControls=0;
for(const source of['keyboard','gamepad'])for(const pattern of['twoFingers','priorCompletedTap']){
 const t=setup(),n=t.nodes.get('lp');
 const physical=held=>{if(source==='keyboard')key(held?'keydown':'keyup','KeyJ');else{pads=[{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];pads[0].buttons[0].pressed=held;t.input.prepareTick();}};
 physical(true);t.input.endTick();pointer(n,'pointerdown',11);
 if(pattern==='twoFingers'){pointer(n,'pointerdown',22);pointer(n,'pointerup',11);assert(!t.input.pressed('lp'));pointer(n,'pointercancel',22);}
 else{pointer(n,'pointerup',11);physical(false);pointer(n,'pointerdown',22);pointer(n,'pointercancel',22);}
 assert.equal(t.input.pressed('lp'),false,source+'/'+pattern+' cannot synthesize an aggregate press');assert(t.input.touchPressed('lp'),'Completed normal touch keeps its source edge');t.input.destroy();heldPhysicalCompletedTouchControls++;
}
console.log(JSON.stringify({heldPhysicalCompletedTouchControls}));
