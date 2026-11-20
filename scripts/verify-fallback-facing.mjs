import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {combatSpritePose} from '../dist/assets/render/CombatSpriteProfiles.js';
import {attackSpriteSample} from '../dist/assets/render/AttackSpriteProfiles.js';
import {victimReactionSample} from '../dist/assets/render/VictimReactionProfiles.js';
import {normalFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('lite');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},rules=new CombatWorld(CHARACTERS[0],CHARACTERS[1],'duel').rules;
function render(f,time){let m=[1,0,0,1,0,0],stack=[],images=[];const o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push({m:[...m],alpha:o.globalAlpha});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(image,...args){images.push({asset:image.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,time);assert(images.length>0);return images;}
const failures=[];let bodies=0,echoes=0,directionChecks=0;
function near(actual,expected,label){if(Math.abs(actual-expected)>1e-8)failures.push(label+' '+actual+' expected '+expected);}
for(const c of CHARACTERS)for(const facing of[-1,1])for(const state of['idle','walk','jump','crouch','block','parry','hit','knockdown','ko','atlas-startup','atlas-recovery']){
 characterTextureManager.preloadCharacter(c.id);const f=new Fighter(c,'player',400,500,facing,c.superArts[0]),a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);let pose;
 if(state.startsWith('atlas-')){f.startMove(normalFor('hp',false,c.id));const phase=state.slice(6),valid=[];for(let frame=0;frame<f.currentMove.startup+f.currentMove.active+f.currentMove.recovery;frame++){f.moveFrame=frame;const p=attackSpriteSample(f);if(p.useAtlas&&p.phase===phase)valid.push({frame,p});}valid.sort((a,b)=>Math.abs(b.p.offsetX)-Math.abs(a.p.offsetX));assert(valid.length>0);f.moveFrame=valid[0].frame;f.stateFrame=f.moveFrame;pose=attackSpriteSample(f);}
 else{f.state=state;f.stateFrame=12;if(state==='walk')f.previousX=f.x-facing*3;if(state==='jump'){f.airborne=true;f.jumpHeight=72;f.jumpVelocity=0;}
  if(['block','parry','hit','knockdown','ko'].includes(state)){f.state='idle';if(state==='parry')f.parryWindow=6;if(state==='ko')f.hp=1;f.receiveHit(state==='knockdown'?throwMoveFor(c.id):normalFor('hp',false,c.id),a,state==='block');assert.equal(f.state,state);if(state==='hit')f.syncVisualHitSequence(1,1);}
  pose=combatSpritePose(f,f.animationFrame/60);
 }
 const images=render(f,.4),body=images.at(-1);assert(body.asset.includes(state.startsWith('atlas-')?'/attack-atlases/':'/combat-sprites/'));const label=c.id+' '+facing+' '+state;
 near(body.matrix[4],f.x+pose.offsetX,label+' bodyworldX');bodies++;
 if(['crouch','block','parry'].includes(state)){if(Math.sign(body.matrix[4]-f.x)!==-facing)failures.push(label+' must lean behind facing');directionChecks++;}
 if(state.startsWith('atlas-')){let index=0;if(pose.afterimage>.04)for(const i of[2,1]){near(images[index++].matrix[4],f.x+pose.offsetX-facing*i*(8+pose.smear*7),label+' atlas echo');echoes++;}if(pose.smear>.18){near(images[index++].matrix[4],f.x+pose.offsetX-facing*10*pose.smear,label+' atlas smear');echoes++;}assert.equal(index,images.length-1);}
 if(state==='walk')for(const[i,index]of[[2,0],[1,1]]){near(images[index].matrix[4],f.x+pose.offsetX-facing*3*i*1.9-facing*i*2.5,label+' motion echo');echoes++;}
 if(state==='hit'){const p=victimReactionSample(f);assert(p.echo>.08,'Exercise actual victim-echo branch');if(p.echo>.08)for(const[i,index]of[[2,0],[1,1]]){near(images[index].matrix[4],f.x+pose.offsetX+f.lastHitDirection*i*(6+p.echo*9),label+' victim echo');echoes++;}}
}
assert.deepEqual(failures,[],'Facing must not be applied twice to fallback world-space pose offsets');
console.log('FALLBACK_FACING_PASS',{bodies,echoes,directionChecks});
