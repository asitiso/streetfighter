import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f,alpha){let m=[1,0,0,1,0,0];const paints=[],stack=[],o={globalAlpha:1,filter:'none'};
 const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','fillRect'].includes(k))return()=>paints.push({kind:k,matrix:[...m]});return ({save(){stack.push({m:[...m],alpha:o.globalAlpha,filter:o.filter});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;o.filter=s.filter;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(im,...args){paints.push({kind:'image',asset:im.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});
 drawCombatFighter(ctx,f,alpha,.5);assert.equal(stack.length,0);assert(paints.length>0);return paints;
}
let cases=0,comparisons=0,stageRoutes=0;
for(const c of roster)for(const facing of [-1,1])for(const mode of ['hd','lite'])for(const [dx,dy]of [[6,0],[-5,3],[2,-4]]){
 textures.setMode('lite');textures.setMode(mode);textures.preloadCharacter(c.id);
 const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.x+=dx;f.y+=dy;f.airborne=true;f.jumpHeight=40;f.animationFrame=70;f.hp=400;f.superGauge=42;
 const current=[f.x,f.y,f.hp,f.superGauge,f.animationFrame];f.enterVictoryPose();
 const expected=draw(f,1);
 for(const alpha of [0,.1,.25,.5,.9,1]){assert.deepEqual(draw(f,alpha),expected,c.id+' '+mode+' victory body/shadow must stay anchored across redraw interpolation');comparisons++;}
 assert.deepEqual([f.previousX,f.previousY],[f.x,f.y]);assert.deepEqual([f.x,f.y,f.hp,f.superGauge,f.animationFrame],current);assert.equal(f.stateFrame,0);cases++;
}
const input={pressed:()=>false,held:k=>k==='right',released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}};
for(const c of roster)for(const stage of [1,2,3,4,5]){
 textures.setMode('lite');textures.setMode('hd');
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],stage);scene.enter();scene.introFrames=0;
 if(stage===5){scene.prepareFinalDuel();scene.phase='final-duel';}else{scene.prepareDuel();scene.phase='duel';}
 scene.world.enemy.hp=0;const startX=scene.world.player.x;scene.fixedUpdate(1/60,1);assert(scene.world.player.x>startX,'Winner moves on final combat tick');
 if(stage===5)for(let tick=0;tick<180;tick++)scene.fixedUpdate(1/60,2+tick);
 assert.equal(scene.phase,'clear');const f=scene.world.player,expected=draw(f,1);
 for(const alpha of [0,.2,.5,.8,1])assert.deepEqual(draw(f,alpha),expected,'Actual stage clear must hold player and shadow at final world position');
 scene.fixedUpdate(1/60,500);const next=draw(f,1);assert.deepEqual(draw(f,0),next);stageRoutes++;
}
textures.setMode('lite');console.log('VICTORY_POSITION_ANCHOR_PASS',{characters:10,cases,comparisons,stageRoutes,facings:2,qualityModes:2,worldPositionPreserved:true,resultStatePreserved:true,redrawStable:true});
