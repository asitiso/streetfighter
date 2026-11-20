import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],assets=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s]))),images=[];
globalThis.Image=class{complete=true;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures,PLAYABLE_CHARACTER_TEXTURE_IDS}=await import('../dist/assets/render/CharacterTextureManager.js');
let released=0,reloads=0;
const expected=c=>animationSequencesFor(c,true).filter(s=>s.poseAuthored).length;
function load(id){animations.preloadCharacter(id,'combat');assert.equal(animations.readyCount(id),expected(id));}
function cleared(id){assert.equal(animations.readyCount(id),0,id+' strips must be released');}
function handlesCleared(list){for(const im of list){assert.equal(im.src,'');assert.equal(im.onload,null);assert.equal(im.onerror,null);released++;}}
assert.equal(PLAYABLE_CHARACTER_TEXTURE_IDS.length,8,'Texture cleanup must preserve playable UI roster');
textures.setMode('hd');for(const c of roster)load(c.id);
const first=images.filter(im=>assets.has(im.original));assert(first.length>0);
// Explicit HD keeps cached characters while focus changes.
textures.focusCharacter('RYU');for(const c of roster)assert.equal(animations.readyCount(c.id),expected(c.id));
textures.setMode('lite');for(const c of roster)cleared(c.id);handlesCleared(first);
// Return to auto: three recent characters are retained, including bosses.
textures.setMode('auto');for(const id of ['URIEN','GILL','RYU']){textures.focusCharacter(id);load(id);}
const uriImages=images.filter(im=>im.src&&assets.get(im.original)?.characterId==='URIEN');
const gillImages=images.filter(im=>im.src&&assets.get(im.original)?.characterId==='GILL');
textures.focusCharacter('KEN');cleared('URIEN');handlesCleared(uriImages);
assert.equal(animations.readyCount('GILL'),expected('GILL'),'Recent boss stays loaded');
assert.equal(animations.readyCount('RYU'),expected('RYU'),'Recent playable stays loaded');
textures.focusCharacter('CHUNLI');cleared('GILL');handlesCleared(gillImages);
for(const id of ['URIEN','GILL']){load(id);reloads++;}textures.setMode('lite');
for(const c of roster)cleared(c.id);
textures.setMode('auto');for(const id of ['URIEN','GILL']){textures.preloadCharacter(id);assert(animations.readyCount(id)>0);reloads++;}
textures.setMode('lite');for(const c of roster)cleared(c.id);
console.log('BOSS_TEXTURE_RELEASE_PASS',{characters:roster.length,releasedHandles:released,bossReloads:reloads,liteClearsBosses:true,autoRetention:3,hdRetentionUnchanged:true});
