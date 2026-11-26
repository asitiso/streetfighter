// V081: duels are best-of-3; fixtures start in the FINAL ROUND (1-1) so one KO decides the match.
import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor,animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {transitionPolishProfile} from '../dist/assets/render/FinalPolishProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const input={pressed:()=>false,held:()=>false,released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}};
function draw(scene){const images=[],stack=[],o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){images.push({asset:im.src,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,scene.world.player,1,scene.time);assert.equal(stack.length,0);return images.at(-1);}
function enterClear(c,stage,onClear){const scene=new Stage1Scene(input,audio,c,c.superArts[0],stage,onClear);scene.enter();scene.introFrames=0;
 if(stage===5){scene.prepareFinalDuel();scene.phase='final-duel';scene.playerRoundWins=scene.enemyRoundWins=1;}else{scene.prepareDuel();scene.phase='duel';scene.playerRoundWins=scene.enemyRoundWins=1;}
 scene.world.enemy.hp=0;scene.fixedUpdate(1/60,1);
 if(stage===5){assert.equal(scene.phase,'final-ko');for(let i=0;i<180;i++)scene.fixedUpdate(1/60,i+2);}
 assert.equal(scene.phase,'clear');assert.equal(scene.world.player.state,'victory');assert.equal(scene.world.player.stateFrame,0);return scene;
}
let cases=0,authoredFrames=0,repeatChecks=0;
for(const c of roster)for(const stage of [1,2,3,4,5]){
 textures.setMode('lite');textures.setMode('hd');let calls=0,result;
 const scene=enterClear(c,stage,r=>{calls++;result=r;}),f=scene.world.player,seq=animationSequenceFor(c.id,'victory',true),seen=new Set();
 const initialClock=f.animationFrame,worldTime=scene.world.time,hp=f.hp,gauge=f.superGauge,x=f.x,y=f.y,elapsed=scene.elapsedCombatFrames;
 for(let tick=0;tick<40;tick++){
  const im=draw(scene);assert.equal(im.asset,seq.asset);seen.add(im.args[0]/seq.frameWidth);assert.deepEqual(draw(scene),im,'Repeated draw does not advance victory');repeatChecks++;
  scene.fixedUpdate(1/60,1000+tick);
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7],c.id+' stage '+stage+' clear must play full victory animation');authoredFrames+=seen.size;
 assert.equal(f.stateFrame,40);assert.equal(f.animationFrame-initialClock,40);
 const profile=transitionPolishProfile(stage),dispatchAfter=stage===5?profile.finalClearFrames-profile.finalClearDispatchAt:profile.clearFrames-profile.clearDispatchAt;
 assert.equal(calls,0);for(let tick=40;tick<dispatchAfter-1;tick++)scene.fixedUpdate(1/60,2000+tick);assert.equal(calls,0);
 scene.fixedUpdate(1/60,3000);assert.equal(calls,1);assert.equal(result.stageId,stage);
 for(let tick=0;tick<60;tick++)scene.fixedUpdate(1/60,4000+tick);assert.equal(calls,1,'Clear callback stays one-shot');
 assert.equal(draw(scene).args[0],7*seq.frameWidth,'Final victory frame holds');
 assert.equal(scene.world.time,worldTime);assert.equal(scene.elapsedCombatFrames,elapsed);assert.deepEqual([f.hp,f.superGauge,f.x,f.y],[hp,gauge,x,y],'Victory cannot change combat results or physics');cases++;
}
textures.setMode('lite');const lite=enterClear(CHARACTERS[0],1,()=>{}),clock=lite.world.player.animationFrame;
for(let tick=0;tick<60;tick++)lite.fixedUpdate(1/60,tick);assert.equal(lite.world.player.stateFrame,60);assert.equal(lite.world.player.animationFrame-clock,60);
console.log('STAGE_CLEAR_VICTORY_CLOCK_PASS',{cases,characters:10,stages:5,authoredFrames,repeatChecks,liteClock:true,physicsFrozen:true,dispatchTimingUnchanged:true,oneShotCallback:true,finalPoseHeld:true});

function clearLabels(scene, compact) {
  const labels = new Map();
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'fillText' ? (text, x, y) => labels.set(text, y)
      : key === 'createLinearGradient' ? () => ({addColorStop() {}}) : () => {},
  });
  scene.drawStageClear(ctx, compact);
  return labels;
}
for (const [stage, replay, action] of [
  [1, false, 'TAP START FOR NEXT STAGE'],
  [5, false, 'TAP START FOR ENDING'],
  [5, true, 'TAP START FOR STAGE SELECT'],
]) {
  const scene = enterClear(CHARACTERS[0], stage, () => {});
  scene.replay = replay;
  scene.phaseFrames = 78;
  let labels = clearLabels(scene, true);
  assert.equal(labels.get(action), 235, 'Touch instruction sits above the score panel');
  assert(![...labels].some(([label]) => /TRANSFERRING TO ENDING|RETURNING TO STAGE SELECT/.test(label)));
  scene.clearAdvanceQueued = true;
  labels = clearLabels(scene, true);
  assert(labels.has('CONTINUE QUEUED') && !labels.has(action));
  scene.routeError = 'SAVE FAILED';
  assert(!clearLabels(scene, true).has('CONTINUE QUEUED'));
  assert(!clearLabels(scene, false).has(action));
  scene.destroy();
}
console.log('TOUCH_CLEAR_ACTION_PASS');
