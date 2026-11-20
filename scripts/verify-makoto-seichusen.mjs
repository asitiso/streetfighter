import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('MAKOTO','seichusen-godanzuki',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Seichusen Godanzuki needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:1,activeStart:2,activeEnd:7,recoveryStart:8});
const requests=[],assets=new Map(animationSequencesFor('MAKOTO',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('MAKOTO');requests.length=0;animationTextureManager.preloadCharacter('MAKOTO','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('MAKOTO','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/makoto/manifest.json',import.meta.url),'utf8')),urls=new Set(requests);
const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/makoto/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,335);assert.equal(manifest.records.length,36);assert.ok(entryBytes>0);assert.ok(entryBytes<15_000_000,'Makoto authored entry exceeds15MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},def=getCharacter('MAKOTO');
export const timelines={};
let canvasDraws=0,freezeChecks=0,impactChecks=0;const allFrames=new Set();
for(const facing of [-1,1])for(const variant of ['SUPER','SA1'])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',variant==='SA1'?def.superArts[0]:undefined);w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 const move=f.currentMove;assert.equal(move.id,'MAKOTO_'+variant);assert.equal(animationSequenceKindForAttack('MAKOTO',move),'seichusen-godanzuki');assert.equal(f.superGauge,500-move.superCost,'Super gauge cost must remain exact');
 const initialFreeze=w.superFreezeFrames;assert.equal(initialFreeze,move.superPresentation?.freezeFrames??9);const startX=f.x,seen=new Set(),contacts=new Set();let stopped=false,observedFreeze=0;
 for(let tick=6;tick<150;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,superFreeze:w.superFreezeFrames>0,worldX:f.previousX-startX});
  assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(w.projectiles.length,0);
  if(f.state==='attack'){
   assert.equal(s.sequence.id,seq.id);seen.add(s.frame);allFrames.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,tick/60);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],s.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0));
   if(s.contact&&!stopped){stopped=true;f.hitStop=3;const clock=f.moveFrame;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.x,startX);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  const freeze=w.superFreezeFrames>0,clock=f.moveFrame,frame=s.frame;
  w.update(quiet,tick);
  if(freeze){observedFreeze++;freezeChecks++;assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,frame,'Super freeze must not advance authored art');}
 }
 assert.equal(observedFreeze,initialFreeze);if(variant==='SUPER')assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[2,3,4,5,6,7]);assert.equal(f.state,'idle');assert.equal(f.x,startX,'Seichusen animation must preserve stationary super physics');
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded super retains aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(allFrames.size,12);assert.ok(freezeChecks>0);
for(const facing of [-1,1])for(const variant of ['SUPER','SA1'])for(const delay of [0,3,7]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=variant==='SUPER'?specialMovesFor('MAKOTO').super:superArtMoveFor('MAKOTO',1,def.superArts[0].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup+delay;e.x=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.state='hit';e.stateFrame=-100;
 const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),1);const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.ok(s.contact&&s.frame>=2&&s.frame<=7);impactChecks++;
 const hitHp=e.hp;e.state='hit';e.stateFrame=-100;e.hitStop=0;f.hitStop=0;w.resolveAttack(f,e,quiet);assert.equal(e.hp,hitHp,'Visual twisting frames cannot add extra hits');
}
let multiHitChecks=0;
for(const facing of[-1,1])for(const variant of['SUPER','SA1']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=variant==='SUPER'?specialMovesFor('MAKOTO').super:superArtMoveFor('MAKOTO',1,def.superArts[0].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);e.hp=e.maxHp=10000;
 assert.equal(move.damage,variant==='SUPER'?342:352);assert.equal(move.startup,variant==='SUPER'?3:2);assert.equal(move.active,variant==='SUPER'?9:11);
 const hitCount=move.multiHit?.hits??1,interval=move.multiHit?.interval??2;
 for(let i=0;i<hitCount;i++){
  f.moveFrame=move.startup+i*interval;f.hitStop=0;e.hitStop=0;e.x=f.x+facing*60;e.y=f.y;e.state='hit';e.stateFrame=-100;
  const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),i+1);assert.ok(animationSequenceSample(f,0).contact);
  const after=e.hp;f.hitStop=0;e.hitStop=0;e.state='hit';e.stateFrame=-100;w.resolveAttack(f,e,quiet);assert.equal(e.hp,after);multiHitChecks++;
 }
 assert.equal(f.attackVictimHits.get(e.uid),variant==='SUPER'?1:5);
}
const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=99;low.startMove(specialMovesFor('MAKOTO').super);assert.equal(low.currentMove,null);assert.equal(low.superGauge,99);
for(const id of ['MAKOTO_SUPER_TEST','MAKOTO_SA1_TEST','MAKOTO_TC_TEST'])assert.equal(animationSequenceKindForAttack('MAKOTO',{id}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'MAKOTO_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_PRIMARY'}),'hayate');assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_MOBILITY'}),'tsurugi');assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_ANTI_AIR'}),'shoryuken');
console.log('MAKOTO_SEICHUSEN_PASS',{variants:2,buttons:3,facings:2,canvasDraws,freezeChecks,impactChecks,multiHitChecks,contacts:[2,3,4,5,6,7],entryBytes});

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA2'}),'abare-tosanami');

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA3'}),'tanden-renki');
