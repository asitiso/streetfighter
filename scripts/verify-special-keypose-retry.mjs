import assert from 'node:assert/strict';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {getCharacter} from '../dist/assets/game/characters.js';
const images=[];globalThis.Image=class{complete=false;naturalWidth=0;naturalHeight=0;constructor(){images.push(this);}set src(v){this.url=v;this.original??=v;}get src(){return this.url;}};
const {preloadSpecialKeyPoses:preload,specialKeyPoseImage:read,specialKeyPoseAsset:asset,releaseSpecialKeyPoses:release}=await import('../dist/assets/render/SpecialKeyPoseLibrary.js');
const catalog=Object.fromEntries(['KEN','CHUNLI'].map(c=>[c,[...new Set(Object.values(specialMovesFor(c)).map(m=>asset(c,m)).filter(Boolean))]]));
assert.equal(Object.values(catalog).flat().length,6);
const requests=p=>images.filter(im=>im.original===p),last=p=>requests(p).at(-1);
function fail(im){im.complete=true;im.naturalWidth=0;im.naturalHeight=0;}
function finish(im){im.complete=true;im.naturalWidth=384;im.naturalHeight=448;im.onload?.();}
let recovered=0,polls=0;
for(const c of['KEN','CHUNLI']){
 preload(c);const first=catalog[c].map(last);assert.equal(first.length,c==='KEN'?4:2);
 for(const im of first)fail(im);
 for(const p of catalog[c])for(let i=0;i<100;i++){assert.equal(read(p),null);polls++;}
 for(const p of catalog[c])assert.equal(requests(p).length,1,'Failed render lookup must not retry');
 preload(c);
 for(const [i,p]of catalog[c].entries()){assert.equal(requests(p).length,2,c+' explicit preparation must retry failed pose');assert.equal(first[i].src,'');assert.equal(read(p),null);}
 const before=images.length;preload(c);assert.equal(images.length,before,'Pending requests remain shared');
 for(const p of catalog[c]){const im=last(p);finish(im);assert.equal(read(p),im);recovered++;}
 preload(c);assert.equal(images.length,before,'Healthy requests remain shared');release(c);
 for(const p of catalog[c])assert.equal(last(p).src,'');
}
const p=catalog.KEN[0];preload('CHUNLI');for(const a of catalog.CHUNLI)finish(last(a));
preload('KEN');const broken=last(p);fail(broken);const before=images.length;
preload('CHUNLI');preload('RYU');assert.equal(images.length,before,'Character scope stays isolated');
for(let i=0;i<100;i++)assert.equal(read('/art/special-keyposes/ken/unknown.webp'),null);
assert.equal(images.length,before,'Lazy reads for an unavailable asset cannot retry failed peers');
preload('KEN');const retry=last(p);assert.notEqual(retry,broken);assert.equal(broken.src,'');fail(retry);
for(let i=0;i<100;i++)assert.equal(read(p),null);
preload('KEN');const again=last(p);assert.notEqual(again,retry);assert.equal(retry.src,'');
finish(retry);assert.equal(read(p),null,'Retired image completion cannot replace a pending retry');
finish(again);assert.equal(read(p),again);recovered++;
// Exercise the actual fallback renderer while HQ animation remains pending.
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');textures.setMode('hd');
const c=getCharacter('KEN'),f=new Fighter(c,'player',400,500,1,c.superArts[0]),move=specialMovesFor('KEN').primary;
f.startMove(move);f.moveFrame=move.startup;const draws=[];
const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
drawCombatFighter(ctx,f,1,0);assert(draws.some(a=>a[0]===again),'Recovered key pose must render during HQ fallback');
release('KEN');preload('KEN');const preparationOld=last(p);fail(preparationOld);
textures.preloadCharacter('KEN');const prepared=last(p);assert.notEqual(prepared,preparationOld);assert.equal(preparationOld.src,'');finish(prepared);assert.equal(read(p),prepared);recovered++;
release('KEN');finish(prepared);assert.equal(prepared.src,'');
const ImageClass=globalThis.Image;delete globalThis.Image;const n=images.length;preload('KEN');assert.equal(read(p),null);assert.equal(images.length,n);globalThis.Image=ImageClass;
preload('KEN');for(const a of catalog.KEN){finish(last(a));assert.equal(read(a),last(a));recovered++;}
release('KEN');release('CHUNLI');textures.setMode('lite');
console.log('SPECIAL_KEYPOSE_RETRY_PASS',{assets:6,recovered,renderPollsWithoutRetry:polls+200,pendingAndHealthyShared:true,scopeIsolation:true,repeatedFailureSafe:true,retiredCompletionSafe:true,realFallbackRender:true,characterPreparation:true,noImageSafe:true});
