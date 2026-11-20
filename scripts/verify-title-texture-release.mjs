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


const {SceneManager}=await import('../dist/assets/core/SceneManager.js');
const {Stage1Scene}=await import('../dist/assets/scenes/Stage1Scene.js');
const {TitleScene}=await import('../dist/assets/scenes/TitleScene.js');
const audio={playStagePulse(){},unlock(){return Promise.resolve();}};
const input={};let storageWrites=0;
globalThis.localStorage={getItem(){return null;},setItem(){storageWrites++;}};
const scenes=new SceneManager();
const title=()=>new TitleScene(input,audio,[]);
const activeHigh=()=>images.filter(im=>highOwners.has(im.original)&&im.src);
let transitions=0,released=0;
for(const player of roster)for(const stage of [1,2,3,4,5]){
 textures.setMode('lite');textures.setMode('auto');
 const scene=new Stage1Scene(input,audio,player,player.superArts[0],stage);
 scene.spawnBeltWave(1);await scenes.setScene(scene);
 const actors=[...new Set([player.id,...scene.world.enemies.map(e=>e.character.id)])];
 assert(actors.every(id=>animations.readyCount(id)>0));
 const handles=activeHigh(),writes=storageWrites;
 await scenes.setScene(title());
 allHighGone();for(const im of handles){assert.equal(im.src,'','Returning to title must release unused battle image handles');released++;}
 assert.equal(storageWrites,writes,'Title cleanup must not change user settings');
 for(const id of actors)for(const key of [art.combatSpriteKey(id),art.attackAtlasKey(id)].filter(Boolean))assert(art.isArtAssetReady(key),'Base fallback stays ready');
 const n=images.length;await scenes.setScene(title());assert.equal(images.length,n,'Repeated title is idempotent');
 await scenes.setScene(scene);assert(actors.every(id=>animations.readyCount(id)>0),'Re-entered stage reloads authored motion');
 await scenes.setScene(title());textures.focusCharacter(player.id);
 assert.equal(roster.filter(c=>animations.readyCount(c.id)>0).length,1,'Menu focus must not restore prior battle actors');
 transitions++;
}
textures.setMode('lite');textures.setMode('auto');autoLoad=false;
const ken=roster.find(c=>c.id==='KEN'),pendingStage=new Stage1Scene(input,audio,ken,ken.superArts[0],2);
await scenes.setScene(pendingStage);const pending=activeHigh();assert(pending.length>0);
await scenes.setScene(title());allHighGone();for(const im of pending){assert.equal(im.src,'');assert(im.onload==null);assert(im.onerror==null);}
autoLoad=true;textures.setMode('hd');await scenes.setScene(pendingStage);const hd=activeHigh();assert(hd.length>0);await scenes.setScene(title());assert(hd.every(im=>im.src),'Explicit HIGH keeps its retention policy');
textures.setMode('auto');allHighGone();assert(hd.every(im=>im.src===''),'AUTO must not retain stale focus after HIGH title return');
textures.setMode('lite');await scenes.setScene(title());allHighGone();
console.log('TITLE_TEXTURE_RELEASE_PASS',{transitions,characters:10,stages:5,releasedHandles:released,pendingCanceled:true,hdPolicyPreserved:true,baseFallbackPreserved:true,reentryReload:true,idempotent:true,storageUnchanged:true});
