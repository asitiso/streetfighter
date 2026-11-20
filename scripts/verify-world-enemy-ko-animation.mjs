import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],ken=CHARACTERS.find(c=>c.id==='KEN');
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');textures.setMode('lite');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const input={pressed:()=>false,held:()=>false,released:()=>false};
function filters(f){const paints=[],stack=[],o={globalAlpha:1,filter:'none'};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','drawImage'].includes(k))return()=>paints.push(o.filter);return ({save(){stack.push({...o});},restore(){Object.assign(o,stack.pop());},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert(paints.length>0);return paints;}

const state=f=>[f.state,f.stateFrame,f.animationFrame,f.hitStop,f.hitFlash,f.jumpHeight,f.jumpVelocity,f.airborne,f.x,f.y];
let cases=0,referenceTicks=0,freezeChecks=0,airLandings=0;
for(const c of roster)for(const mode of ['belt','duel'])for(const airborne of [false,true]){
 const w=new CombatWorld(ken,c,mode,ken.superArts[0]);w.replaceEnemies([{character:c,x:700,y:500},{character:ken,x:1120,y:500},{character:c,x:150,y:500}]);
 const [dead,live,inert]=w.enemies;live.aiCooldown=100000;inert.hp=0;dead.receiveHit({...normalFor('hp',false,'KEN'),damage:99999},w.player,false);assert.equal(dead.state,'ko');if(airborne){dead.airborne=true;dead.jumpHeight=55;dead.jumpVelocity=3;}
 const initial=dead.stateFrame,reference=Object.assign(Object.create(Object.getPrototypeOf(dead)),dead),frozen=state(dead),inertState=state(inert),liveClock=live.animationFrame;
 w.superFreezeFrames=3;for(let tick=0;tick<3;tick++){w.update(input,tick);assert.deepEqual(state(dead),frozen,'Super freeze pauses KO actors too');assert.equal(live.animationFrame,liveClock);freezeChecks++;}
 const hp=w.player.hp,gauge=w.player.superGauge,deadGauge=dead.superGauge;
 for(let tick=0;tick<120;tick++){w.update(input,1000+tick);reference.updateAi(w.player,w.rules);assert.equal(w.closestEnemyToPlayer(),live,'KO and dead-neutral actors remain excluded from targeting');assert.deepEqual(state(inert),inertState,'Dead entry without KO state cannot restart AI');}
 assert(dead.stateFrame>initial,c.id+' defeated enemy must advance KO while wave continues');assert.deepEqual(state(dead),state(reference));referenceTicks+=120;
 assert.equal(dead.hitFlash,0);assert(filters(dead).every(f=>f==='none'));assert.equal(live.animationFrame-liveClock,120,'Living enemy updates exactly once per tick');
 assert.deepEqual([w.player.hp,w.player.superGauge,dead.hp,dead.superGauge],[hp,gauge,0,deadGauge]);assert.equal(w.totalPlayerDamage,0);assert.equal(w.totalEnemyDamage,0);assert.equal(w.livingEnemies.length,1);
 if(airborne){assert.equal(dead.airborne,false);assert.equal(dead.jumpHeight,0);airLandings++;}cases++;
}
let stageCases=0;
for(const stage of [1,2,3,4,5]){
 const scene=new Stage1Scene(input,{playStagePulse(){},playHit(){},playParry(){}},ken,ken.superArts[0],stage);scene.enter();scene.introFrames=0;
 const dead=scene.world.enemies[0];dead.receiveHit({...normalFor('hp',false,'KEN'),damage:99999},scene.world.player,false);for(const e of scene.world.livingEnemies)e.aiCooldown=100000;
 const initial=dead.stateFrame;for(let tick=0;tick<120;tick++)scene.fixedUpdate(1/60,tick);assert.equal(scene.phase,'belt');assert.equal(scene.beltState,'fight');assert(dead.stateFrame>initial);assert.equal(dead.hitFlash,0);assert(scene.world.livingEnemies.length>0);stageCases++;
}
console.log('WORLD_ENEMY_KO_ANIMATION_PASS',{characters:10,cases,referenceTicks,freezeChecks,airLandings,stageCases,targetExclusion:true,livingUpdatedOnce:true,deadNeutralSkipped:true,noCombatRewards:true});
