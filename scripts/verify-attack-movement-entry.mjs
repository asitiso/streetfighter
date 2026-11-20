import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},physics=createHash('sha256'),controls=createHash('sha256');
function setup(c,face,mode,direction){const w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;let tick=0;const step=(i=q)=>{f.captureInput(i,tick++);f.updatePlayer(i,w.rules);};const key=direction===1?'right':'left',tap={...q,held:k=>k===key,pressed:k=>k===key};step(tap);step();step(tap);assert(f.dashFrames>0);sample(f);return{f,step};}
function record(f){const data={...f,uid:0};delete data.attackMovementEntry;physics.update(JSON.stringify(data));}
let cases=0,valid=0,expired=0,walking=0;const failures=[];
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const direction of[-1,1])for(const gap of[0,1,3,6,8,9,10,12])for(const delay of[0,1,3,6,10]){
 const a=setup(c,face,mode,direction),b=setup(c,face,mode,direction);for(let i=0;i<gap;i++){a.step();sample(a.f);b.step();}const eligible=a.f.dashFrames>0||Math.abs(a.f.x-a.f.previousX)>4.6;const hp={...q,pressed:k=>k==='hp'};a.step(hp);b.step(hp);sample(a.f);for(let i=0;i<delay;i++){a.step();sample(a.f);b.step();}record(a.f);record(b.f);const expected=sample(a.f),actual=sample(b.f);controls.update(JSON.stringify(expected));if(JSON.stringify(expected)!==JSON.stringify(actual))failures.push([c.id,face,mode,direction,gap,delay,expected.kind,actual.kind]);if(eligible)valid++;else expired++;cases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const delay of[0,1,3,6,10]){const a=setup(c,face,mode,face),b=setup(c,face,mode,face);for(let i=0;i<12;i++){a.step();sample(a.f);b.step();sample(b.f);}const walk={...q,held:k=>k===(face===1?'right':'left')};a.step(walk);b.step(walk);sample(a.f);sample(b.f);const hp={...q,pressed:k=>k==='hp'};a.step(hp);b.step(hp);sample(a.f);for(let i=0;i<delay;i++){a.step();sample(a.f);b.step();}const expected=sample(a.f),actual=sample(b.f);record(a.f);record(b.f);controls.update(JSON.stringify(expected));if(JSON.stringify(expected)!==JSON.stringify(actual))failures.push(['walk',c.id,face,mode,delay]);walking++;}
const report={passed:failures.length===0,cases,valid,expired,walking,physicsSha256:physics.digest('hex'),denseControlsSha256:controls.digest('hex'),failures:failures.length,examples:failures.slice(0,8)};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(failures.length,0,'Skipped renders must not replay expired dash momentum');
