import assert from 'node:assert/strict';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('MAKOTO','shoryuken',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Makoto rising uppercut needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:3,activeStart:4,activeEnd:7,recoveryStart:8});
const requests=[];
const assets=new Map(animationSequencesFor('MAKOTO',true).map(s=>[s.asset,s]));
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
animationTextureManager.releaseCharacter('MAKOTO');requests.length=0;
animationTextureManager.preloadCharacter('MAKOTO','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('MAKOTO','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/makoto/manifest.json',import.meta.url),'utf8'));
const urls=new Set(requests),entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/makoto/'+r.id+'.webp')).reduce((sum,r)=>sum+r.bytes,0);
assert.equal(manifest.frameTotal,335);assert.equal(manifest.records.length,36);assert.ok(entryBytes<15_000_000,'Makoto authored entry exceeds15MBcap');
const reachedFrames=new Set();const coverage=[];
for(const facing of [-1,1])for(const variant of ['ANTI_AIR']){
 const w=new CombatWorld(getCharacter('MAKOTO'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',rows=[];
 for(let tick=0;tick<3;tick++){const held=tick===0?[forward]:tick===1?['down']:['down',forward,'lp'];w.update({held:k=>held.includes(k),pressed:k=>tick===2&&k==='lp',released:()=>false},tick);}
 const move=f.currentMove;assert.equal(move.id,'MAKOTO_'+variant);
 const seen=new Set(),contacts=new Set();let frozen=false,airAttack=false,peak=0,landed=false,wasAir=false;
 for(let tick=3;tick<120;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,jumpHeight:f.jumpHeight,worldX:f.x-600});
  peak=Math.max(peak,f.jumpHeight);if(f.airborne)wasAir=true;if(wasAir&&!f.airborne)landed=true;
  if(f.state==='attack'||s.sequence.id===seq.id){
   if(f.state!=='attack'){assert.equal(f.currentMove,null);assert.equal(s.contact,false,'Visual recovery cannot extend attack contact');}
   assert.equal(s.sequence.id,seq.id);if(f.airborne&&f.moveFrame>=move.startup+move.active)assert.ok(s.frame<=8,'Airborne recovery must not display grounded landing/guard');if(!f.airborne&&f.landingFrames>0&&f.moveFrame>=move.startup+move.active)assert.ok(s.frame>=9,'Landed recovery needs landing art');seen.add(s.frame);reachedFrames.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);airAttack ||= f.airborne;
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],s.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);
   if(f.jumpHeight>0)assert.equal(translations.filter(([x,y])=>x===0&&y===-f.jumpHeight).length,1,'Gameplay height must apply exactly once');
   if(s.contact&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame,height=f.jumpHeight;for(let stop=0;stop<3;stop++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.jumpHeight,height);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true});}}
  }
  w.update(quiet,tick);
 }
 assert.ok(peak>0&&airAttack&&landed);assert.equal(f.state,'idle');assert.equal(f.jumpHeight,0);assert.deepEqual([...contacts].sort(),[4,5,6,7]);assert.ok(seen.has(7)&&seen.has(8)&&seen.has(9),'Flight apex/descent and touchdown poses must be reached');coverage.push({variant,facing,frames:seen.size});
 f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id,'Launched uppercut owns its flight');f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall','Interruption returns to authored airborne hit reaction');
 timelines[variant+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const id of ['MAKOTO_CMD_MP','MAKOTO_ANTI_AIR_TEST','MAKOTO_TC_TEST'])assert.equal(animationSequenceKindForAttack('MAKOTO',{id}),null);
assert.equal(animationSequenceKindForAttack('RYU',{id:'MAKOTO_ANTI_AIR'}),null);
function landedUppercut(){const w=new CombatWorld(getCharacter('MAKOTO'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.startMove(specialMovesFor('MAKOTO').antiAir);for(let tick=0;tick<100;tick++){w.update(quiet,tick);if(!f.currentMove&&!f.airborne&&f.landingFrames>0){assert.equal(animationSequenceSample(f,0)?.sequence.id,seq.id);return w;}}throw Error('Fukiage did not land');}
let next=landedUppercut();next.update({held:k=>k==='up',pressed:k=>k==='up',released:()=>false},101);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'jump','A fresh jump must not inherit Fukiage recovery art');
next=landedUppercut();for(let tick=101;tick<104;tick++)next.update({held:k=>tick!==102&&k==='right',pressed:k=>tick!==102&&k==='right',released:()=>false},tick);assert.ok(next.player.dashFrames>0);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'dash','A fresh dash takes priority over landing and Fukiage recovery');for(let tick=104;tick<111;tick++)next.update(quiet,tick);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'dash');
next=landedUppercut();next.player.receiveHit(specialMovesFor('KEN').primary,new CombatWorld(getCharacter('KEN'),getCharacter('RYU'),'duel').player,false);assert.equal(animationSequenceSample(next.player,0)?.sequence.kind,'hit','A hit must interrupt Fukiage recovery');
assert.equal(reachedFrames.size,12,'Fukiage must keep its flight/touchdown art through all12storedframes without extending combat timing');
console.log('MAKOTO_FUKIAGE_PASS',{variants:1,facings:2,canvasDraws,entryBytes,contacts:[4,5,6,7],worldHeightAppliedOnce:true,coverage});

for(const id of ['MAKOTO_SUPER','MAKOTO_SA1'])assert.equal(animationSequenceKindForAttack('MAKOTO',{id}),'seichusen-godanzuki');

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA2'}),'abare-tosanami');

assert.equal(animationSequenceKindForAttack('MAKOTO',{id:'MAKOTO_SA3'}),'tanden-renki');
