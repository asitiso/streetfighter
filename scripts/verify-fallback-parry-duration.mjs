import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {createHash} from 'node:crypto';
const recording=process.argv.includes('--record-controls'),q={held:()=>false,pressed:()=>false,released:()=>false},records=[];
let cases=0,ticks=0,frozen=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const side of ['player','enemy'])for(const kind of ['high','low','red']){
 const rules=new CombatWorld(c,c,'duel').rules;
 const f=new Fighter(c,side,500,350,facing),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing),move=normalFor(kind==='low'?'mk':'mp',kind==='low',c.id);
 if(kind==='red')f.redParryWindow=3;else if(kind==='low')f.lowParryWindow=3;else f.parryWindow=3;
 assert.equal(f.receiveHit(move,a,false),kind==='red'?'red-parry':'parry');const duration=kind==='red'?10:8;
 assert.equal(f.parryAnimationDuration,duration);
 const initial=sampleFighterMotion(f,0);for(let i=0;i<2;i++){f.updatePlayer(q,rules);assert.deepEqual(sampleFighterMotion(f,0),initial);frozen++;}
 for(let elapsed=0;elapsed<duration;elapsed++){
  const clip=motionClipForFighter(f,0),hq=animationSequenceSample(f,0);
  if(!recording){assert.equal(clip.clip,'parry');assert(Math.abs(clip.progress-elapsed/duration)<1e-12,c.id+'/'+kind+' must start at first pose and follow its real duration');assert.equal(clip.progress,hq.progress,'Fallback and HQ must share normalized parry time');}
  records.push([c.id,facing,side,kind,elapsed,f.state,f.stateFrame,f.parryAnimationDuration,f.hp,f.superGauge,f.hitStop,f.x,f.y,f.airborne,f.currentMove?.id??null,f.parryWindow,f.lowParryWindow,f.redParryWindow]);f.updatePlayer(q,rules);ticks++;
 }
 assert.notEqual(f.state,'parry');cases++;
}
if(!recording){
 const c=CHARACTERS[0],f=new Fighter(c,'player',500,350,1);f.state='parry';
 for(const [duration,stateFrame,expected] of [[0,-10,0],[0,-5,.5],[0,0,1],[-3,-1,0],[8,-99,0],[8,0,1]]){
  f.parryAnimationDuration=duration;f.stateFrame=stateFrame;assert.equal(motionClipForFighter(f,0).progress,expected);
 }
}
if(recording)console.log(JSON.stringify(records));else console.log('FALLBACK_PARRY_DURATION_PASS',{cases,ticks,frozen,gameplaySHA256:createHash('sha256').update(JSON.stringify(records)+'\n').digest('hex')});
