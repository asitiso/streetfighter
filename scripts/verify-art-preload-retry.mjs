import assert from 'node:assert/strict';
const images=[];globalThis.Image=class{complete=false;naturalWidth=0;naturalHeight=0;constructor(){images.push(this);}set src(v){this.url=v;}get src(){return this.url;}};
const {ART_ASSET_PATHS:paths,artImage,preloadArtAssets:preload,isArtAssetReady:ready,hasArtAssetFailed:failed,unloadArtAsset:unload}=await import('../dist/assets/render/ImageAssets.js');
const keys=Object.keys(paths);let recovered=0,polls=0;
function fail(im){im.complete=true;im.naturalWidth=0;im.naturalHeight=0;im.onerror?.();}
function finish(im){im.complete=true;im.naturalWidth=384;im.naturalHeight=448;im.onload?.();}
function retired(im){assert.equal(im.src,'');assert.equal(im.onload,null);assert.equal(im.onerror,null);}
for(const key of keys){
 const before=images.length;assert.equal(artImage(key),null);assert.equal(images.length,before+1);
 const old=images.at(-1);fail(old);assert(failed(key));assert(!ready(key));
 for(let i=0;i<100;i++){assert.equal(artImage(key),null);assert(failed(key));assert(!ready(key));polls++;}
 assert.equal(images.length,before+1,'Render reads must not retry failures');
 const late=old.onload;preload([key,key]);
 assert.equal(images.length,before+2,key+' explicit preparation must retry failed art once');
 const retry=images.at(-1);assert.notEqual(retry,old);retired(old);assert(!failed(key));
 late();assert(!ready(key),'Old load callback must not mark replacement ready');
 preload([key,key]);assert.equal(images.length,before+2,'Pending requests remain shared');
 finish(retry);assert(ready(key));assert.equal(artImage(key),retry);
 preload([key]);assert.equal(images.length,before+2,'Healthy image stays shared');recovered++;
 unload(key);retired(retry);assert(!ready(key));assert(!failed(key));
}
// Real screen preparation calls the same recovery path.
const {TitleScene}=await import('../dist/assets/scenes/TitleScene.js');
const title=new TitleScene({}, {unlock:()=>Promise.resolve(),startFrontendTheme(){}},[{enabled:true}]);
title.enter();const firstTitle=images.findLast(image=>image.src===paths['title-keyart']);assert(firstTitle);fail(firstTitle);const titleWarmCount=images.length;
title.enter();const nextTitle=images.findLast(image=>image.src===paths['title-keyart']);assert.equal(images.length,titleWarmCount+1,'Title reentry retries only failed art and shares pending portraits');assert.notEqual(nextTitle,firstTitle);retired(firstTitle);finish(nextTitle);assert(ready('title-keyart'));recovered++;
artImage('ending-keyart');const other=images.at(-1);fail(other);
preload(['title-keyart']);assert.equal(images.at(-1),other,'Unrelated preload must not retry failed keys');
preload(['ending-keyart']);const retry=images.at(-1);retired(other);fail(retry);
preload(['ending-keyart']);const again=images.at(-1);assert.notEqual(again,retry);retired(retry);
const lateLoad=again.onload;unload('ending-keyart');retired(again);finish(again);lateLoad();assert(!ready('ending-keyart'),'Released late callback must not revive art');
unload('title-keyart');
const ImageClass=globalThis.Image;delete globalThis.Image;preload(['stage-1']);assert.equal(artImage('stage-1'),null);assert(!failed('stage-1'));globalThis.Image=ImageClass;
preload(['stage-1']);finish(images.at(-1));assert(ready('stage-1'));recovered++;unload('stage-1');
for(const key of keys)assert(!ready(key));
console.log('ART_PRELOAD_RETRY_PASS',{artKeys:keys.length,recovered,renderPollsWithoutRetry:polls,titleReentry:true,pendingAndHealthyShared:true,scopeIsolation:true,repeatedFailureSafe:true,lateReleaseSafe:true,noImageSafe:true});
