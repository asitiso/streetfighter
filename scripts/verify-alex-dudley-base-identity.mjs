import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ART_ASSET_PATHS, preloadArtAssets, unloadArtAsset } from '../dist/assets/render/ImageAssets.js';
import { ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';
import { characterTextureManager } from '../dist/assets/render/CharacterTextureManager.js';
const ids=['ALEX','DUDLEY'];
const keys=ids.flatMap(id=>['sprite-'+id.toLowerCase(),'sprite-'+id.toLowerCase()+'-hd']);
if(process.argv.includes('--record-controls')) console.log(JSON.stringify(Object.entries(ART_ASSET_PATHS).filter(([key])=>!keys.includes(key))));
else {
 let checks=0;const sources=[];
 for(const id of ids){
  const slug=id.toLowerCase(),lite='sprite-'+slug,hd=lite+'-hd';
  const paths=['/art/combat-sprites/'+slug+'-authored-v1.png','/art/combat-sprites-hd/'+slug+'-authored-v1.png'];
  const source=readFileSync(new URL('../art-source/throw-escape-motion-v1/'+slug+'/reference-idle.png',import.meta.url));
  for(const [index,key] of [lite,hd].entries()){
   assert.equal(ART_ASSET_PATHS[key],paths[index],id+' must use the authored original instead of the legacy placeholder');
   assert.deepEqual(readFileSync(new URL('../dist'+paths[index],import.meta.url)),source,'Approved source bytes preserved');
   assert(ASSET_GROUPS[index?'character-hd':'app-shell'].includes(paths[index]));
  }
  const sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
  assert(sw.includes(paths[0]));assert(!sw.includes(paths[1]),'HD remains deferred');
  let failNext=false;
  globalThis.Image=class {complete=true;naturalWidth=384;naturalHeight=448;set src(value){this.url=value;if(failNext){failNext=false;this.onerror?.();}else this.onload?.();}get src(){return this.url;}};
  for(const mode of ['lite','hd']){
   characterTextureManager.setMode(mode);preloadArtAssets([lite,hd]);
   const selection=characterTextureManager.combatSelection(id);
   assert.equal(selection.key,mode==='hd'?hd:lite);assert.equal(selection.image.src,paths[mode==='hd'?1:0]);checks++;
  }
  unloadArtAsset(hd);failNext=true;characterTextureManager.setMode('hd');
  assert.equal(characterTextureManager.combatSelection(id).key,lite);checks++;
  preloadArtAssets([hd]);assert.equal(characterTextureManager.combatSelection(id).key,hd);checks++;
  sources.push({id,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')});
 }
 console.log('ALEX_DUDLEY_BASE_IDENTITY_PASS',JSON.stringify({checks,sources,sourceBytesPreserved:true}));
}
