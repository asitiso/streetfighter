import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('IBUKI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
fighter.currentMove = normalFor('lp', false, 'IBUKI');
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
    if (!crouching && button === 'lp') continue;
    fighter.currentMove = normalFor(button, crouching, 'IBUKI');
    assert.equal(animationSequenceSample(fighter, 0), null, `Standing jab must not replace ${fighter.currentMove.id}`);
  }
}
fighter.currentMove = move;
fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded jab must not replace an airborne attack');
fighter.airborne = false;
fighter.state = 'idle'; fighter.stateFrame = 0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('IBUKI_LIGHT_ATTACK_PASS');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 f.updatePlayer({held:()=>false,pressed:key=>key==='lp',released:()=>false},rules);
 assert.equal(f.currentMove.id,'5LP');const frames=new Set();let contact=false;
 while(f.state==='attack'){const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'stand-light');frames.add(s.frame);contact ||= s.contact;f.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);}
 assert.ok(contact&&frames.has(0)&&frames.has(3)&&frames.has(6));assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 console.log('IBUKI_JAB_REACHABLE',{facing,frames:[...frames]});
}
