import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('ALEX','stun-gun-headbutt',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Stun Gun Headbutt needs full authored action');
assert.equal(seq.frameWidth,640);assert.equal(seq.frameCount,12);assert.deepEqual(seq.phase,{startupEnd:2,activeStart:3,activeEnd:7,recoveryStart:8});
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
assert.equal(manifest.frameTotal,331);assert.equal(manifest.records.length,36);assert.ok(entryBytes>0);assert.ok(entryBytes<18_000_000,'Yun authored entry exceeds18MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},def=getCharacter('ALEX');
export const timelines={};
let canvasDraws=0,freezeChecks=0,impactChecks=0,airDraws=0,landingChecks=0;const allFrames=new Set();
for(const facing of [-1,1])for(const variant of ['SA3'])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[2]);w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 const move=f.currentMove;assert.equal(move.id,'ALEX_'+variant);assert.equal(animationSequenceKindForAttack('ALEX',move),'stun-gun-headbutt');assert.equal(f.superGauge,500-move.superCost,'Super gauge cost must remain exact');
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
 assert.equal(observedFreeze,initialFreeze);assert.equal(seen.size,12);assert.deepEqual([...contacts].sort((a,b)=>a-b),[3,4,5,6,7]);assert.equal(f.state,'idle');assert.ok(Math.abs(f.x-startX-facing*12*f.combatProfile.antiAirDrift)<1e-8,'Preserve native launch drift');assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id,'Stun Gun Headbutt owns its native launch visuals');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(allFrames.size,12);assert.ok(freezeChecks>0&&airDraws>0&&landingChecks>0);
const move=superArtMoveFor('ALEX',3,def.superArts[2].gauge);assert.equal(move.damage,292);assert.equal(move.startup,5);assert.equal(move.active,6);assert.equal(move.recovery,30);assert.equal(move.launch,68);assert.equal(move.hitbox.forward,124);assert.equal(move.multiHit,undefined);assert.equal(move.kind,'throw');assert.equal(move.guardBreak,true);let pairChecks=0,pairDrawChecks=0,escapeChecks=0;
for(const facing of[-1,1])for(const delay of[0,2,5]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0];f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup+delay;e.x=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.state='idle';e.aiCooldown=1001;
 const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.ok(s.contact&&s.frame>=3&&s.frame<=7);const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),1);assert.equal(f.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');assert.equal(animationSequenceSample(f,0),null);assert.equal(animationSequenceSample(e,0),null);impactChecks++;
 const after=e.hp;f.hitStop=0;e.hitStop=0;f.moveFrame=move.startup+move.active-1;w.resolveAttack(f,e,quiet);assert.equal(e.hp,after,'Grab art must not add repeated damage');
}
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[2]),f=w.player,e=w.enemies[0];f.x=f.previousX=600;f.facing=facing;f.superGauge=500;e.x=e.previousX=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.aiCooldown=10000;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,'lp']];let synced=false,recovered=false,damageChanges=0,lastHp=e.hp;
 for(let tick=0;tick<180;tick++){
  const held=tick<6?inputs[tick]:[];w.update({held:k=>held.includes(k),pressed:k=>tick===5&&k==='lp',released:()=>false},tick);
  if(e.hp<lastHp)damageChanges++;lastHp=e.hp;
  if(f.throwSyncFrames>0){
   synced=true;pairChecks++;assert.equal(f.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');assert.equal(f.throwSyncPartnerUid,e.uid);assert.equal(e.throwSyncPartnerUid,f.uid);
   assert.equal(animationSequenceSample(f,0),null);assert.equal(animationSequenceSample(e,0),null);
   draws.length=0;drawCombatFighter(ctx,f,0,tick/60);drawCombatFighter(ctx,e,0,tick/60);assert.ok(draws.some(d=>d[0].src===seq.asset),'Successful SA3 grab retains its owned aerial body');pairDrawChecks++;
  }else if(synced&&f.state==='idle')recovered=true;
 }
 assert.ok(synced&&recovered);assert.equal(damageChanges,1);assert.equal(w.playerThrowsLanded,1);
}
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('ALEX',3,def.superArts[2].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup;e.x=f.x+facing*60;e.y=f.y;e.state='idle';e.aiCooldown=9;const hp=e.hp;
 w.resolveAttack(f,e,quiet);assert.equal(e.hp,hp);assert.equal(f.throwSyncFrames,0);assert.equal(e.throwSyncFrames,0);assert.ok(w.events.some(event=>event.type==='throw-escape'));escapeChecks++;
}
const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=103;low.startMove(superArtMoveFor('ALEX',3,def.superArts[2].gauge));assert.equal(low.currentMove,null);assert.equal(low.superGauge,103);
for(const id of ['ALEX_SA3_TEST','ALEX_TC_TEST','THROW'])assert.equal(animationSequenceKindForAttack('ALEX',{id}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'ALEX_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_PRIMARY'}),'flash-chop');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_MOBILITY'}),'slash-elbow');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_ANTI_AIR'}),'shoryuken');
console.log('ALEX_STUN_GUN_HEADBUTT_PASS',{variants:1,buttons:3,facings:2,canvasDraws,freezeChecks,impactChecks,pairChecks,pairDrawChecks,escapeChecks,airDraws,landingChecks,contacts:[3,4,5,6,7],entryBytes});

assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_SA2'}),'boomerang-raid');assert.equal(animationSequenceKindForAttack('KEN',{id:'ALEX_SA1'}),null);

assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_SA1'}),'hyper-bomb');
function landedHeadbutt(){const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player;w.enemies.length=0;f.superGauge=500;f.startMove(move);for(let tick=0;tick<120;tick++){w.update(quiet,tick);if(!f.currentMove&&!f.airborne&&f.landingFrames>0){assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id);return w;}}throw Error('Stun Gun Headbutt did not land');}
let next=landedHeadbutt();next.update({held:k=>k==='up',pressed:k=>k==='up',released:()=>false},121);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'jump','Fresh jump must not inherit Stun Gun Headbutt recovery');
next=landedHeadbutt();next.player.receiveHit(specialMovesFor('KEN').primary,new CombatWorld(getCharacter('KEN'),def,'duel').player,false);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'hit');
next=landedHeadbutt();next.player.startMove(specialMovesFor('ALEX').primary);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'flash-chop','New move must not inherit Stun Gun Headbutt recovery');
