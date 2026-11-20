import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {animationSequencesFor,animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],assets=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s]))),images=[];
let memory=2;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get deviceMemory(){return memory;}}});
const stored=new Map([['ssc-character-texture-quality-v1','hd']]);globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
globalThis.Image=class{complete=true;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
assert.equal(textures.currentMode,'hd');assert.equal(textures.wantsHd(),true);
assert.equal(animations.wantsHighFrame(),true,'Stored explicit HIGH must apply to authored animation on low runtime tier');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
let checks=0,hqDraws=0,suppressed=0;
for(const mode of['auto','hd','lite'])for(const tier of['high','balanced','low'])for(const mem of[undefined,2,8]){
 memory=mem;runtimeQuality.setTier(tier);textures.setMode(mode);
 const expected=mode==='hd'||mode==='auto'&&tier!=='low'&&!(tier==='balanced'&&mem!==undefined&&mem<4);
 assert.equal(textures.wantsHd(),expected);assert.equal(animations.wantsHighFrame(),expected);
 for(const c of roster){
  animations.releaseCharacter(c.id);const before=images.length;animations.preloadCharacter(c.id,'movement');
  const s=animationSequenceFor(c.id,'idle',true),selected=animations.selection(s);
  assert.equal(Boolean(selected),expected,mode+' '+tier+' '+mem+' '+c.id);
  const requested=images.slice(before).filter(im=>assets.has(im.original));assert.equal(requested.length>0,expected);
  const f=new Fighter(c,'player',400,500,1,c.superArts[0]),draws=[];
  const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
  drawCombatFighter(ctx,f,1,0);const count=draws.filter(a=>a[0].src===s.asset).length;
  assert.equal(count,expected?1:0,'Rendered quality must match the character setting');
  if(expected)hqDraws++;else suppressed++;
  animations.releaseCharacter(c.id);checks++;
 }
}
assert.equal(checks,270);assert(hqDraws>0&&suppressed>0);
textures.setMode('auto');runtimeQuality.setTier('high');
console.log('ANIMATION_QUALITY_POLICY_PASS',{characters:10,modeTierMemoryCases:27,renderChecks:checks,hqDraws,suppressed,persistedHighHonored:true});
