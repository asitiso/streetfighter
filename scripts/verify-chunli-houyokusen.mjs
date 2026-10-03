import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor, normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('CHUNLI'), specials=specialMovesFor('CHUNLI');
const moves=[specials.super,superArtMoveFor('CHUNLI',2)];
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',300,460,facing,def.superArts[1]);
 for(const move of moves) {
  fighter.superGauge=1000;fighter.startMove(move);
  assert.equal(fighter.currentMove.id,move.id);
  for(const [tick,frame,contact] of [[0,0,false],[move.startup-1,move.startup===1?0:2,false],[move.startup,3,true],[move.startup+move.active-1,11,true],[move.startup+move.active,12,false],[move.startup+move.active+move.recovery-1,15,false]]) {
   fighter.moveFrame=tick;const sample=animationSequenceSample(fighter,0);
   assert.equal(sample?.sequence.kind,'super-rush',`${move.id} must use Houyokusen`);assert.equal(sample.frame,frame);assert.equal(sample.contact,contact);
  }
 }
 const multi=moves[1];fighter.currentMove=multi;
 const contactFrames=[];
 for(let hit=0;hit<multi.multiHit.hits;hit++) {
  fighter.moveFrame=multi.startup+hit*multi.multiHit.interval;const sample=animationSequenceSample(fighter,0);
  assert.equal(sample.contact,true);contactFrames.push(sample.frame);
 }
 assert.equal(new Set(contactFrames).size,multi.multiHit.hits,'Seven hit opportunities must progress through distinct kick frames');
 fighter.currentMove=superArtMoveFor('CHUNLI',1);assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'kikosho');
 fighter.currentMove=superArtMoveFor('CHUNLI',3);assert.equal(animationSequenceSample(fighter,0),null,'SA3 must remain distinct');
 for(const [other,kind] of [[specials.primary,'hadoken'],[specials.exPrimary,'hadoken'],[specials.antiAir,'shoryuken'],[specials.mobility,'tatsumaki'],[normalFor('lp',false,'CHUNLI'),'stand-light'],[normalFor('hp',false,'CHUNLI'),'stand-heavy']]){fighter.currentMove=other;fighter.moveFrame=0;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,kind);}
 fighter.currentMove=moves[1];fighter.airborne=true;assert.equal(animationSequenceSample(fighter,0),null,'Grounded kick super must not replace air attacks');
 fighter.airborne=false;fighter.state='idle';fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
}
console.log('CHUNLI_HOUYOKUSEN_PASS');
