import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
const specs=[{name:'close',distance:60},{name:'mid',distance:110},{name:'ranged',distance:300},{name:'corner',distance:60,corner:true},{name:'chase',distance:150,air:true},{name:'antiAir',distance:50,air:true}];
let airCases=0,airSamples=0,groundCases=0,naturalChases=0,existingAttackSamples=0;
function rules(mode){return {mode,depthMovement:mode==='belt',laneTolerance:mode==='belt'?54:22,arenaLeft:120,arenaRight:1160,arenaTop:mode==='belt'?394:500,arenaBottom:mode==='belt'?580:500};}
function snapshot(f){return [f.x,f.y,f.previousX,f.previousY,f.facing,f.state,f.stateFrame,f.hp,f.superGauge,f.installFrames,f.aiCooldown,f.aiAirChaseCount,f.aiCornerPressureCount,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.currentMove?.id??null,f.moveFrame,sample(f,0)?.sequence.kind??null,sample(f,0)?.frame??null];}
function fixture(c,mode,facing,spec){const r=rules(mode),targetX=spec.corner?(facing===1?1140:140):600+facing*spec.distance,f=new Fighter(c,'enemy',targetX-facing*spec.distance,500,facing),target=new Fighter(getCharacter('RYU'),'player',targetX,500,-facing);if(spec.air){target.updatePlayer({...q,pressed:k=>k==='jump'},r);while(target.jumpHeight<90)target.updatePlayer(q,r);}return{r,f,target};}
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const spec of specs){
 const {r,f,target}=fixture(c,mode,facing,spec);f.updatePlayer({...q,pressed:k=>k==='jump'},r);f.superGauge=1000;f.aiSuperBias=1;
 for(let n=0;n<12;n++){f.updateAiDirected(target,r,{role:'attack',desiredX:f.x,desiredY:500,attackAllowed:true,rangedAllowed:true});assert(f.airborne);airSamples++;if(!recording){assert.equal(f.currentMove,null,c.id+'/'+spec.name+' must not start a ground move during jump');assert.equal(f.superGauge,1000,'No gauge spent on invalid airborne ground attack');assert.equal(f.aiAirChaseCount,0,'No repeated chase impulse');assert.equal(f.aiCornerPressureCount,0);assert.equal(f.state,'jump');assert.equal(sample(f,0)?.sequence.kind,'jump');}}
 airCases++;
}
// Real AI chase followed by ready offense must wait for actual touchdown.
for(const c of roster.filter(c=>['KEN','CHUNLI','DUDLEY','IBUKI','YUN','GILL'].includes(c.id)))for(const mode of ['duel','belt'])for(const facing of [-1,1]){
 const {r,f,target}=fixture(c,mode,facing,{distance:150,air:true});f.updateAi(target,r);assert(f.currentMove?.technique==='air'&&f.airborne);let ended=false,landed=false,attackedAfterLanding=false;
 for(let n=0;n<85;n++){target.x=f.x+facing*60;target.airborne=false;target.jumpHeight=0;const old=f.currentMove;f.updateAiDirected(target,r,{role:'attack',desiredX:f.x,desiredY:500,attackAllowed:true,rangedAllowed:true});if(old?.technique==='air'&&f.currentMove===old)existingAttackSamples++;if(!f.currentMove)ended=true;if(ended&&!landed&&f.airborne&&!recording){assert.equal(f.currentMove,null,'Chase recovery must not select ground attack');assert.equal(sample(f,0)?.sequence.kind,'jump');}if(!f.airborne)landed=true;if(landed&&f.currentMove)attackedAfterLanding=true;}
 assert(ended&&landed&&attackedAfterLanding);naturalChases++;
}
// All grounded branches and decisions retain complete selected outcomes.
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const spec of specs){
 const {r,f,target}=fixture(c,mode,facing,spec),rows=[];f.superGauge=1000;f.aiSuperBias=.3;
 // One ground-origin decision covers ordinary/corner/ranged/chase branches.
 f.updateAiDirected(target,r,{role:'attack',desiredX:f.x,desiredY:500,attackAllowed:true,rangedAllowed:true});rows.push(snapshot(f));records.push({c:c.id,mode,facing,spec:spec.name,ground:true,rows});groundCases++;
}
// Nonattacking airborne steering and existing air-normal execution are unchanged.
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const attack of [false,true]){
 const {r,f,target}=fixture(c,mode,facing,{distance:200});f.updatePlayer({...q,pressed:k=>k==='jump'},r);if(attack)f.startMove(airNormalFor(c.id,'lp'));const rows=[];for(let n=0;n<60;n++){f.updateAiDirected(target,r,{role:'attack',desiredX:f.x+facing*200,desiredY:500,attackAllowed:false,rangedAllowed:false});rows.push(snapshot(f));}records.push({c:c.id,mode,facing,attack,ground:false,rows});
}
if(recording)console.log(JSON.stringify(records));else console.log('AI_AIR_GROUND_ATTACK_PASS',{airCases,airSamples,groundCases,naturalChases,existingAttackSamples,recordedControls:records.length,characters:roster.length});
