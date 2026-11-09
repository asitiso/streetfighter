import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('RYU','hadoken',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Ryu projectile needs a full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:4,activeStart:5,activeEnd:6,recoveryStart:7});
const assets=new Map(animationSequencesFor('RYU',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const draws=[],translations=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
export const timelines={};
for(const facing of [-1,1])for(const variant of ['PRIMARY','EX','SUPER','SA1','SA3']){
 const w=new CombatWorld(getCharacter('RYU'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left';const rows=[];
 if(['PRIMARY','EX'].includes(variant)){
  for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',forward]:[forward,'lp',...(variant==='EX'?['mp']:[])];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k==='lp',released:()=>false},tick);}
 }else f.startMove(variant==='SUPER'?specialMovesFor('RYU').super:superArtMoveFor('RYU',variant==='SA1'?1:3));
 const move=f.currentMove;assert.equal(move.id,variant==='PRIMARY'?'RYU_PRIMARY':variant==='EX'?'RYU_EX_PRIMARY':'RYU_'+variant);
 const seen=new Set(),contacts=new Set();let frozen=false,spawned=false;
 for(let tick=3;tick<100;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y}))});
  if(f.state==='attack'){
   assert.equal(s.sequence.id,seq.id);seen.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],s.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0));
   if(w.projectiles.length&&!spawned){spawned=true;assert.equal(s.frame,5,'New projectile must leave the forward-palm release');assert.equal(w.projectiles.length,move.projectile.count??1);}
   if(s.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y}))});}}
  }
  w.update(quiet,tick);
 }
 assert.ok(spawned);assert.equal(f.state,'idle');assert.ok(contacts.has(5)&&contacts.has(6));if(variant==='PRIMARY')assert.equal(seen.size,12,'Normal-speed projectile must reach every frame');
 f.startMove(move);f.airborne=true;assert.equal(animationSequenceSample(f,0),null,'Grounded projectile art must preserve aerial fallback');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.ok(animationSequenceFor('RYU','shoryuken',true)?.poseAuthored,'Uppercut promotion retains projectile behavior');
assert.equal(animationSequenceKindForAttack('RYU',{id:'RYU_CMD_MP'}),null);
console.log('RYU_HADOKEN_PASS',{variants:5,facings:2,canvasDraws,projectileReleaseFrame:5,airRejected:true});
