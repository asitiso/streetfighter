import assert from 'node:assert/strict';
import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{normalFor}from'../dist/assets/combat/MoveLibrary.js';
import{airAttackRecoverySample as blend,animationSequenceSample}from'../dist/assets/render/AnimationTimingMapper.js';
const q={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,mixedTicks=0,landingControls=0,freezeChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const button of['lp','mp','hp','lk','mk','hk'])for(const delay of[0,5,12,20]){
 const w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);for(let n=0;n<delay;n++)f.updatePlayer(q,w.rules);f.updatePlayer({...q,pressed:k=>k===button},w.rules);let ticks=0;
 while(f.currentMove){assert.equal(blend(f,0),null,'active attack owns its pose');f.updatePlayer(q,w.rules);assert(++ticks<100);}
 if(f.airborne){let last=0;for(let n=0;n<7&&f.airborne;n++){const before=JSON.stringify(f),s=blend(f,0);assert.equal(JSON.stringify(f),before);if(f.stateFrame<2){assert(s,'natural air recovery needs bridge');assert.equal(s.previous.sequence.kind,'air-'+({lp:'light-punch',mp:'medium-punch',hp:'heavy-punch',lk:'light-kick',mk:'medium-kick',hk:'heavy-kick'}[button]));assert.equal(s.previous.frame,s.previous.sequence.frameCount-1);assert.equal(s.current.sequence.kind,'jump');assert(s.blend>last&&s.blend<1);last=s.blend;mixedTicks++;f.hitStop=2;const frozen=JSON.stringify(s);for(let k=0;k<2;k++){f.updatePlayer(q,w.rules);assert.equal(JSON.stringify(blend(f,99)),frozen);freezeChecks++;}}else assert.equal(s,null);f.updatePlayer(q,w.rules);}}
 while(f.airborne)f.updatePlayer(q,w.rules);assert.equal(blend(f,0),null,'touchdown releases air bridge');landingControls++;cases++;
}
let interruptionCases=0;
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const delay of[0,1])for(const action of['attack','hit','land','jump']){
 const w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);f.updatePlayer({...q,pressed:k=>k==='lp'},w.rules);while(f.currentMove)f.updatePlayer(q,w.rules);for(let i=0;i<delay;i++)f.updatePlayer(q,w.rules);assert(blend(f,0),'fixture must start inside live bridge');
 if(action==='attack'){f.updatePlayer({...q,pressed:k=>k==='mp'},w.rules);assert.equal(f.state,'attack');assert.equal(f.currentMove.technique,'air');}
 if(action==='hit'){f.receiveHit(normalFor('mp',false,c.id),w.enemy,false);assert.equal(f.state,'hit');}
 if(action==='land'||action==='jump'){while(f.airborne)f.updatePlayer(q,w.rules);assert.equal(f.landingFrames,8);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'landing');if(action==='jump'){f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);assert.equal(f.state,'jump');assert.equal(f.visualRecoveryMoveId,null);}}
 assert.equal(blend(f,0),null,'new action owns body '+action);interruptionCases++;
}
let lateTouchdowns=0;
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel']){
 let found=false;
 for(let delay=0;delay<40&&!found;delay++){const w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);for(let n=0;n<delay;n++)f.updatePlayer(q,w.rules);if(!f.airborne)continue;f.updatePlayer({...q,pressed:k=>k==='lp'},w.rules);while(f.currentMove)f.updatePlayer(q,w.rules);if(!blend(f,0)||f.jumpHeight+f.jumpVelocity>0)continue;
  assert(f.airborne);assert(blend(f,0),'bridge must still be active immediately before touchdown');f.updatePlayer(q,w.rules);assert.equal(f.airborne,false);assert.equal(f.landingFrames,8);assert.equal(blend(f,0),null,'touchdown must interrupt an active bridge on this exact tick');assert.equal(animationSequenceSample(f,0)?.sequence.kind,'landing');found=true;lateTouchdowns++;
 }assert(found,'no immediate touchdown fixture '+c.id+'/'+face+'/'+mode);
}
assert(mixedTicks>0);console.log(JSON.stringify({passed:true,cases,mixedTicks,landingControls,freezeChecks,interruptionCases,lateTouchdowns}));
