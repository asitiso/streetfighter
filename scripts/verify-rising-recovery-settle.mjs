import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},record=process.argv.includes('--record-controls'),physics=[],controls=[];let cases=0,settled=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const mode of ['duel','belt'])for(const m of [specialMovesFor(c.id).antiAir,...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge)).filter(m=>m.id.startsWith(c.id))]){
 if(!m.launch)continue;const w=new CombatWorld(c,c,mode),f=w.player;f.facing=facing;f.superGauge=1000;f.startMove(m);let landed=false;
 for(let tick=0;tick<100;tick++){
  f.updatePlayer(q,w.rules);if(f.landingFrames>0)landed=true;const before=JSON.stringify(f),s=sample(f,0);assert.equal(JSON.stringify(f),before);const state=JSON.parse(before);delete state.attackHasLanded;physics.push([c.id,m.id,facing,mode,tick,state]);
  if(landed&&!f.airborne&&f.landingFrames===0&&f.currentMove?.id===m.id&&s){if(!record)assert.equal(s.frame,s.sequence.frameCount-1,'completed touchdown must not rewind '+m.id);settled++;}
  if(m.id!=='KEN_SA2')controls.push([c.id,m.id,facing,mode,tick,s]);
  if(!f.currentMove&&!f.airborne&&f.landingFrames===0)break;
 }cases++;
}
if(!record){const c=CHARACTERS.find(c=>c.id==='KEN'),w=new CombatWorld(c,c,'duel'),f=w.player,m=superArtMoveFor(c.id,2);f.superGauge=1000;f.startMove(m);while(f.airborne||f.landingFrames>0||!f.attackHasLanded)f.updatePlayer(q,w.rules);const pose=sample(f,0);f.hitStop=3;for(let n=0;n<3;n++){f.updatePlayer(q,w.rules);assert.deepEqual(sample(f,0),pose,'settled pose freezes with hit stop');}f.superGauge=0;f.startMove(m);assert.equal(f.attackHasLanded,true,'rejected move must retain old landing');f.startMove(specialMovesFor(c.id).antiAir);assert.equal(f.attackHasLanded,false,'accepted move resets old landing');}
if(record)console.log(JSON.stringify({physics,controls}));else{assert(settled>0);console.log(JSON.stringify({passed:true,cases,settled}));}
