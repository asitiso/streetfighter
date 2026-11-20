import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS], images=[], sequences=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
let autoLoad=true;
function finish(im){const s=sequences.get(im.src);im.complete=true;im.naturalWidth=s?s.frameWidth*s.frameCount:384;im.naturalHeight=448;im.onload?.();}
globalThis.Image=class{constructor(){images.push(this);this.complete=false;}set src(v){this.url=v;if(v&&autoLoad)finish(this);}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {Stage1Scene}=await import('../dist/assets/scenes/Stage1Scene.js');
const art=await import('../dist/assets/render/ImageAssets.js');
const ken=roster.find(c=>c.id==='KEN');
const scene=new Stage1Scene({}, {playStagePulse(){}},ken,ken.superArts[0]);
textures.setMode('auto');scene.enter();
const enemyId=scene.world.enemy.character.id;assert.notEqual(enemyId,'KEN');
const idle=id=>animationSequencesFor(id,true).find(s=>s.kind==='idle'&&s.poseAuthored);
const enemy=animations.selection(idle(enemyId)).image, before=images.length;
scene.exit();scene.enter();
assert.equal(animations.selection(idle(enemyId)).image,enemy,'Re-entering stage must preserve opponent image identity');
assert.equal(images.length,before,'Re-entering stage must not request textures again');
const expected=id=>animationSequencesFor(id,true).filter(s=>s.poseAuthored).length;
let pairs=0;
for(const a of roster)for(const b of roster){
 textures.focusCharacter(a.id,b.id);animations.preloadCharacter(a.id,'combat');animations.preloadCharacter(b.id,'combat');
 assert.equal(animations.readyCount(a.id),expected(a.id));assert.equal(animations.readyCount(b.id),expected(b.id));
 assert(roster.filter(c=>animations.readyCount(c.id)>0).length<=3,'AUTO retains at most three characters');
 const ai=animations.selection(idle(a.id)).image,bi=animations.selection(idle(b.id)).image,n=images.length;
 textures.focusCharacter(a.id,b.id);
 assert.equal(images.length,n);assert.equal(animations.selection(idle(a.id)).image,ai);assert.equal(animations.selection(idle(b.id)).image,bi);pairs++;
}
textures.setMode('lite');textures.setMode('auto');autoLoad=false;
textures.preloadCharacter('RYU');const pending=images.findLast(im=>im.src===idle('RYU').asset),n=images.length;
textures.focusCharacter('KEN','RYU');assert.equal(pending.src,idle('RYU').asset,'Pending opponent request must survive focus');
assert.equal(images.filter(im=>im.src===idle('RYU').asset).length,1);finish(pending);assert.equal(animations.selection(idle('RYU')).image,pending);
autoLoad=true;textures.setMode('lite');textures.setMode('hd');
for(const c of roster){textures.focusCharacter(c.id);animations.preloadCharacter(c.id,'combat');}
textures.focusCharacter('KEN','RYU');assert(roster.every(c=>animations.readyCount(c.id)===expected(c.id)),'Explicit HD keeps unrelated ready art');
textures.setMode('lite');const liteStart=images.length;textures.focusCharacter('KEN','RYU');
assert(roster.every(c=>animations.readyCount(c.id)===0));assert.equal(images.length,liteStart);
for(const id of ['KEN','RYU'])assert(art.isArtAssetReady(art.combatSpriteKey(id)));
textures.setMode('auto');textures.focusCharacter('KEN','RYU');assert(animations.readyCount('KEN')>0&&animations.readyCount('RYU')>0);
runtimeQuality.setTier('low');textures.focusCharacter('KEN','RYU');assert(roster.every(c=>animations.readyCount(c.id)===0));
console.log('PAIRED_TEXTURE_FOCUS_PASS',{pairs,mirrors:10,stageReentryReused:true,pendingReused:true,autoLimit:3,hdRetained:true,litePreserved:true,reload:true});
