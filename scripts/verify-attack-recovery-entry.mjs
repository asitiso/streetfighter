import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},physics=createHash('sha256'),controls=createHash('sha256');
function trace(f){const data={...f,uid:0};delete data.attackRecoveryAnimationFrame;return JSON.stringify(data);}
function fixture(c,face,mode,button){const w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;f.updatePlayer({...q,pressed:k=>k===button},w.rules);assert(f.currentMove);sample(f);return{w,f};}
let reactionCases=0,naturalControls=0;const failures=[];
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const reaction of['hit','throw','collision'])for(const delay of[0,1,3,6,10]){
 const a=fixture(c,face,mode,'hp'),b=fixture(c,face,mode,'hp');for(const r of[a,b]){if(reaction==='collision')r.f.receiveThrownCollision(20,face);else r.f.receiveHit(reaction==='throw'?throwMoveFor(c.id):normalFor('hp',false,c.id),r.w.enemy,false);}sample(a.f);let n=0;while(a.f.state==='hit'||a.f.state==='knockdown'||a.f.hitStop>0||a.f.airborne||a.f.landingFrames>0){a.f.updatePlayer(q,a.w.rules);sample(a.f);b.f.updatePlayer(q,b.w.rules);assert.equal(trace(a.f),trace(b.f));assert(++n<240);}for(let i=0;i<delay;i++){a.f.updatePlayer(q,a.w.rules);sample(a.f);b.f.updatePlayer(q,b.w.rules);}const dense=sample(a.f),sparse=sample(b.f);assert.equal(dense.active,false);if(JSON.stringify(dense)!==JSON.stringify(sparse))failures.push([c.id,face,mode,reaction,delay,dense.kind,sparse.kind]);physics.update(trace(a.f));physics.update(trace(b.f));reactionCases++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const button of['lp','mp','hp','lk','mk','hk'])for(const delay of[0,1,3,6,10]){
 const a=fixture(c,face,mode,button),b=fixture(c,face,mode,button);let n=0;while(a.f.currentMove){a.f.updatePlayer(q,a.w.rules);sample(a.f);b.f.updatePlayer(q,b.w.rules);assert.equal(trace(a.f),trace(b.f));assert(++n<160);}for(let i=0;i<delay;i++){a.f.updatePlayer(q,a.w.rules);sample(a.f);b.f.updatePlayer(q,b.w.rules);}const dense=sample(a.f),sparse=sample(b.f);if(JSON.stringify(dense)!==JSON.stringify(sparse))failures.push(['natural',c.id,face,mode,button,delay]);physics.update(trace(a.f));physics.update(trace(b.f));controls.update(JSON.stringify(dense));naturalControls++;
}

const lowPhysics=createHash('sha256');let lowRecoveryCases=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const button of['lp','mp','hp','lk','mk','hk'])for(const heldEnd of[false,true])for(const showAttack of[false,true])for(const delay of[0,1,3,6,9,12]){
 function lowFixture(dense){const w=new CombatWorld(c,c,'duel'),f=w.player;f.x=f.previousX=500;f.facing=face;sample(f);for(let i=0;i<6;i++){f.updatePlayer({...q,held:k=>k==='down'},w.rules);if(dense)sample(f);}f.updatePlayer({...q,held:k=>k==='down',pressed:k=>k===button},w.rules);assert(f.currentMove.id.startsWith('2'));if(dense||showAttack)sample(f);return{w,f};}
 const a=lowFixture(true),b=lowFixture(false);let n=0;while(a.f.currentMove){const input=heldEnd?{...q,held:k=>k==='down'}:q;a.f.updatePlayer(input,a.w.rules);sample(a.f);b.f.updatePlayer(input,b.w.rules);assert.equal(trace(a.f),trace(b.f));assert(++n<160);}for(let i=0;i<delay;i++){a.f.updatePlayer(q,a.w.rules);sample(a.f);b.f.updatePlayer(q,b.w.rules);}const dense=sample(a.f),sparse=sample(b.f);assert.equal(dense.active,false,'low recovery is owned by crouch/rise');if(JSON.stringify(dense)!==JSON.stringify(sparse))failures.push(['low-recovery',c.id,face,button,heldEnd,showAttack,delay,dense.kind,sparse.kind]);lowPhysics.update(trace(a.f));lowPhysics.update(trace(b.f));lowRecoveryCases++;
}

const report={passed:failures.length===0,reactionCases,naturalControls,lowRecoveryCases,lowPhysicsSha256:lowPhysics.digest('hex'),physicsSha256:physics.digest('hex'),naturalControlsSha256:controls.digest('hex'),failures:failures.length,examples:failures.slice(0,8)};if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(failures.length,0,'Interrupted attacks cannot replay a natural recovery transition');
