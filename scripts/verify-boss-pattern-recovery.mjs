import assert from 'node:assert/strict';
import {Stage5Scene} from '../dist/assets/scenes/Stage5Scene.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,throwMoveFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}},recording=process.argv.includes('--record-controls'),records=[];
const patterns=[...[0,1,2].map(index=>({id:'URIEN',phase:1,index})),...[1,2,3].flatMap(phase=>Array.from({length:phase===1?2:phase===2?4:5},(_,index)=>({id:'GILL',phase,index})))];
let lockedCases=0,resumeCases=0,groundControls=0,sceneCases=0;
function setup(spec,facing){const c=getCharacter('RYU'),scene=new Stage5Scene(q,audio,c,c.superArts[0]);scene.introFrames=0;if(spec.id==='URIEN'){scene.prepareDuel();scene.phase='duel';}else{scene.prepareFinalDuel();scene.phase='final-duel';scene.gillPhase=spec.phase;}const b=scene.world.enemy,p=scene.world.player;b.x=b.previousX=600;b.facing=facing;p.x=p.previousX=600+facing*250;p.facing=-facing;scene.bossPatternCooldown=1;scene.bossPatternIndex=spec.index;return{scene,b,p};}
function trigger(scene,id){if(id==='URIEN')scene.updateUrienPattern();else scene.updateGillPattern();}
function state(b){return[b.x,b.y,b.state,b.stateFrame,b.hp,b.superGauge,b.currentMove?.id??null,b.moveFrame,b.moveEffectTriggered,b.hitStop,b.airborne,b.jumpHeight,b.jumpVelocity,b.throwSyncFrames];}
function lock(b,p,scene,kind){if(kind==='airborne')b.updatePlayer({...q,pressed:k=>k==='jump'},scene.world.rules);else if(kind==='victory')b.enterVictoryPose();else if(kind==='hitstop')b.hitStop=2;else if(kind==='melee')b.startMove(normalFor('hp',false,b.character.id));else if(kind==='unspawned-projectile'){b.startMove(specialMovesFor(b.character.id).primary);assert.equal(b.currentMove.kind,'projectile');}else{
 if(kind==='parry')b.parryWindow=6;if(kind==='ko')b.hp=1;b.receiveHit(kind==='knockdown'?throwMoveFor('RYU'):normalFor('hp',false,'RYU'),p,kind==='block');while(b.hitStop)b.updateAiDirected(p,scene.world.rules,{role:'attack',desiredX:b.x,desiredY:b.y,attackAllowed:false,rangedAllowed:false});
 }}
for(const spec of patterns)for(const facing of [-1,1])for(const kind of ['hit','block','parry','knockdown','airborne','victory','ko','hitstop','melee','unspawned-projectile']){
 const {scene,b,p}=setup(spec,facing);lock(b,p,scene,kind);const before=state(b),index=scene.bossPatternIndex,events=scene.world.events.length,projectiles=scene.world.projectiles.length;
 trigger(scene,spec.id);if(!recording){assert.deepEqual(state(b),before,spec.id+'/'+kind+' pattern cannot interrupt locked/airborne state');assert.equal(scene.bossPatternIndex,index);assert.equal(scene.world.events.length,events);assert.equal(scene.world.projectiles.length,projectiles);}
 lockedCases++;
 if(!recording&&['hit','block','parry','knockdown','airborne'].includes(kind)){
  for(let t=0;t<180&&(b.airborne||!['idle','walk','crouch'].includes(b.state));t++)b.updateAiDirected(p,scene.world.rules,{role:'attack',desiredX:b.x,desiredY:b.y,attackAllowed:false,rangedAllowed:false});
  assert(!b.airborne&&['idle','walk','crouch'].includes(b.state));trigger(scene,spec.id);assert.equal(scene.bossPatternIndex,index+1,'Due pattern resumes without a fresh cooldown');assert(b.currentMove);resumeCases++;
 }
}
// Ground-neutral and already-emitted projectile handoffs keep old patterns exactly.
for(const spec of patterns)for(const facing of [-1,1])for(const initial of ['idle','walk','crouch','emitted-projectile']){
 const {scene,b}=setup(spec,facing);if(initial==='emitted-projectile'){b.startMove(specialMovesFor(b.character.id).primary);b.moveEffectTriggered=true;}else b.state=initial;
 trigger(scene,spec.id);assert.equal(scene.bossPatternIndex,spec.index+1);records.push({spec,facing,initial,boss:state(b),cooldown:scene.bossPatternCooldown,index:scene.bossPatternIndex,flash:scene.bossPatternFlash,events:scene.world.events.map(({type,x,y,power,ttl,label})=>({type,x,y,power,ttl,label})),projectiles:scene.world.projectiles.map(p=>({move:p.move.id,x:p.x,y:p.y,vx:p.vx,vy:p.vy,life:p.life,radius:p.radius,piercing:p.piercing,burstIndex:p.burstIndex,burstTotal:p.burstTotal}))});groundControls++;
}
// Actual stage loop must retain hit/block/parry recovery on the due-pattern tick.
for(const id of ['URIEN','GILL'])for(const facing of [-1,1])for(const kind of ['hit','block','parry']){
 const {scene,b,p}=setup({id,phase:1,index:0},facing);lock(b,p,scene,kind);const frame=b.stateFrame;scene.fixedUpdate(1/60,1);if(!recording){assert.equal(b.state,kind);assert.equal(b.stateFrame,frame+1);assert.equal(scene.bossPatternIndex,0);assert.equal(scene.world.projectiles.length,0);}sceneCases++;
}
if(recording)console.log(JSON.stringify(records));else console.log('BOSS_PATTERN_RECOVERY_PASS',{patterns:patterns.length,lockedCases,resumeCases,groundControls,sceneCases,bosses:2});
