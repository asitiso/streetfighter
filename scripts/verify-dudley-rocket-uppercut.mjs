import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('DUDLEY','rocket-uppercut',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Rocket Uppercut needs full authored action');
assert.equal(seq.frameWidth,640);assert.equal(seq.frameCount,12);assert.deepEqual(seq.phase,{startupEnd:1,activeStart:2,activeEnd:7,recoveryStart:8});
const requests=[],assets=new Map(animationSequencesFor('DUDLEY',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('DUDLEY');requests.length=0;animationTextureManager.preloadCharacter('DUDLEY','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('DUDLEY','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/dudley/manifest.json',import.meta.url),'utf8')),urls=new Set(requests);
const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/dudley/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,335);assert.equal(manifest.records.length,36);assert.ok(entryBytes>0);assert.ok(entryBytes<13_000_000,'Yun authored entry exceeds13MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},def=getCharacter('DUDLEY');
export const timelines={};
let canvasDraws=0,freezeChecks=0,impactChecks=0,nativeLaunchChecks=0,airDraws=0,landingChecks=0;const allFrames=new Set();
for(const facing of [-1,1])for(const variant of ['SA1'])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[0]);w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 const move=f.currentMove;assert.equal(move.id,'DUDLEY_'+variant);assert.equal(animationSequenceKindForAttack('DUDLEY',move),'rocket-uppercut');assert.equal(f.superGauge,500-move.superCost,'Super gauge cost must remain exact');
 const initialFreeze=w.superFreezeFrames;assert.equal(initialFreeze,move.superPresentation?.freezeFrames??9);const startX=f.x,seen=new Set(),contacts=new Set();let stopped=false,observedFreeze=0;
 for(let tick=6;tick<150;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,superFreeze:w.superFreezeFrames>0,worldX:f.previousX-startX});
  assert.equal(w.projectiles.length,0); if(s.sequence.id===seq.id){seen.add(s.frame);allFrames.add(s.frame);if(f.landingFrames>0){landingChecks++;assert.equal(s.frame,f.landingFrames>=6?9:f.landingFrames>=3?10:11);}}
  if(f.state==='attack'){
   assert.equal(s.sequence.id,seq.id);seen.add(s.frame);allFrames.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,tick/60);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],s.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.deepEqual(translations[1],[0,-f.jumpHeight]);assert.ok(translations.slice(2).every(([x,y])=>x===0&&y===0));if(f.jumpHeight>0)airDraws++;if(f.moveFrame>=move.startup+move.active&&f.airborne)assert.equal(s.frame,f.jumpVelocity>0?7:8);
   if(s.contact&&!stopped){stopped=true;f.hitStop=3;const clock=f.moveFrame,height=f.jumpHeight,x=f.x;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.jumpHeight,height);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  const freeze=w.superFreezeFrames>0,clock=f.moveFrame,frame=s.frame,height=f.jumpHeight,x=f.x;
  w.update(quiet,tick);
  if(freeze){observedFreeze++;freezeChecks++;assert.equal(f.moveFrame,clock);assert.equal(f.jumpHeight,height);assert.equal(f.x,x);assert.equal(animationSequenceSample(f,0).frame,frame,'Super freeze must not advance authored art');}
 }
 assert.equal(observedFreeze,initialFreeze);assert.equal(seen.size,12);assert.deepEqual([...contacts].sort((a,b)=>a-b),[2,3,4,5,6,7]);assert.equal(f.state,'idle');assert.ok(Math.abs(f.x-startX-facing*18*f.combatProfile.antiAirDrift)<1e-8,'Preserve native launch drift');assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id,'Rocket Uppercut owns its native launch visuals');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(allFrames.size,12);assert.ok(freezeChecks>0&&airDraws>0&&landingChecks>0);
