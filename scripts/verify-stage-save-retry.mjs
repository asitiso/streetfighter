import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
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
console.log(JSON.stringify({passed:true,cases}));
