import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],images=[],sequences=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
let memory=8;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get deviceMemory(){return memory;}}});
let autoLoad=true;globalThis.Image=class{complete=autoLoad;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;const s=sequences.get(v);this.naturalWidth=autoLoad?(s?s.frameWidth*s.frameCount:384):0;this.naturalHeight=autoLoad?448:0;if(v&&autoLoad)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const art=await import('../dist/assets/render/ImageAssets.js');
const highKeys=c=>[art.combatSpriteHqKey(c),art.combatSpriteHdKey(c),art.attackAtlasHdKey(c)].filter(Boolean);
const highOwners=new Map([...sequences].map(([url,s])=>[url,s.characterId]));
for(const c of roster)for(const k of highKeys(c.id))highOwners.set(art.ART_ASSET_PATHS[k],c.id);
for(const[c,kinds]of[['KEN',['hadoken','shoryuken','tatsumaki','super-rush']],['CHUNLI',['kikoken','spinning-bird-kick']]])for(const k of kinds)highOwners.set('/art/special-keyposes/'+c.toLowerCase()+'/'+k+'.webp',c);
function allHighGone(){for(const c of roster){assert.equal(animations.readyCount(c.id),0,c.id+' high animation must be cleared');for(const k of highKeys(c.id))assert(!art.isArtAssetReady(k));}}

const {GameApp}=await import('../dist/assets/core/GameApp.js');
let clock=100000,resizeCount=0,qualityChanges=0,storageWrites=0;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
globalThis.localStorage={getItem(){return null;},setItem(){storageWrites++;}};
const app=Object.create(GameApp.prototype);
Object.assign(app,{telemetry:{sampleFrame(){},noteQualityChange(){qualityChanges++;}},ctx:{setTransform(){},clearRect(){}},canvas:{width:1280,height:720},dpr:1,viewScale:1,logicalWidth:1280,logicalHeight:720,scenes:{render(){}}});
app.resize=()=>{resizeCount++;};
function renderFrames(count,dt=.04){for(let i=0;i<count;i++)app.render(0,dt);}
function arm(){runtimeQuality.setTier('low',false);runtimeQuality.setTier('high',false);clock+=12001;}
function prepare(mode='auto'){
 textures.setMode('lite');runtimeQuality.setTier('high');textures.setMode(mode);
 textures.focusCharacter('KEN','RYU','CHUNLI','IBUKI','ALEX','YUN');
 for(const id of ['KEN','RYU','CHUNLI','IBUKI','ALEX','YUN'])animations.preloadCharacter(id,'combat');
}
function highHandles(){return images.filter(im=>highOwners.has(im.original)&&im.src);}
prepare();const active=highHandles(),before=images.length,writes=storageWrites;
arm();renderFrames(12);assert.equal(runtimeQuality.currentTier,'balanced');assert(active.every(im=>im.src),'High-memory balanced preserves active textures');
clock+=12001;renderFrames(12);assert.equal(runtimeQuality.currentTier,'low');
allHighGone();for(const im of active)assert.equal(im.src,'','Adaptive low must release high image handles immediately');
assert.equal(images.length,before,'Downgrade must not create requests');assert.equal(storageWrites,writes,'Adaptive changes must not persist user mode');
for(const id of ['KEN','RYU','CHUNLI','IBUKI','ALEX','YUN'])for(const key of [art.combatSpriteKey(id),art.attackAtlasKey(id)].filter(Boolean))assert(art.isArtAssetReady(key),'LITE fallback remains ready');
renderFrames(500);assert.equal(images.length,before,'Stable low frames do not request high textures');
assert.equal(qualityChanges,2);assert.equal(resizeCount,2);
memory=2;prepare();const lowMemory=highHandles();arm();renderFrames(12);assert.equal(runtimeQuality.currentTier,'balanced');allHighGone();for(const im of lowMemory)assert.equal(im.src,'');
memory=8;autoLoad=false;prepare();const pending=highHandles();assert(pending.length>0);arm();renderFrames(12);clock+=12001;renderFrames(12);allHighGone();for(const im of pending){assert.equal(im.src,'');assert(im.onload==null);assert(im.onerror==null);}
autoLoad=true;prepare('hd');const hd=highHandles();arm();renderFrames(12);clock+=12001;renderFrames(12);assert.equal(runtimeQuality.currentTier,'low');assert(hd.every(im=>im.src),'Explicit HIGH retains image handles');assert(animations.readyCount('KEN')>0);
prepare();assert(animations.readyCount('KEN')>0,'Normal preparation reloads released art');
textures.setMode('lite');console.log('ADAPTIVE_TEXTURE_RELEASE_PASS',{adaptiveChanges:qualityChanges,resizeCount,highMemoryBalancedRetained:true,lowMemoryBalancedReleased:true,lowReleased:true,pendingCanceled:true,explicitHdRetained:true,liteFallbackPreserved:true,storageUnaffected:true,reloadWorks:true});
