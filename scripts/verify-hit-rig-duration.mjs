import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {fighterAnatomyProfile} from '../dist/assets/render/FighterVisualProfiles.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
import {characterTextureManager} from '../dist/assets/render/CharacterTextureManager.js';
globalThis.Image=undefined;characterTextureManager.setMode('lite');
function render(f){let lastArmAngle=0,matrix=[1,0,0,1,0,0],stack=[],path=[],body=null;const arms=[],trace=[],o={globalAlpha:1,imageSmoothingEnabled:true,imageSmoothingQuality:'low'};
 const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
 const operations={save(){stack.push({matrix:[...matrix],o:{...o}});},restore(){const s=stack.pop();matrix=s.matrix;for(const key of Object.keys(o))delete o[key];Object.assign(o,s.o);},translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},rotate(a){lastArmAngle=a;const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=matrix;matrix[0]=aa*c+cc*s;matrix[1]=b*c+d*s;matrix[2]=cc*c-aa*s;matrix[3]=d*c-b*s;},beginPath(){path=[];},moveTo(x,y){path.push(point(x,y));},lineTo(x,y){path.push(point(x,y));},stroke(){if(o.strokeStyle==='rgba(5,7,12,.88)'&&o.lineWidth>17&&path.length===2)arms.push({angle:lastArmAngle,start:path[0],end:path[1],width:o.lineWidth});},createLinearGradient(...a){if(a[0]===-40&&a[1]===-136)body=[...matrix];return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}};
 const ctx=new Proxy(o,{get(o,key){if(key in o)return o[key];return(...args)=>{trace.push([key,...args]);return operations[key]?.(...args);};},set(o,key,v){o[key]=v;trace.push(['set',key,typeof v==='object'?'gradient':v]);return true;}});const before=JSON.stringify(f);drawCombatFighter(ctx,f,1,0);assert.equal(JSON.stringify(f),before,'Rendering cannot mutate fighter');assert.equal(stack.length,0);return{body,arms,trace};}
const recording=process.argv.includes('--record-controls'),records=[],q={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,ticks=0,freezeChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const side of ['player','enemy'])for(const counter of [false,true])for(const crouch of [false,true])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing),move=normalFor(button,crouch,c.id);
 assert.equal(f.receiveHit(move,a,false,counter),'hit');if(f.state!=='hit')continue;
 const duration=f.hitAnimationDuration;assert(duration>0);const initial=sampleFighterMotion(f,0),initialArmAngles=!recording?render(f).arms.map(a=>a.angle):null;
 while(f.hitStop>0){f.updatePlayer(q,w.rules);assert.deepEqual(sampleFighterMotion(f,0),initial,'Hitstop freezes recoil');if(!recording)assert.deepEqual(render(f).arms.map(a=>a.angle),initialArmAngles,'Actual rig arms freeze during hitstop');freezeChecks++;}
 for(let elapsed=0;elapsed<duration;elapsed++){
  const clip=motionClipForFighter(f,0),hq=animationSequenceSample(f,0);assert.equal(clip.clip,'hit');
  if(!recording){const r=render(f),anatomy=fighterAnatomyProfile(c.id),kind=f.lastHitReaction,zone=f.lastHitZone,kindScale=kind==='launch'?1.34:kind==='throw'?1.42:kind==='low'?.74:kind==='high'?1.12:1,zoneScale=zone==='head'?1.18:zone==='leg'?.72:zone==='launch'?1.28:zone==='throw'?1.4:1,recoil=anatomy.hitTwist*kindScale*zoneScale,bias=zone==='leg'?.42:zone==='launch'?-.48:zone==='head'?-.12:zone==='throw'?.2:0,direction=f.lastHitDirection*f.facing,phase=(duration-elapsed)/duration;assert.equal(r.arms.length,2);assert(Math.abs(r.arms[0].angle-(direction*(-.95*recoil-phase*.22*recoil)+bias))<1e-12,'Front arm recoil follows actual hit duration');assert(Math.abs(r.arms[1].angle-(direction*(.72*recoil+phase*.18*recoil)-bias*.6))<1e-12,'Rear arm recoil follows actual hit duration');assert(Math.abs(clip.progress-elapsed/Math.max(1,duration-1))<1e-12,c.id+'/'+button+'/'+crouch+'/'+counter+' recoil must span actual hit stun from first pose');assert.equal(clip.progress,hq.progress,'Fallback hit phase must match HQ');}
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
if(recording)console.log(JSON.stringify(records));else console.log('HIT_RIG_DURATION_PASS',{cases,ticks,freezeChecks});
