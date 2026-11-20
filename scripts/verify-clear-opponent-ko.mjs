// V081: duels are best-of-3; fixtures start in the FINAL ROUND (1-1) so one KO decides the match.
import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {transitionPolishProfile} from '../dist/assets/render/FinalPolishProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],ken=CHARACTERS.find(c=>c.id==='KEN');
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const input={pressed:()=>false,held:()=>false,released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}};
function filters(f){const paints=[],stack=[],o={globalAlpha:1,filter:'none'};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','drawImage'].includes(k))return()=>paints.push(o.filter);return ({save(){stack.push({...o});},restore(){Object.assign(o,stack.pop());},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert(paints.length>0);return paints;}
const state=f=>[f.state,f.stateFrame,f.animationFrame,f.hitStop,f.hitFlash,f.jumpHeight,f.jumpVelocity,f.airborne];
let cases=0,referenceTicks=0,airLandings=0,campaignRoutes=0;
for(const mode of ['hd','lite'])for(const airborne of [false,true])for(const spec of [...roster.map(c=>({stage:1,opponent:c})),...[1,2,3,4,5].map(stage=>({stage}))]){
 textures.setMode('lite');textures.setMode(mode);let callbacks=0;
 const scene=new Stage1Scene(input,audio,ken,ken.superArts[0],spec.stage,()=>callbacks++);scene.enter();scene.introFrames=0;
 if(spec.stage===5){scene.prepareFinalDuel();scene.phase='final-duel';scene.playerRoundWins=scene.enemyRoundWins=1;}else{scene.prepareDuel();scene.phase='duel';scene.playerRoundWins=scene.enemyRoundWins=1;}
 if(spec.opponent){scene.world.replaceEnemies([{character:spec.opponent,x:880,y:500}]);scene.prepareCombatTextures();}
 const p=scene.world.player,e=scene.world.enemy;
 e.receiveHit({...normalFor('hp',false,p.character.id),damage:99999},p,false);assert.equal(e.state,'ko');if(airborne){e.airborne=true;e.jumpHeight=55;e.jumpVelocity=3;}
 scene.fixedUpdate(1/60,1);if(spec.stage===5)for(let tick=0;tick<180;tick++)scene.fixedUpdate(1/60,2+tick);
 assert.equal(scene.phase,'clear');const reference=Object.assign(Object.create(Object.getPrototypeOf(e)),e),initial=e.stateFrame,clock=p.animationFrame;
 const worldTime=scene.world.time,elapsed=scene.elapsedCombatFrames,result=[p.hp,p.superGauge,e.hp,e.superGauge,p.x,p.y,e.x,e.y];
 for(let tick=0;tick<120;tick++){scene.fixedUpdate(1/60,1000+tick);reference.updatePlayer(input,scene.world.rules);assert.equal(callbacks,0);}
 assert(e.stateFrame>initial,e.character.id+' opponent KO must progress during clear');assert.equal(e.hitFlash,0);assert.deepEqual(state(e),state(reference),'Opponent follows existing KO update');referenceTicks+=120;
 assert(filters(e).every(filter=>filter==='none'),'Final opponent draw clears hit flash');if(airborne){assert.equal(e.airborne,false);assert.equal(e.jumpHeight,0);airLandings++;}
 assert.equal(p.state,'victory');assert.equal(p.stateFrame,120);assert.equal(p.animationFrame-clock,120);assert.equal(scene.world.time,worldTime);assert.equal(scene.elapsedCombatFrames,elapsed);
 assert.deepEqual([p.hp,p.superGauge,e.hp,e.superGauge,p.x,p.y,e.x,e.y],result,'KO motion preserves combat results and world coordinates');
 const timing=transitionPolishProfile(spec.stage),dispatchAfter=spec.stage===5?timing.finalClearFrames-timing.finalClearDispatchAt:timing.clearFrames-timing.clearDispatchAt;
 for(let tick=120;tick<dispatchAfter-1;tick++)scene.fixedUpdate(1/60,2000+tick);assert.equal(callbacks,0);scene.fixedUpdate(1/60,3000);assert.equal(callbacks,1);for(let tick=0;tick<10;tick++)scene.fixedUpdate(1/60,4000+tick);assert.equal(callbacks,1);
 if(!spec.opponent)campaignRoutes++;cases++;
}
textures.setMode('lite');console.log('CLEAR_OPPONENT_KO_PASS',{opponentTypes:10,cases,referenceTicks,airLandings,campaignRoutes,qualityModes:2,playerVictoryClockPreserved:true,resultsFrozen:true,dispatchTimingUnchanged:true});
