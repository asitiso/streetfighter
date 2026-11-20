import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ART_ASSET_PATHS,preloadArtAssets,unloadArtAsset} from '../dist/assets/render/ImageAssets.js';
import {ASSET_GROUPS} from '../dist/assets/core/AssetManager.js';
import {characterTextureManager} from '../dist/assets/render/CharacterTextureManager.js';
const ids=['RYU','KEN','CHUNLI','IBUKI'],keys=ids.flatMap(id=>['sprite-'+id.toLowerCase(),'sprite-'+id.toLowerCase()+'-hd']);
if(process.argv.includes('--record-controls')) console.log(JSON.stringify(Object.entries(ART_ASSET_PATHS).filter(([key])=>!keys.includes(key))));
else {
 let checks=0;const sources=[];
 for(const id of ids){
  const slug=id.toLowerCase(),lite='sprite-'+slug,hd=lite+'-hd',hq=lite+'-hq';
  const paths=['/art/combat-sprites/'+slug+'-authored-v1.png','/art/combat-sprites-hd/'+slug+'-authored-v1.png'];
  const source=readFileSync(new URL('../art-source/throw-escape-motion-v1/'+slug+'/reference-idle.png',import.meta.url));
  assert.deepEqual([source.readUInt32BE(16),source.readUInt32BE(20)],[384,448]);
  for(const [index,key] of [lite,hd].entries()){
   assert.equal(ART_ASSET_PATHS[key],paths[index],id+' fallback must match the authored attack identity');
   assert.deepEqual(readFileSync(new URL('../dist'+paths[index],import.meta.url)),source);
   assert(ASSET_GROUPS[index?'character-hd':'app-shell'].includes(paths[index]));
  }
  const sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
  assert(sw.includes(paths[0]));assert(!sw.includes(paths[1]));
  assert.equal(ART_ASSET_PATHS[hq],'/art/combat-sprites-hq/'+slug+'.webp');
  let hqMustFail=true,failNextHD=false;
  globalThis.Image=class {complete=true;naturalWidth=384;naturalHeight=448;set src(value){this.url=value;if(value.includes('/combat-sprites-hq/')&&hqMustFail)this.onerror?.();else if(value===paths[1]&&failNextHD){failNextHD=false;this.onerror?.();}else this.onload?.();}get src(){return this.url;}};
  for(const mode of ['lite','hd']){
   characterTextureManager.setMode(mode);preloadArtAssets([lite,hd]);
   const s=characterTextureManager.combatSelection(id);assert.equal(s.key,mode==='hd'?hd:lite);assert.equal(s.image.src,paths[mode==='hd'?1:0]);checks++;
  }
  unloadArtAsset(hd);failNextHD=true;characterTextureManager.setMode('hd');assert.equal(characterTextureManager.combatSelection(id).key,lite);checks++;
  preloadArtAssets([hd]);assert.equal(characterTextureManager.combatSelection(id).key,hd);checks++;
  unloadArtAsset(hq);hqMustFail=false;preloadArtAssets([hq]);assert.equal(characterTextureManager.combatSelection(id).key,hq);checks++;
  sources.push({id,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')});
 }
 console.log('HQ_ROSTER_BASE_IDENTITY_PASS',JSON.stringify({checks,sources,hqPriorityPreserved:true,sourceBytesPreserved:true}));
}
