import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('ALEX','hyper-bomb',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Hyper Bomb needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:2,activeStart:3,activeEnd:5,recoveryStart:6});
const requests=[],assets=new Map(animationSequencesFor('ALEX',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('ALEX');requests.length=0;animationTextureManager.preloadCharacter('ALEX','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('ALEX','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/alex/manifest.json',import.meta.url),'utf8')),urls=new Set(requests);
const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/alex/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,331);assert.equal(manifest.records.length,36);assert.ok(entryBytes>0);assert.ok(entryBytes<18_000_000,'Alex authored entry exceeds18MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},def=getCharacter('ALEX');
export const timelines={};
let canvasDraws=0,freezeChecks=0;const allFrames=new Set();
for(const facing of [-1,1])for(const variant of ['SUPER','SA1'])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',variant==='SA1'?def.superArts[0]:undefined);w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 const move=f.currentMove;assert.equal(move.id,'ALEX_'+variant);assert.equal(animationSequenceKindForAttack('ALEX',move),'hyper-bomb');assert.equal(f.superGauge,500-move.superCost,'Super gauge cost must remain exact');
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
 assert.equal(observedFreeze,initialFreeze);if(variant==='SUPER')assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[3,4,5]);assert.equal(f.state,'idle');assert.equal(f.x,startX,'Hyper Bomb animation must preserve stationary super physics');
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded super retains aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(allFrames.size,12);assert.ok(freezeChecks>0);

let impactChecks=0,pairChecks=0,pairDrawChecks=0,escapeChecks=0;
for(const facing of[-1,1])for(const variant of['SUPER','SA1']){
 const move=variant==='SUPER'?specialMovesFor('ALEX').super:superArtMoveFor('ALEX',1,def.superArts[0].gauge);
 assert.equal(move.damage,variant==='SUPER'?336:356);assert.equal(move.kind,variant==='SUPER'?'melee':'throw');assert.equal(move.multiHit,undefined);
 for(const delay of[0,Math.floor((move.active-1)/2),move.active-1]){
  const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0];f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup+delay;
  e.x=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.state=variant==='SA1'?'idle':'hit';e.stateFrame=-100;e.aiCooldown=1001;
  const sample=animationSequenceSample(f,0);assert.equal(sample.sequence.id,seq.id);assert.ok(sample.contact&&sample.frame>=3&&sample.frame<=5);
  const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),1);impactChecks++;
  if(variant==='SA1'){assert.equal(f.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');assert.equal(animationSequenceSample(f,0),null);assert.equal(animationSequenceSample(e,0),null);}
  const after=e.hp;f.moveFrame=move.startup+move.active-1;f.hitStop=0;e.hitStop=0;w.resolveAttack(f,e,quiet);assert.equal(e.hp,after,'Extra grab poses cannot apply repeated damage');
 }
}
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[0]),f=w.player,e=w.enemies[0];f.x=f.previousX=600;f.facing=facing;f.superGauge=500;e.x=e.previousX=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.aiCooldown=10000;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,'lp']];let synced=false,recovered=false,damageChanges=0,lastHp=e.hp;
 for(let tick=0;tick<180;tick++){
  const held=tick<6?inputs[tick]:[];w.update({held:k=>held.includes(k),pressed:k=>tick===5&&k==='lp',released:()=>false},tick);
  if(e.hp<lastHp)damageChanges++;lastHp=e.hp;
  if(f.throwSyncFrames>0){
   synced=true;pairChecks++;assert.equal(f.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');assert.equal(f.throwSyncPartnerUid,e.uid);assert.equal(e.throwSyncPartnerUid,f.uid);
   assert.equal(animationSequenceSample(f,0),null);assert.equal(animationSequenceSample(e,0),null);
   draws.length=0;drawCombatFighter(ctx,f,0,tick/60);drawCombatFighter(ctx,e,0,tick/60);assert.ok(!draws.some(d=>d[0].src===seq.asset),'Native paired throw must own both actors');pairDrawChecks++;
  }else if(synced&&f.state==='idle')recovered=true;
 }
 assert.ok(synced&&recovered);assert.equal(damageChanges,1);assert.equal(w.playerThrowsLanded,1);
}
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('ALEX',1,def.superArts[0].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup;e.x=f.x+facing*60;e.y=f.y;e.state='idle';e.aiCooldown=9;const hp=e.hp;
 w.resolveAttack(f,e,quiet);assert.equal(e.hp,hp);assert.equal(f.throwSyncFrames,0);assert.equal(e.throwSyncFrames,0);assert.ok(w.events.some(event=>event.type==='throw-escape'));escapeChecks++;
}
for(const move of[specialMovesFor('ALEX').super,superArtMoveFor('ALEX',1,def.superArts[0].gauge)]){
 const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=move.superCost-1;low.startMove(move);assert.equal(low.currentMove,null);assert.equal(low.superGauge,move.superCost-1);
}
for(const id of['ALEX_SUPER_TEST','ALEX_SA1_TEST','ALEX_TC_TEST','THROW'])assert.equal(animationSequenceKindForAttack('ALEX',{id}),null);
assert.equal(animationSequenceKindForAttack('KEN',{id:'ALEX_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_PRIMARY'}),'flash-chop');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_MOBILITY'}),'slash-elbow');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_ANTI_AIR'}),'shoryuken');
console.log('ALEX_HYPER_BOMB_PASS',{variants:2,buttons:3,facings:2,canvasDraws,freezeChecks,impactChecks,pairChecks,pairDrawChecks,escapeChecks,entryBytes});

assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_SA2'}),'boomerang-raid');

assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_SA3'}),'stun-gun-headbutt');
