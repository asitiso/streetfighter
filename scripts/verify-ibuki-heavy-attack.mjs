import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('IBUKI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
const move = normalFor('hp', false, 'IBUKI');
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
    fighter.currentMove = normalFor(button, crouching, 'IBUKI');
    assert.equal(animationSequenceSample(fighter, 0), null, `Heavy palm must not replace ${fighter.currentMove.id}`);
  }
}
fighter.currentMove = specialMovesFor('IBUKI').primary;
assert.notEqual(animationSequenceSample(fighter, 0)?.sequence.kind, 'stand-heavy', 'Kikoken must keep its own presentation');
fighter.currentMove = move;
fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded heavy palm must not replace air attacks');
fighter.airborne = false;
fighter.state = 'idle'; fighter.stateFrame = 0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('IBUKI_HEAVY_ATTACK_PASS');

const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 f.updatePlayer({held:()=>false,pressed:key=>key==='hp',released:()=>false},rules);
 assert.equal(f.currentMove.id,'5HP');const frames=new Set();let contact=false;
 while(f.state==='attack'){const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'stand-heavy');frames.add(s.frame);contact ||= s.contact;f.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);}
 assert.ok(contact&&frames.has(0)&&frames.has(5)&&frames.has(9));assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 console.log('IBUKI_JAB_REACHABLE',{facing,frames:[...frames]});
}
