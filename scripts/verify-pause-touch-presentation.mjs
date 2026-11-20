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

import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {Stage2Scene} from '../dist/assets/scenes/Stage2Scene.js';
import {Stage3Scene} from '../dist/assets/scenes/Stage3Scene.js';
import {Stage4Scene} from '../dist/assets/scenes/Stage4Scene.js';
import {Stage5Scene} from '../dist/assets/scenes/Stage5Scene.js';
let blocked=0,lifecycle=0;
for(const action of actions.filter(a=>a!=='start')){const t=setup();if(['left','right','up','down'].includes(action)){document.hit=t.nodes.get(action);pointer(t.dpad,'pointerdown',11);}else pointer(t.nodes.get(action),'pointerdown',11);assert(t.input.touchHeld(action));t.touch.setPaused(true);assert.equal(t.input.touchHeld(action),false);t.input.endTick();if(['left','right','up','down'].includes(action)){pointer(t.dpad,'pointerdown',22);pointer(t.dpad,'pointermove',11);}else pointer(t.nodes.get(action),'pointerdown',22);assert.equal(t.input.held(action),false);pointer(t.nodes.get('start'),'pointerdown',33);assert(t.input.pressed('start'));t.touch.setPaused(false);t.input.endTick();assert.equal(t.input.touchHeld('start'),false);if(['left','right','up','down'].includes(action))pointer(t.dpad,'pointerdown',44);else pointer(t.nodes.get(action),'pointerdown',44);assert(t.input.touchHeld(action));t.input.destroy();blocked++;}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const [index,Scene] of [Stage1Scene,Stage2Scene,Stage3Scene,Stage4Scene,Stage5Scene].entries())for(const finish of ['exit','destroy']){const t=setup(),events=[],callback=p=>{events.push(p);t.touch.setPaused(p);};const args=[t.input,{},c,c.superArts[0],...(index===0?[1]:[]),undefined,undefined,callback];const scene=new Scene(...args);scene.introFrames=0;pointer(t.nodes.get('start'),'pointerdown',1);t.input.prepareTick();scene.fixedUpdate(1/60,1);t.input.endTick();assert.equal(scene.paused,true);assert.equal(t.touch.paused,true);scene[finish]();assert.equal(t.touch.paused,false);assert.deepEqual(events,[true,false]);t.input.destroy();lifecycle++;}
console.log(JSON.stringify({passed:true,blocked,lifecycle}));

