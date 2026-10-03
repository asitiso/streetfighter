import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor, normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('CHUNLI'), specials=specialMovesFor('CHUNLI'), move=specials.antiAir;
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
const input={held:()=>false,pressed:()=>false,released:()=>false};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',300,460,facing,def.superArts[0]); fighter.startMove(move);
 for(const [gameFrame,artFrame,contact] of [[0,0,false],[move.startup-1,3,false],[move.startup,4,true],[move.startup+move.active-1,7,true],[move.startup+move.active,8,false],[move.startup+move.active+move.recovery-1,11,false]]) {
  fighter.moveFrame=gameFrame; const sample=animationSequenceSample(fighter,0);
  assert.equal(sample?.sequence.kind,'shoryuken');assert.equal(sample.frame,artFrame);assert.equal(sample.contact,contact);
 }
 // Follow the real launch, flight and landing instead of only assigning frame numbers.
 fighter.startMove(move); let airborneSamples=0, reachedLanding=false;
 for(let tick=0;tick<move.startup+move.active+move.recovery+60;tick++) {
  if(fighter.currentMove?.id===move.id&&fighter.state==='attack') {
   const sample=animationSequenceSample(fighter,0);
   assert.equal(sample?.sequence.kind,'shoryuken','Rising attack must not disappear when gameplay launches it');
   if(fighter.airborne)airborneSamples++;
  }
  fighter.updatePlayer(input,rules); if(airborneSamples&& !fighter.airborne)reachedLanding=true;
 }
 assert.ok(airborneSamples>0,'Must exercise airborne rise');assert.ok(reachedLanding,'Must exercise return to ground');
 for(const [other,kind] of [[specials.primary,'hadoken'],[specials.exPrimary,'hadoken'],[specials.mobility,'tatsumaki'],[normalFor('lp',false,'CHUNLI'),'stand-light'],[normalFor('hp',false,'CHUNLI'),'stand-heavy']]) {
  fighter.startMove(other);fighter.airborne=false;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,kind);
 }
 for(const other of [specials.super,...[1,2,3].map(id=>superArtMoveFor('CHUNLI',id))]){fighter.currentMove=other;fighter.state='attack';assert.equal(animationSequenceSample(fighter,0),null);}
 fighter.currentMove=airNormalFor('CHUNLI','hk');fighter.airborne=true;
 assert.equal(animationSequenceSample(fighter,0),null,'Air normal must retain its own presentation');
 fighter.airborne=false;fighter.state='idle';fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
}
console.log('CHUNLI_RISING_KICK_PASS');
