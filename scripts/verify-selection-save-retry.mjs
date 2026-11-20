import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {CharacterSelectScene} from '../dist/assets/scenes/CharacterSelectScene.js';
import {SuperArtSelectScene} from '../dist/assets/scenes/SuperArtSelectScene.js';
const audio={unlock:()=>Promise.resolve(),playMenuMove(){},playUiConfirm(){}};
let cases=0;
for(const character of CHARACTERS) for(const kind of ['character','art']) for(const button of ['confirm','lp','mp','hp','start']) {
 let active=button,calls=0,reject;
 const pending=new Promise((_,r)=>reject=r);pending.catch(()=>{});
 const input={pressed:b=>b===active,touchPressed:b=>b===active};
 const confirm=value=>{calls++;assert.equal(kind==='character'?value.id:value.id,kind==='character'?character.id:2);return calls===1?pending:Promise.resolve();};
 const scene=kind==='character'?new CharacterSelectScene(input,audio,character.id,confirm):new SuperArtSelectScene(input,audio,character,2,confirm,()=>{});
 scene.enter();scene.fixedUpdate(1/60);scene.fixedUpdate(1/60);assert.equal(calls,1,'pending confirm deduplicated');
 reject(new Error('quota'));await Promise.resolve();await Promise.resolve();
 assert.equal(scene.transitioning,false,'failed save must unlock selection');assert.match(scene.errorMessage,/RETRY/);
 scene.fixedUpdate(1/60);assert.equal(calls,2,'fresh confirm retries preserved selection');assert.equal(scene.errorMessage,'');scene.exit();scene.destroy();cases++;
}
for(const kind of ['character','art']) for(const mode of ['sync','stale']) {
 let reject,calls=0;const pending=new Promise((_,r)=>reject=r);pending.catch(()=>{});
 const input={pressed:b=>b==='confirm',touchPressed:()=>false};
 const confirm=()=>{calls++;if(mode==='sync')throw Error('quota');return calls===1?pending:new Promise(()=>{});};
 const c=CHARACTERS[0],scene=kind==='character'?new CharacterSelectScene(input,audio,c.id,confirm):new SuperArtSelectScene(input,audio,c,1,confirm,()=>{});
 scene.enter();assert.doesNotThrow(()=>scene.fixedUpdate(1/60));
 if(mode==='sync')assert.equal(scene.transitioning,false);else{scene.exit();scene.enter();scene.fixedUpdate(1/60);reject(Error('old'));await Promise.resolve();await Promise.resolve();assert.equal(scene.transitioning,true);assert.equal(scene.errorMessage,'');}
 scene.destroy();cases++;
}
console.log(JSON.stringify({passed:true,cases}));
