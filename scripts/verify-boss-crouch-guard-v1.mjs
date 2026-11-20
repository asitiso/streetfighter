import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{CHARACTERS as PLAYABLE,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';
import{Fighter}from'../dist/assets/combat/Fighter.js';
import{animationSequenceFor,animationSequencesFor}from'../dist/assets/render/AnimationSequenceLibrary.js';
import{animationTextureManager}from'../dist/assets/render/AnimationTextureManager.js';
import{characterTextureManager}from'../dist/assets/render/CharacterTextureManager.js';
import{drawCombatFighter}from'../dist/assets/render/Visuals.js';
import{ASSET_GROUPS,CAMPAIGN_OFFLINE_URLS}from'../dist/assets/core/AssetManager.js';
const CHARACTERS=[...PLAYABLE,...BOSS_CHARACTERS],sequences=CHARACTERS.flatMap(c=>animationSequencesFor(c.id));let failLow=false;const requests=[];
globalThis.Image=class{complete=true;naturalWidth=384;naturalHeight=448;set src(v){this.url=v;requests.push(v);const s=sequences.find(s=>s.asset===v);if(s){this.naturalWidth=s.frameWidth*s.frameCount;this.naturalHeight=s.frameHeight;}if(v.includes('crouch-guard')&&failLow)this.onerror?.();else this.onload?.();}get src(){return this.url;}};
globalThis.OffscreenCanvas=class{constructor(){this.ops=[];this.ctx=null;}getContext(){if(this.ctx)return this.ctx;const o={globalAlpha:1,globalCompositeOperation:'source-over'},stack=[];this.ctx=new Proxy(o,{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='clearRect')this.ops.length=0;if(k==='save')stack.push({...o});if(k==='restore')Object.assign(o,stack.pop());if(k==='drawImage')this.ops.push({url:a[0].src,alpha:o.globalAlpha,args:a.slice(1),composite:o.globalCompositeOperation});},set(o,k,v){o[k]=v;return true;}});return this.ctx;}};
characterTextureManager.setMode('hd');animationTextureManager.setQualityPolicy(()=>true);
function render(c,clock,face=1,state='block',progress=.5){const f=new Fighter(c,'player',400,500,face);f.state=state;f.stateFrame=-16*(1-progress);f.guardAnimationDuration=16;f.crouchAnimationFrame=clock;const before=JSON.stringify(f),draws=[],shadows=[],stack=[],o={globalAlpha:.7,imageSmoothingEnabled:false,imageSmoothingQuality:'low',filter:'none'};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return(...a)=>{if(k==='save')stack.push({...o});if(k==='restore')Object.assign(o,stack.pop());if(k==='drawImage')a[0].ops?draws.push(...a[0].ops.map(d=>({...d,alpha:d.alpha*o.globalAlpha}))):draws.push({url:a[0].src,alpha:o.globalAlpha,args:a.slice(1)});if(k==='ellipse')shadows.push(o.globalAlpha);if(k==='createRadialGradient'||k==='createLinearGradient')return{addColorStop(){}};};},set(o,k,v){o[k]=v;return true;}});drawCombatFighter(ctx,f,1,123);assert.equal(JSON.stringify(f),before,'Rendering cannot mutate combat');assert.equal(o.globalAlpha,.7,'Parent opacity must survive');return{draws,shadows};}

let checks=0;
for(const id of ['URIEN','GILL']){
 const slug=id.toLowerCase(),manifest=JSON.parse(await readFile(new URL('../art-source/boss-crouch-guard-v1/'+slug+'/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.character,id);assert.equal(manifest.frames,6);assert.equal(manifest.frameWidth,384);assert.equal(manifest.frameHeight,448);assert.equal(manifest.sharedScale,.65);
 for(const[name,digest]of Object.entries(manifest.sha256)){const path=name.endsWith('.webp')?'../'+manifest.runtime:'../art-source/boss-crouch-guard-v1/'+slug+'/'+name;const bytes=await readFile(new URL(path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),digest);if(name.endsWith('.webp'))assert(bytes.length<600000);}
 const low=animationSequenceFor(id,'crouch-guard');assert(low?.enabled&&low.poseAuthored);assert.equal(low.frameCount,6);assert(ASSET_GROUPS['character-hq'].includes(low.asset));assert(ASSET_GROUPS['stage-5'].includes(low.asset));assert(CAMPAIGN_OFFLINE_URLS.includes(low.asset));
 animationTextureManager.preloadCharacter(id,'movement');assert(requests.includes(low.asset));const character=CHARACTERS.find(c=>c.id===id);
 for(const face of [-1,1])for(const p of [0,.2,.4,.6,.8,1])for(let clock=-1;clock<=5;clock++){
  const r=render(character,clock,face,'block',p),body=r.draws.filter(d=>d.url?.includes('/animation-hq/'+slug+'/')),fresh=body.find(d=>d.url===low.asset);
  if(clock===-1)assert(!fresh);else{assert(fresh);assert.equal(fresh.args[0],Math.min(5,Math.floor(p*6))*384);assert(Math.abs(fresh.alpha-.7*(clock+1)/6)<1e-12);assert.equal(body.length,clock===5?1:2);if(clock<5)assert.equal(fresh.composite,'lighter');}
  assert.equal(r.shadows.length,1);checks++;
 }
 for(const c of CHARACTERS)for(const state of ['idle','parry','crouch']){assert.equal(render(c,5,1,state).draws.some(d=>d.url===low.asset),c.id===id&&state!=='parry');checks++;}
 animationTextureManager.releaseCharacter(id);failLow=true;animationTextureManager.preloadCharacter(id,'movement');const fallback=render(character,5);assert(!fallback.draws.some(d=>d.url===low.asset));assert(fallback.draws.some(d=>d.url.includes('/'+slug+'/guard.webp')));assert.equal(fallback.shadows.length,1);
 failLow=false;animationTextureManager.preloadCharacter(id,'movement');assert(render(character,5).draws.some(d=>d.url===low.asset));animationTextureManager.releaseCharacter(id);assert.equal(animationTextureManager.readyCount(id),0);
 const startRequests=requests.length;characterTextureManager.setMode('lite');assert(!render(character,5).draws.some(d=>d.url===low.asset));assert(!requests.slice(startRequests).includes(low.asset));characterTextureManager.setMode('hd');
}
console.log(JSON.stringify({passed:true,characters:2,checks,frames:12,missingTextureFallback:true,liteFallback:true,retry:true,release:true,offline:true}));
