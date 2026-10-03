import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def=getCharacter('CHUNLI');
const fighter=new Fighter(def,'player',300,460,1,def.superArts[0]);
const specials=specialMovesFor('CHUNLI');
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
}
fighter.currentMove=specials.antiAir;
assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'tatsumaki','Rising kick must keep its own presentation');
for(const other of [specials.super,...[1,2,3].map(id=>superArtMoveFor('CHUNLI',id))]) {
  fighter.currentMove=other;
  assert.equal(animationSequenceSample(fighter,0),null,`Spinning bird must not replace ${other.id}`);
}
fighter.currentMove=specials.primary; fighter.moveFrame=0;
assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'hadoken');
fighter.currentMove=move; fighter.airborne=true;
assert.equal(animationSequenceSample(fighter,0),null,'Ground-initiated spin must not replace an air attack');
fighter.airborne=false; fighter.state='idle'; fighter.stateFrame=0;
assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
console.log('CHUNLI_SPINNING_BIRD_PASS');
