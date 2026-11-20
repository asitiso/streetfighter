import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('lite');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},rules=new CombatWorld(CHARACTERS[0],CHARACTERS[1],'duel').rules;
function render(f,time){let m=[1,0,0,1,0,0],stack=[],images=[];const o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push({m:[...m],alpha:o.globalAlpha});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(image,...args){images.push({asset:image.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,time);assert(images.length>0);return images.at(-1);}
const failures=[];let comparisons=0,repeatChecks=0,maxYDifference=0;
function seed(c,facing){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state='ko';f.stateFrame=0;characterTextureManager.preloadCharacter(c.id);render(f,0);/* Hold a time-independent completed body before injecting a last-tick event. */for(let tick=0;tick<64;tick++){f.updatePlayer(quiet,rules);render(f,0);}return f;}
for(const c of CHARACTERS)for(const facing of[-1,1])for(const event of['hit','block','parry','attack'])for(const gap of[1,2,3,4,5,6]){
 const dense=seed(c,facing),sparse=seed(c,facing);const a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);
 for(let tick=0;tick<gap;tick++){for(const f of[dense,sparse]){if(tick===gap-1){f.state='crouch';f.stateFrame=12;f.crouchAnimationFrame=5;}f.updatePlayer(event==='attack'&&tick===gap-1?{...quiet,pressed:k=>k==='hp'}:{...quiet,held:k=>k==='down'},rules);}if(tick<gap-1)render(dense,0);}
 for(const f of[dense,sparse]){
  if(event==='attack'){assert.equal(f.state,'attack');assert.equal(f.moveFrame,0);}
  else{if(event==='parry')f.parryWindow=6;assert.equal(f.receiveHit(normalFor('mp',false,c.id),a,event==='block'),event);if(event==='hit')f.syncVisualHitSequence(1,1);assert(f.stateFrame<0);}
 }
 const expected=render(dense,0),actual=render(sparse,0),error=Math.max(...actual.matrix.map((v,i)=>Math.abs(v-expected.matrix[i])));maxYDifference=Math.max(maxYDifference,Math.abs(actual.matrix[5]-expected.matrix[5]));if(error>1e-8)failures.push(c.id+' '+facing+' '+event+' gap'+gap+' error'+error);comparisons++;
 assert.deepEqual(render(sparse,.2),actual,'Extra draws after a new event must stay frozen');repeatChecks++;
}
console.log('LATE_POSE_TRANSFORM_DIFFERENCE',{comparisons,maxYDifference});assert.deepEqual(failures,[],'A last-tick reaction or new attack cannot be integrated through earlier missed ticks');
console.log('FALLBACK_POSE_AGE_PASS',{comparisons,repeatChecks,maxYDifference});
