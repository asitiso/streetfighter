import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('RYU','tatsumaki',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Ryu mobility needs full authored spin action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:2,activeStart:3,activeEnd:8,recoveryStart:9});
const assets=new Map(animationSequencesFor('RYU',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const draws=[],translations=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
export const timelines={};
const reachedFrames=new Set();const coverage=[];
const {combatProfileFor}=await import('../dist/assets/combat/CharacterCombatProfiles.js');
for(const facing of [-1,1])for(const button of ['lk','mk','hk']){
 const w=new CombatWorld(getCharacter('RYU'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;
 const back=facing===1?'left':'right',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',back]:[back,button];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k===button,released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'RYU_MOBILITY');assert.equal(animationSequenceKindForAttack('RYU',move),'tatsumaki');const startX=f.x;
 const seen=new Set(),contacts=new Set();let frozen=false;
 for(let tick=3;tick<90;tick++){
  const a=animationSequenceSample(f,0);assert.ok(a);rows.push({kind:a.sequence.kind,frame:a.frame,width:a.sequence.frameWidth,facing,contact:a.contact,hitStop:f.hitStop>0,worldX:f.previousX-startX});
  assert.equal(f.airborne,false,'Spin artwork must not change grounded gameplay');assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(a.sequence.id,seq.id);seen.add(a.frame);assert.equal(a.contact,f.isMoveActive());if(a.contact)contacts.add(a.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],a.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Spin art must not inherit unrelated staging offsets');
   if(a.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,a.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.equal(seen.size,12);assert.deepEqual([...contacts].sort((a,b)=>a-b),[3,4,5,6,7,8]);assert.equal(f.state,'idle');assert.ok(Math.abs(f.x-startX-facing*combatProfileFor('RYU').mobilitySpeed*move.active)<1e-7,'Authored art must retain exact mobility distance');
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded spin must retain aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'hit');
 timelines[button.toUpperCase()+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(animationSequenceKindForAttack('RYU',{id:'RYU_CMD_MP'}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'RYU_MOBILITY'}),null);
console.log('RYU_TATSUMAKI_PASS',{buttons:3,facings:2,canvasDraws,contacts:[3,4,5,6,7,8],distancePreserved:true,groundedPhysics:true});
