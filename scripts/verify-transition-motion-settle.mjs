// V081: duels are best-of-3; fixtures start in the FINAL ROUND (1-1) so one KO decides the match.
import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {transitionPolishProfile} from '../dist/assets/render/FinalPolishProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],routes=[...[1,2,3,4,5].map(stage=>({stage,route:'belt'})),{stage:5,route:'final'}],audio={playStagePulse(){},playHit(){},playParry(){}};
let cases=0,landings=0,replacements=0,bossFreezeChecks=0;
for(const c of roster)for(const facing of [-1,1])for(const kind of ['air-light','air-heavy','rising'])for(const {stage,route}of routes){
 let hostile=false,callbacks=0;const input={pressed:()=>hostile,held:()=>hostile,released:()=>false},scene=new Stage1Scene(input,audio,c,c.superArts[0],stage,()=>callbacks++);scene.enter();scene.introFrames=0;
 if(route==='final'){scene.prepareDuel();scene.phase='duel';scene.playerRoundWins=scene.enemyRoundWins=1;}else{scene.beltWave=2;scene.spawnBeltWave(2);scene.prepareCombatTextures();}
 const old=scene.world,p=old.player,move=kind==='rising'?specialMovesFor(c.id).antiAir:airNormalFor(c.id,kind==='air-light'?'lp':'hk');p.facing=facing;p.startMove(move);assert(p.currentMove);p.airborne=true;p.jumpHeight=kind==='air-light'?120:55;p.jumpVelocity=kind==='air-light'?5:3;p.moveFrame=p.currentMove.startup+1;p.stateFrame=p.moveFrame;p.hitStop=2;
 for(const e of old.enemies)e.receiveHit({...normalFor('hp',false,c.id),damage:99999},p,false);
 scene.fixedUpdate(1/60,1);const phase=route==='final'?'final-transition':'transition',target=route==='final'?'final-duel':'duel';assert.equal(scene.phase,phase);assert(p.airborne);hostile=true;
 old.totalPlayerDamage=111;old.totalEnemyDamage=22;old.maxPlayerComboHits=3;old.playerParries=2;const result=scene.stageResult(),hp=p.hp,gauge=p.superGauge,worldTime=old.time,stageTime=scene.stageTime,timing=transitionPolishProfile(stage),prepareTick=timing.duelFrames-timing.duelPrepareAt,initialClock=p.animationFrame;
 for(let tick=1;tick<prepareTick;tick++){
  scene.fixedUpdate(1/60,1000+tick);assert.equal(scene.world,old);assert.equal(scene.phase,phase);assert.equal(scene.phaseFrames,timing.duelFrames-tick);assert.equal(old.time,worldTime);assert.equal(scene.stageTime,stageTime);assert.deepEqual(scene.stageResult(),result);assert.deepEqual([p.hp,p.superGauge],[hp,gauge]);
  if(p.airborne&&!p.currentMove){assert.equal(p.state,'jump');if(kind!=='rising')assert.equal(animationSequenceSample(p,scene.time)?.sequence.kind,'jump');}
 }
 assert(p.animationFrame>initialClock,c.id+' '+phase+' must advance current player motion');assert.equal(p.airborne,false,'Finisher must land before boss replacement');assert.equal(p.jumpHeight,0);assert.equal(p.currentMove,null);assert.equal(p.state,'idle');for(const e of old.enemies){assert.equal(e.state,'ko');assert.equal(e.hitFlash,0);assert(e.stateFrame>-90);}landings++;
 scene.fixedUpdate(1/60,2000);assert.notEqual(scene.world,old);assert.equal(scene.phaseFrames,timing.duelPrepareAt);assert.equal(scene.phase,phase);const next=scene.world,boss=next.enemy,bossState=[boss.hp,boss.x,boss.y,boss.state,boss.stateFrame,boss.animationFrame];assert.deepEqual([next.player.hp,next.player.superGauge],[hp,gauge]);assert.deepEqual(scene.stageResult(),result);assert.equal(next.time,0);assert.equal(scene.stageTime,99);if(route==='final')assert.equal(boss.character.id,'GILL');replacements++;
 for(let tick=prepareTick+1;tick<=timing.duelFrames;tick++){
  scene.fixedUpdate(1/60,3000+tick);assert.equal(scene.world,next);assert.equal(next.time,0);assert.deepEqual([boss.hp,boss.x,boss.y,boss.state,boss.stateFrame,boss.animationFrame],bossState,'Prepared boss cannot act during intro');assert.equal(next.player.currentMove,null);assert.equal(next.player.airborne,false);assert.equal(next.projectiles.length,0);assert.deepEqual(scene.stageResult(),result);assert.equal(callbacks,0);assert.equal(scene.phase,tick===timing.duelFrames?target:phase);bossFreezeChecks++;
 }
 cases++;
}
console.log('TRANSITION_MOTION_SETTLE_PASS',{characters:10,facings:2,routes:6,cases,landings,replacements,bossFreezeChecks,prepareTickPreserved:true,startTickPreserved:true,metricsCarried:true,inputSuppressed:true,noLiveBossAI:true});
