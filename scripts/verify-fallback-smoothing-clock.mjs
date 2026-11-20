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
const failures=[];let paths=0,repeats=0,freezes=0,reactions=0,superFreezes=0,repeatedHits=0,resumePairs=0;
for(const c of CHARACTERS)for(const facing of[-1,1])for(const path of['sprite','atlas']){
 const w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=f.previousX=400;characterTextureManager.preloadCharacter(c.id);render(f,0);
 if(path==='atlas'){f.startMove(normalFor('hp',false,c.id));for(let i=0;i<2;i++)f.updatePlayer(quiet,rules);}else{f.state='walk';f.stateFrame=6;f.updatePlayer({...quiet,held:k=>k==='right'},rules);}
 const first=render(f,1/60);assert(first.asset.includes(path==='atlas'?'/attack-atlases/':'/combat-sprites/'),'Exercise intended fallback path');
 for(let i=0;i<4;i++){const repeated=render(f,1/60);if(JSON.stringify(repeated)!==JSON.stringify(first))failures.push(c.id+' '+facing+' '+path+' duplicate');repeats++;}
 f.hitStop=3;f.updatePlayer(quiet,rules);const frozen=render(f,2/60);
 for(let tick=0;tick<2;tick++){f.updatePlayer(quiet,rules);const after=render(f,2/60+(tick+1)*.1);if(JSON.stringify(after)!==JSON.stringify(frozen))failures.push(c.id+' '+facing+' '+path+' hitstop');freezes++;}
 w.superFreezeFrames=3;for(let tick=0;tick<3;tick++){w.update(quiet,tick);if(JSON.stringify(render(f,.3+tick*.1))!==JSON.stringify(frozen))failures.push(c.id+' '+facing+' '+path+' superfreeze');superFreezes++;}
 const enemy=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);f.receiveHit(normalFor('mp',false,c.id),enemy,false);const hit=render(f,.5);assert.notDeepEqual(hit,frozen,'New reaction must invalidate frozen pose');assert(hit.asset.includes('/combat-sprites/'));assert.notDeepEqual(hit.matrix.slice(0,4),frozen.matrix.slice(0,4),'Reaction must refresh the cached linear transform, independently of world pushback');reactions++;
 enemy.facing=facing;f.receiveHit(normalFor('mp',false,c.id),enemy,false);const secondHit=render(f,.6);if(JSON.stringify(secondHit.matrix.slice(0,4))===JSON.stringify(hit.matrix.slice(0,4)))failures.push(c.id+' '+facing+' '+path+' same-state new hit direction');repeatedHits++;paths++;
}
for(const c of CHARACTERS)for(const facing of[-1,1]){
 function atlas(){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);render(f,0);f.startMove(normalFor('hp',false,c.id));for(let i=0;i<2;i++)f.updatePlayer(quiet,rules);render(f,1/60);return f;}
 const normal=atlas(),paused=atlas();render(paused,100);normal.updatePlayer(quiet,rules);paused.updatePlayer(quiet,rules);assert.deepEqual(render(paused,100+1/60),render(normal,2/60),'Wall pause must not become extra spring integration on resume');resumePairs++;
}
assert.deepEqual(failures,[],'Repeated/frozen simulation frames must preserve fallback body geometry');
console.log('FALLBACK_SMOOTHING_CLOCK_PASS',{paths,repeats,freezes,superFreezes,reactions,repeatedHits,resumePairs});
