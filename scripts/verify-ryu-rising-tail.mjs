import assert from 'node:assert/strict';
import {getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false},assets=new Map(animationSequencesFor('RYU',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const paints=[],stack=[],o={globalAlpha:.4};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){paints.push({src:im.src,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert.equal(o.globalAlpha,.4);return paints;}
function prepare(facing){const w=new CombatWorld(getCharacter('RYU'),getCharacter('KEN'),'duel'),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;const forward=facing===1?'right':'left';for(let t=0;t<3;t++){const held=t===0?[forward]:t===1?['down']:['down',forward,'lp'];w.update({held:k=>held.includes(k),pressed:k=>t===2&&k==='lp',released:()=>false},t);}assert.equal(f.currentMove?.id,'RYU_ANTI_AIR');return{w,f,forward,tick:3};}
function atTail(facing){const run=prepare(facing);while(run.f.currentMove&&run.tick<100)run.w.update(quiet,run.tick++);assert.equal(run.f.visualRecoveryMoveId,'RYU_ANTI_AIR');assert(!run.f.airborne&&run.f.landingFrames>0);assert.equal(run.f.state,'idle');return run;}
let cases=0,draws=0,freezeChecks=0,interruptions=0,controls=0;
for(const facing of[-1,1])for(const freeze of[false,true]){const {w,f,tick}=atTail(facing);let t=tick;const first=sample(f,0);assert.equal(first?.sequence.kind,'shoryuken','Completed Ryu uppercut must retain its authored landing recovery');assert.equal(first.frame,9);const hp=f.hp;
 if(freeze){f.hitStop=3;const timer=f.landingFrames;for(let n=0;n<3;n++){w.update(quiet,t++);assert.equal(f.landingFrames,timer);assert.deepEqual(sample(f,0),first);freezeChecks++;}}
 const timers=[],frames=[];while(f.landingFrames>0){const s=sample(f,0);assert.equal(s?.sequence.kind,'shoryuken');assert.equal(s.contact,false);timers.push(f.landingFrames);frames.push(s.frame);const paints=draw(f);assert(paints.some(p=>p.src===s.sequence.asset&&p.args[0]===s.frame*640&&p.args[2]===640));assert(!paints.some(p=>p.src.endsWith('/landing.webp')),'Generic landing art must not replace uppercut recovery');draws++;w.update(quiet,t++);}
 assert.deepEqual(timers,[7,6,5,4,3,2,1]);assert.deepEqual([...new Set(frames)],[9,10,11]);assert.equal(f.hp,hp);assert.equal(sample(f,0)?.sequence.kind,'idle');assert.equal(f.visualRecoveryMoveId,null);cases++;}
for(const facing of[-1,1])for(const action of['attack','jump','hit','block','parry','dash']){const {w,f,forward,tick}=atTail(facing);const enemy=new Fighter(getCharacter('KEN'),'enemy',f.x+facing*60,f.y,-facing);
 if(action==='attack')w.update({...quiet,pressed:k=>k==='lp'},tick);
 if(action==='jump')w.update({...quiet,pressed:k=>k==='jump'},tick);
 if(action==='hit')assert.equal(f.receiveHit(normalFor('mp'),enemy,false),'hit');
 if(action==='block')assert.equal(f.receiveHit(normalFor('lp'),enemy,true),'block');
 if(action==='parry'){w.update({...quiet,pressed:k=>k===forward},tick);assert.equal(f.receiveHit(normalFor('lp'),enemy,false),'parry');}
 if(action==='dash'){const tap={...quiet,held:k=>k===forward,pressed:k=>k===forward};w.update(tap,tick);w.update(quiet,tick+1);w.update(tap,tick+2);assert(f.dashFrames>0);}
 const expected={attack:'stand-light',jump:'jump',hit:'hit',block:'guard',parry:'parry',dash:'dash'}[action];assert.equal(sample(f,0)?.sequence.kind,expected,action+' must immediately replace previous recovery');assert.equal(f.visualRecoveryMoveId,null);const paints=draw(f);assert(!paints.some(p=>p.src.endsWith('/shoryuken.webp')));assert(paints.some(p=>p.src===sample(f,0).sequence.asset));interruptions++;}
for(const facing of[-1,1]){const w=new CombatWorld(getCharacter('RYU'),getCharacter('KEN'),'duel'),f=w.player;w.enemies.length=0;f.facing=facing;f.superGauge=500;f.startMove(superArtMoveFor('RYU',2));let air=false;for(let t=0;t<100;t++){const s=sample(f,0);if(f.state==='attack'){assert.equal(s?.sequence.kind,'shoryuken');air ||= f.airborne;}w.update(quiet,t);}assert(air);assert.equal(sample(f,0)?.sequence.kind,'idle');assert.equal(f.visualRecoveryMoveId,null);controls++;
 w.update({...quiet,pressed:k=>k==='jump'},100);let t=101;while(f.airborne&&t<220)w.update(quiet,t++);assert(f.landingFrames>0);assert.equal(sample(f,0)?.sequence.kind,'landing','Regular jump must keep its dedicated landing art');controls++;}
console.log('RYU_RISING_TAIL_PASS',{facings:2,cases,draws,freezeChecks,interruptions,controls,realMotionInput:true,existingAssetsReused:true,gameplayTimingUnchanged:true});