for(const facing of [-1,1])for(const variant of ['SA1'])for(const delay of [0,6,11]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('DUDLEY',1,def.superArts[0].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup+delay;e.x=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.state='hit';e.stateFrame=-100;
 const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.ok(e.airborne&&e.jumpHeight>0&&e.jumpVelocity>0);assert.equal(f.attackVictimHits.get(e.uid),1);const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.ok(s.contact&&s.frame>=2&&s.frame<=7);impactChecks++;
 const hitHp=e.hp;e.state='hit';e.stateFrame=-100;e.hitStop=0;f.hitStop=0;w.resolveAttack(f,e,quiet);assert.equal(e.hp,hitHp,'Visual twisting frames cannot add extra hits');
}
const move=superArtMoveFor('DUDLEY',1,def.superArts[0].gauge);
assert.equal(move.damage,300);assert.equal(move.startup,2);assert.equal(move.active,12);assert.equal(move.recovery,25);assert.equal(move.launch,98);assert.equal(move.hitbox.forward,128);assert.equal(move.multiHit,undefined);assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_SUPER'}),'corkscrew-blow');
let nativeComboChecks=0;
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[0]),f=w.player,e=w.enemies[0];f.x=f.previousX=600;f.facing=facing;f.superGauge=500;e.x=e.previousX=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.aiCooldown=10000;e.state='hit';e.stateFrame=-100;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,'lp']];let previousHits=0,totalHits=0;
 for(let tick=0;tick<180;tick++){
  const held=tick<6?inputs[tick]:[];w.update({held:k=>held.includes(k),pressed:k=>tick===5&&k==='lp',released:()=>false},tick);
  const hits=f.attackVictimHits.get(e.uid)??0;
  if(hits>previousHits){assert.equal(hits,previousHits+1);assert.equal(hits,totalHits+1);const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.equal(s.frame,2);assert.ok(s.contact);assert.equal(f.airborne,true);assert.ok(e.airborne&&e.jumpHeight>0&&e.jumpVelocity>0);nativeLaunchChecks++;totalHits++;nativeComboChecks++;}
  previousHits=hits;
 }
 assert.equal(totalHits,1,'Real world inputs must retain the native single-hit uppercut');assert.equal(f.state,'idle');
}

const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=87;low.startMove(superArtMoveFor('DUDLEY',1,def.superArts[0].gauge));assert.equal(low.currentMove,null);assert.equal(low.superGauge,87);
for(const id of ['DUDLEY_SA1_TEST','DUDLEY_TC_TEST','THROW'])assert.equal(animationSequenceKindForAttack('DUDLEY',{id}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'DUDLEY_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_PRIMARY'}),'machine-gun-blow');assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_MOBILITY'}),'ducking-straight');assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_ANTI_AIR'}),'shoryuken');
console.log('DUDLEY_ROCKET_UPPERCUT_PASS',{variants:1,buttons:3,facings:2,canvasDraws,freezeChecks,impactChecks,nativeComboChecks,nativeLaunchChecks,airDraws,landingChecks,contacts:[2,3,4,5,6,7],entryBytes});

assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_SA2'}),'rolling-thunder');assert.equal(animationSequenceKindForAttack('KEN',{id:'DUDLEY_SA1'}),null);

assert.equal(animationSequenceKindForAttack('DUDLEY',{id:'DUDLEY_SA3'}),'corkscrew-blow');
function landedRocket(){const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player;w.enemies.length=0;f.superGauge=500;f.startMove(move);for(let tick=0;tick<120;tick++){w.update(quiet,tick);if(!f.currentMove&&!f.airborne&&f.landingFrames>0){assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id);return w;}}throw Error('Rocket Uppercut did not land');}
let next=landedRocket();next.update({held:k=>k==='up',pressed:k=>k==='up',released:()=>false},121);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'jump','Fresh jump must not inherit Rocket Uppercut recovery');
next=landedRocket();next.player.receiveHit(specialMovesFor('KEN').primary,new CombatWorld(getCharacter('KEN'),def,'duel').player,false);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'hit');
next=landedRocket();next.player.startMove(specialMovesFor('DUDLEY').primary);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'machine-gun-blow','New move must not inherit Rocket Uppercut recovery');
