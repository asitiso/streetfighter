import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {combatProfileFor} from '../dist/assets/combat/CharacterCombatProfiles.js';
const seq=animationSequenceFor('GILL','lariat-rush',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Gill Lariat Rush needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:3,activeStart:4,activeEnd:7,recoveryStart:8});
const assets=new Map(animationSequencesFor('GILL',true).map(s=>[s.asset,s]));
const requests=[];
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const draws=[],translations=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
export const timelines={};
const {readFile}=await import('node:fs/promises');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('GILL');requests.length=0;animationTextureManager.preloadCharacter('GILL','movement');assert.ok(!requests.includes(seq.asset),'Movement preparation must not load lariat art');animationTextureManager.preloadCharacter('GILL','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/gill/manifest.json',import.meta.url),'utf8'));const urls=new Set(requests);const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/gill/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,307);assert.equal(manifest.records.length,34);assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('GILL',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());assert.ok(entryBytes<17_000_000,'Gill authored entry exceeds17MB');
for(const facing of [-1,1])for(const variant of ['lk','mk','hk']){
 const w=new CombatWorld(getCharacter('GILL'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const back=facing===1?'left':'right',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',back]:[back,variant];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k===variant,released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'GILL_MOBILITY');assert.equal(animationSequenceKindForAttack('GILL',move),'lariat-rush');const startX=f.x;
 const seen=new Set(),contacts=new Set();let frozen=false;
 for(let tick=3;tick<100;tick++){
  const a=animationSequenceSample(f,0);assert.ok(a);rows.push({kind:a.sequence.kind,frame:a.frame,width:a.sequence.frameWidth,facing,contact:a.contact,hitStop:f.hitStop>0,worldX:f.previousX-startX});assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(a.sequence.id,seq.id);seen.add(a.frame);assert.equal(a.contact,f.isMoveActive());if(a.contact)contacts.add(a.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],a.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted lariat must use zero staging offsets');
   if(a.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,a.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[4,5,6,7]);assert.equal(f.state,'idle');assert.ok(Math.abs(f.x-startX-facing*combatProfileFor('GILL').mobilitySpeed*move.active)<1e-7,'Authored action retains exact mobility distance');
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded lariat must retain aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['GILL_MOBILITY_TEST','GILL_TC_TEST','GILL_SA1','GILL_SA2','GILL_SA3'])assert.equal(animationSequenceKindForAttack('GILL',{id}),null,'Only exact mobility uses lariat art');assert.equal(animationSequenceKindForAttack('KEN',{id:'GILL_MOBILITY'}),null); for(const id of ['GILL_PRIMARY','GILL_EX_PRIMARY'])assert.equal(animationSequenceKindForAttack('GILL',{id}),'hadoken');
assert.equal(animationSequenceKindForAttack('GILL',{id:'GILL_ANTI_AIR'}),'shoryuken');
console.log('GILL_LARIAT_RUSH_PASS',{buttons:3,facings:2,canvasDraws,contacts:[4,5,6,7],entryBytes,airRejected:true});

assert.equal(animationSequenceKindForAttack('GILL',{id:'GILL_SUPER'}),'seraphic-storm');
