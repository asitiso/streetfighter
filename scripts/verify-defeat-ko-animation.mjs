import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS];
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const input={pressed:k=>k==='confirm',held:()=>false,released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}};
function filters(f){const paints=[],stack=[],o={globalAlpha:1,filter:'none'};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','drawImage'].includes(k))return()=>paints.push(o.filter);return ({save(){stack.push({...o});},restore(){Object.assign(o,stack.pop());},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert(paints.length>0);return paints;}
const snapshot=f=>[f.state,f.stateFrame,f.animationFrame,f.hitStop,f.hitFlash,f.jumpHeight,f.jumpVelocity,f.airborne,f.throwSyncFrames,f.superVictimFrames];
let cases=0,referenceTicks=0,airLandings=0,doubleKOs=0;
for(const c of roster)for(const mode of ['hd','lite'])for(const kind of ['ground','air','double-ko']){
 textures.setMode('lite');textures.setMode(mode);let callbacks=0;const scene=new Stage1Scene(input,audio,c,c.superArts[0],1,undefined,()=>callbacks++);scene.enter();scene.introFrames=0;scene.prepareDuel();scene.phase='duel';
 const f=scene.world.player,e=scene.world.enemy;e.aiCooldown=1000;
 f.receiveHit({...normalFor('hp',false,e.character.id),damage:99999},e,false);assert.equal(f.state,'ko');assert(f.hitFlash>0);
 if(kind==='air'){f.airborne=true;f.jumpHeight=55;f.jumpVelocity=3;}
 if(kind==='double-ko')e.receiveHit({...normalFor('hp',false,c.id),damage:99999},f,false);
 scene.fixedUpdate(1/60,1);assert.equal(scene.phase,'defeat');assert.equal(scene.defeatFrames,120);
 const initial=f.stateFrame,refs=[f,...scene.world.enemies].filter(actor=>actor.state==='ko').map(actor=>({actor,reference:Object.assign(Object.create(Object.getPrototypeOf(actor)),actor)}));
 const hp=f.hp,gauge=f.superGauge,worldTime=scene.world.time,elapsed=scene.elapsedCombatFrames,enemyBefore=[e.x,e.y,e.hp,e.superGauge];
 for(let tick=0;tick<120;tick++){scene.fixedUpdate(1/60,1000+tick);for(const {reference}of refs)reference.updatePlayer(input,scene.world.rules);assert.equal(callbacks,0,'Retry delay must remain intact');}
 assert(f.stateFrame>initial,c.id+' defeat must advance KO animation');assert.equal(f.hitFlash,0,c.id+' defeat flash must expire');
 for(const {actor,reference}of refs){assert.deepEqual(snapshot(actor),snapshot(reference),'Defeat uses same KO physics/clock/hitstop as existing fighter update');referenceTicks+=120;}
 assert(filters(f).every(filter=>filter==='none'),'Final KO render must not retain hit flash');
 if(kind==='air'){assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);airLandings++;}
 if(kind==='double-ko'){assert.equal(scene.defeatReason,'double-ko');assert.equal(e.hitFlash,0);doubleKOs++;}else assert.deepEqual([e.x,e.y,e.hp,e.superGauge],enemyBefore,'Living enemies stay frozen');
 assert.equal(scene.world.time,worldTime);assert.equal(scene.elapsedCombatFrames,elapsed);assert.deepEqual([f.hp,f.superGauge],[hp,gauge],'Defeat animation cannot change combat results');
 scene.fixedUpdate(1/60,2000);assert.equal(callbacks,1);for(let tick=0;tick<5;tick++)scene.fixedUpdate(1/60,3000+tick);assert.equal(callbacks,1);cases++;
}
textures.setMode('lite');let timeoutCallbacks=0;const timeout=new Stage1Scene(input,audio,CHARACTERS[0],CHARACTERS[0].superArts[0],1,undefined,()=>timeoutCallbacks++);timeout.enter();timeout.introFrames=0;timeout.stageTime=.001;timeout.fixedUpdate(1/60,1);assert.equal(timeout.defeatReason,'time-over');assert.equal(timeout.defeatFrames,90);const state=snapshot(timeout.world.player);
for(let tick=0;tick<90;tick++)timeout.fixedUpdate(1/60,tick);assert.deepEqual(snapshot(timeout.world.player),state,'Timeout living player stays frozen');assert.equal(timeoutCallbacks,0);timeout.fixedUpdate(1/60,100);assert.equal(timeoutCallbacks,1);
console.log('DEFEAT_KO_ANIMATION_PASS',{characters:10,cases,referenceTicks,airLandings,doubleKOs,qualityModes:2,resultsFrozen:true,livingEnemiesFrozen:true,retryDelayUnchanged:true,timeoutUnchanged:true});
