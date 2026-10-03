import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile } from '../dist/assets/render/AnimationFrameProfiles.js';
const def=getCharacter('IBUKI');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:-1000,arenaRight:2200,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 const backward=facing===1?'left':'right';
 const input={held:key=>key===backward,pressed:()=>false,released:()=>false};
 fighter.updatePlayer(input,rules);assert.equal(fighter.state,'walk');
 let sample=animationSequenceSample(fighter,0);
 assert.equal(sample?.sequence.id,'IBUKI_WALK_BACK_HQ','Backward input needs distinct authored retreat');
 assert.ok((fighter.x-fighter.previousX)*facing<0,'Retreat moves away from facing');
 const profile=animationFrameProfile('IBUKI','walk-back');
 assert.ok([...profile.anchorX,...profile.anchorY].every(v=>v===0),'Grounded authored art needs no staging offsets');
 const cycle=profile.weights.reduce((s,v)=>s+Math.max(.05,v),0)/sample.sequence.fps*60;
 const frames=new Set();let previous=-1,wrapped=false;
 for(let tick=0;tick<Math.ceil(cycle*2);tick++) {
  sample=animationSequenceSample(fighter,0);assert.equal(sample.sequence.kind,'walk-back');
  if(previous===9&&sample.frame===0)wrapped=true;previous=sample.frame;frames.add(sample.frame);
  fighter.updatePlayer(input,rules);
 }
 assert.equal(frames.size,10);assert.ok(wrapped,'Actual state clock wraps retreat loop');
 fighter.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);
 assert.equal(animationSequenceSample(fighter,0).sequence.kind,'idle');
 const forward=facing===1?'right':'left';fighter.updatePlayer({held:key=>key===forward,pressed:()=>false,released:()=>false},rules);
 assert.equal(animationSequenceSample(fighter,0).sequence.kind,'walk','Forward gait stays distinct');
 fighter.state='hit';fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0),null,'Unfinished hit remains fallback');
}
console.log('IBUKI_RETREAT_PASS');
