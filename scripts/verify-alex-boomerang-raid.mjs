import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('ALEX','boomerang-raid',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Boomerang Raid needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:1,activeStart:2,activeEnd:7,recoveryStart:8});
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
let canvasDraws=0,freezeChecks=0,impactChecks=0;const allFrames=new Set();
for(const facing of [-1,1])for(const variant of ['SA2'])for(const button of ['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[1]);w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 const move=f.currentMove;assert.equal(move.id,'ALEX_'+variant);assert.equal(animationSequenceKindForAttack('ALEX',move),'boomerang-raid');assert.equal(f.superGauge,500-move.superCost,'Super gauge cost must remain exact');
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
 assert.equal(observedFreeze,initialFreeze);assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[2,3,4,5,6,7]);assert.equal(f.state,'idle');assert.equal(f.x,startX,'Boomerang Raid animation must preserve stationary super physics');
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null,'Grounded super retains aerial fallback');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[variant+' '+button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
assert.equal(allFrames.size,12);assert.ok(freezeChecks>0);
for(const facing of [-1,1])for(const variant of ['SA2'])for(const delay of [0,7,15]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('ALEX',2,def.superArts[1].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup+delay;e.x=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.state='hit';e.stateFrame=-100;
 const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),1);const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.ok(s.contact&&s.frame>=2&&s.frame<=7);impactChecks++;
 const hitHp=e.hp;e.state='hit';e.stateFrame=-100;e.hitStop=0;f.hitStop=0;w.resolveAttack(f,e,quiet);assert.equal(e.hp,hitHp,'Visual twisting frames cannot add extra hits');
}
let multiHitChecks=0;
for(const facing of[-1,1])for(const variant of['SA2']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('ALEX',2,def.superArts[1].gauge);
 f.x=600;f.facing=facing;f.superGauge=500;f.startMove(move);e.hp=e.maxHp=10000;
 assert.equal(move.damage,330);assert.equal(move.startup,4);assert.equal(move.active,16);assert.equal(move.recovery,29);assert.deepEqual(move.multiHit,{hits:4,interval:3,perHitScale:.29});assert.equal(move.wallBounce,true);
 const hitCount=move.multiHit?.hits??1,interval=move.multiHit?.interval??2;
 for(let i=0;i<hitCount;i++){
  f.moveFrame=move.startup+i*interval;f.hitStop=0;e.hitStop=0;e.x=f.x+facing*60;e.y=f.y;e.state='hit';e.stateFrame=-100;
  const hp=e.hp;w.resolveAttack(f,e,quiet);assert.ok(e.hp<hp);assert.equal(f.attackVictimHits.get(e.uid),i+1);assert.ok(animationSequenceSample(f,0).contact);assert.equal(animationSequenceSample(f,0).frame,[2,3,4,5][i],'Four native hits must align chop/backfist/chop/finisher');
  const after=e.hp;f.hitStop=0;e.hitStop=0;e.state='hit';e.stateFrame=-100;w.resolveAttack(f,e,quiet);assert.equal(e.hp,after);multiHitChecks++;
 }
 assert.equal(f.attackVictimHits.get(e.uid),4);
}
let wallChecks=0;
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player,e=w.enemies[0],move=superArtMoveFor('ALEX',2,def.superArts[1].gauge);
 e.x=facing===1?w.rules.arenaRight-2:w.rules.arenaLeft+2;f.x=e.x-facing*60;f.facing=facing;f.superGauge=500;f.startMove(move);f.moveFrame=move.startup;
 e.y=f.y;e.hp=e.maxHp=10000;e.state='hit';e.stateFrame=-100;const hp=e.hp;w.resolveAttack(f,e,quiet);
 assert.ok(e.hp<hp);assert.equal(e.wallBounceFrames,18);assert.equal(e.airborne,true);assert.ok(e.jumpVelocity>0);assert.ok(w.events.some(event=>event.type==='wall-bounce'));assert.equal(animationSequenceSample(e,0),null);assert.equal(animationSequenceSample(f,0).sequence.id,seq.id);wallChecks++;
}
for(const id of ['ALEX_SUPER','ALEX_SA1'])assert.equal(animationSequenceKindForAttack('ALEX',{id}),'hyper-bomb');

let nativeComboChecks=0;
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[1]),f=w.player,e=w.enemies[0];f.x=f.previousX=600;f.facing=facing;f.superGauge=500;e.x=e.previousX=f.x+facing*60;e.y=f.y;e.hp=e.maxHp=10000;e.aiCooldown=10000;e.state='hit';e.stateFrame=-100;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,'lp']];let previousHits=0,totalHits=0;
 for(let tick=0;tick<180;tick++){
  const held=tick<6?inputs[tick]:[];w.update({held:k=>held.includes(k),pressed:k=>tick===5&&k==='lp',released:()=>false},tick);
  const hits=f.attackVictimHits.get(e.uid)??0;
  if(hits>previousHits){assert.equal(hits,previousHits+1);assert.equal(hits,totalHits+1);const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.equal(s.frame,[2,3,4,5][totalHits]);assert.ok(s.contact);totalHits++;nativeComboChecks++;}
  previousHits=hits;
 }
 assert.equal(totalHits,4,'Real world inputs must retain all four native combo hits');assert.equal(f.state,'idle');
}
const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=119;low.startMove(superArtMoveFor('ALEX',2,def.superArts[1].gauge));assert.equal(low.currentMove,null);assert.equal(low.superGauge,119);
for(const id of ['ALEX_SA2_TEST','ALEX_TC_TEST','THROW'])assert.equal(animationSequenceKindForAttack('ALEX',{id}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'ALEX_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_PRIMARY'}),'flash-chop');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_MOBILITY'}),'slash-elbow');assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_ANTI_AIR'}),'shoryuken');
console.log('ALEX_BOOMERANG_RAID_PASS',{variants:1,buttons:3,facings:2,canvasDraws,freezeChecks,impactChecks,multiHitChecks,wallChecks,nativeComboChecks,contacts:[2,3,4,5,6,7],entryBytes});

assert.equal(animationSequenceKindForAttack('ALEX',{id:'ALEX_SA3'}),'stun-gun-headbutt');
