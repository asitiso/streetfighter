import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],audio={playStagePulse(){},playHit(){},playParry(){}};
const enemyState=e=>[e.x,e.y,e.hp,e.superGauge,e.state,e.stateFrame,e.animationFrame,e.aiCooldown];
let cases=0,landings=0,resumeChecks=0,motionSamples=0;
for(const c of roster)for(const stage of [1,2,3,4,5])for(const wave of [1,2])for(const facing of [-1,1])for(const kind of ['air-light','air-heavy','rising']){
 let hostile=false;const input={pressed:key=>hostile&&key!=='start',held:()=>hostile,released:()=>false},scene=new Stage1Scene(input,audio,c,c.superArts[0],stage);scene.enter();scene.introFrames=0;scene.beltWave=wave-1;scene.spawnBeltWave(wave-1);scene.prepareCombatTextures();
 const p=scene.world.player;for(const e of scene.world.enemies)e.receiveHit({...normalFor('hp',false,c.id),damage:99999},p,false);scene.fixedUpdate(1/60,1);assert.equal(scene.beltState,'travel');assert.equal(scene.beltWave,wave);
 p.x=p.previousX=scene.areaStarts[wave]+160;p.facing=facing;p.installFrames=kind==='air-light'?1:kind==='air-heavy'?30:120;p.installPowerScale=1.3;p.installFrameScale=.85;p.installMoveScale=1.2;p.installLabel='GENEI JIN';const move=kind==='rising'?specialMovesFor(c.id).antiAir:airNormalFor(c.id,kind==='air-light'?'lp':'hk');p.startMove(move);p.airborne=true;p.jumpHeight=kind==='air-light'?120:55;p.jumpVelocity=kind==='air-light'?5:3;p.moveFrame=p.currentMove.startup+1;p.stateFrame=p.moveFrame;p.hitStop=2;
 scene.fixedUpdate(1/60,2);assert.equal(scene.waveBreakFrames,54);assert(scene.world.livingEnemies.length>0);assert(p.airborne);hostile=true;
 const clock=p.animationFrame,hp=p.hp,gauge=p.superGauge,worldTime=scene.world.time,result=scene.stageResult(),enemies=scene.world.enemies.map(enemyState),install=[p.installFrames,p.installPowerScale,p.installFrameScale,p.installMoveScale,p.installLabel],samples=new Set();
 for(let tick=1;tick<=54;tick++){
  scene.fixedUpdate(1/60,1000+tick);assert.equal(scene.waveBreakFrames,54-tick);assert.equal(scene.phase,'belt');assert.equal(scene.world.time,worldTime);assert.equal(scene.stageTime,99);assert.deepEqual(scene.stageResult(),result);assert.deepEqual(scene.world.enemies.map(enemyState),enemies,'Arrival pause cannot activate enemy AI');assert.deepEqual([p.hp,p.superGauge],[hp,gauge]);assert.deepEqual([p.installFrames,p.installPowerScale,p.installFrameScale,p.installMoveScale,p.installLabel],install,'Wave wait must preserve active install duration and scales');assert.equal(scene.world.projectiles.length,0);
  const sample=animationSequenceSample(p,scene.time);if(sample)samples.add(sample.sequence.id+':'+sample.frame);if(p.airborne&&!p.currentMove){assert.equal(p.state,'jump');if(kind!=='rising')assert.equal(sample?.sequence.kind,'jump');}
 }
 assert(p.animationFrame>clock,c.id+' wave arrival pause must advance current player motion');assert.equal(p.airborne,false,'Player must land during wave arrival');assert.equal(p.jumpHeight,0);assert.equal(p.currentMove,null,'Held input cannot start new attacks during pause');assert.equal(p.state,'idle');assert(samples.size>1);motionSamples+=samples.size;landings++;
 hostile=false;const before=p.animationFrame,enemyClocks=scene.world.enemies.map(e=>e.animationFrame),elapsed=scene.elapsedCombatFrames;scene.fixedUpdate(1/60,2000);
 assert.equal(p.animationFrame,before+1);assert.equal(p.installFrames,install[0]-1,'Install countdown resumes on first combat tick');if(install[0]===1)assert.deepEqual([p.installPowerScale,p.installFrameScale,p.installMoveScale,p.installLabel],[1,1,1,'']);assert(Math.abs(scene.world.time-worldTime-1/60)<1e-10);assert.equal(scene.elapsedCombatFrames,elapsed+1);assert(scene.stageTime<99);scene.world.enemies.forEach((e,i)=>assert.equal(e.animationFrame,enemyClocks[i]+1,'Enemies start exactly on first fight tick'));resumeChecks++;cases++;
}
// A player can position during the card while enemy bodies and the clock stay fixed.
{
 const c=roster[0], held=new Set(['right','down']);
 const input={pressed:()=>false,held:key=>held.has(key),released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=54;
 const w=scene.world,p=w.player,foe=w.enemies[0];
 p.x=p.previousX=1400;p.y=p.previousY=480;
 const snapshot=w.enemies.map(enemyState);
 scene.fixedUpdate(1/60,1);
 assert(p.x>1400&&p.y>480&&p.state==='walk','Both lanes respond on the first announcement frame');
 assert.deepEqual(w.enemies.map(enemyState),snapshot);
 held.delete('down');p.y=foe.y;
 for(let tick=2;tick<40;tick++)scene.fixedUpdate(1/60,tick);
 assert.equal(p.x,foe.x-58,'Player cannot walk through a waiting enemy');
 assert.deepEqual(w.enemies.map(enemyState),snapshot);
 held.clear();held.add('up');
 for(let tick=40;tick<=54;tick++)scene.fixedUpdate(1/60,tick);
 assert(p.y<foe.y-20&&p.y>=w.rules.arenaTop);
 assert.equal(scene.stageTime,99);
 scene.waveBreakFrames=5;
 held.clear();held.add('right');
 p.x=p.previousX=1400;p.y=p.previousY=525;
 w.addProp({id:'arrival-crate',label:'CRATE',x:1462,y:525,width:66,depth:40,hp:80,solid:true});
 scene.fixedUpdate(1/60,55);
 assert.equal(p.x,1401,'Movement respects solid props during the card');
 assert.deepEqual(w.enemies.map(enemyState),snapshot);
}
// A complete directional tap before one tick still moves once during arrival.
{
 const {InputManager}=await import('../dist/assets/input/InputManager.js');
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
 const input=new InputManager(),c=roster[0],scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=54;
 const w=scene.world,p=w.player;
 p.x=p.previousX=1400;p.y=p.previousY=480;
 const foes=w.enemies.map(enemyState);
 input.setTouchDirections(['right','down']);input.setTouchDirections([]);
 input.setTouch('lp',true);input.setTouch('lp',false);
 input.prepareTick();scene.fixedUpdate(1/60,1);input.endTick();
 assert(p.x>1400&&p.y>480,'A released diagonal must take one step on both axes');
 assert.equal(p.currentMove,null,'An early attack does not fire during arrival');
 const first=[p.x,p.y];
 input.prepareTick();scene.fixedUpdate(1/60,2);input.endTick();
 assert.deepEqual([p.x,p.y],first,'A tap moves once');
 input.setTouchDirections(['right']);input.setTouchDirections([]);
 input.setTouchDirections(['left']);input.setTouchDirections([]);
 input.prepareTick();scene.fixedUpdate(1/60,3);input.endTick();
 assert(p.x<first[0]&&p.y===first[1],'The latest tap owns the step');
 const beforeKeys=[p.x,p.y];
 const key=(type,code)=>{
  const event=new Event(type,{cancelable:true});
  Object.defineProperty(event,'code',{value:code});
  window.dispatchEvent(event);
 };
 key('keydown','ArrowLeft');key('keydown','ArrowDown');
 key('keyup','ArrowLeft');key('keyup','ArrowDown');
 input.prepareTick();scene.fixedUpdate(1/60,4);input.endTick();
 assert(p.x<beforeKeys[0]&&p.y>beforeKeys[1],'Releasing keyboard directions in sequence must preserve the diagonal');
 assert.deepEqual(w.enemies.map(enemyState),foes);
 assert.equal(scene.stageTime,99);
 input.destroy();
}
// Direction taps are already used for positioning during arrival; they must not replay at GO.
{
 const {InputManager}=await import('../dist/assets/input/InputManager.js');
 for(const action of ['none','lp','live-dash']){
  const input=new InputManager(),c=roster[0],scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
  scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=4;
  const p=scene.world.player;
  p.x=p.previousX=1400;p.y=p.previousY=480;
  let tick=1;
  const step=()=>{input.prepareTick();scene.fixedUpdate(1/60,tick++);input.endTick();};
  input.setTouchDirections(['left']);step();
  input.setTouchDirections([]);
  if(action==='lp'){input.setTouch('lp',true);input.setTouch('lp',false);}
  step();
  if(action!=='live-dash')input.setTouchDirections(['left']);
  step();input.setTouchDirections([]);step();
  const x=p.x;
  assert.equal(p.currentMove,null,'Attacks wait for the live wave');
  if(action==='live-dash')input.setTouchDirections(['left']);
  step();
  if(action==='live-dash')assert.equal(p.dashFrames,8,'A new second press on the live tick still dashes');
  else {
   assert.equal(p.x,x,'Arrival movement must not replay as a dash');
   assert.equal(p.dashFrames,0);
   assert.equal(p.currentMove?.id,action==='lp'?'5LP':undefined,'A late attack keeps its own input');
  }
  input.destroy();
 }
}
// The final announcement tick can also be the last recovery tick of the old move.
{
 const {InputManager}=await import('../dist/assets/input/InputManager.js');
 const input=new InputManager(),c=roster[0],scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=1;
 const p=scene.world.player;
 const kick=normalFor('hk',false,c.id);
 p.startMove(kick);p.moveFrame=kick.startup+kick.active+kick.recovery-1;
 input.setTouch('lp',true);input.setTouch('lp',false);
 input.prepareTick();scene.fixedUpdate(1/60,1);input.endTick();
 assert.equal(scene.waveBreakFrames,0);
 assert.equal(p.currentMove,null,'Earlier attack still completes on the last announcement tick');
 assert.equal(scene.stageTime,99,'Combat remains frozen through the last announcement tick');
 input.prepareTick();scene.fixedUpdate(1/60,2);input.endTick();
 assert.equal(p.currentMove?.id,'5LP','The released button survives the coincident recovery end');
 assert.equal(p.moveFrame,0);
 input.destroy();
}
// Arrival must not turn a committed move toward the newly spawned enemies.
for (const facing of [-1, 1]) {
 const c=roster[0],input={held:()=>false,pressed:()=>false,released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=4;
 const w=scene.world,p=w.player;
 const positions=w.enemies.map(e=>e.x);
 p.x=p.previousX=facing===-1?Math.min(...positions)-100:Math.max(...positions)+100;
 p.facing=facing;
 const kick=normalFor('hk',false,c.id);
 p.startMove(kick);p.moveFrame=kick.startup+kick.active+kick.recovery-2;
 const enemies=w.enemies.map(enemyState);
 scene.fixedUpdate(1/60,1);
 assert.equal(p.currentMove,kick);
 assert.equal(p.facing,facing,'A committed attack cannot reverse during the announcement');
 scene.fixedUpdate(1/60,2);
 assert.equal(p.currentMove,null);
 assert.equal(p.facing,-facing,'After recovery the nearest enemy owns facing again');
 assert.deepEqual(w.enemies.map(enemyState),enemies);
}
// A command may start before its button can be reserved for the live wave.
for (const presstime of ['early', 'late']) {
 const {InputManager}=await import('../dist/assets/input/InputManager.js');
 const input=new InputManager(),c=roster[0],scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);scene.waveBreakFrames=11;
 const p=scene.world.player;
 p.x=p.previousX=scene.areaStarts[1]+110;p.y=p.previousY=455;
 let tick=1;
 const step=()=>{input.prepareTick();scene.fixedUpdate(1/60,tick++);input.endTick();assert.equal(p.currentMove,null);};
 const punch=()=>{input.setTouch('lp',true);input.setTouch('lp',false);};
 input.setTouchDirections(['down']);step();
 input.setTouchDirections(['down','right']);step();
 input.setTouchDirections(['right']);
 if (presstime==='early') punch();
 step();input.setTouchDirections([]);
 while(scene.waveBreakFrames>4)step();
 input.setTouchDirections(['right']);
 if(presstime==='late')punch();
 step();input.setTouchDirections([]);
 while(scene.waveBreakFrames>0)step();
 input.prepareTick();scene.fixedUpdate(1/60,tick);input.endTick();
 assert.equal(p.currentMove?.id,presstime==='late'?specialMovesFor(c.id).primary.id:undefined,
  'A late button can use earlier directions without reserving the early button');
 input.destroy();
}
// The market ambush leaves enough space to retreat or switch lanes during arrival.
{
 const c=roster[0],held=new Set();
 const input={pressed:()=>false,held:key=>held.has(key),released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],2);
 scene.introFrames=0;
 const w=scene.world,p=w.player,base=scene.areaStarts[1];
 for(const enemy of w.enemies)enemy.receiveHit({...normalFor('hp',false,c.id),damage:99999},p,false);
 scene.fixedUpdate(1/60,1);
 assert.equal(scene.beltState,'travel');
 p.x=p.previousX=base+150;p.y=p.previousY=500;
 scene.fixedUpdate(1/60,2);
 assert.equal(scene.waveBreakFrames,54);
 const entryX=p.x,enemies=w.enemies.map(enemyState);
 held.add('left');
 for(let tick=3;tick<=52;tick++)scene.fixedUpdate(1/60,tick);
 assert(p.x<=entryX-200,'Market arrival must allow at least 200 pixels of retreat');
 assert.equal(w.rules.arenaTop,405);
 assert.equal(w.rules.arenaBottom,575);
 assert.deepEqual(w.enemies.map(enemyState),enemies);
 assert.equal(scene.stageTime,99);
}
let start=false;const pauseInput={pressed:key=>start&&key==='start',held:()=>false,released:()=>false},pauseScene=new Stage1Scene(pauseInput,audio,roster[0],roster[0].superArts[0]);pauseScene.enter();pauseScene.introFrames=0;pauseScene.waveBreakFrames=54;const pf=pauseScene.world.player;pf.airborne=true;pf.jumpHeight=55;pf.jumpVelocity=3;pf.state='jump';const pc=pf.animationFrame;
start=true;pauseScene.fixedUpdate(1/60,1);assert(pauseScene.paused);start=false;pauseScene.fixedUpdate(1/60,2);assert.equal(pauseScene.waveBreakFrames,54);assert.equal(pf.animationFrame,pc);assert.equal(pf.jumpHeight,55);start=true;pauseScene.fixedUpdate(1/60,3);assert.equal(pauseScene.paused,false);start=false;pauseScene.fixedUpdate(1/60,4);assert.equal(pauseScene.waveBreakFrames,53);assert.equal(pf.animationFrame,pc+1);
console.log('WAVE_BREAK_PLAYER_SETTLE_PASS',{characters:10,stages:5,nextWaves:2,facings:2,cases,landings,resumeChecks,motionSamples,pauseTicks:54,userPausePreserved:true,installTimerPreserved:true,enemiesFrozen:true,resultsFrozen:true,combatInputSuppressed:true,movementAndCollisions:true});
