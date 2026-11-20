import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {airFallSample} from '../dist/assets/render/AirFallProfiles.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
import {animationTextureManager as atm} from '../dist/assets/render/AnimationTextureManager.js';
import {characterTextureManager as ctm} from '../dist/assets/render/CharacterTextureManager.js';
const baseline=process.argv.includes('--baseline'),record=process.argv.includes('--record'),chars=[...CHARACTERS,...BOSS_CHARACTERS];
const q={held:()=>false,pressed:()=>false,released:()=>false},assets=new Map(chars.flatMap(c=>animationSequencesFor(c.id).map(s=>[s.asset,s]))),images=[];
let failAsset='',paints=[],translations=[];
globalThis.Image=class{complete=true;constructor(){images.push(this);}set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=s?s.frameHeight:448;if(v===failAsset)this.onerror?.();else this.onload?.();}get src(){return this.url;}};
ctm.setMode('hd');atm.setQualityPolicy(()=>ctm.wantsHd());for(const c of chars)atm.preloadCharacter(c.id,'movement');
function render(f){paints=[];translations=[];const stack=[],o={globalAlpha:.7,filter:'none',imageSmoothingEnabled:false,imageSmoothingQuality:'low'},ctx=new Proxy(o,{get:(o,k)=>k in o?o[k]:k==='save'?()=>stack.push({...o}):k==='restore'?()=>Object.assign(o,stack.pop()):k==='drawImage'?(im,...args)=>paints.push({src:im.src,args}):k==='translate'?(...xy)=>translations.push(xy):k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});const before=JSON.stringify(f);drawCombatFighter(ctx,f,1,999);assert.equal(JSON.stringify(f),before,'Rendering is read only');assert.equal(stack.length,0);assert.equal(o.globalAlpha,.7);return {paints:[...paints],translations:[...translations]};}
const physics=createHash('sha256');let cases=0,airDraws=0,groundDraws=0,freezeChecks=0,exclusions=0;
for(const c of chars)for(const face of[-1,1])for(const button of['lp','mp','lk','mk']){
 const w=new CombatWorld(c,getCharacter('KEN'),'duel'),f=w.player,a=w.enemy;f.facing=face;f.airborne=true;f.jumpHeight=70;f.jumpVelocity=-2;
 const result=f.receiveHit(normalFor(button,false,'KEN'),a,false);assert.equal(result,'hit');assert.equal(f.state,'hit');assert(f.airborne);
 for(let tick=0;tick<85;tick++){
  physics.update(JSON.stringify([c.id,face,button,tick,f.state,f.stateFrame,f.x,f.y,f.hp,f.hitStop,f.airborne,f.jumpHeight,f.jumpVelocity,f.juggleHits]));
  if(f.state==='hit'){
   const r=render(f);
   if(f.airborne||f.jumpHeight>0){
    const expected=animationSequenceFor(c.id,baseline?'hit':'fall',true),s=baseline?animationSequenceSample(f,0):airFallSample(f);
    assert.equal(s?.sequence.id,expected.id,c.id+' ordinary airborne hit must use aerial recoil art');
    if(!baseline)assert.equal(animationSequenceSample(f,0)?.sequence.id,expected.id,'Direct sampler uses the same airborne body');
    assert(r.paints.some(p=>p.src===expected.asset&&p.args[0]===s.frame*expected.frameWidth));
    assert.equal(r.translations.filter(xy=>xy[0]===0&&xy[1]===-f.jumpHeight).length,1,'Apply gameplay height exactly once');airDraws++;
   }else{assert.equal(airFallSample(f),null);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'hit');groundDraws++;}
  }
  const before=f.state==='hit'&&f.hitStop>0?JSON.stringify([f.stateFrame,f.jumpHeight,f.jumpVelocity,baseline?animationSequenceSample(f,0):airFallSample(f)]):null;
  f.updatePlayer(q,w.rules);
  if(before){assert.equal(JSON.stringify([f.stateFrame,f.jumpHeight,f.jumpVelocity,baseline?animationSequenceSample(f,0):airFallSample(f)]),before);freezeChecks++;}
 }cases++;
}
const digest=physics.digest('hex');
if(!record)assert.equal(digest,'289f9950fef5eeb960d3d7060c620d50e73cb7ecbb1f0fda11270a83a01bb9ff','Combat physics must match the pre-fix trace');
if(!baseline)for(const c of chars){
 const f=new Fighter(c,'player',400,500,1);f.state='hit';f.stateFrame=-12;f.hitAnimationDuration=12;f.airborne=true;f.jumpHeight=100;
 const seq=animationSequenceFor(c.id,'fall',true);
 for(const[frame,ratio]of[[0,.9],[1,.5],[2,.1],[3,-.1],[4,-.5],[5,-.9]]){f.jumpVelocity=f.combatProfile.jumpVelocity*ratio;assert.equal(airFallSample(f)?.frame,frame);assert(render(f).paints.some(p=>p.src===seq.asset&&p.args[0]===frame*512));}
 for(const key of['throwSyncFrames','superVictimFrames','wallBounceFrames','groundBounceFrames','throwEscapeFrames']){f[key]=2;assert.equal(airFallSample(f),null);assert(!render(f).paints.some(p=>p.src===seq.asset));f[key]=0;exclusions++;}
 for(const state of['idle','walk','jump','block','parry','attack','victory']){f.state=state;assert.equal(airFallSample(f),null);exclusions++;}f.state='hit';
 f.airborne=false;f.jumpHeight=0;assert.equal(airFallSample(f),null);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'hit');assert(render(f).paints.some(p=>p.src===animationSequenceFor(c.id,'hit',true).asset));f.jumpHeight=1;assert(airFallSample(f));f.airborne=true;f.jumpHeight=100;
 const image=images.find(im=>im.src===seq.asset);image.naturalWidth--;assert(!render(f).paints.some(p=>p.src===seq.asset));image.naturalWidth++;image.complete=false;assert(!render(f).paints.some(p=>p.src===seq.asset));image.complete=true;
 ctm.setMode('lite');assert(!render(f).paints.some(p=>p.src===seq.asset));ctm.setMode('hd');atm.releaseCharacter(c.id);failAsset=seq.asset;atm.preloadCharacter(c.id,'movement');assert(!render(f).paints.some(p=>p.src===seq.asset));failAsset='';atm.preloadCharacter(c.id,'movement');assert(render(f).paints.some(p=>p.src===seq.asset));atm.releaseCharacter(c.id);assert.equal(atm.readyCount(c.id),0);
}
console.log(JSON.stringify({passed:true,baseline,cases,airDraws,groundDraws,freezeChecks,exclusions,physics:digest}));
