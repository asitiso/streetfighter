import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {combatProfileFor} from '../dist/assets/combat/CharacterCombatProfiles.js';
const seq=animationSequenceFor('DUDLEY','machine-gun-blow',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Dudley Machine Gun Blow needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:2,activeStart:3,activeEnd:8,recoveryStart:9});
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
assert.ok(Object.values(ASSET_GROUPS).flat().includes(seq.asset),'Machine Gun Blow must be in the app asset catalog');
animationTextureManager.releaseCharacter('DUDLEY');requests.length=0;animationTextureManager.preloadCharacter('DUDLEY','movement');assert.ok(!requests.includes(seq.asset),'Movement preparation must not load ducking art');animationTextureManager.preloadCharacter('DUDLEY','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/dudley/manifest.json',import.meta.url),'utf8'));const urls=new Set(requests);const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/dudley/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,335);assert.equal(manifest.records.length,36);assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('DUDLEY',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());assert.ok(entryBytes<13_000_000,'Dudley authored entry exceeds13MB');
for(const facing of [-1,1])for(const variant of ['PRIMARY','EX_PRIMARY']){
 const w=new CombatWorld(getCharacter('DUDLEY'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?['down']:tick===1?['down',forward]:[forward,'lp',...(variant==='EX_PRIMARY'?['mp']:[])];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k==='lp',released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'DUDLEY_'+variant);assert.equal(animationSequenceKindForAttack('DUDLEY',move),'machine-gun-blow');const startX=f.x;
 const seen=new Set(),contacts=new Set();let frozen=false,punches=0,lastPeak=false;
 for(let tick=3;tick<100;tick++){
  const a=animationSequenceSample(f,0);assert.ok(a);rows.push({kind:a.sequence.kind,frame:a.frame,width:a.sequence.frameWidth,facing,contact:a.contact,hitStop:f.hitStop>0,worldX:f.previousX-startX});assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(a.sequence.id,seq.id);seen.add(a.frame);assert.equal(a.contact,f.isMoveActive());if(a.contact){contacts.add(a.frame);const peak=[3,6].includes(a.frame);if(peak&&!lastPeak)punches++;lastPeak=peak;}
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],a.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted ducking straight must use zero staging offsets');
   if(a.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,a.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.equal(punches,move.multiHit.hits,'Whiff art must show exactly the configured3/5punches');if(variant==='PRIMARY')assert.equal(seen.size,12);assert.ok(contacts.has(3)&&contacts.has(6)&&contacts.has(4)&&contacts.has(7));assert.equal(f.state,'idle');assert.equal(f.x,startX,'Barrage must preserve stationary physics');
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded ducking straight must retain aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['DUDLEY_PRIMARY_TEST','DUDLEY_TC_TEST'])assert.equal(animationSequenceKindForAttack('DUDLEY',{id}),null,'Only exact primary variants use barrage art');assert.equal(animationSequenceKindForAttack('KEN',{id:'DUDLEY_MOBILITY'}),null); assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_ANTI_AIR'}),'shoryuken');assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_MOBILITY'}),'ducking-straight');

let connectedChecks=0;
for(const facing of [-1,1])for(const variant of ['primary','exPrimary'])for(const delay of [0,2]){
 const w=new CombatWorld(getCharacter('DUDLEY'),getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0];
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(specialMovesFor('DUDLEY')[variant]);e.hp=e.maxHp=10000;
 const move=f.currentMove;let impacts=0;
 for(let clock=0;clock<move.startup+move.active;clock++){
  f.moveFrame=clock;f.hitStop=0;e.hitStop=0;e.state='hit';e.stateFrame=-100;e.x=f.x+facing*(clock<move.startup+delay?1000:60);e.y=f.y;
  const hp=e.hp;w.resolveAttack(f,e,quiet);
  if(e.hp<hp){
   impacts++;const sample=animationSequenceSample(f,0);assert.ok([3,6].includes(sample.frame),'Every actual impact, including delayed first contact, must use full extension');
   assert.equal(sample.frame,impacts%2?3:6);connectedChecks++;
   if(impacts===1){const stop=f.hitStop;assert.ok(stop>0);w.enemies.length=0;for(let i=0;i<stop;i++){w.update(quiet,i);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,sample.frame);}w.enemies.push(e);}
  }
 }
 assert.equal(impacts,move.multiHit.hits);assert.equal(f.attackVictimHits.get(e.uid),move.multiHit.hits);
}
assert.equal(connectedChecks,32);

let multiTargetChecks=0;
for(const facing of [-1,1])for(const variant of ['primary','exPrimary']){
 const w=new CombatWorld(getCharacter('DUDLEY'),getCharacter('KEN'),'belt');
 w.replaceEnemies([{character:getCharacter('KEN'),x:660,y:495,hp:10000},{character:getCharacter('KEN'),x:660,y:495,hp:10000}]);
 const f=w.player;f.x=600;f.y=495;f.facing=facing;f.superGauge=500;f.startMove(specialMovesFor('DUDLEY')[variant]);
 const move=f.currentMove,[a,b]=w.enemies;
 for(const [index,clock] of [move.startup,move.startup+move.multiHit.interval,move.startup+move.multiHit.interval+1].entries()){
  f.moveFrame=clock;f.hitStop=0;const e=index===2?b:a;e.x=f.x+facing*60;e.y=f.y;e.state='hit';e.stateFrame=-100;e.hitStop=0;
  const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);const sample=animationSequenceSample(f,0);
  assert.ok([3,6].includes(sample.frame),'A newer lower-count target must show full extension on impact');multiTargetChecks++;
  const stop=f.hitStop;w.enemies.length=0;for(let tick=0;tick<stop;tick++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,sample.frame);}w.enemies.push(a,b);
 }
 assert.equal(f.attackVictimHits.get(a.uid),2);assert.equal(f.attackVictimHits.get(b.uid),1);
}
assert.equal(multiTargetChecks,12);
for(const id of ['DUDLEY_SUPER','DUDLEY_SA3'])assert.equal(animationSequenceKindForAttack('DUDLEY',{id}),'corkscrew-blow');
console.log('DUDLEY_MACHINE_GUN_BLOW_PASS',{variants:2,facings:2,canvasDraws,connectedChecks,multiTargetChecks,punches:[3,5],entryBytes,airRejected:true});

assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_SA2'}),'rolling-thunder');

assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_SA1'}),'rocket-uppercut');
