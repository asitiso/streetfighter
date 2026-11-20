import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],images=[],sequences=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
let memory=8;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get deviceMemory(){return memory;}}});
globalThis.Image=class{complete=true;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;const s=sequences.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const art=await import('../dist/assets/render/ImageAssets.js');
const highKeys=c=>[art.combatSpriteHqKey(c),art.combatSpriteHdKey(c),art.attackAtlasHdKey(c)].filter(Boolean);
const liteKeys=roster.flatMap(c=>[art.combatSpriteKey(c.id),art.attackAtlasKey(c.id)].filter(Boolean));
const highOwners=new Map([...sequences].map(([url,s])=>[url,s.characterId]));
for(const c of roster)for(const k of highKeys(c.id))highOwners.set(art.ART_ASSET_PATHS[k],c.id);
for(const[c,kinds]of[['KEN',['hadoken','shoryuken','tatsumaki','super-rush']],['CHUNLI',['kikoken','spinning-bird-kick']]])for(const k of kinds)highOwners.set('/art/special-keyposes/'+c.toLowerCase()+'/'+k+'.webp',c);
const expected=id=>animationSequencesFor(id,true).filter(s=>s.poseAuthored).length;
function loadAll(){for(const c of roster){textures.focusCharacter(c.id);animations.preloadCharacter(c.id,'combat');assert.equal(animations.readyCount(c.id),expected(c.id));}}
function allHighGone(){for(const c of roster){assert.equal(animations.readyCount(c.id),0,c.id+' high animation must be cleared');for(const k of highKeys(c.id))assert(!art.isArtAssetReady(k));}}
function litePreserved(){for(const k of liteKeys)assert(art.isArtAssetReady(k),k+' LITE fallback must remain ready');}
textures.setMode('hd');loadAll();
const before=images.length,first=images.filter(im=>highOwners.has(im.original)&&im.src),keep=new Set(roster.slice(-3).map(c=>c.id));
textures.setMode('auto');
for(const c of roster){
 assert.equal(animations.readyCount(c.id),keep.has(c.id)?expected(c.id):0,'AUTO switch must immediately trim '+c.id);
 for(const k of highKeys(c.id))assert.equal(art.isArtAssetReady(k),keep.has(c.id));
}
let released=0,retained=0;for(const im of first){if(keep.has(highOwners.get(im.original))){assert.equal(im.src,im.original);retained++;}else{assert.equal(im.src,'');released++;}}
assert.equal(images.length,before,'Switching to AUTO must not reload retained art');litePreserved();
textures.setMode('auto');assert.equal(images.length,before,'Repeated AUTO selection is idempotent');
textures.focusCharacter('KEN');assert(animations.readyCount('KEN')>0);assert.equal(animations.readyCount('YUN'),0,'Fourth focus evicts the oldest recent character');
const active=images.filter(im=>highOwners.has(im.original)&&im.src),n=images.length;
runtimeQuality.setTier('low');textures.focusCharacter('RYU');allHighGone();litePreserved();
assert.equal(images.slice(n).filter(im=>highOwners.has(im.original)).length,0,'Low AUTO focus must not request high art');
for(const im of active)assert.equal(im.src,'');
runtimeQuality.setTier('high');textures.focusCharacter('CHUNLI');assert(animations.readyCount('CHUNLI')>0,'Released art reloads when high quality returns');
memory=2;runtimeQuality.setTier('balanced');textures.setMode('hd');loadAll();
textures.setMode('auto');allHighGone();litePreserved();
memory=8;textures.focusCharacter('URIEN');assert(animations.readyCount('URIEN')>0);
textures.setMode('lite');allHighGone();litePreserved();textures.setMode('auto');runtimeQuality.setTier('high');
console.log('AUTO_TEXTURE_TRIM_PASS',{characters:10,releasedOnAuto:released,retainedOnAuto:retained,recentCharacters:3,liteFallbackPreserved:liteKeys.length,idempotent:true,lowTierFocusClearsHigh:true,lowMemoryAutoClearsHigh:true,explicitHdPreserved:true,reloadWorks:true});
