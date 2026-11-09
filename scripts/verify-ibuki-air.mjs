import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('IBUKI');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:-1000,arenaRight:2200,arenaTop:380,arenaBottom:590};
const neutral={held:()=>false,pressed:()=>false,released:()=>false};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 fighter.updatePlayer({held:()=>false,pressed:key=>key==='jump',released:()=>false},rules);
 assert.equal(animationSequenceSample(fighter,0)?.sequence.id,'IBUKI_JUMP_HQ','Real jump needs authored strip');
 const frames={jump:new Set(),landing:new Set()};let rise=false,fall=false,maxHeight=0,landed=false;
 for(let tick=0;tick<100;tick++) {
  const sample=animationSequenceSample(fighter,0);if(sample?.sequence.kind in frames)frames[sample.sequence.kind].add(sample.frame);
  if(fighter.airborne){rise ||= fighter.jumpVelocity>0;fall ||= fighter.jumpVelocity<0;maxHeight=Math.max(maxHeight,fighter.jumpHeight);}
  if(!fighter.airborne&&fighter.landingFrames>0){landed=true;assert.equal(sample?.sequence.id,'IBUKI_LANDING_HQ');}
  if(landed&&fighter.landingFrames===0){assert.equal(sample.sequence.kind,'idle');break;}
  fighter.updatePlayer(neutral,rules);
 }
 assert.ok(rise&&fall&&landed&&maxHeight>0);assert.deepEqual([...frames.jump],[0,1,2,3,4,5,6,7]);
 assert.ok(frames.jump.has(3)||frames.jump.has(4),'Apex tuck visible');assert.deepEqual([...frames.landing],[1,2,4,5],'Existing landing timing reaches compression, rebound and recovery');
 assert.ok(frames.landing.has(1)||frames.landing.has(2),'Landing compression visible');
 console.log('IBUKI_AIR_FRAMES',{facing,jump:[...frames.jump],landing:[...frames.landing]});
}
console.log('IBUKI_AIR_PASS');
