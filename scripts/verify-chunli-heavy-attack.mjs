import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('CHUNLI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
const move = normalFor('hp', false, 'CHUNLI');
fighter.currentMove = move;
for (const facing of [-1, 1]) {
  fighter.facing = facing;
  const cases = [[0,0,false], [move.startup-1,3,false], [move.startup,4,true],
    [move.startup+move.active-1,5,true], [move.startup+move.active,6,false],
    [move.startup+move.active+move.recovery-1,9,false]];
  for (const [gameFrame, artFrame, contact] of cases) {
    fighter.moveFrame = gameFrame;
    const sample = animationSequenceSample(fighter, 0);
    assert.equal(sample?.sequence.kind, 'stand-heavy');
    assert.equal(sample.frame, artFrame);
    assert.equal(sample.contact, contact);
  }
}
for (const crouching of [false, true]) {
  for (const button of ['mp','hp','lk','mk','hk']) {
    if (!crouching && button === 'hp') continue;
    fighter.currentMove = normalFor(button, crouching, 'CHUNLI');
    assert.equal(animationSequenceSample(fighter, 0), null, `Heavy palm must not replace ${fighter.currentMove.id}`);
  }
}
fighter.currentMove = specialMovesFor('CHUNLI').primary;
assert.notEqual(animationSequenceSample(fighter, 0)?.sequence.kind, 'stand-heavy', 'Kikoken must keep its own presentation');
fighter.currentMove = move;
fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded heavy palm must not replace air attacks');
fighter.airborne = false;
fighter.state = 'idle'; fighter.stateFrame = 0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('CHUNLI_HEAVY_ATTACK_PASS');
