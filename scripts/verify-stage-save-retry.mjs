import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {transitionPolishProfile} from '../dist/assets/render/FinalPolishProfiles.js';
const audio={playStagePulse(){},playHit(){},playParry(){}};
let cases=0;
for(const c of CHARACTERS)for(const stage of [1,2,3,4,5])for(const phase of ['clear','defeat']) {
 let button=phase==='defeat',calls=0,reject,firstResult;
 const pending=new Promise((_,r)=>reject=r);pending.catch(()=>{});
 const input={pressed:k=>button&&k==='confirm',held:()=>false,released:()=>false};
 const callback=result=>{calls++;if(result){if(firstResult)assert.deepEqual(result,firstResult);else firstResult=result;}return calls===1?pending:Promise.resolve();};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],stage,callback,callback);scene.introFrames=0;scene.phase=phase;scene.phaseFrames=0;scene.defeatFrames=0;
 const state=[scene.world.player.hp,scene.world.player.superGauge,scene.elapsedCombatFrames];
 scene.fixedUpdate(1/60,1);scene.fixedUpdate(1/60,2);assert.equal(calls,1);
 reject(Error('quota'));await Promise.resolve();await Promise.resolve();
 assert.equal(phase==='clear'?scene.clearDispatched:scene.defeatDispatched,false,'failed transition must unlock');assert.match(scene.routeError,/RETRY/);
 button=false;for(let i=0;i<8;i++)scene.fixedUpdate(1/60,3+i);assert.equal(calls,1,'no automatic write storm');
 button=true;scene.fixedUpdate(1/60,12);assert.equal(calls,2);assert.equal(scene.routeError,'');scene.fixedUpdate(1/60,13);assert.equal(calls,2);
 assert.deepEqual([scene.world.player.hp,scene.world.player.superGauge,scene.elapsedCombatFrames],state);scene.destroy();cases++;
}
for(const phase of ['clear','defeat']){
 const c=CHARACTERS[0],input={pressed:()=>true,held:()=>false,released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],1,()=>{throw Error('quota')},()=>{throw Error('quota')});scene.introFrames=0;scene.phase=phase;scene.phaseFrames=0;scene.defeatFrames=0;
 assert.doesNotThrow(()=>scene.fixedUpdate(1/60,1));assert.match(scene.routeError,/RETRY/);scene.destroy();cases++;
}
for(const phase of ['clear','defeat']) {
 let reject;const pending=new Promise((_,r)=>reject=r);pending.catch(()=>{});
 const c=CHARACTERS[0],input={pressed:()=>true,held:()=>false,released:()=>false};
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],1,()=>pending,()=>pending);scene.introFrames=0;scene.phase=phase;scene.phaseFrames=0;scene.defeatFrames=0;
 scene.fixedUpdate(1/60,1);scene.exit();reject(Error('late quota'));await Promise.resolve();await Promise.resolve();assert.equal(scene.routeError,'');assert.equal(phase==='clear'?scene.clearDispatched:scene.defeatDispatched,true);scene.destroy();cases++;
}
{
 const c=CHARACTERS[0],input={pressed:()=>false,held:()=>false,released:()=>false},scene=new Stage1Scene(input,audio,c,c.superArts[0],5);
 const texts=[],ctx=new Proxy({globalCompositeOperation:'source-over'},{get:(o,k)=>o[k]??(k==='fillText'?text=>texts.push(text):k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{})});
 scene.phase='clear';scene.phaseFrames=0;scene.drawStageClear(ctx);assert(texts.some(t=>t.includes('TRANSFERRING TO ENDING')));
 texts.length=0;scene.routeError='SAVE FAILED • PRESS START / ENTER / ATTACK TO RETRY';scene.drawStageClear(ctx);assert(!texts.some(t=>t.includes('TRANSFERRING TO ENDING')),'failed save must not claim ending transfer');scene.destroy();cases++;
}
for (const stage of [1, 3, 5]) for (const advance of ['start', 'confirm']) {
 let pressed = '', calls = 0, reject;
 const pending = new Promise((_, fail) => { reject = fail; });
 const player = CHARACTERS[0];
 const input = { pressed: action => action === pressed, held: () => false, released: () => false };
 const profile = transitionPolishProfile(stage);
 const scene = new Stage1Scene(input, audio, player, player.superArts[0], stage, () => {
   calls++;
   return calls === 1 ? pending : Promise.resolve();
 });
 scene.phase = 'clear';
 scene.introFrames = 0;
 scene.phaseFrames = stage === 5 ? profile.finalClearFrames : profile.clearFrames;
 let tick = 0;
 const step = (button = '') => { pressed = button; scene.fixedUpdate(1 / 60, ++tick); };
 step('hp');
 for (let i = 1; i < 61; i++) step();
 assert.equal(calls, 0, 'A combat attack cannot skip the clear screen');
 step(advance);
 assert.equal(calls, 1, 'START or Enter after the reveal must dispatch at once');
 step(advance);
 assert.equal(calls, 1, 'Repeated confirm must not submit another save');
 reject(Error('quota'));
 await Promise.resolve();
 await Promise.resolve();
 assert.match(scene.routeError, /RETRY/);
 step();
 assert.equal(calls, 1, 'An early save failure must wait for a fresh retry');
 step(advance);
 assert.equal(calls, 2, 'A fresh press must retry after a failed early clear');
 scene.destroy();
 cases++;
}
{
 const player = CHARACTERS[0];
 let pressed = true, calls = 0;
 const input = { pressed: action => pressed && action === 'start', held: () => false, released: () => false };
 const scene = new Stage1Scene(input, audio, player, player.superArts[0], 1, () => { calls++; });
 scene.phase = 'clear';
 scene.introFrames = 0;
 scene.phaseFrames = transitionPolishProfile(1).clearFrames;
 scene.fixedUpdate(1 / 60, 1);
 pressed = false;
 for (let tick = 2; tick < 60; tick++) scene.fixedUpdate(1 / 60, tick);
 assert.equal(calls, 0, 'The queued tap must give the score time to appear');
 scene.fixedUpdate(1 / 60, 60);
 assert.equal(calls, 1, 'A released early tap dispatches after the one-second reveal');
 scene.destroy();
 cases++;
}
console.log(JSON.stringify({passed:true,cases}));
