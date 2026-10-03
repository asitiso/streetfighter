import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile } from '../dist/assets/render/AnimationFrameProfiles.js';
const def=getCharacter('IBUKI'), input={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',300,460,facing,def.superArts[0]);fighter.state='idle';fighter.stateFrame=0;
 let sample=animationSequenceSample(fighter,0);assert.equal(sample?.sequence.id,'IBUKI_IDLE_HQ','Idle must use enabled authored Ibuki sequence');assert.equal(sample.frame,0);
 const profile=animationFrameProfile('IBUKI','idle');assert.ok([...profile.anchorX,...profile.anchorY].every(value=>value===0),'Already grounded idle art must not receive staging root shifts');const cycle=profile.weights.reduce((s,v)=>s+Math.max(.05,v),0)/sample.sequence.fps*60;
 const frames=new Set();for(let tick=0;tick<Math.ceil(cycle*2);tick++){sample=animationSequenceSample(fighter,0);assert.equal(sample.sequence.kind,'idle');frames.add(sample.frame);fighter.updatePlayer(input,rules);}
 assert.equal(frames.size,6,'Actual idle state clock must advance through every breathing pose');
 fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0).frame,0);fighter.stateFrame=Math.ceil(cycle);assert.equal(animationSequenceSample(fighter,0).frame,0,'Idle cycle must wrap');
 fighter.state='walk';fighter.previousX=fighter.x;fighter.x+=facing;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'walk','Walking must stay distinct from idle');
 fighter.state='hit';assert.equal(animationSequenceSample(fighter,0),null);
 fighter.state='idle';fighter.airborne=false;fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0).sequence.id,'IBUKI_IDLE_HQ');
}
console.log('IBUKI_IDLE_PASS');
