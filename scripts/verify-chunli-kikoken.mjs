import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor, normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('CHUNLI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
const specials = specialMovesFor('CHUNLI');
for (const move of [specials.primary, specials.exPrimary]) {
  fighter.currentMove = move;
  for (const facing of [-1,1]) {
    fighter.facing = facing;
    for (const [gameFrame, artFrame, contact] of [[0,0,false], [move.startup-1,4,false],
      [move.startup,5,true], [move.startup+move.active-1,6,true],
      [move.startup+move.active,7,false], [move.startup+move.active+move.recovery-1,11,false]]) {
      fighter.moveFrame = gameFrame;
      const sample = animationSequenceSample(fighter, 0);
      assert.equal(sample?.sequence.kind, 'hadoken', `${move.id} must use its authored projectile casting strip`);
      assert.equal(sample.frame, artFrame);
      assert.equal(sample.contact, contact);
    }
  }
}
for (const move of [specials.antiAir, specials.mobility, specials.super,
  ...[1,2,3].map(id => superArtMoveFor('CHUNLI',id))]) {
  fighter.currentMove = move;
  assert.equal(animationSequenceSample(fighter, 0), null, `Kikoken must not replace ${move.id}`);
}
fighter.currentMove = specials.primary; fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded casting must not replace air attacks');
fighter.airborne = false;
for (const [button, kind] of [['lp','stand-light'],['hp','stand-heavy']]) {
  fighter.currentMove = normalFor(button,false,'CHUNLI'); fighter.moveFrame=0;
  assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, kind);
}
fighter.state='idle'; fighter.stateFrame=0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('CHUNLI_KIKOKEN_PASS');
