import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile } from '../dist/assets/render/AnimationFrameProfiles.js';
const def=getCharacter('IBUKI');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:-1000,arenaRight:2200,arenaTop:380,arenaBottom:590};
const neutral={held:()=>false,pressed:()=>false,released:()=>false};
for(const facing of [-1,1]) for(const direction of [-1,1]) {
 const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 const action=direction===1?'right':'left';const tap={held:key=>key===action,pressed:key=>key===action,released:()=>false};
 for(const [tick,input] of [[0,tap],[1,neutral],[2,tap]]) {fighter.captureInput(input,tick);fighter.updatePlayer(input,rules);}
 assert.equal(fighter.dashFrames,8,'Double tap starts existing eight-tick dash');
 assert.equal(animationSequenceSample(fighter,0)?.sequence.id,'IBUKI_DASH_HQ','Actual dash needs authored strip');
 const profile=animationFrameProfile('IBUKI','dash');assert.ok([...profile.anchorX,...profile.anchorY].every(v=>v===0));
 const frames=new Set();let ticks=0;
 while(fighter.dashFrames>0) {
  const sample=animationSequenceSample(fighter,0);assert.equal(sample.sequence.kind,'dash');frames.add(sample.frame);
  const before=fighter.x;fighter.captureInput(neutral,3+ticks);fighter.updatePlayer(neutral,rules);
  assert.ok((fighter.x-before)*direction>0,'Dash keeps its input direction regardless of facing');ticks++;
 }
 assert.equal(ticks,8);assert.deepEqual([...frames],[0,1,3,4,5,6],'Unchanged dash timing reaches every expected pose');assert.ok(frames.has(0),'Launch visible');assert.ok(frames.has(6),'Recovery visible');
 assert.ok([...frames].some(f=>f>=1&&f<=3),'Drive visible');assert.ok([...frames].some(f=>f>=4&&f<=5),'Braking visible');
 fighter.updatePlayer(neutral,rules);assert.equal(animationSequenceSample(fighter,0).sequence.kind,'idle');
 fighter.updatePlayer({held:key=>key===(facing===1?'right':'left'),pressed:()=>false,released:()=>false},rules);
 assert.equal(animationSequenceSample(fighter,0).sequence.kind,'walk');
 console.log('IBUKI_DASH_FRAMES',{facing,direction,frames:[...frames]});
}
console.log('IBUKI_DASH_PASS');
