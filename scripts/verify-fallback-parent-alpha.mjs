import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {EndingScene} from '../dist/assets/scenes/EndingScene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
let hqReady=false;
globalThis.Image=class{set src(v){this.url=v;this.complete=!v.includes('/animation-hq/')||hqReady;const s=seqs.get(v);this.naturalWidth=this.complete?(s?s.frameWidth*s.frameCount:960):0;this.naturalHeight=s?s.frameHeight:896;if(v&&this.complete)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
let currentCase='ending';
function record(draw,parentAlpha=1){
 const images=[],stack=[],o={globalAlpha:parentAlpha};
 const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(image,...args){images.push({asset:image.src,alpha:o.globalAlpha,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});
 draw(ctx);assert.equal(o.globalAlpha,parentAlpha,'Drawing restores caller alpha');assert(images.length>0,currentCase+' must exercise an image path');return images;
}
const quiet={pressed:()=>false,touchPressed:()=>false};
textures.setMode('lite');
let endings=0;
for(const c of CHARACTERS){
 const scene=new EndingScene(quiet,{playStagePulse(){}},c,c.superArts[0],[],()=>{});scene.enter();
 for(const seconds of [0,.4,.55,.8,1.1,1.65,2]){
  scene.time=seconds;scene.hero.stateFrame=Math.floor(seconds*60);
  const expected=Math.min(1,Math.max(0,(seconds-.55)/1.1));
  const actual=record(ctx=>scene.drawHero(ctx,1));
  const full=record(ctx=>drawCombatFighter(ctx,scene.hero,1,seconds));
  assert.equal(actual.length,full.length);
  actual.forEach((im,i)=>assert(Math.abs(im.alpha-full[i].alpha*expected)<1e-10,c.id+' ending fallback must respect parent reveal alpha at '+seconds));endings++;
 }
}
let comparisons=0,echoLayers=0;
for(const c of CHARACTERS)for(const facing of [-1,1])for(const mode of ['lite','hd'])for(const state of ['idle','victory','walk','jump','hit','attack']){
 currentCase=c.id+' '+facing+' '+mode+' '+state;
 textures.setMode('lite');textures.setMode(mode);textures.preloadCharacter(c.id);
 const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=state;f.stateFrame=14;
 if(state==='walk'||state==='jump'){f.previousX=f.x-5;f.airborne=state==='jump';f.jumpHeight=state==='jump'?20:0;}
 if(state==='attack'){f.startMove(normalFor('hp',false,c.id));f.moveFrame=2;f.stateFrame=f.moveFrame;}
 if(state==='hit'){f.stateFrame=-8;f.hitAnimationDuration=18;f.lastHitPower=180;f.lastHitDirection=facing;}
 const full=record(ctx=>drawCombatFighter(ctx,f,1,.5));
 assert(full.at(-1).asset.includes(state==='attack'?'/attack-atlases':'/combat-sprites'),'Exercise expected fallback image path');
 for(const alpha of [0,.1,.5,1]){
  const actual=record(ctx=>drawCombatFighter(ctx,f,1,.5),alpha);assert.equal(actual.length,full.length);
  actual.forEach((im,i)=>{assert.equal(im.asset,full[i].asset);assert(Math.abs(im.alpha-full[i].alpha*alpha)<1e-10,c.id+' '+state+' '+mode+' layer '+i+' must multiply parent alpha');});comparisons++;echoLayers+=Math.max(0,actual.length-1);
 }
}
hqReady=true;let hqCases=0;
for(const c of roster){textures.setMode('lite');textures.setMode('hd');textures.preloadCharacter(c.id);const f=new Fighter(c,'player',400,500,1,c.superArts[0]);f.enterVictoryPose();
 const full=record(ctx=>drawCombatFighter(ctx,f,1,0));assert(full.at(-1).asset.includes('/animation-hq/'));
 const faded=record(ctx=>drawCombatFighter(ctx,f,1,0),.25);assert.equal(faded.at(-1).alpha,full.at(-1).alpha*.25);hqCases++;}
textures.setMode('lite');console.log('FALLBACK_PARENT_ALPHA_PASS',{endingRevealChecks:endings,comparisons,echoLayers,hqCases,states:6,facings:2,qualityModes:2,callerStateRestored:true});
