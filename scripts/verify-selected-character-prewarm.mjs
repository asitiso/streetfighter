import assert from 'node:assert/strict';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {characterTextureManager} from '../dist/assets/render/CharacterTextureManager.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
const original=characterTextureManager.preloadCharacter;let cases=0;
try{for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const stage of [1,2,3,4,5])for(const replay of [false,true]){const events=[];let release;const gate=new Promise(r=>release=r);characterTextureManager.preloadCharacter=id=>events.push({type:'prewarm',id});const fake={};for(const n of [1,2,3,4,5])fake['startStage'+(n===1?'':n)]=async(...args)=>{events.push({type:'stage',n,args});await gate;};let finished=false;const promise=GameApp.prototype.startStageNumber.call(fake,stage,c,c.superArts[0],true,replay).then(()=>finished=true);assert.equal(events[0]?.type,'prewarm','Character preparation must start before stage dispatch');assert.equal(events[0].id,c.id);assert.equal(events[1]?.n,stage);assert.equal(events.length,2,'No extra preparation or stage dispatch');assert.equal(finished,false,'Stage request remains pending without blocking preparation');assert.equal(events[1].args[0],c);assert.equal(events[1].args[1],c.superArts[0]);if(stage===1){assert.equal(events[1].args[2],true);assert.equal(events[1].args[3],replay);}else assert.equal(events[1].args[2],replay);release();await promise;assert.equal(finished,true);cases++;}}finally{characterTextureManager.preloadCharacter=original;}
console.log(JSON.stringify({passed:true,cases,characters:10,stages:5,replayModes:2,pendingStageDoesNotDelayPreparation:true,argumentsPreserved:true}));

const {characterPortraitKey, unloadArtAsset} = await import('../dist/assets/render/ImageAssets.js');
const originalImage = globalThis.Image;
const requests = [];
globalThis.Image = class {
  set src(url) {
    if (url) requests.push(url);
  }
};
try {
  for (const id of ['RYU', 'KEN']) {
    const character = CHARACTERS.find(candidate => candidate.id === id);
    const portrait = characterPortraitKey(id);
    const url = `/art/portraits/${id.toLowerCase()}.webp`;
    for (const replay of [false, true]) {
      unloadArtAsset(portrait);
      requests.length = 0;
      let dispatched = false;
      const fake = {
        async startStage3() {
          dispatched = true;
          assert.equal(requests.filter(path => path.startsWith('/art/portraits/')).join(), url);
        },
      };
      await GameApp.prototype.startStageNumber.call(fake, 3, character, character.superArts[0], false, replay);
      assert(dispatched, 'An undecoded portrait cannot delay dispatch');
    }
    unloadArtAsset(portrait);
  }
} finally {
  if (originalImage === undefined) delete globalThis.Image;
  else globalThis.Image = originalImage;
}
console.log('SELECTED_STAGE_PORTRAIT_PREWARM_PASS');
