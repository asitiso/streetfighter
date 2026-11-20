// V081: duels are best-of-3; fixtures start in the FINAL ROUND (1-1) so one KO decides the match.
import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS];
const audio={playStagePulse(){},playHit(){},playParry(){}};
let cases=0,landings=0,motionSamples=0;
for(const c of roster)for(const facing of [-1,1])for(const kind of ['air-light','air-normal','rising','rush','super']){
 let hostile=false,clears=0;const input={pressed:()=>hostile,held:()=>hostile,released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],5,()=>clears++);scene.enter();scene.introFrames=0;scene.prepareFinalDuel();scene.phase='final-duel';scene.playerRoundWins=scene.enemyRoundWins=1;
 const p=scene.world.player,e=scene.world.enemy,specials=specialMovesFor(c.id),move=kind==='air-light'?airNormalFor(c.id,'lp'):kind==='air-normal'?airNormalFor(c.id,'hk'):kind==='rising'?specials.antiAir:kind==='rush'?specials.mobility:specials.super;
 p.superGauge=p.superGaugeMax;p.facing=facing;p.x=p.previousX=600;p.startMove(move);assert(p.currentMove);
 if(kind==='air-normal'||kind==='air-light'){p.airborne=true;p.jumpHeight=kind==='air-light'?120:55;p.jumpVelocity=kind==='air-light'?5:3;}
 p.moveFrame=p.currentMove.startup+1;p.stateFrame=p.moveFrame;p.attackConnected=true;p.hitStop=2;
 e.receiveHit({...normalFor('hp',false,c.id),damage:99999},p,false);scene.fixedUpdate(1/60,1);assert.equal(scene.phase,'final-ko');assert.equal(scene.finalKoFrames,180);hostile=true;
 const clock=p.animationFrame,worldTime=scene.world.time,elapsed=scene.elapsedCombatFrames,hp=p.hp,gauge=p.superGauge,boss=[e.hp,e.state,e.stateFrame,e.animationFrame,e.hitFlash,e.jumpHeight],samples=new Set();
 for(let tick=1;tick<=179;tick++){
  scene.fixedUpdate(1/60,1000+tick);assert.equal(scene.phase,'final-ko');assert.equal(scene.finalKoFrames,180-tick);assert.equal(clears,0);
  const sample=animationSequenceSample(p,scene.time);if(sample)samples.add(sample.sequence.id+':'+sample.frame);
  if(p.airborne&&p.currentMove===null){assert.equal(p.state,'jump',c.id+' '+kind+' must retain jump state until landing');if(kind==='air-light'||kind==='air-normal')assert.equal(sample?.sequence.kind,'jump','Air normal recovery must display jump motion');else assert.notEqual(sample?.sequence.kind,'idle','Airborne special recovery cannot display idle');}
 }
 assert(p.animationFrame>clock,c.id+' final KO must advance current player motion');
 assert.equal(p.airborne,false,c.id+' '+kind+' must land before victory');assert.equal(p.jumpHeight,0);assert.equal(p.currentMove,null,'Existing finisher must recover without new input attacks');assert.equal(p.state,'idle');assert(samples.size>1,'Cinematic must sample changing animation frames');motionSamples+=samples.size;
 assert.deepEqual([p.hp,p.superGauge],[hp,gauge]);assert.deepEqual([e.hp,e.state,e.stateFrame,e.animationFrame,e.hitFlash,e.jumpHeight],boss,'Boss cinematic is independent of live combat');assert.equal(scene.world.time,worldTime);assert.equal(scene.elapsedCombatFrames,elapsed);assert.equal(scene.world.projectiles.length,0);assert.equal(p.aiAirChaseCount,0);assert.equal(p.aiCornerPressureCount,0);
 scene.fixedUpdate(1/60,2000);assert.equal(scene.phase,'clear');assert.equal(scene.finalKoFrames,0);assert.equal(p.state,'victory');assert.equal(p.stateFrame,0);assert.equal(p.airborne,false);assert.equal(clears,0);cases++;if(kind==='air-light'||kind==='air-normal'||kind==='rising')landings++;
}
console.log('FINAL_KO_PLAYER_SETTLE_PASS',{characters:10,facings:2,cases,landings,motionSamples,hostileInputIgnored:true,noNewProjectiles:true,resultStateFrozen:true,bossCinematicPreserved:true,finalKoTicks:180});
