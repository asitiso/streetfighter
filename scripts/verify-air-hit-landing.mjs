import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';import{Fighter}from'../dist/assets/combat/Fighter.js';import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';import{normalFor}from'../dist/assets/combat/MoveLibrary.js';import{airHitHandoffSample,animationSequenceSample}from'../dist/assets/render/AnimationTimingMapper.js';
const baseline=process.argv.includes('--baseline'),record=process.argv.includes('--record'),q={held:()=>false,pressed:()=>false,released:()=>false},chars=[...CHARACTERS,...BOSS_CHARACTERS];
const physics=createHash('sha256');let cases=0,eligible=0,groundedSuppressed=0,airRetained=0,wrongTarget=0,groundRecoveries=0;
for(const c of chars)for(const facing of[-1,1])for(const button of['lp','mp','hp','lk','mk','hk'])for(const counter of[false,true])for(const juggle of[0,4,8])for(const height of[8,24,70]){
 const w=new CombatWorld(c,getCharacter('KEN'),'duel'),f=w.player;f.facing=facing;f.airborne=true;f.jumpHeight=height;f.jumpVelocity=-4;f.juggleHits=juggle;f.receiveHit(normalFor(button,false,'KEN'),w.enemy,false,counter);
 for(let tick=0;tick<100;tick++){
  physics.update(JSON.stringify([c.id,facing,button,counter,juggle,height,tick,f.state,f.stateFrame,f.x,f.y,f.hp,f.hitStop,f.airborne,f.jumpHeight,f.jumpVelocity]));
  if(f.state==='hit'&&f.airborne&&f.stateFrame>=-3&&f.stateFrame<0&&f.hitAnimationDuration>3){
   const before=JSON.stringify(f),future=Object.assign(Object.create(Object.getPrototypeOf(f)),f);let guard=0;
   while(future.state==='hit'&&guard++<30)future.updatePlayer(q,w.rules);assert.notEqual(future.state,'hit');assert.equal(JSON.stringify(f),before,'Oracle must not advance live fighter');
   const h=airHitHandoffSample(f);assert.equal(JSON.stringify(f),before,'Sampler must not write live fighter');eligible++;
   if(!future.airborne){if(h)wrongTarget++;if(!baseline)assert(h===null,'Do not blend to jump when actual stun expiry is grounded');groundedSuppressed++;}
   else{assert(h,'Genuine airborne recovery keeps its existing handoff');assert.equal(h.current.sequence.kind,'jump');airRetained++;}
  }
  if(f.state==='hit'&&!f.airborne){assert.equal(airHitHandoffSample(f),null);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'hit');groundRecoveries++;}
  f.updatePlayer(q,w.rules);
 }cases++;
}
const digest=physics.digest('hex');if(!record)assert.equal(digest,'256510b3acc5cf0632376ceba9c0780fe3b8d60ba06e2818c442efd6075bb9f8','Native2160case physics trace unchanged');
if(!baseline){
 let exactGround=0,justAir=0,frozen=0,inputChecks=0;
 for(const c of chars)for(const facing of[-1,1])for(const left of[1,2,3]){
  const w=new CombatWorld(c,c,'duel'),f=w.player;f.facing=facing;f.state='hit';f.stateFrame=-left;f.hitAnimationDuration=12;f.airborne=true;f.jumpVelocity=-4;
  // Construct a boundary using native update order, independently checked by real updates.
  const probe=new Fighter(c,'player',500,500,facing);probe.state='hit';probe.stateFrame=-left;probe.hitAnimationDuration=12;probe.airborne=true;probe.jumpHeight=100;probe.jumpVelocity=-4;for(let n=0;n<left;n++)probe.updatePlayer(q,w.rules);const travel=100-probe.jumpHeight;
  f.jumpHeight=travel-1e-7;assert.equal(airHitHandoffSample(f),null);exactGround++;
  f.jumpHeight=travel+.001;const expected=airHitHandoffSample(f);assert(expected);justAir++;
  f.hitStop=3;for(let n=0;n<3;n++){const height=f.jumpHeight,vel=f.jumpVelocity,frame=f.stateFrame;f.updatePlayer(q,w.rules);assert.deepEqual(airHitHandoffSample(f),expected);assert.equal(f.jumpHeight,height);assert.equal(f.jumpVelocity,vel);assert.equal(f.stateFrame,frame);frozen++;}
  for(let n=0;n<left;n++)f.updatePlayer(q,w.rules);assert.equal(f.state,'jump');f.updatePlayer({...q,pressed:k=>k==='lp'},w.rules);assert.equal(f.state,'attack');inputChecks++;
 }
 assert.equal(wrongTarget,0);console.log(JSON.stringify({passed:true,cases,eligible,groundedSuppressed,airRetained,wrongTarget,groundRecoveries,exactGround,justAir,frozen,inputChecks,physics:digest}));
}else console.log(JSON.stringify({passed:true,baseline,cases,eligible,groundedSuppressed,airRetained,wrongTarget,groundRecoveries,physics:digest}));
