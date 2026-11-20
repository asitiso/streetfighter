import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('MAKOTO','hayate',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Makoto Hayate needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:6});
const assets=new Map(animationSequencesFor('MAKOTO',true).map(s=>[s.asset,s]));
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
assert.ok(Object.values(ASSET_GROUPS).flat().includes(seq.asset),'Hayate must be in the app asset catalog');
animationTextureManager.releaseCharacter('MAKOTO');requests.length=0;animationTextureManager.preloadCharacter('MAKOTO','movement');assert.ok(!requests.includes(seq.asset),'Movement preparation must not load Hayate art');animationTextureManager.preloadCharacter('MAKOTO','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/makoto/manifest.json',import.meta.url),'utf8'));const urls=new Set(requests);const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/makoto/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,335);assert.equal(manifest.records.length,36);assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('MAKOTO',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());assert.ok(entryBytes<15_000_000,'Makoto authored entry exceeds15MB');
for(const facing of [-1,1])for(const variant of ['PRIMARY','EX_PRIMARY']){
 const w=new CombatWorld(getCharacter('MAKOTO'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',forward]:[forward,'lp',...(variant==='EX_PRIMARY'?['mp']:[])];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k==='lp',released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'MAKOTO_'+variant);assert.equal(animationSequenceKindForAttack('MAKOTO',move),'hayate');const startX=f.x;
 const seen=new Set(),contacts=new Set();let frozen=false;
 for(let tick=3;tick<100;tick++){
  const a=animationSequenceSample(f,0);assert.ok(a);rows.push({kind:a.sequence.kind,frame:a.frame,width:a.sequence.frameWidth,facing,contact:a.contact,hitStop:f.hitStop>0,worldX:f.previousX-startX});assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(a.sequence.id,seq.id);seen.add(a.frame);assert.equal(a.contact,f.isMoveActive());if(a.contact)contacts.add(a.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],a.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted Hayate must use zero staging offsets');
   if(a.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,a.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[4,5]);assert.equal(f.state,'idle');assert.equal(f.x,startX);
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded Hayate must retain aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['MAKOTO_PRIMARY_TEST','MAKOTO_TC_TEST'])assert.equal(animationSequenceKindForAttack('MAKOTO',{id}),null,'Only exact primary variants use Hayate');assert.equal(animationSequenceKindForAttack('KEN',{id:'MAKOTO_PRIMARY'}),null);
assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_MOBILITY'}),'tsurugi');
console.log('MAKOTO_HAYATE_PASS',{variants:2,facings:2,canvasDraws,contacts:[4,5],entryBytes,airRejected:true});

for(const id of ['MAKOTO_SUPER','MAKOTO_SA1'])assert.equal(animationSequenceKindForAttack('MAKOTO',{id}),'seichusen-godanzuki');

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA2'}),'abare-tosanami');

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA3'}),'tanden-renki');