let postCombatCases=0;
for(const c of CHARACTERS)for(const [index,Scene]of [Stage1Scene,Stage2Scene,Stage3Scene,Stage4Scene,Stage5Scene].entries())for(const reason of ['ko','time-over','clear'])for(const finish of ['exit','destroy']){
 const t=setup(),audio=new Proxy({},{get:()=>()=>{}}),callback=active=>t.touch.setPostCombatMode(active),args=[t.input,audio,c,c.superArts[0],...(index===0?[1]:[]),undefined,undefined,undefined,callback],s=new Scene(...args);s.introFrames=0;
 if(reason==='time-over')s.stageTime=0;else if(reason==='ko'){s.world.player.hp=0;s.world.player.state='ko';s.world.player.stateFrame=-90;}else{if(index===4){s.prepareFinalDuel();s.phase='final-duel';}else{s.prepareDuel();s.phase='duel';}s.world.enemy.hp=0;s.world.enemy.state='ko';s.world.enemy.stateFrame=-90;}
 s.fixedUpdate(1/60,1);assert.equal(t.touch.postCombatMode,true,'Result phase must clear combat controls');assert.equal(s.paused,false,'Post-combat display is not a simulation pause');pointer(t.nodes.get('hp'),'pointerdown',11);assert(!t.input.touchHeld('hp'),'Hidden touch attacks cannot create ghost input');pointer(t.nodes.get('start'),'pointerdown',22);assert(t.input.pressed('start'),'START remains available');s[finish]();assert.equal(t.touch.postCombatMode,false,'Result controls cannot leak to the next scene');assert(!t.input.touchHeld('start'));t.input.destroy();postCombatCases++;
}
console.log('POST_COMBAT_TOUCH_PASS',{postCombatCases,clearAndDefeat:true,startAvailable:true,sceneExitRestoresControls:true});
import{SceneManager}from'../dist/assets/core/SceneManager.js';
let postCombatRouteCases=0;
for(const [index,Scene]of [Stage1Scene,Stage2Scene,Stage3Scene,Stage4Scene,Stage5Scene].entries())for(const reason of ['ko','clear'])for(const failFirst of [false,true]){
 const t=setup(),manager=new SceneManager(),audio=new Proxy({},{get:()=>()=>{}}),c=CHARACTERS[1],mode=active=>t.touch.setPostCombatMode(active);let calls=0,next;
 const make=(clear,defeat)=>new Scene(t.input,audio,c,c.superArts[0],...(index===0?[1]:[]),clear,defeat,undefined,mode);
 const route=()=>{calls++;if(failFirst&&calls===1)throw Error('controlled route failure');next=make();return manager.setScene(next);};
 const s=make(route,route);await manager.setScene(s);s.introFrames=0;if(reason==='ko'){s.world.player.hp=0;s.world.player.state='ko';s.world.player.stateFrame=-90;}else{if(index===4){s.prepareFinalDuel();s.phase='final-duel';}else{s.prepareDuel();s.phase='duel';}s.world.enemy.hp=0;s.world.enemy.state='ko';s.world.enemy.stateFrame=-90;}
 s.fixedUpdate(1/60,1);assert(t.touch.postCombatMode);if(reason==='ko')s.defeatFrames=0;else{s.phase='clear';s.phaseFrames=0;}s.routeError='RETRY';
 const tapStart=()=>{pointer(t.nodes.get('start'),'pointerdown',33);pointer(t.nodes.get('start'),'pointerup',33);t.input.prepareTick();s.fixedUpdate(1/60,2);t.input.endTick();};tapStart();if(failFirst){assert.equal(calls,1);assert(t.touch.postCombatMode,'Failed route keeps readable result controls');assert(s.routeError);tapStart();}await manager.transitionTail;assert.equal(manager.activeScene,next);assert.equal(calls,failFirst?2:1);assert(!t.touch.postCombatMode);assert(!t.input.pressed('start')&&!t.input.touchHeld('start'),'Retry START cannot pause the new scene');pointer(t.nodes.get('hp'),'pointerdown',44);assert(t.input.touchHeld('hp'),'Fresh combat controls work after actual scene replacement');next.exit();next.destroy();t.input.destroy();postCombatRouteCases++;
}
console.log('POST_COMBAT_SCENE_ROUTE_PASS',{postCombatRouteCases,failedRouteKeepsFooter:true,replacementRestoresCombat:true,noGhostStart:true});
import{GameApp}from'../dist/assets/core/GameApp.js';import{DEFAULT_SAVE}from'../dist/assets/save/SaveManager.js';
let postCombatFactoryCases=0;
for(const c of CHARACTERS)for(const stage of [1,2,3,4,5]){
 const t=setup(),app=Object.create(GameApp.prototype),audio=new Proxy({},{get:()=>()=>{}});Object.assign(app,{input:t.input,touch:t.touch,audio,scenes:new SceneManager(),assets:{prefetchGroup(){}},recovery:{checkpoint(){}},save:{...DEFAULT_SAVE,stageSelectUnlocked:true,selectedCharacter:c.id},loadStageModule:async(_group,importer)=>importer()});
 await app.startStageNumber(stage,c,c.superArts[0],false,true);const previous=app.scenes.activeScene;previous.introFrames=0;previous.world.player.hp=0;previous.world.player.state='ko';previous.world.player.stateFrame=-90;app.scenes.fixedUpdate(1/60,1);assert(t.touch.postCombatMode,'Real stage factory wires result controls');previous.defeatFrames=0;pointer(t.nodes.get('start'),'pointerdown',55);pointer(t.nodes.get('start'),'pointerup',55);t.input.prepareTick();app.scenes.fixedUpdate(1/60,2);t.input.endTick();for(let n=0;n<30&&app.scenes.activeScene===previous;n++)await new Promise(setImmediate);await app.scenes.transitionTail;const next=app.scenes.activeScene;assert(next&&next!==previous,'Real GameApp defeat callback restarts stage');assert.equal(next.constructor.name,['Stage1Scene','Stage2Scene','Stage3Scene','Stage4Scene','Stage5Scene'][stage-1]);assert(!t.touch.postCombatMode,'Factory restart restores combat presentation');assert(!t.input.pressed('start')&&!t.input.touchHeld('start'));assert(!next.paused);pointer(t.nodes.get('hp'),'pointerdown',66);assert(t.input.touchHeld('hp'),'Fresh attack works after factory restart');next.exit();next.destroy();t.input.destroy();postCombatFactoryCases++;
}
console.log('POST_COMBAT_GAMEAPP_FACTORY_PASS',{postCombatFactoryCases,realFactories:5,realDefeatCallbacks:true,restoredWithoutGhostStart:true});