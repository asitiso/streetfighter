import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {combatSpritePose} from '../dist/assets/render/CombatSpriteProfiles.js';
globalThis.Image=class{complete=true;naturalWidth=960;naturalHeight=896;set src(v){this.url=v;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f,alpha,time=0){let m=[1,0,0,1,0,0];const paints=[],stack=[],o={globalAlpha:1,filter:'none'};
 const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','fillRect'].includes(k))return()=>paints.push({kind:k,matrix:[...m]});return ({save(){stack.push({m:[...m],alpha:o.globalAlpha,filter:o.filter});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;o.filter=s.filter;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(im,...args){paints.push({kind:'image',asset:im.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});
 drawCombatFighter(ctx,f,alpha,time);assert.equal(stack.length,0);assert(paints.length>0);return paints;
}

const geometry=p=>[p.offsetX,p.offsetY,p.rotation,p.scaleX,p.scaleY,p.torsoTwist];
let progressChecks=0,holdChecks=0,renderChecks=0;
for(const c of CHARACTERS)for(const facing of [-1,1])for(const state of ['ko','knockdown']){
 const f=new Fighter(c,'enemy',700,500,facing,c.superArts[0]);f.state=state;const duration=state==='ko'?90:34;
 let lastAngle=-Infinity,lastDrop=-Infinity,changes=0;
 for(let frame=-duration;frame<=0;frame++){
  f.stateFrame=frame;const p=combatSpritePose(f,0);assert(p.useSprite);
  const angle=Math.abs(p.rotation);assert(angle>=lastAngle-1e-12,c.id+' '+state+' rotation must progress toward fallen pose without rewinding');assert(p.offsetY>=lastDrop-1e-12,'Fall height must not rewind');if(angle>lastAngle+1e-10)changes++;
  lastAngle=angle;lastDrop=p.offsetY;progressChecks++;
 }
 assert(changes>10,'Fall must animate over multiple simulation ticks');
 const final=geometry(combatSpritePose(f,0));
 for(const frame of [0,1,10,28,90,300])for(const time of [0,.25,1,5,100]){f.stateFrame=frame;assert.deepEqual(geometry(combatSpritePose(f,time)),final,'Completed '+state+' sprite must hold pose without idle breathing or rewind');holdChecks++;}
}
for(const c of CHARACTERS)for(const facing of [-1,1])for(const mode of ['lite','hd']){
 textures.setMode('lite');textures.setMode(mode);textures.preloadCharacter(c.id);
 const f=new Fighter(c,'enemy',700,500,facing,c.superArts[0]);f.state='ko';f.hp=0;f.stateFrame=0;
 const target=new Fighter(c,'player',360,500,1,c.superArts[0]),rules=new CombatWorld(c,c,'duel').rules,expected=draw(f,1,0);assert(expected.some(p=>p.asset?.includes('/combat-sprites')));
 for(let tick=1;tick<=120;tick++){f.updateAi(target,rules);const actual=draw(f,tick%2?.2:.8,tick/60);
  assert.equal(actual.length,expected.length);actual.forEach((p,i)=>{assert.equal(p.kind,expected[i].kind);assert.equal(p.asset,expected[i].asset);p.matrix.forEach((v,j)=>assert(Math.abs(v-expected[i].matrix[j])<1e-8,c.id+' '+mode+' settled KO body/shadow must stay stable'));});renderChecks++;
 }
}
textures.setMode('lite');console.log('KO_SPRITE_FINAL_HOLD_PASS',{characters:8,facings:2,progressChecks,holdChecks,renderChecks,qualityModes:2,monotonicFall:true,noIdleBreathing:true,finalPoseHeld:true});
