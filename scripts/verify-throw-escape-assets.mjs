import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {ASSET_GROUPS,THROW_ESCAPE_ASSETS} from '../dist/assets/core/AssetManager.js';
const manifest=JSON.parse(readFileSync(new URL('../art-source/throw-escape-motion-v1/manifest.json',import.meta.url)));
assert.equal(manifest.characters.length,10);assert.equal(manifest.totalFrames,60);
for(const c of manifest.characters){
 for(const [file,key] of [['generated-sheet-v1.png','sourceSHA256'],['reference-idle.png','referenceSHA256'],['generation-prompt.txt','promptSHA256']])assert.equal(createHash('sha256').update(readFileSync(new URL('../art-source/throw-escape-motion-v1/'+c.character+'/'+file,import.meta.url))).digest('hex'),c[key]);
 const seq=animationSequenceFor(c.character.toUpperCase(),'throw-escape');assert(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full');
 assert.equal(seq.frameCount,6);assert.equal(seq.frameWidth,384);assert.equal(seq.frameHeight,448);assert.equal(seq.loop,false);assert.equal(seq.timing,'linear');
 const bytes=readFileSync(new URL('../public'+seq.asset,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),c.runtimeSHA256);assert.equal(bytes.length,c.bytes);assert(c.bytes<=600000);assert.equal(new Set(c.frameHashes).size,6);
 for(const group of ['character-hq','stage-1','stage-2','stage-3','stage-4','stage-5'])assert(ASSET_GROUPS[group].includes(seq.asset),group+' missing '+seq.asset);
}
assert.equal(THROW_ESCAPE_ASSETS.length,10);assert.equal(manifest.decodedBytes,41287680);assert(manifest.totalBytes<=6000000);
console.log('THROW_ESCAPE_ASSETS_PASS',manifest.totalFrames,manifest.totalBytes);
