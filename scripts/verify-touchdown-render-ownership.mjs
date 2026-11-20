import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},physics=createHash('sha256'),controls=createHash('sha256');
function trace(f){const data={...f,uid:0};delete data.landingNeutralAnimationFrame;return JSON.stringify(data);}
function fixture(c,face,mode,entry,dense,showAir){const w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=0;const step=(i=q)=>{f.captureInput(i,tick++);f.updatePlayer(i,w.rules);if(dense)sample(f);};sample(f);if(entry==='rising'){f.startMove(specialMovesFor(c.id).antiAir);if(dense)sample(f);}else{step({...q,pressed:k=>k==='jump'});if(entry!=='jump'){for(let i=0;i<3;i++)step();step({...q,pressed:k=>k===(entry==='air-lp'?'lp':'hk')});}}let n=0;while(f.airborne||f.currentMove){if(showAir&&f.airborne&&f.jumpVelocity<0&&f.jumpHeight+f.jumpVelocity<=0)sample(f);step();assert(++n<200);}return{w,f,step};}
let cases=0,landingControls=0,cancelControls=0;const failures=[];
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const entry of['jump','air-lp','air-hk','rising'])for(const showAir of[false,true])for(const delay of[0,1,3,6,8,10]){
 const a=fixture(c,face,mode,entry,true,showAir),b=fixture(c,face,mode,entry,false,showAir);for(let i=0;i<delay;i++){a.step();b.step();}assert.equal(trace(a.f),trace(b.f));const dense=sample(a.f),sparse=sample(b.f);if(JSON.stringify(dense)!==JSON.stringify(sparse))failures.push([c.id,face,mode,entry,showAir,delay,dense.kind,sparse.kind]);physics.update(trace(a.f));physics.update(trace(b.f));controls.update(JSON.stringify(dense));if(dense.kind==='landing-neutral')landingControls++;cases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const route of['crouch-pulse','jump','dash','attack'])for(const delay of[0,1,3,6]){
 const a=fixture(c,face,'duel','jump',true,false),b=fixture(c,face,'duel','jump',false,false);const both=i=>{a.step(i);b.step(i);};if(route==='crouch-pulse'){both({...q,held:k=>k==='down'});both(q);}else if(route==='jump')both({...q,pressed:k=>k==='jump'});else if(route==='attack')both({...q,pressed:k=>k==='hp'});else{const key=face===1?'right':'left',tap={...q,held:k=>k===key,pressed:k=>k===key};both(tap);both(q);both(tap);assert(a.f.dashFrames>0);}for(let i=0;i<delay;i++)both(q);assert.equal(trace(a.f),trace(b.f));const dense=sample(a.f),sparse=sample(b.f);if(JSON.stringify(dense)!==JSON.stringify(sparse))failures.push(['cancel',c.id,face,route,delay,dense.kind,sparse.kind]);physics.update(trace(a.f));physics.update(trace(b.f));controls.update(JSON.stringify(dense));cancelControls++;
}
const report={passed:failures.length===0,cases,landingControls,cancelControls,physicsSha256:physics.digest('hex'),denseControlsSha256:controls.digest('hex'),failures:failures.length,examples:failures.slice(0,8)};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(failures.length,0,'Touchdown ownership must survive skipped air renders without reviving cancelled settles');
