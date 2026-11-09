import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('CHUNLI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
fighter.currentMove = normalFor('lp', false, 'CHUNLI');
const move = fighter.currentMove;
for (const facing of [-1, 1]) {
  fighter.facing = facing;
  for (const [gameFrame, artFrame, contact] of [[0,0,false], [move.startup,3,true], [move.startup+move.active+move.recovery-1,6,false]]) {
    fighter.moveFrame = gameFrame;
    const sample = animationSequenceSample(fighter, 0);
    assert.equal(sample?.sequence.kind, 'stand-light');
    assert.equal(sample.frame, artFrame);
    assert.equal(sample.contact, contact);
  }
}
for (const crouching of [false, true]) {
  for (const button of ['lp','mp','hp','lk','mk','hk']) {
    if (!crouching && (button === 'lp' || button === 'hp')) continue;
    fighter.currentMove = normalFor(button, crouching, 'CHUNLI');
    assert.equal(animationSequenceSample(fighter, 0), null, `Standing jab must not replace ${fighter.currentMove.id}`);
  }
}
fighter.currentMove = move;
fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded jab must not replace an airborne attack');
fighter.airborne = false;
fighter.state = 'idle'; fighter.stateFrame = 0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('CHUNLI_LIGHT_ATTACK_PASS');
