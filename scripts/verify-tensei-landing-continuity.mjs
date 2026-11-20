import assert from 'node:assert/strict';
import {getCharacter,CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {superArtMoveFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},record=process.argv.includes('--record-controls'),physics=[],controls=[];let cases=0,airRecovery=0,landingRecovery=0;
for(const facing of [-1,1])for(const mode of ['belt','duel']){
 const c=getCharacter('CHUNLI'),w=new CombatWorld(c,c,mode),f=w.player,m=superArtMoveFor(c.id,3);f.facing=facing;f.superGauge=1000;f.startMove(m);
 for(let tick=0;tick<65;tick++){
  f.updatePlayer(q,w.rules);const before=JSON.stringify(f),s=sample(f,tick/60);assert.equal(JSON.stringify(f),before,'sampling must not mutate combat');physics.push([facing,mode,tick,before]);
  if(f.currentMove?.id===m.id&&f.moveFrame>=m.startup+m.active&&f.airborne){if(!record){assert.equal(s?.sequence.kind,'tensei-ranka');assert.equal(s.frame,f.jumpVelocity>0?7:8,'air recovery must retain airborne pose');assert.equal(s.contact,false);}airRecovery++;}
  if(f.visualRecoveryMoveId===m.id&&f.landingFrames>0&&!f.airborne){if(!record){assert.equal(s?.sequence.kind,'tensei-ranka','last landing tick must retain signature art');assert.equal(s.frame,f.landingFrames>=6?9:f.landingFrames>=3?10:11);}landingRecovery++;}
 }
 assert(airRecovery>0&&landingRecovery>0);cases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS]){const w=new CombatWorld(c,c,'duel'),f=w.player;f.startMove(specialMovesFor(c.id).antiAir);for(let tick=0;tick<65;tick++){f.updatePlayer(q,w.rules);controls.push([c.id,tick,sample(f,0)]);}}
if(record)console.log(JSON.stringify({physics,controls}));else console.log(JSON.stringify({passed:true,cases,airRecovery,landingRecovery}));
