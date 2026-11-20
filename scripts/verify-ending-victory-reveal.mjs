import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor,animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {EndingScene} from '../dist/assets/scenes/EndingScene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
function frame(scene){const draws=[],stack=[],o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){draws.push({asset:im.src,alpha:o.globalAlpha,sourceX:args[0]});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});scene.drawHero(ctx,1);assert.equal(stack.length,0);return draws.at(-1);}
const quiet={pressed:()=>false,touchPressed:()=>false},audio={playStagePulse(){}};
function make(c,input=quiet,finish=()=>{}){return new EndingScene(input,audio,c,c.superArts[0],[],finish);}
let visibleFrames=0,repeatedDraws=0,sparseChecks=0;
for(const c of roster){
 textures.setMode('lite');textures.setMode('hd');textures.preloadCharacter(c.id);
 const scene=make(c),sequence=animationSequenceFor(c.id,'victory',true),seen=new Set();scene.enter();
 for(let tick=1;tick<=240;tick++){
  scene.fixedUpdate(1/60);const im=frame(scene);assert.equal(im.asset,sequence.asset);
  const index=im.sourceX/sequence.frameWidth;
  if(im.alpha>=1-1e-10)seen.add(index);
  const state=scene.hero.stateFrame;assert.deepEqual(frame(scene),im,'Repeated render must not advance victory');assert.equal(scene.hero.stateFrame,state);repeatedDraws++;
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7],c.id+' must show complete victory animation at full opacity');visibleFrames+=seen.size;assert.equal(scene.hero.animationFrame,scene.hero.stateFrame,'Ending clocks must advance together');
 assert.equal(frame(scene).sourceX,7*sequence.frameWidth,'Last victory pose stays held');
 const dense=make(c),sparse=make(c);dense.enter();sparse.enter();
 for(let tick=0;tick<180;tick++){dense.fixedUpdate(1/60);sparse.fixedUpdate(1/60);const expected=frame(dense);if(tick%6===5){assert.deepEqual(frame(sparse),expected,'Skipped draws must not change animation time');sparseChecks++;}}
}
textures.setMode('lite');const c=CHARACTERS[0],lite=make(c);lite.enter();
for(let tick=0;tick<90;tick++)lite.fixedUpdate(1/60);assert.equal(lite.hero.stateFrame,0,'LITE also holds initial pose during reveal');
for(let tick=0;tick<60;tick++)lite.fixedUpdate(1/60);assert(lite.hero.stateFrame>0);assert.equal(lite.hero.stateFrame,lite.hero.animationFrame);
let finished=0;const skip=make(c,{pressed:k=>k==='confirm',touchPressed:()=>false},()=>finished++);skip.enter();skip.fixedUpdate(1/60);assert.equal(finished,1,'Fresh confirm returns immediately');for(let i=0;i<410;i++)skip.fixedUpdate(1/60);assert.equal(finished,1,'Return dispatch remains unique');
console.log('ENDING_VICTORY_REVEAL_PASS',{characters:10,fullyVisibleAuthoredFrames:visibleFrames,repeatedDraws,sparseChecks,liteTiming:true,clocksSynchronized:true,finalPoseHeld:true,immediateReturn:true});
