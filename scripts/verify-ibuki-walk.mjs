import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile } from '../dist/assets/render/AnimationFrameProfiles.js';
const def=getCharacter('IBUKI');const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);const forward=facing===1?'right':'left';const input={held:key=>key===forward,pressed:()=>false,released:()=>false};
 fighter.updatePlayer(input,rules);assert.equal(fighter.state,'walk');let sample=animationSequenceSample(fighter,0);assert.equal(sample?.sequence.id,'IBUKI_WALK_HQ','Actual forward walking needs enabled authored strip');
 const profile=animationFrameProfile('IBUKI','walk');assert.ok([...profile.anchorX,...profile.anchorY].every(value=>value===0),'Authored steps must not receive staging root shifts');const cycle=profile.weights.reduce((s,v)=>s+Math.max(.05,v),0)/sample.sequence.fps*60;
 const frames=new Set();for(let tick=0;tick<Math.ceil(cycle*2);tick++){sample=animationSequenceSample(fighter,0);assert.equal(sample.sequence.kind,'walk');frames.add(sample.frame);fighter.updatePlayer(input,rules);}
 assert.equal(frames.size,12,'Real walking state clock must advance through all steps');
 fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0).frame,0);fighter.stateFrame=Math.ceil(cycle);assert.equal(animationSequenceSample(fighter,0).frame,0,'Cycle wraps');
 fighter.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);assert.equal(animationSequenceSample(fighter,0).sequence.kind,'idle','Stopping returns to authored idle');
 fighter.state='walk';fighter.previousX=fighter.x;fighter.x-=facing;assert.equal(animationSequenceSample(fighter,0).sequence.kind,'walk-back','Retreat remains distinct');
}
console.log('IBUKI_WALK_PASS');
