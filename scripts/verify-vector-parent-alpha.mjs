import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.Image=class{complete=true;naturalWidth=0;naturalHeight=0;set src(v){this.url=v;if(v)this.onerror?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');textures.setMode('lite');
const {drawCombatFighter,drawCharacterPreview}=await import('../dist/assets/render/Visuals.js');
const roster=[...CHARACTERS,...BOSS_CHARACTERS];
function record(draw,alpha=1){
 const paints=[],stack=[],o={globalAlpha:alpha};
 const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','fillRect','strokeRect','fillText','strokeText'].includes(k))return()=>paints.push({kind:k,alpha:o.globalAlpha});return ({save(){stack.push(o.globalAlpha);},restore(){assert(stack.length);o.globalAlpha=stack.pop();},drawImage(){assert.fail('Must exercise vector fallback with unavailable image assets');},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});
 draw(ctx);assert.equal(o.globalAlpha,alpha,'Caller opacity restored');assert.equal(stack.length,0);assert(paints.length>0);return paints;
}
let comparisons=0,paintChecks=0,previewComparisons=0;
function compare(draw,label){
 const full=record(draw);
 for(const alpha of [0,.1,.5,1]){
  const faded=record(draw,alpha);assert.equal(faded.length,full.length,label+' paint count');
  faded.forEach((p,i)=>{assert.equal(p.kind,full[i].kind);assert(Math.abs(p.alpha-full[i].alpha*alpha)<1e-10,label+' paint '+i+' must respect parent alpha '+alpha);paintChecks++;});comparisons++;
 }
}
for(const c of roster)for(const facing of [-1,1]){
 textures.preloadCharacter(c.id);
 for(const state of ['idle','walk','jump','victory','parry','hit','block']){
  const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=state;f.stateFrame=12;if(state==='hit'){f.stateFrame=-8;f.hitAnimationDuration=18;}if(state==='walk')f.previousX=f.x-5;if(state==='jump'){f.airborne=true;f.jumpHeight=28;}
  compare(ctx=>drawCombatFighter(ctx,f,1,.6),c.id+' '+facing+' '+state);
 }
 const specials=specialMovesFor(c.id),moves=[...['lp','mp','hp','lk','mk','hk'].map(b=>normalFor(b,false,c.id)),...['primary','antiAir','mobility','super','exPrimary'].map(k=>specials[k]).filter(Boolean)];
 for(const move of moves)for(const phase of ['startup','active','recovery']){
  const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.startMove(move);
  f.moveFrame=phase==='startup'?Math.floor(move.startup/2):phase==='active'?move.startup:move.startup+move.active+Math.floor(move.recovery/2);f.stateFrame=f.moveFrame;
  compare(ctx=>drawCombatFighter(ctx,f,1,.6),c.id+' '+facing+' '+move.id+' '+phase);
 }
 for(const pose of ['idle','walk','signature','parry','victory']){compare(ctx=>drawCharacterPreview(ctx,c,400,500,1,facing,.6,pose),c.id+' preview '+pose);previewComparisons+=4;}
}
console.log('VECTOR_PARENT_ALPHA_PASS',{characters:10,facings:2,comparisons,paintChecks,previewComparisons,failedAssetFallback:true,callerStateRestored:true});
