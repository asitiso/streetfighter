import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
const seq=animationSequenceFor('URIEN','hadoken',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Urien projectile needs a full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:4,activeStart:5,activeEnd:6,recoveryStart:7});
const requests=[];
const assets=new Map(animationSequencesFor('URIEN',true).map(s=>[s.asset,s]));
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
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));
assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset),'Metallic Sphere must stay deferred');
animationTextureManager.releaseCharacter('URIEN');requests.length=0;
animationTextureManager.preloadCharacter('URIEN','movement');assert.ok(!requests.includes(seq.asset),'Movement preparation must not fetch projectile art');
animationTextureManager.preloadCharacter('URIEN','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/urien/manifest.json',import.meta.url),'utf8'));
const urls=new Set(requests),entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/urien/'+r.id+'.webp')).reduce((sum,r)=>sum+r.bytes,0);
assert.equal(manifest.frameTotal,307);assert.equal(manifest.records.length,34);
assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('URIEN',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());
assert.ok(entryBytes<14_000_000,'Urien authored entry exceeds14MB');
const sourceOrder=manifest.records.find(r=>r.id==='hadoken').sourceOrder;
for(const facing of [-1,1])for(const variant of ['PRIMARY','EX']){
 const w=new CombatWorld(getCharacter('URIEN'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left';const rows=[];
  for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',forward]:[forward,'lp',...(variant==='EX'?['mp']:[])];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k==='lp',released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,variant==='PRIMARY'?'URIEN_PRIMARY':variant==='EX'?'URIEN_EX_PRIMARY':'URIEN_'+variant);
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
 assert.ok(spawned);assert.equal(new Set([...seen].map(i=>sourceOrder[i])).size,6,'Both speeds must retain all six source drawings');assert.equal(f.state,'idle');assert.ok(contacts.has(5)&&contacts.has(6));if(variant==='PRIMARY')assert.equal(seen.size,12,'Normal-speed projectile must reach every frame');
 f.startMove(move);f.airborne=true;assert.equal(animationSequenceSample(f,0),null,'Grounded projectile art must preserve aerial fallback');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['URIEN_CMD_MP','URIEN_PRIMARY_TEST','URIEN_TC_TEST','URIEN_SA1','URIEN_SA2','URIEN_SA3'])assert.equal(animationSequenceKindForAttack('URIEN',{id}),null,'Only exact primary variants use Metallic Sphere');
assert.equal(animationSequenceKindForAttack('GILL',{id:'URIEN_PRIMARY'}),null);
assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_ANTI_AIR'}),'shoryuken');
assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_MOBILITY'}),'shoulder-tackle');
assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_SUPER'}),'aegis-reflector');
console.log('URIEN_METALLIC_SPHERE_PASS',{variants:2,facings:2,canvasDraws,entryBytes,projectileReleaseFrame:5,airRejected:true});
