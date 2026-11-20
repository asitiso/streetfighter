import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {animationTransitionSample} from '../dist/assets/render/AnimationTransitionProfiles.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('lite');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},rules=new CombatWorld(CHARACTERS[0],CHARACTERS[1],'duel').rules;
function render(f,time){let m=[1,0,0,1,0,0],stack=[],images=[];const o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push({m:[...m],alpha:o.globalAlpha});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(image,...args){images.push({asset:image.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,time);assert(images.length>0);return images.at(-1);}
const failures=[];let comparisons=0,maxYDifference=0,longGapChecks=0;
function seed(c,facing,path,entry=false){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);characterTextureManager.preloadCharacter(c.id);f.state=path==='atlas'?'crouch':'idle';render(f,0);
 if(path==='atlas'){f.startMove({...normalFor('hp',false,c.id),startup:60});f.moveFrame=f.stateFrame=15;}else{f.state='ko';f.stateFrame=0;}
 animationTransitionSample(f);if(!entry)render(f,0);return f;}
function advance(f,path){f.updatePlayer(quiet,rules);if(path==='atlas')f.moveFrame=f.stateFrame=15;}
for(const c of CHARACTERS)for(const facing of[-1,1])for(const path of['sprite','atlas'])for(const gap of[1,2,3,4,5,6])for(const entry of[false,true]){
 const dense=seed(c,facing,path,entry),sparse=seed(c,facing,path,entry);let expected;
 // A completed KO body and held atlas frame are time-independent targets.
 // Idle/crouch breathing now correctly advances on the local clock and cannot
 // serve as a constant-target fixture for missed-render spring integration.
 for(let tick=0;tick<gap;tick++){advance(dense,path);expected=render(dense,0);advance(sparse,path);}
 const actual=render(sparse,0);assert(actual.asset.includes(path==='atlas'?'/attack-atlases/':'/combat-sprites/'));
 const error=Math.max(...actual.matrix.map((v,i)=>Math.abs(v-expected.matrix[i])));maxYDifference=Math.max(maxYDifference,Math.abs(actual.matrix[5]-expected.matrix[5]));if(error>1e-8)failures.push(c.id+' '+facing+' '+path+' gap'+gap+' maxerror'+error);comparisons++;
}
for(const c of CHARACTERS)for(const facing of[-1,1])for(const path of['sprite','atlas']){
 const capped=seed(c,facing,path),long=seed(c,facing,path);for(let i=0;i<8;i++)advance(capped,path);for(let i=0;i<600;i++)advance(long,path);
 assert.deepEqual(render(long,0),render(capped,0),'Offscreen catchup stays bounded after the outer transition expires');longGapChecks++;
}
console.log('CATCHUP_TRANSFORM_DIFFERENCE',{comparisons,maxYDifference});assert.deepEqual(failures,[],'Held target smoothing must integrate elapsed simulation ticks consistently');
console.log('FALLBACK_CATCHUP_PASS',{comparisons,maxYDifference,longGapChecks});
