import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const recording=process.argv.includes('--record-controls'),records=[],q={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,ticks=0,freezeChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const side of ['player','enemy'])for(const counter of [false,true])for(const crouch of [false,true])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing),move=normalFor(button,crouch,c.id);
 assert.equal(f.receiveHit(move,a,false,counter),'hit');if(f.state!=='hit')continue;
 const duration=f.hitAnimationDuration;assert(duration>0);const initial=sampleFighterMotion(f,0);
 while(f.hitStop>0){f.updatePlayer(q,w.rules);assert.deepEqual(sampleFighterMotion(f,0),initial,'Hitstop freezes recoil');freezeChecks++;}
 for(let elapsed=0;elapsed<duration;elapsed++){
  const clip=motionClipForFighter(f,0),hq=animationSequenceSample(f,0);assert.equal(clip.clip,'hit');
  if(!recording){assert(Math.abs(clip.progress-elapsed/Math.max(1,duration-1))<1e-12,c.id+'/'+button+'/'+crouch+'/'+counter+' recoil must span actual hit stun from first pose');assert.equal(clip.progress,hq.progress,'Fallback hit phase must match HQ');}
  records.push([c.id,facing,side,counter,crouch,button,elapsed,f.state,f.stateFrame,f.hitAnimationDuration,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.x,f.y,f.airborne,f.jumpHeight,f.jumpVelocity,f.currentMove?.id??null,f.landingFrames,f.wallBounceFrames,f.groundBounceFrames]);f.updatePlayer(q,w.rules);ticks++;
 }
 assert.notEqual(f.state,'hit');cases++;
}
if(!recording){
 for(const c of [...CHARACTERS,...BOSS_CHARACTERS]){
  const f=new Fighter(c,'player',500,350,1),a=new Fighter(c,'enemy',545,350,-1),rules=new CombatWorld(c,c,'duel').rules;
  const jab=normalFor('lp',false,c.id),heavy=normalFor('hp',false,c.id);
  f.receiveHit(jab,a,false);while(f.hitStop)f.updatePlayer(q,rules);for(let i=0;i<4;i++)f.updatePlayer(q,rules);
  f.receiveHit(heavy,a,false,true);if(f.state==='hit'){assert.equal(motionClipForFighter(f,0).progress,0);assert.equal(f.hitAnimationDuration,heavy.hitStun+3);}
  for(const duration of [1,2,6,30,60]){f.state='hit';f.hitAnimationDuration=duration;f.wallBounceFrames=f.groundBounceFrames=0;for(let i=0;i<duration;i++){f.stateFrame=-duration+i;assert.equal(motionClipForFighter(f,0).progress,i/Math.max(1,duration-1));}}
  for(const [state,duration,frame,wall,ground] of [['hit',0,-10,0,0],['hit',30,-18,18,0],['hit',30,-16,0,16],['idle',30,-16,0,16],['hit',20,0,0,0]]){f.state=state;f.hitAnimationDuration=duration;f.stateFrame=frame;f.wallBounceFrames=wall;f.groundBounceFrames=ground;assert.equal(motionClipForFighter(f,0).progress,Math.max(0,Math.min(1,1-Math.abs(frame)/20)),'Legacy and bounce phase unchanged');}
 }
}
if(recording)console.log(JSON.stringify(records));else console.log('FALLBACK_HIT_DURATION_PASS',{cases,ticks,freezeChecks});
