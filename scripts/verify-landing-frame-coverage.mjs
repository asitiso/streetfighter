import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,freezeChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const freeze of [false,true]){
 const w=new CombatWorld(c,getCharacter('RYU'),'duel',c.superArts[0]),f=w.player;f.x=f.previousX=500;f.facing=facing;const hp=f.hp;
 f.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);assert(f.airborne);let ticks=0;while(f.airborne&&ticks++<120)f.updatePlayer(quiet,w.rules);assert(!f.airborne);assert.equal(f.landingFrames,8);
 if(freeze){const first=animationSequenceSample(f,0);f.hitStop=3;for(let i=0;i<3;i++){f.updatePlayer(quiet,w.rules);assert.equal(f.landingFrames,8);assert.deepEqual(animationSequenceSample(f,0),first);freezeChecks++;}}
 const frames=[],timers=[];while(f.landingFrames>0){const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'landing');frames.push(s.frame);timers.push(f.landingFrames);f.updatePlayer(quiet,w.rules);}
 assert.deepEqual([...new Set(frames)],[0,1,2,3,4,5],c.id+' real landing must show every authored pose');assert.equal(frames[0],0);assert.equal(frames.at(-1),5);assert(frames.every((n,i)=>i===0||n>=frames[i-1]));assert.deepEqual(timers,[8,7,6,5,4,3,2,1],'New touchdown retains all eight visual ticks');assert.equal(f.hp,hp);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');cases++;
}
console.log('LANDING_FRAME_COVERAGE_PASS',{characters:10,facings:2,cases,freezeChecks,everyPoseVisible:true,fullEightTickLandingWindow:true});
