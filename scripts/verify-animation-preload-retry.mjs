import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor,animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],assets=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s]))),images=[];
globalThis.Image=class{complete=false;naturalWidth=0;naturalHeight=0;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:m}=await import('../dist/assets/render/AnimationTextureManager.js');
const seq=(id,kind='idle')=>animationSequenceFor(id,kind,true);
const requests=s=>images.filter(x=>x.original===s.asset);
const last=s=>requests(s).at(-1);
function fail(im){im.complete=true;im.naturalWidth=0;im.naturalHeight=0;im.onerror?.();}
function finish(im){const s=assets.get(im.original);im.complete=true;im.naturalWidth=s.frameWidth*s.frameCount;im.naturalHeight=s.frameHeight;im.onload?.();}
function retired(im){assert.equal(im.src,'');assert.equal(im.onload,null);assert.equal(im.onerror,null);}
let recovered=0,noDrawRetries=0;
for(const c of roster){
 const s=seq(c.id);assert.equal(m.selection(s),null);const old=last(s);fail(old);
 for(let i=0;i<100;i++){assert.equal(m.selection(s),null);assert.equal(m.readyCount(c.id),0);noDrawRetries++;}
 assert.equal(requests(s).length,1,'Failed draw must not cause a request storm');
 m.preloadCharacter(c.id,'movement');const retry=last(s);
 assert.notEqual(retry,old,c.id+' explicit preload must retry failed animation');
 retired(old);assert.equal(m.selection(s),null,'Retry remains unavailable until decoded');
 const requestCount=images.length;m.preloadCharacter(c.id,'movement');
 assert.equal(images.length,requestCount,'Healthy and in-flight requests remain shared');
 finish(retry);assert.equal(m.selection(s)?.image,retry);assert.equal(m.readyCount(c.id),1);recovered++;
 m.preloadCharacter(c.id,'movement');assert.equal(images.length,requestCount);
 m.releaseCharacter(c.id);retired(retry);assert.equal(m.readyCount(c.id),0);
}
const victory=seq('KEN','victory');m.selection(victory);const broken=last(victory);fail(broken);
m.preloadCharacter('KEN','movement');assert.equal(last(victory),broken,'Movement prep must not retry combat-only art');
m.preloadCharacter('RYU','combat');assert.equal(last(victory),broken,'Other character prep must not retry Ken');
m.preloadCharacter('KEN','combat');const retry=last(victory);assert.notEqual(retry,broken);retired(broken);
const savedLoad=retry.onload;const before=images.length;
for(let i=0;i<100;i++)assert.equal(m.selection(victory),null);
m.preloadCharacter('KEN','combat');assert.equal(images.length,before,'Pending retry must not duplicate');
m.releaseCharacter('KEN');retired(retry);finish(retry);savedLoad();assert.equal(m.readyCount('KEN'),0,'Late load cannot revive released cache');
m.selection(victory);const fresh=last(victory);assert.notEqual(fresh,retry);finish(fresh);assert.equal(m.selection(victory)?.image,fresh);recovered++;
m.releaseCharacter('KEN');m.releaseCharacter('RYU');
const boss=seq('GILL');m.selection(boss);const lowOld=last(boss);fail(lowOld);
runtimeQuality.setTier('low');m.preloadCharacter('GILL','movement');assert.equal(last(boss),lowOld);assert.equal(m.selection(boss),null);
runtimeQuality.setTier('high');m.preloadCharacter('GILL','movement');const highNew=last(boss);assert.notEqual(highNew,lowOld);finish(highNew);assert.equal(m.selection(boss)?.image,highNew);recovered++;m.releaseCharacter('GILL');
for(const c of roster)assert.equal(m.readyCount(c.id),0);
console.log('ANIMATION_PRELOAD_RETRY_PASS',{characters:10,recovered,noDrawRetries,scopeIsolation:true,pendingDeduplication:true,lateReleaseSafe:true,lowTierRespected:true});
