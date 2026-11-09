import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {combatProfileFor} from '../dist/assets/combat/CharacterCombatProfiles.js';
const seq=animationSequenceFor('DUDLEY','ducking-straight',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Dudley Ducking Straight needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:6});
const assets=new Map(animationSequencesFor('DUDLEY',true).map(s=>[s.asset,s]));
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
assert.ok(Object.values(ASSET_GROUPS).flat().includes(seq.asset),'Ducking Straight must be in the app asset catalog');
animationTextureManager.releaseCharacter('DUDLEY');requests.length=0;animationTextureManager.preloadCharacter('DUDLEY','movement');assert.ok(!requests.includes(seq.asset),'Movement preparation must not load ducking art');animationTextureManager.preloadCharacter('DUDLEY','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/dudley/manifest.json',import.meta.url),'utf8'));const urls=new Set(requests);const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/dudley/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,203);assert.equal(manifest.records.length,24);assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('DUDLEY',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());assert.ok(entryBytes<9_000_000,'Dudley authored entry exceeds9MB');
for(const facing of [-1,1])for(const variant of ['lk','mk','hk']){
 const w=new CombatWorld(getCharacter('DUDLEY'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const back=facing===1?'left':'right',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',back]:[back,variant];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k===variant,released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'DUDLEY_MOBILITY');assert.equal(animationSequenceKindForAttack('DUDLEY',move),'ducking-straight');const startX=f.x;
 const seen=new Set(),contacts=new Set();let frozen=false;
 for(let tick=3;tick<100;tick++){
  const a=animationSequenceSample(f,0);assert.ok(a);rows.push({kind:a.sequence.kind,frame:a.frame,width:a.sequence.frameWidth,facing,contact:a.contact,hitStop:f.hitStop>0,worldX:f.previousX-startX});assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(a.sequence.id,seq.id);seen.add(a.frame);assert.equal(a.contact,f.isMoveActive());if(a.contact)contacts.add(a.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],a.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted ducking straight must use zero staging offsets');
   if(a.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,a.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[4,5]);assert.equal(f.state,'idle');assert.ok(Math.abs(f.x-startX-facing*combatProfileFor('DUDLEY').mobilitySpeed*move.active)<1e-7,'Authored action retains exact mobility distance');
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded ducking straight must retain aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'hit');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['DUDLEY_MOBILITY_TEST','DUDLEY_TC_TEST','DUDLEY_SUPER','DUDLEY_SA1','DUDLEY_SA2','DUDLEY_SA3'])assert.equal(animationSequenceKindForAttack('DUDLEY',{id}),null,'Only exact mobility uses elbow art');assert.equal(animationSequenceKindForAttack('KEN',{id:'DUDLEY_MOBILITY'}),null); for(const id of ['DUDLEY_PRIMARY','DUDLEY_EX_PRIMARY','DUDLEY_ANTI_AIR'])assert.equal(animationSequenceKindForAttack('DUDLEY',{id}),null);
console.log('DUDLEY_DUCKING_STRAIGHT_PASS',{buttons:3,facings:2,canvasDraws,contacts:[4,5],entryBytes,airRejected:true});
