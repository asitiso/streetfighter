import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('CHUNLI'), move=superArtMoveFor('CHUNLI',3);
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
const input={held:()=>false,pressed:()=>false,released:()=>false};
for(const facing of [-1,1]) {
 const fighter=new Fighter(def,'player',300,460,facing,def.superArts[2]);fighter.superGauge=1000;fighter.startMove(move);assert.equal(fighter.currentMove.id,move.id);
 for(const [tick,frame,contact] of [[0,0,false],[move.startup-1,3,false],[move.startup,4,true],[move.startup+move.active-1,7,true],[move.startup+move.active,8,false],[move.startup+move.active+move.recovery-1,11,false]]) {
  fighter.moveFrame=tick;const sample=animationSequenceSample(fighter,0);assert.equal(sample?.sequence.kind,'tensei-ranka','SA3 needs its own rising kick chain');assert.equal(sample.frame,frame);assert.equal(sample.contact,contact);
 }
 fighter.superGauge=1000;fighter.startMove(move);let airborneSamples=0,landed=false;
 for(let tick=0;tick<move.startup+move.active+move.recovery+60;tick++) {
  if(fighter.state==='attack'&&fighter.currentMove?.id===move.id){assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'tensei-ranka','SA3 must retain its authored sequence during flight');if(fighter.airborne)airborneSamples++;}
  fighter.updatePlayer(input,rules);if(airborneSamples&&!fighter.airborne)landed=true;
 }
 assert.ok(airborneSamples>0);assert.ok(landed);
 const specials=specialMovesFor('CHUNLI');
 for(const other of [specials.primary,specials.exPrimary,specials.antiAir,specials.mobility,specials.super,superArtMoveFor('CHUNLI',1),superArtMoveFor('CHUNLI',2)]){fighter.currentMove=other;fighter.state='attack';fighter.airborne=false;assert.notEqual(animationSequenceSample(fighter,0)?.sequence.kind,'tensei-ranka',other.id);}
 fighter.currentMove=airNormalFor('CHUNLI','hk');fighter.airborne=true;assert.equal(animationSequenceSample(fighter,0),null);
 fighter.airborne=false;fighter.state='idle';fighter.stateFrame=0;assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
}
console.log('CHUNLI_TENSEI_RANKA_PASS');
