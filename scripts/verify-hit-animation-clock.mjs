import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const input={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const id of ['KEN','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL']) for(const facing of [-1,1]) for(const counter of [false,true]) {
 const victim=new Fighter(getCharacter(id),'player',600,460,facing);
 const attacker=new Fighter(getCharacter('RYU'),'enemy',650,460,-facing);
 const move={...normalFor('lp'),hitStun:24};
 const strike=()=>victim.receiveHit(move,attacker,false,counter);
 strike();const initial=animationSequenceSample(victim,0);assert.equal(initial?.sequence.kind,'hit',id+' requires authored hit reaction');assert.equal(initial.frame,0);
 while(victim.hitStop>0){victim.updatePlayer(input,rules);assert.equal(animationSequenceSample(victim,0).frame,0,'Hit stop freezes impact');}
 const frames=new Set();let ticks=0;
 while(victim.state==='hit'){frames.add(animationSequenceSample(victim,0).frame);victim.updatePlayer(input,rules);ticks++;}
 assert.equal(ticks,24+(counter?3:0),'Visual clock preserves hit stun');
 assert.equal(frames.size,initial.sequence.frameCount,'Actual negative hit-stun clock must reach every authored pose');
 assert.ok(frames.has(initial.sequence.frameCount-1),'Recovery pose must be reached');
 assert.equal(victim.state,'idle');
 strike();assert.equal(animationSequenceSample(victim,0).frame,0,'A new hit restarts impact');
 while(victim.hitStop>0)victim.updatePlayer(input,rules);
 for(let t=0;t<6;t++)victim.updatePlayer(input,rules);
 assert.ok(animationSequenceSample(victim,0).frame>0);
 strike();assert.equal(animationSequenceSample(victim,0).frame,0,'Another hit during recoil must restart impact');
}
console.log('HIT_ANIMATION_CLOCK_PASS');
