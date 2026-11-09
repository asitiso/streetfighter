import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('CHUNLI'), move=superArtMoveFor('CHUNLI',1);
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',300,460,facing,def.superArts[0]);
 fighter.superGauge=1000;fighter.startMove(move);assert.equal(fighter.currentMove.id,'CHUNLI_SA1');
 for(const [tick,frame,contact] of [[0,0,false],[move.startup-1,4,false],[move.startup,5,true],[move.startup+move.active-1,6,true],[move.startup+move.active,7,false],[move.startup+move.active+move.recovery-1,11,false]]) {
  fighter.moveFrame=tick;const sample=animationSequenceSample(fighter,0);
  assert.equal(sample?.sequence.kind,'kikosho','SA1 needs its own authored two-palm release');assert.equal(sample.frame,frame);assert.equal(sample.contact,contact);
 }
 const specials=specialMovesFor('CHUNLI');
 for(const other of [specials.primary,specials.exPrimary,specials.antiAir,specials.mobility,specials.super,superArtMoveFor('CHUNLI',2),superArtMoveFor('CHUNLI',3)]) {
  fighter.currentMove=other;assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'kikosho',other.id);
 }
 fighter.currentMove=move;fighter.airborne=true;assert.equal(animationSequenceSample(fighter,0),null);
 fighter.airborne=false;fighter.state='idle';fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
}
console.log('CHUNLI_KIKOSHO_PASS');
