import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
let cases=0,freezes=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const direction of [-1,0,1]){
 const w=new CombatWorld(c,c,mode),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;const rows=[];let didFreeze=false,t=0;
 for(let n=0;n<75;n++){w.update({...quiet,held:k=>direction!==0&&k===(direction>0?'right':'left'),pressed:k=>n===0&&k==='jump'},t++);const s=sample(f,0);if(s?.sequence.kind!=='jump')continue;rows.push({frame:s.frame,height:f.jumpHeight,velocity:f.jumpVelocity});
  if(!didFreeze&&Math.abs(f.jumpVelocity)<1){didFreeze=true;f.hitStop=3;const p=[f.x,f.y,f.jumpHeight,f.jumpVelocity];for(let i=0;i<3;i++){w.update(quiet,t++);assert.deepEqual([f.x,f.y,f.jumpHeight,f.jumpVelocity],p);assert.deepEqual(sample(f,0),s);freezes++;}}
 }
 const label=c.id+'/'+mode+'/'+facing+'/'+direction,peak=Math.max(...rows.map(r=>r.height)),apex=rows.reduce((a,b)=>Math.abs(a.velocity)<Math.abs(b.velocity)?a:b);
 assert(apex.frame===3||apex.frame===4,label+': tucked apex must align with physical apex, got frame'+apex.frame);
 const landingReady=rows.find(r=>r.frame===7);assert(landingReady,label+': final jump pose missing');assert(landingReady.velocity<0&&landingReady.height<=peak*.8,label+': landing-ready pose arrived too early');
 assert(rows.filter(r=>r.velocity>0).every(r=>r.frame<=4),label+': descent pose played while rising');
 assert.deepEqual([...new Set(rows.map(r=>r.frame))].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
 assert(rows.every((r,i)=>i===0||r.frame>=rows[i-1].frame),label+': jump animation reversed');assert(didFreeze);cases++;
}
console.log('JUMP_PHASE_TIMING_PASS',{cases,freezeChecks:freezes,all8Frames:true,physicalApexAligned:true,landingReadyOnlyDuringDescent:true});
