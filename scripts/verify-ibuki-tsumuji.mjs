import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def=getCharacter('IBUKI');
const fighter=new Fighter(def,'player',300,460,1,def.superArts[0]);
const specials=specialMovesFor('IBUKI');
const move=specials.mobility;
fighter.state='attack'; fighter.currentMove=move;
for (const facing of [-1,1]) {
  fighter.facing=facing;
  for (const [gameFrame,artFrame,contact] of [[0,0,false],[move.startup-1,2,false],
    [move.startup,3,true],[move.startup+move.active-1,8,true],
    [move.startup+move.active,9,false],[move.startup+move.active+move.recovery-1,11,false]]) {
    fighter.moveFrame=gameFrame;
    const sample=animationSequenceSample(fighter,0);
    assert.equal(sample?.sequence.kind,'tatsumaki');
    assert.equal(sample.frame,artFrame);
    assert.equal(sample.contact,contact);
  }
  const activeFrames=[];
  for(let frame=move.startup;frame<move.startup+move.active;frame++) {
    fighter.moveFrame=frame;
    activeFrames.push(animationSequenceSample(fighter,0).frame);
  }
  assert.ok(new Set(activeFrames).size>=5,'Active spin must advance through rotation poses');
  const hitFrames=[];
  for(let hit=0;hit<move.multiHit.hits;hit++){fighter.moveFrame=move.startup+hit*move.multiHit.interval;hitFrames.push(animationSequenceSample(fighter,0).frame);}
  assert.equal(new Set(hitFrames).size,3,'Three hit opportunities sample distinct rotation frames');
}
fighter.currentMove=specials.antiAir;
assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'tatsumaki','Rising kick must keep its own presentation');
for(const other of [specials.super,...[1,2,3].map(id=>superArtMoveFor('IBUKI',id))]) {
  fighter.currentMove=other;
  assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'tatsumaki',`Spinning bird must not replace ${other.id}`);
}
fighter.currentMove=specials.primary; fighter.moveFrame=0;
assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'hadoken');
fighter.currentMove=move; fighter.airborne=true;
assert.equal(animationSequenceSample(fighter,0),null,'Ground-initiated spin must not replace an air attack');
fighter.airborne=false; fighter.state='idle'; fighter.stateFrame=0;
assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
console.log('IBUKI_SPINNING_BIRD_PASS');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[0]);f.startMove(move);const frames=new Set();
 while(f.state==='attack'){const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,'IBUKI_TSUMUJI_HQ');frames.add(s.frame);f.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);}
 assert.equal(frames.size,12);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
}
