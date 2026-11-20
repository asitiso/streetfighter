import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {throwMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {motionClipForFighter} from '../dist/assets/render/AnimationPoseLibrary.js';
import {characterTextureManager} from '../dist/assets/render/CharacterTextureManager.js';
import {animationTextureManager} from '../dist/assets/render/AnimationTextureManager.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],sizes=new Map(roster.flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,[s.frameCount*s.frameWidth,s.frameHeight]]));
globalThis.Image=class{complete=true;set src(v){this.url=v;if(!v)return;[this.naturalWidth,this.naturalHeight]=sizes.get(v)??[960,896];this.onload?.();}get src(){return this.url;}};
const q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];let neutralCases=0,neutralDraws=0,freezeChecks=0,actionCases=0,poseEvolutionCases=0,readyBitmapControls=0;
function render(f,time=0){const calls=[],o={globalAlpha:1,imageSmoothingEnabled:true,imageSmoothingQuality:'low'},ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return(...a)=>{calls.push([k,...a.map(v=>typeof v==='object'?(v?.src??'gradient'):typeof v==='number'&&v===0?0:v)]);if(k==='createRadialGradient'||k==='createLinearGradient')return{addColorStop(...a){calls.push(['stop',...a]);}};};},set(o,k,v){o[k]=v;calls.push(['set',k,typeof v==='object'?'gradient':typeof v==='number'&&v===0?0:v]);return true;}});drawCombatFighter(ctx,f,1,time);return calls;}
function selected(f){return[f.x,f.y,f.previousX,f.previousY,f.state,f.stateFrame,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.throwEscapeFrames,f.airborne,f.jumpHeight,f.dashFrames,f.currentMove?.id??null,f.moveFrame];}
function fixture(c,facing,role){const w=new CombatWorld(c,c,'duel'),p=w.player,e=w.enemy;p.x=p.previousX=500;p.facing=facing;e.x=e.previousX=500+facing*45;e.y=p.y;e.facing=-facing;e.aiCooldown=9;p.startMove(throwMoveFor(c.id));p.moveFrame=p.currentMove.startup;w.resolveAttack(p,e,q);const f=role==='attacker'?p:e;assert.equal(f.throwEscapeFrames,12);assert.equal(f.hitStop,4);return{w,f};}
for(const quality of ['hd','lite'])for(const c of roster){characterTextureManager.setMode(quality);characterTextureManager.preloadCharacter(c.id);if(quality==='hd')animationTextureManager.preloadCharacter(c.id,'combat');
 for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const neutral of ['idle','walk','crouch']){
  const {w,f}=fixture(c,facing,role),first=render(f);if(!recording && quality==='hd') assert(first.some(v=>v[0]==='drawImage' && v[1]==='/art/throw-escape-v1/'+c.id.toLowerCase()+'.webp'),'Authored escape bitmap must replace idle');
  for(let t=0;t<4;t++){f.updatePlayer(q,w.rules);if(!recording)assert.deepEqual(render(f,t+1),first,'Escape geometry freezes during all hitstop ticks');freezeChecks++;}
  const phases=new Set();for(let t=0;t<12;t++){const draw=render(f,t*.25);if(!recording && quality==='hd'){ const sample=animationSequenceSample(f,0);assert.equal(sample.sequence.kind,'throw-escape');assert.equal(sample.frame,Math.floor(t/2));assert(draw.some(v=>v[0]==='drawImage' && v[1]===sample.sequence.asset && v[2]===Math.floor(t/2)*384)); }assert.equal(motionClipForFighter(f,0).clip,'throwEscape');assert.equal(f.canBeThrown(),false);phases.add(quality==='hd'?animationSequenceSample(f,0).frame:JSON.stringify(draw));records.push({quality,id:c.id,facing,role,neutral,tick:t,fighter:selected(f),clip:motionClipForFighter(f,0)});f.updatePlayer({...q,held:k=>neutral==='walk'?k===(f.facing===1?'right':'left'):neutral==='crouch'?k==='down':false},w.rules);neutralDraws++;}
  assert.equal(f.throwEscapeFrames,0);if(quality==='hd')assert.equal(phases.size,6,'Six original poses must play twice each');poseEvolutionCases++;const fresh=new Fighter(c,f.side,f.x,f.y,f.facing);Object.assign(fresh,f);fresh.throwEscapeFrames=0;const expected=render(fresh,0);if(expected.some(c=>c[0]==='drawImage'))readyBitmapControls++;if(!recording)assert.equal(render(f,0).some(c=>c[0]==='drawImage'),expected.some(c=>c[0]==='drawImage'),'Normal bitmap routing resumes after immunity expires');neutralCases++;
 }
 for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const action of ['attack','hit','block','parry','jump','dash']){
  const {w,f}=fixture(c,facing,role);while(f.hitStop)f.updatePlayer(q,w.rules);
  if(action==='attack')f.startMove(normalFor('hp',false,c.id));else if(action==='jump')f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);else if(action==='dash')f.startDash(f.facing);else{const owner=f===w.player?w.enemy:w.player;if(action==='parry')f.parryWindow=6;f.receiveHit(normalFor('mp',false,c.id),owner,action==='block');}
  assert(f.throwEscapeFrames>0);assert.notEqual(motionClipForFighter(f,0).clip,'throwEscape');const fresh=new Fighter(c,f.side,f.x,f.y,f.facing);Object.assign(fresh,f);fresh.throwEscapeFrames=0;const observed=render(f,0),expected=render(fresh,0);assert.deepEqual(observed,expected,quality+'/'+c.id+'/'+role+'/'+action+' new action geometry');actionCases++;
 }
}

