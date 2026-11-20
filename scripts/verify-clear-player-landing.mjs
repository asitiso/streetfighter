import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {transitionPolishProfile} from '../dist/assets/render/FinalPolishProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],audio={playStagePulse(){},playHit(){},playParry(){}};
let cases=0,landings=0,victoryFrames=0,maxLandingTick=0;
for(const c of roster)for(const stage of [1,2,3,4])for(const facing of [-1,1])for(const kind of ['air-light','air-heavy','rising']){
 let hostile=false,callbacks=0;const input={pressed:()=>hostile,held:()=>hostile,released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],stage,()=>callbacks++);scene.enter();scene.introFrames=0;scene.prepareDuel();scene.phase='duel';
 const p=scene.world.player,e=scene.world.enemy,move=kind==='rising'?specialMovesFor(c.id).antiAir:airNormalFor(c.id,kind==='air-light'?'lp':'hk');p.facing=facing;p.startMove(move);assert(p.currentMove);
 p.airborne=true;p.jumpHeight=kind==='air-light'?120:55;p.jumpVelocity=kind==='air-light'?5:3;p.moveFrame=p.currentMove.startup+1;p.stateFrame=p.moveFrame;p.hitStop=2;
 e.receiveHit({...normalFor('hp',false,c.id),damage:99999},p,false);scene.fixedUpdate(1/60,1);assert.equal(scene.phase,'clear');
 assert.equal(p.airborne,true,c.id+' normal clear must not snap airborne winner to ground');assert(p.jumpHeight>0);assert.notEqual(p.state,'victory');hostile=true;
 const hp=p.hp,gauge=p.superGauge,elapsed=scene.elapsedCombatFrames,worldTime=scene.world.time,timing=transitionPolishProfile(stage),dispatchAfter=timing.clearFrames-timing.clearDispatchAt,seen=new Set();let landedAt=0,lastHeight=p.jumpHeight;
 for(let tick=1;tick<=dispatchAfter;tick++){
  scene.fixedUpdate(1/60,1000+tick);const sample=animationSequenceSample(p,scene.time);
  if(p.airborne){assert.notEqual(p.state,'victory');assert(p.jumpHeight>0);if(!p.currentMove){assert.equal(p.state,'jump');if(kind!=='rising')assert.equal(sample?.sequence.kind,'jump');}}
  else{assert.equal(p.state,'victory');if(!landedAt){landedAt=tick;assert(lastHeight<20,'Victory begins at actual landing rather than teleporting from height');}assert.equal(sample?.sequence.kind,'victory');seen.add(sample.frame);}
  lastHeight=p.jumpHeight;assert.equal(callbacks,tick===dispatchAfter?1:0,'Clear dispatch timing stays unchanged');assert.deepEqual([p.hp,p.superGauge],[hp,gauge]);assert.equal(scene.world.time,worldTime);assert.equal(scene.elapsedCombatFrames,elapsed);assert.equal(scene.world.projectiles.length,0);
 }
 assert(landedAt>0);assert.deepEqual([...seen],[0,1,2,3,4,5,6,7],'All victory frames remain visible before next scene');assert.equal(p.currentMove,null);assert.equal(p.jumpHeight,0);assert.equal(p.previousX,p.x);assert.equal(p.previousY,p.y);maxLandingTick=Math.max(maxLandingTick,landedAt);victoryFrames+=seen.size;cases++;landings++;
}
console.log('CLEAR_PLAYER_LANDING_PASS',{characters:10,stages:4,facings:2,cases,landings,victoryFrames,maxLandingTick,inputSuppressed:true,resultsFrozen:true,dispatchTimingUnchanged:true});
