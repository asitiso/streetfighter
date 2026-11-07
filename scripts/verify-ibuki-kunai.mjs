import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor, normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const def = getCharacter('IBUKI');
const fighter = new Fighter(def, 'player', 300, 460, 1, def.superArts[0]);
fighter.state = 'attack';
const specials = specialMovesFor('IBUKI');
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
fighter.currentMove=specials.mobility;
assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'hadoken','Spinning bird must keep its own presentation');
fighter.currentMove=specials.antiAir;
assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'hadoken','Rising kick must keep its own presentation');
for (const move of [2,3].map(id => superArtMoveFor('IBUKI',id))) {
  fighter.currentMove = move;
  assert.notEqual(animationSequenceSample(fighter, 0)?.sequence.kind, 'hadoken', `Kikoken must not replace ${move.id}`);
}
fighter.currentMove = specials.primary; fighter.airborne = true;
assert.equal(animationSequenceSample(fighter, 0), null, 'Grounded casting must not replace air attacks');
fighter.airborne = false;
for (const [button, kind] of [['lp','stand-light'],['hp','stand-heavy']]) {
  fighter.currentMove = normalFor(button,false,'IBUKI'); fighter.moveFrame=0;
  assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, kind);
}
fighter.state='idle'; fighter.stateFrame=0;
assert.equal(animationSequenceSample(fighter, 0)?.sequence.kind, 'idle');
console.log('IBUKI_KUNAI_PASS');
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) for(const attack of [specials.primary,specials.exPrimary]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[0]);f.superGauge=f.superGaugeMax;f.startMove(attack);
 assert.equal(f.currentMove.id,attack.id);const frames=new Set();let release=false;
 while(f.state==='attack'){const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,'IBUKI_KUNAI_HQ');frames.add(s.frame);release ||= s.contact;f.updatePlayer({held:()=>false,pressed:()=>false,released:()=>false},rules);}
 assert.ok(release&&frames.has(0)&&frames.has(5)&&frames.has(11));assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 console.log('IBUKI_KUNAI_REACHABLE',{facing,move:attack.id,frames:[...frames]});
}