if(!recording){
 let behavior='ready';const instances=[];
 globalThis.Image=class{complete=true;set src(v){this.url=v;if(!v)return;instances.push(this);[this.naturalWidth,this.naturalHeight]=sizes.get(v)??[960,896];if(v.startsWith('/art/throw-escape-v1/')){if(behavior==='loading'){this.complete=false;return;}if(behavior==='failed'){this.onerror?.();return;}if(behavior==='wrong-width')this.naturalWidth--;if(behavior==='wrong-height')this.naturalHeight--;}
 this.onload?.();}get src(){return this.url;}};
 let fallbackChecks=0,retryChecks=0,releaseChecks=0;
 for(const c of roster){characterTextureManager.setMode('hd');characterTextureManager.preloadCharacter(c.id);
  for(const state of ['loading','failed','wrong-width','wrong-height']){animationTextureManager.releaseCharacter(c.id);behavior=state;animationTextureManager.preloadCharacter(c.id,'combat');const {f}=fixture(c,1,'attacker');const drawn=render(f);assert(drawn.some(a=>a[0]==='drawImage'),'Existing bitmap fallback must stay visible '+c.id+'/'+state);assert(!drawn.some(a=>a[0]==='drawImage'&&a[1].startsWith('/art/throw-escape-v1/')),'Invalid or unavailable image must not render');fallbackChecks++;
   if(state==='failed'){const count=instances.length;render(f);render(f);assert.equal(instances.length,count,'Draw must not retry failed textures');behavior='ready';animationTextureManager.preloadCharacter(c.id,'combat');assert(render(f).some(a=>a[0]==='drawImage'&&a[1].startsWith('/art/throw-escape-v1/')));retryChecks++;}
  }
  const before=instances.filter(im=>im.src.startsWith('/art/throw-escape-v1/'));animationTextureManager.releaseCharacter(c.id);assert.equal(animationTextureManager.readyCount(c.id),0);assert(before.every(im=>im.src===''));releaseChecks++;
  behavior='ready';animationTextureManager.preloadCharacter(c.id,'movement');assert(!instances.some(im=>im.src==='/art/throw-escape-v1/'+c.id.toLowerCase()+'.webp'),'Menu movement preload excludes supplemental strip');animationTextureManager.preloadCharacter(c.id,'combat');assert(render(fixture(c,-1,'victim').f).some(a=>a[0]==='drawImage'&&a[1].startsWith('/art/throw-escape-v1/')));animationTextureManager.releaseCharacter(c.id);
 }
 console.log('THROW_ESCAPE_LIFECYCLE_PASS',{fallbackChecks,retryChecks,releaseChecks});
}

if(recording)console.log(JSON.stringify(records));else console.log('THROW_ESCAPE_RENDER_PRIORITY_PASS',{neutralCases,neutralDraws,freezeChecks,actionCases,poseEvolutionCases,readyBitmapControls,characters:roster.length});
