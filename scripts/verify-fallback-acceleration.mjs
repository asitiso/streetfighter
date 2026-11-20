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
const failures=[];let pairs=0,steps=0,bodyDraws=0;
function geometry(f){const r=render(f,0);assert(r.asset.includes(f.state==='attack'?'/attack-atlases/':'/combat-sprites/'));const m=r.matrix;bodyDraws++;return {angle:Math.atan2(m[1]*f.facing,m[0]*f.facing),x:m[4]-f.x,y:m[5]-f.y,sx:Math.hypot(m[0],m[1]),sy:Math.hypot(m[2],m[3])};}
function near(a,b,label){if(Math.abs(a-b)>1e-8)failures.push(label+' '+a+' expected '+b);}
for(const c of CHARACTERS)for(const state of['crouch','idle','atlas']){
 characterTextureManager.preloadCharacter(c.id);const fs=[-1,1].map(facing=>{const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=state==='atlas'?'crouch':state;f.stateFrame=0;f.previousX=f.x-facing*(state==='idle'?4:0);if(state==='atlas'){render(f,0);f.startMove({...normalFor('hp',false,c.id),startup:60});f.moveFrame=15;f.stateFrame=15;}return f;});
 const stationary=fs.map(f=>Object.assign(Object.create(Object.getPrototypeOf(f)),f));
 fs.map(geometry);stationary.map(geometry);
 // Idle breathing has a shared artistic lean. Advance a stationary reference
 // on the same simulation clock so only acceleration/settle residuals are compared.
 for(const speed of[0,4,4,0,-3,0]){for(const f of fs){f.updatePlayer(state==='crouch'?{...quiet,held:k=>k==='down'}:quiet,rules);f.x+=f.facing*speed;}
  for(const f of stationary)f.updatePlayer(state==='crouch'?{...quiet,held:k=>k==='down'}:quiet,rules);
  const reference=stationary.map(geometry),baselineAngle=reference[0].angle+reference[1].angle;
  const [left,right]=fs.map(geometry),label=c.id+' '+state+' speed'+speed;
  near(left.angle+right.angle,baselineAngle,label+' acceleration/settle lean must mirror');near(left.x+right.x,0,label+' offset');near(left.y,right.y,label+' vertical');near(left.sx,right.sx,label+' xscale');near(left.sy,right.sy,label+' yscale');steps++;
 }
 pairs++;
}
assert.deepEqual(failures,[],'Signed world acceleration must not be multiplied by facing again');
console.log('FALLBACK_ACCELERATION_PASS',{pairs,steps,bodyDraws});
