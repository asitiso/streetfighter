import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {combatSpritePose} from '../dist/assets/render/CombatSpriteProfiles.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('low');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('lite');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},rules=new CombatWorld(CHARACTERS[0],CHARACTERS[1],'duel').rules;
function render(f,time){let m=[1,0,0,1,0,0],stack=[],images=[],translations=[],shadows=[];const o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push({m:[...m],alpha:o.globalAlpha});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;},translate(x,y){translations.push([x,y]);m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},ellipse(x,y,rx,ry){if(ry<16&&rx>40)shadows.push([m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);},drawImage(image,...args){images.push({asset:image.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,time);assert(images.length>0);return {body:images.at(-1),translations,shadows};}
const failures=[];let cases=0,heightChecks=0,shadowChecks=0;
for(const c of CHARACTERS)for(const facing of[-1,1])for(const reaction of['jump','air-hit','air-ko']){
 const w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player;f.facing=facing;characterTextureManager.preloadCharacter(c.id);
 w.update({...quiet,pressed:k=>k==='jump'},0);for(let tick=1;tick<=8;tick++)w.update(quiet,tick);assert(f.airborne&&f.jumpHeight>0);
 if(reaction!=='jump'){const a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);if(reaction==='air-ko')f.hp=1;f.receiveHit(normalFor('mp',false,c.id),a,false);assert.equal(f.state,reaction==='air-ko'?'ko':'hit');}
 f.jumpHeight=32;const low=render(f,0);assert(low.body.asset.includes('/combat-sprites/'));
 f.jumpHeight=72;const high=render(f,0);
 for(const [r,h]of[[low,32],[high,72]]){if(r.translations.filter(a=>a[0]===0&&a[1]===-h).length!==1)failures.push(c.id+' '+facing+' '+reaction+' missing exact world lift '+h);heightChecks++;assert(r.shadows.length>0);assert.equal(r.shadows[0][1],f.y+5*c.heightScale,'Shadow stays at its existing grounded origin');shadowChecks++;}
 const delta=low.body.matrix[5]-high.body.matrix[5];if(Math.abs(delta-40)>1e-8)failures.push(c.id+' '+facing+' '+reaction+'40px lift became '+delta);assert.deepEqual(low.body.matrix.slice(0,4),high.body.matrix.slice(0,4),'Frozen pose shape unchanged while probing independent world height');cases++;
}
assert.deepEqual(failures,[],'Gameplay jump height must bypass spring and apply once to every airborne base-sprite body');
let nativeArcs=0,nativeAirFrames=0;
for(const c of CHARACTERS)for(const facing of[-1,1]){
 const w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player;f.facing=facing;w.update({...quiet,pressed:k=>k==='jump'},0);let landed=false;
 for(let tick=1;tick<120;tick++){w.update(quiet,tick);const r=render(f,tick/60);assert(r.body.asset.includes('/combat-sprites/'));if(f.airborne)assert.equal(r.shadows[0][1],f.y+5*c.heightScale);
  if(f.airborne&&f.jumpHeight>0){assert.equal(r.translations.filter(a=>a[0]===0&&a[1]===-f.jumpHeight).length,1,'Each native airborne frame applies exactly one gameplay lift');nativeAirFrames++;}
  if(!f.airborne){assert.equal(f.jumpHeight,0);landed=true;break;}
 }
 assert(landed,'Native jump must return to ground');nativeArcs++;
}
let absoluteChecks=0;
for(const c of CHARACTERS)for(const facing of[-1,1])for(const reaction of['jump','air-hit','air-ko']){
 const w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player;f.facing=facing;w.update({...quiet,pressed:k=>k==='jump'},0);for(let tick=1;tick<=8;tick++)w.update(quiet,tick);
 if(reaction!=='jump'){const a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);if(reaction==='air-ko')f.hp=1;f.receiveHit(normalFor('mp',false,c.id),a,false);}
 const pose=combatSpritePose(f,f.animationFrame/60),actual=render(f,0);const expectedY=f.y+pose.offsetY-(f.state==='jump'?0:f.jumpHeight);
 assert(Math.abs(actual.body.matrix[5]-expectedY)<1e-8,'Fresh pose absolute Y must contain gameplay height exactly once');absoluteChecks++;
}
console.log('FALLBACK_JUMP_HEIGHT_PASS',{cases,heightChecks,shadowChecks,nativeArcs,nativeAirFrames,absoluteChecks});
