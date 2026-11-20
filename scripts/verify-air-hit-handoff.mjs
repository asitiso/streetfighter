import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import * as mapper from '../dist/assets/render/AnimationTimingMapper.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
import {animationTextureManager as atm} from '../dist/assets/render/AnimationTextureManager.js';
import {characterTextureManager as ctm} from '../dist/assets/render/CharacterTextureManager.js';
import {releasePoseBlendCanvas} from '../dist/assets/render/PoseBlendBuffer.js';
const chars=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},assets=new Map(chars.flatMap(c=>animationSequencesFor(c.id).map(s=>[s.asset,s]))),images=[],canvases=[];
let paints=[],translations=[],failAsset='',bufferMissing=false,contextId=0;
function context(alpha=1){const id=contextId++,stack=[],o={globalAlpha:alpha,filter:'none',globalCompositeOperation:'source-over',imageSmoothingEnabled:false,imageSmoothingQuality:'low'};return new Proxy(o,{get:(o,k)=>k in o?o[k]:k==='save'?()=>stack.push({...o}):k==='restore'?()=>Object.assign(o,stack.pop()):k==='drawImage'?(im,...args)=>paints.push({src:im.src??'$composite',alpha:o.globalAlpha,operation:o.globalCompositeOperation,args,context:id}):k==='translate'?(...xy)=>translations.push({xy,context:id}):k==='getTransform'?()=>({a:1,b:0,c:0,d:1}):k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});}
class BufferCanvas{constructor(w,h){this.width=w;this.height=h;this.ctx=context();canvases.push(this);}getContext(){return bufferMissing?null:this.ctx;}}
globalThis.OffscreenCanvas=BufferCanvas;
globalThis.Image=class{complete=true;constructor(){images.push(this);}set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=s?s.frameHeight:448;if(v===failAsset)this.onerror?.();else this.onload?.();}get src(){return this.url;}};
ctm.setMode('hd');atm.setQualityPolicy(()=>ctm.wantsHd());for(const c of chars)atm.preloadCharacter(c.id,'movement');
function render(f){paints=[];translations=[];const ctx=context(.65),before=JSON.stringify(f);drawCombatFighter(ctx,f,1,999);assert.equal(JSON.stringify(f),before,'Drawing cannot advance state or clocks');assert.equal(ctx.globalAlpha,.65);assert.equal(ctx.filter,'none');return {paints:[...paints],translations:[...translations]};}
const physics=createHash('sha256');let cases=0,draws=0,handoffs=0,freezeChecks=0,phaseChecks=0,exclusions=0,fallbacks=0;
for(const c of chars)for(const face of[-1,1])for(const button of['lp','mp','lk','mk']){
 const w=new CombatWorld(c,getCharacter('KEN'),'duel'),f=w.player;f.facing=face;f.airborne=true;f.jumpHeight=70;f.jumpVelocity=-2;f.receiveHit(normalFor(button,false,'KEN'),w.enemy,false);
 for(let tick=0;tick<85;tick++){
  physics.update(JSON.stringify([c.id,face,button,tick,f.state,f.stateFrame,f.x,f.y,f.hp,f.hitStop,f.airborne,f.jumpHeight,f.jumpVelocity,f.juggleHits]));
  if(f.state==='hit'&&f.airborne){const r=render(f);draws++;if(f.stateFrame>=-3){
   const previous=animationSequenceFor(c.id,'fall',true),current=animationSequenceFor(c.id,'jump',true),blend=(4+f.stateFrame)/3;
   assert(r.paints.some(p=>p.src===current.asset),'Final airborne hit ticks must bridge into authored jump pose');
   assert(r.paints.some(p=>p.src===previous.asset&&p.alpha===1-blend));assert(r.paints.some(p=>p.src===current.asset&&p.alpha===blend&&p.operation==='lighter'));
   assert.equal(r.paints.filter(p=>p.src==='$composite').length,1);assert.equal(r.paints.find(p=>p.src==='$composite').alpha,.65,'Composite caller opacity exactly once');
   const h=mapper.airHitHandoffSample(f);assert.equal(h.previous.sequence.id,previous.id);assert.equal(h.current.sequence.id,current.id);assert.equal(h.blend,blend);handoffs++;
  }else assert(!r.paints.some(p=>p.src===animationSequenceFor(c.id,'jump',true).asset),'Early impact retains recoil');}
  f.updatePlayer(q,w.rules);
 }cases++;
}
const digest=physics.digest('hex');assert.equal(digest,'289f9950fef5eeb960d3d7060c620d50e73cb7ecbb1f0fda11270a83a01bb9ff','Same80case pre-fix physics trace');assert.equal(handoffs,240);
for(const c of chars)for(const face of[-1,1]){
 const w=new CombatWorld(c,getCharacter('KEN'),'duel'),f=w.player,fall=animationSequenceFor(c.id,'fall',true),jump=animationSequenceFor(c.id,'jump',true);f.facing=face;f.state='hit';f.hitAnimationDuration=12;f.airborne=true;f.jumpHeight=100;f.jumpVelocity=-3;
 for(const left of[3,2,1]){f.stateFrame=-left;const before=JSON.stringify(f),h=mapper.airHitHandoffSample(f);assert.equal(h.blend,(4-left)/3);assert.equal(JSON.stringify(f),before,'Sampling does not write combat state');const r=render(f);assert.equal(r.translations.filter(t=>t.xy[0]===0&&t.xy[1]===-100).length,2,'Each blended body applies gameplay height once');f.hitStop=3;for(let n=0;n<3;n++){f.updatePlayer(q,w.rules);assert.deepEqual(mapper.airHitHandoffSample(f),h);freezeChecks++;}phaseChecks++;}
 for(const key of['throwSyncFrames','superVictimFrames','wallBounceFrames','groundBounceFrames','throwEscapeFrames']){f[key]=2;assert.equal(mapper.airHitHandoffSample(f),null);f[key]=0;exclusions++;}
 for(const state of['idle','walk','jump','block','parry','attack','victory','knockdown','ko']){f.state=state;assert.equal(mapper.airHitHandoffSample(f),null);exclusions++;}f.state='hit';
 for(const value of[-5,-4,0,1]){f.stateFrame=value;assert.equal(mapper.airHitHandoffSample(f),null);exclusions++;}f.stateFrame=-2;
 f.hp=0;assert.equal(mapper.airHitHandoffSample(f),null);f.hp=c.id==='GILL'?1400:1000;
 f.hitAnimationDuration=3;assert.equal(mapper.airHitHandoffSample(f),null);f.hitAnimationDuration=12;f.airborne=false;f.jumpHeight=0;assert.equal(mapper.airHitHandoffSample(f),null);assert(render(f).paints.some(p=>p.src===animationSequenceFor(c.id,'hit',true).asset));f.airborne=true;f.jumpHeight=100;
 const image=images.find(im=>im.src===jump.asset);image.complete=false;assert(!render(f).paints.some(p=>p.src==='$composite'));assert(render(f).paints.some(p=>p.src===fall.asset));image.complete=true;image.naturalWidth--;assert(!render(f).paints.some(p=>p.src==='$composite'));image.naturalWidth++;
 bufferMissing=true;releasePoseBlendCanvas();assert(render(f).paints.some(p=>p.src===fall.asset));bufferMissing=false;releasePoseBlendCanvas();ctm.setMode('lite');assert(!render(f).paints.some(p=>p.src==='$composite'));ctm.setMode('hd');atm.releaseCharacter(c.id);failAsset=jump.asset;atm.preloadCharacter(c.id,'movement');assert(render(f).paints.some(p=>p.src===fall.asset));assert(!render(f).paints.some(p=>p.src==='$composite'));failAsset='';atm.preloadCharacter(c.id,'movement');assert(render(f).paints.some(p=>p.src==='$composite'));fallbacks+=6;
 releasePoseBlendCanvas();assert(canvases.every(c=>c.width===1&&c.height===1));
}
// A fresh action is still accepted on the first free simulation tick.
let inputChecks=0;for(const c of chars){const w=new CombatWorld(c,c,'duel'),f=w.player;f.state='hit';f.stateFrame=-1;f.hitAnimationDuration=12;f.airborne=true;f.jumpHeight=100;f.updatePlayer(q,w.rules);assert.equal(f.state,'jump');assert.equal(f.stateFrame,0);f.updatePlayer({...q,pressed:k=>k==='lp'},w.rules);assert.equal(f.state,'attack');assert.equal(f.currentMove.id,c.id+'_AIR_LP');inputChecks++;}
for(const c of chars)atm.releaseCharacter(c.id);releasePoseBlendCanvas();
console.log(JSON.stringify({passed:true,cases,draws,handoffs,phaseChecks,freezeChecks,exclusions,fallbacks,inputChecks,physics:digest,noNewArt:true,simulationUnchanged:true}));
