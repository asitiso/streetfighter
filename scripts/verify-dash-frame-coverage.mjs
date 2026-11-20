import assert from 'node:assert/strict';
import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{Fighter}from'../dist/assets/combat/Fighter.js';
import{normalFor}from'../dist/assets/combat/MoveLibrary.js';
import{animationSequencesFor}from'../dist/assets/render/AnimationSequenceLibrary.js';
import{animationSequenceSample as sample}from'../dist/assets/render/AnimationTimingMapper.js';
const characters=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false},assets=new Map(characters.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const{runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const{characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('hd');
const{animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const{drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const paints=[],stack=[],o={globalAlpha:.4};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){paints.push({src:im.src,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert.equal(o.globalAlpha,.4);return paints;}
function prepare(c,mode,facing,direction){const w=new CombatWorld(c,getCharacter('RYU'),mode),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;const action=direction===1?'right':'left',tap={...quiet,held:k=>k===action,pressed:k=>k===action};for(const[t,input]of[[0,tap],[1,quiet],[2,tap]])w.update(input,t);assert.equal(f.dashFrames,8);return{w,f,t:3};}
let cases=0,draws=0,freezeChecks=0,interruptions=0;
for(const c of characters){characterTextureManager.focusCharacter(c.id);characterTextureManager.preloadCharacter(c.id);animationTextureManager.preloadCharacter(c.id,'combat');
 for(const mode of['duel','belt'])for(const facing of[-1,1])for(const direction of[-1,1]){const kind=direction===facing?'dash':'dash-back';
  for(const freeze of[false,true]){const run=prepare(c,mode,facing,direction),{w,f}=run;const hp=f.hp,gauge=f.superGauge,frames=[],timers=[];let prev=-1;
   while(f.dashFrames>0){const s=sample(f,0);assert.equal(s?.sequence.kind,kind);assert.equal(s.sequence.facingRelativeDirection,direction===facing?'forward':'backward');assert(s.frame>=prev);prev=s.frame;frames.push(s.frame);timers.push(f.dashFrames);const paints=draw(f);assert(paints.some(p=>p.src===s.sequence.asset&&p.args[0]===s.frame*s.sequence.frameWidth&&p.args[2]===s.sequence.frameWidth));draws++;
    if(freeze&&f.dashFrames===6){f.hitStop=3;const pos=[f.x,f.y],clock=f.dashFrames;for(let n=0;n<3;n++){w.update(quiet,run.t++);assert.deepEqual([f.x,f.y],pos);assert.equal(f.dashFrames,clock);assert.deepEqual(sample(f,0),s);freezeChecks++;}}
    const before=f.x;w.update(quiet,run.t++);assert(Math.abs((f.x-before)-direction*8.2*c.speed*f.combatProfile.walkScale)<1e-8);assert.equal(f.facing,facing);}
   assert.deepEqual([...new Set(frames)],[0,1,2,3,4,5,6],c.id+' '+kind+' must display all seven stored poses');assert.equal(frames[0],0);assert.equal(frames.at(-1),6);assert.deepEqual(timers,[8,7,6,5,4,3,2,1]);assert.equal(f.hp,hp);assert.equal(f.superGauge,gauge);w.update(quiet,run.t++);assert.equal(sample(f,0)?.sequence.kind,'idle');cases++;}
  for(const action of['attack','jump','hit','block','parry']){const run=prepare(c,mode,facing,direction),{w,f}=run;for(let n=0;n<6;n++)w.update(quiet,run.t++);assert.equal(f.dashFrames,2);assert.equal(f.parryWindow,0);const enemy=new Fighter(getCharacter('RYU'),'enemy',f.x+facing*60,f.y,-facing);
   if(action==='attack')w.update({...quiet,pressed:k=>k==='lp'},run.t++);if(action==='jump')w.update({...quiet,pressed:k=>k==='jump'},run.t++);
   if(action==='hit')assert.equal(f.receiveHit(normalFor('mp'),enemy,false),'hit');if(action==='block')assert.equal(f.receiveHit(normalFor('lp'),enemy,true),'block');
   if(action==='parry'){w.update({...quiet,pressed:k=>k===(facing===1?'right':'left')},run.t++);assert.equal(f.receiveHit(normalFor('lp'),enemy,false),'parry');}
   assert.equal(f.dashFrames,0);const expected={attack:'stand-light',jump:'jump',hit:'hit',block:'guard',parry:'parry'}[action];assert.equal(sample(f,0)?.sequence.kind,expected);const paints=draw(f);assert(paints.some(p=>p.src===sample(f,0).sequence.asset));assert(!paints.some(p=>p.src.endsWith('/dash.webp')||p.src.endsWith('/dash-back.webp')));interruptions++;}
 }}
console.log('DASH_FRAME_COVERAGE_PASS',{characters:characters.length,modes:2,facings:2,directions:2,cases,draws,freezeChecks,interruptions,storedFramesPerSequence:7,gameplayTicks:8,realDoubleTap:true});
