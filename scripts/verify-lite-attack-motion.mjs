import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import {liteAnimationTextureManager as lite} from '../dist/assets/render/AnimationTextureManager.js';
import {animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
assert(lite,'A bounded lite animation cache must be available');
const sequence={...animationSequenceFor('YUN','shoulder-tackle',true),liteAsset:undefined};
let decodes=0,closed=0;
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['fixture'])});
globalThis.createImageBitmap=async(_blob,options)=>{decodes++;return {width:options.resizeWidth,height:options.resizeHeight,close(){closed++;}};};
assert.equal(lite.selection(sequence),null);
assert.equal(lite.selection(sequence),null,'Pending request shared');
await new Promise(setImmediate);
const ready=lite.selection(sequence);assert(ready);assert.equal(decodes,1);assert.equal(ready.image.width,sequence.frameCount*128);assert(ready.image.height<=112);
assert(lite.snapshot().pixels<=1572864);assert(lite.snapshot().entries<=8);
lite.release();assert.equal(closed,1);assert.equal(lite.snapshot().pixels,0);
console.log(JSON.stringify({passed:true,decodes,closed}));
// Serial work and pending requests remain bounded while a decoder is slow.
let releaseDecode,active=0,peak=0;
globalThis.createImageBitmap=async(_blob,options)=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>releaseDecode=resolve);active--;return {width:options.resizeWidth,height:options.resizeHeight,close(){this.width=this.height=0;}};};
for(let i=0;i<30;i++)lite.selection({...sequence,id:'queued-'+i});
await new Promise(setImmediate);assert.equal(peak,1);assert(lite.snapshot().entries<=8);assert(lite.queue.length<=8);assert(lite.snapshot().active);
lite.release();releaseDecode();await new Promise(setImmediate);assert.equal(lite.snapshot().entries,0);assert.equal(lite.snapshot().pixels,0);assert.equal(lite.snapshot().active,false);

// A result from an obsolete epoch is closed, never published after release.
let staleClosed=0;
globalThis.createImageBitmap=async(_blob,options)=>{await new Promise(resolve=>releaseDecode=resolve);return {width:options.resizeWidth,height:options.resizeHeight,close(){staleClosed++;this.width=this.height=0;}};};
lite.selection(sequence);await new Promise(setImmediate);lite.release();releaseDecode();await new Promise(setImmediate);assert.equal(staleClosed,1);assert.equal(lite.snapshot().ready,0);

// Failed/unsupported decodes do not repeat in the render loop. Explicit prep retries.
let failedFetches=0;
globalThis.fetch=async()=>{failedFetches++;return {ok:false};};
lite.selection(sequence);await new Promise(setImmediate);for(let i=0;i<100;i++)assert.equal(lite.selection(sequence),null);assert.equal(failedFetches,1);
lite.retryCharacter('RYU');lite.selection(sequence);await new Promise(setImmediate);assert.equal(failedFetches,1);
lite.retryCharacter('YUN');lite.selection(sequence);await new Promise(setImmediate);assert.equal(failedFetches,2);lite.release();
let badClosed=0;
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['fixture'])});
globalThis.createImageBitmap=async()=>({width:7680,height:448,close(){badClosed++;}});
lite.selection(sequence);await new Promise(setImmediate);assert.equal(lite.snapshot().ready,0);assert.equal(badClosed,1);lite.release();

// Retained pixels/entry count and close() stay bounded under varied strips.
let evicted=0;
globalThis.createImageBitmap=async(_blob,options)=>({__lite:true,width:options.resizeWidth,height:options.resizeHeight,close(){evicted++;this.width=this.height=0;}});
for(let i=0;i<32;i++){const s={...sequence,id:'budget-'+i,frameCount:24};lite.selection(s);await new Promise(setImmediate);assert(lite.selection(s));assert(lite.snapshot().entries<=8);assert(lite.snapshot().pixels<=1572864);}
assert(evicted>0);lite.release();assert.equal(lite.snapshot().pixels,0);
const bitmap=globalThis.createImageBitmap;delete globalThis.createImageBitmap;assert.equal(lite.selection(sequence),null);assert.equal(lite.snapshot().entries,0);globalThis.createImageBitmap=bitmap;

// Real LOW rendering selects the same authored contact frame without touching physics.
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {runtimeQuality} from '../dist/assets/core/RuntimeQuality.js';
import {characterTextureManager as textures} from '../dist/assets/render/CharacterTextureManager.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
const images=[];globalThis.Image=class{complete=true;naturalWidth=384;naturalHeight=448;set src(v){this.url=v;images.push(v);this.onload?.();}get src(){return this.url;}};
runtimeQuality.setTier('low');textures.setMode('auto');
const paints=[],ctx=new Proxy({globalAlpha:1,filter:'none',drawImage:(...args)=>paints.push(args),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
let renderCases=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1]){
 const specials=specialMovesFor(c.id);
 for(const move of [normalFor('lp',false,c.id),normalFor('hp',false,c.id),normalFor('hk',true,c.id),specials.primary,specials.mobility,specials.antiAir,specials.super]){
  const f=new Fighter(c,'player',500,500,facing);f.superGauge=1000;f.startMove(move);f.moveFrame=move.startup;
  const sample=animationSequenceSample(f,0);if(!sample||f.state!=='attack'||move.kind==='throw'||move.level==='throw')continue;
  const before=JSON.stringify(f);lite.selection(sample.sequence);await new Promise(setImmediate);paints.length=0;drawCombatFighter(ctx,f,1,999);
  const body=paints.filter(a=>a[0].__lite);assert.equal(body.length,1,c.id+'/'+move.id+' LOW contact must keep authored body');assert.equal(body[0][1],sample.frame*(body[0][0].width/sample.sequence.frameCount));assert.equal(body[0][5],-sample.sequence.frameWidth/4);assert.equal(body[0][7],sample.sequence.frameWidth/2);assert.equal(JSON.stringify(f),before);
  assert(!textures.wantsHd());assert(lite.snapshot().pixels<=1572864);renderCases++;
 }
}
assert(renderCases>=100);assert(!images.some(url=>url.startsWith('/art/animation-hq/')),'LOW must never retain full-size animation Image elements');
textures.clearFocus();assert.equal(lite.snapshot().pixels,0);
lite.selection(sequence);await new Promise(setImmediate);assert(lite.snapshot().ready>0);textures.setMode('hd');assert.equal(lite.snapshot().pixels,0);
console.log(JSON.stringify({passed:true,serialPeak:peak,budgetStrips:32,budgetFrameCount:24,failedDrawPolls:100,staleClosed,badClosed,renderCases,lowTierPreserved:true,qualityUpgradeReleased:true}));
// Eviction must not erase failure suppression and turn animation variety into retries.
lite.release();let evictedFailures=0;globalThis.fetch=async()=>{evictedFailures++;return {ok:false};};
for(let pass=0;pass<3;pass++)for(let i=0;i<9;i++){lite.selection({...sequence,id:'failed-eviction-'+i});await new Promise(setImmediate);}
assert.equal(evictedFailures,9,'Evicted failures require explicit retry, not another draw');
lite.retryCharacter('YUN');lite.selection({...sequence,id:'failed-eviction-0'});await new Promise(setImmediate);assert.equal(evictedFailures,10);lite.release();
console.log(JSON.stringify({passed:true,evictionFailureSuppression:9,explicitRetry:1}));
// Ready rising strips keep authored flight/landing after the attack state ends.
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
textures.setMode('lite');
let delayedQuickAttacks = 0;
for (const button of ['lp', 'lk']) {
  lite.release();
  const ken = CHARACTERS.find(character => character.id === 'KEN');
  const world = new CombatWorld(ken, ken, 'belt');
  const fighter = world.player;
  const press = { ...quiet, pressed: action => action === button };
  let finishDecode;
  const decoding = new Promise(resolve => { finishDecode = resolve; });
  globalThis.fetch = async () => ({ ok: true, blob: async () => new Blob(['fixture']) });
  globalThis.createImageBitmap = async (_blob, options) => {
    await decoding;
    return { __lite: true, width: options.resizeWidth, height: options.resizeHeight, close() {} };
  };
  fighter.updatePlayer(press, world.rules);
  const sample = animationSequenceSample(fighter, 0);
  paints.length = 0;
  drawCombatFighter(ctx, fighter, 1, 0);
  assert(!paints.some(draw => draw[0].__lite), button + ' starts with fallback');
  finishDecode();
  await new Promise(setImmediate);
  assert(lite.selection(sample.sequence, true));
  fighter.updatePlayer(quiet, world.rules);
  paints.length = 0;
  drawCombatFighter(ctx, fighter, 1, 0);
  assert(!paints.some(draw => draw[0].__lite), button + ' cannot switch artwork mid-attack');
  while (fighter.state === 'attack') fighter.updatePlayer(quiet, world.rules);
  fighter.updatePlayer(press, world.rules);
  paints.length = 0;
  drawCombatFighter(ctx, fighter, 1, 0);
  assert(paints.some(draw => draw[0].__lite), button + ' uses loaded artwork on the next attack');
  delayedQuickAttacks++;
}
lite.release();
console.log(JSON.stringify({ delayedQuickAttacks }));
const risingKinds=new Set(['shoryuken','tensei-ranka','rocket-uppercut','stun-gun-headbutt','abare-tosanami','you-hou']);
let recoveryCases=0,recoveryFrames=0,freezeChecks=0,coldChecks=0,fetches=0;
globalThis.fetch=async()=>{fetches++;return {ok:true,blob:async()=>new Blob(['fixture'])};};
globalThis.createImageBitmap=async(_blob,options)=>({__lite:true,width:options.resizeWidth,height:options.resizeHeight,close(){this.width=this.height=0;}});
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const mode of ['belt','duel'])for(const move of [specialMovesFor(c.id).antiAir,...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge)).filter(m=>m.id.startsWith(c.id)&&m.launch)]){
 const w=new CombatWorld(c,c,mode),f=w.player;f.facing=facing;f.superGauge=1000;f.startMove(move);const initial=animationSequenceSample(f,0);if(!initial||!risingKinds.has(initial.sequence.kind))continue;
 lite.release();lite.selection(initial.sequence);await new Promise(setImmediate);assert(lite.selection(initial.sequence));
 let seen=false;
 for(let tick=0;tick<120;tick++){
  f.updatePlayer(quiet,w.rules);const sample=animationSequenceSample(f,0);
  if(f.state!=='attack'&&sample&&risingKinds.has(sample.sequence.kind)){
   const before=JSON.stringify(f),requests=fetches;paints.length=0;drawCombatFighter(ctx,f,1,999);const body=paints.filter(a=>a[0].__lite);
   assert.equal(body.length,1,c.id+'/'+move.id+'/'+mode+'/'+tick+' ready rising recovery must retain authored body');assert.equal(body[0][1],sample.frame*(body[0][0].width/sample.sequence.frameCount));assert.equal(JSON.stringify(f),before);assert.equal(fetches,requests);recoveryFrames++;
   if(!seen){f.hitStop=3;const frozen=JSON.stringify(f);for(let n=0;n<3;n++){paints.length=0;drawCombatFighter(ctx,f,1,n*100);assert.equal(paints.filter(a=>a[0].__lite)[0][1],body[0][1]);assert.equal(JSON.stringify(f),frozen);freezeChecks++;}f.hitStop=0;seen=true;}
  }
  if(!f.currentMove&&!f.airborne&&f.landingFrames===0){paints.length=0;drawCombatFighter(ctx,f,1,0);assert.equal(paints.filter(a=>a[0].__lite).length,0,'Expired recovery must return to movement');break;}
 }
 if(seen)recoveryCases++;
 // Drop the strip during a valid recovery: drawing must not start cold work.
 const g=new CombatWorld(c,c,mode).player;g.facing=facing;g.superGauge=1000;g.startMove(move);
 for(let tick=0;tick<120;tick++){g.updatePlayer(quiet,w.rules);const s=animationSequenceSample(g,0);if(g.state!=='attack'&&s&&risingKinds.has(s.sequence.kind)){
  lite.release();const requests=fetches;for(let n=0;n<10;n++){paints.length=0;drawCombatFighter(ctx,g,1,n);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(fetches,requests,'Cold recovery must not queue decoding');assert.equal(lite.snapshot().entries,0);coldChecks++;break;
 }if(!g.currentMove&&!g.airborne&&g.landingFrames===0)break;}
}
assert(recoveryCases>=40);assert.equal(coldChecks,recoveryCases);lite.release();
console.log(JSON.stringify({passed:true,recoveryCases,recoveryFrames,freezeChecks,coldChecks,physicsAndInputUnchanged:true}));

// Throw ownership uses the existing authored bodies on LOW without changing pair clocks.
import {throwAttackerSample} from '../dist/assets/render/ThrowAttackerProfiles.js';
import {throwVictimSample} from '../dist/assets/render/ThrowVictimProfiles.js';
import {throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
textures.setMode('lite');globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['fixture'])});globalThis.createImageBitmap=async(_b,o)=>({__lite:true,width:o.resizeWidth,height:o.resizeHeight,close(){this.width=this.height=0;}});
let throwFrames=0,throwFrozen=0;const imageStart=images.length;
async function assertThrowBody(f,s,label){assert(s,label+' sample');const before=JSON.stringify(f);if(f.currentMove?.id==='5LP'||f.currentMove?.id==='5LK')lite.selection(s.sequence);else drawCombatFighter(ctx,f,1,0);await new Promise(setImmediate);paints.length=0;drawCombatFighter(ctx,f,1,999);const body=paints.filter(a=>a[0].__lite);assert.equal(body.length,1,label+' needs authored Lite body');assert.equal(body[0][1],s.frame*body[0][0].width/s.sequence.frameCount);assert.deepEqual(body[0].slice(5),[-s.sequence.frameWidth/4,-220,s.sequence.frameWidth/2,s.sequence.frameHeight/2]);assert.equal(JSON.stringify(f),before);assert(lite.snapshot().pixels<=1572864&&lite.snapshot().entries<=8);throwFrames++;}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const a=new Fighter(c,'player',500,500,face);a.startMove(throwMoveFor(c.id));
 for(let frame=0;frame<25;frame++){a.moveFrame=frame;await assertThrowBody(a,throwAttackerSample(a),c.id+'/miss/'+frame);}
 for(const role of['attacker','victim']){const f=new Fighter(c,role==='attacker'?'player':'enemy',500,500,face);if(role==='attacker')f.startMove(throwMoveFor(c.id));else{f.state='knockdown';f.stateFrame=-20;}f.beginThrowSync(role,face,1,24,c.id);
 for(let left=24;left>0;left--){f.throwSyncFrames=left;const s=role==='attacker'?throwAttackerSample(f):throwVictimSample(f);await assertThrowBody(f,s,c.id+'/'+role+'/'+left);if(left===12){f.hitStop=3;const frozen=JSON.stringify(f);for(let n=0;n<3;n++){paints.length=0;drawCombatFighter(ctx,f,1,n*50);assert.equal(paints.filter(a=>a[0].__lite)[0][1],s.frame*paints.filter(a=>a[0].__lite)[0][0].width/s.sequence.frameCount);assert.equal(JSON.stringify(f),frozen);throwFrozen++;}f.hitStop=0;}}
 }
}
for(const[id,art,air]of[['ALEX',1,false],['ALEX',3,true],['IBUKI',2,false]]){const c=[...CHARACTERS,...BOSS_CHARACTERS].find(c=>c.id===id),f=new Fighter(c,'player',500,500,1);f.superGauge=1000;f.startMove(superArtMoveFor(id,art));f.moveFrame=f.currentMove.startup;if(air){f.airborne=true;f.jumpHeight=80;f.jumpVelocity=1;}f.beginThrowSync('attacker',1,1,24,id);await assertThrowBody(f,throwAttackerSample(f),id+'/SA'+art);}
assert(!images.slice(imageStart).some(p=>p.startsWith('/art/throw-attacker-v1/')||p.startsWith('/art/throw-victim-v1/')),'LOW must not construct full-size throw Image elements');textures.clearFocus();assert.equal(lite.snapshot().pixels,0);
console.log(JSON.stringify({passed:true,throwFrames,throwFrozen,superPairs:3,retainedBudget:1572864}));

// Grounded knockdowns retain authored recovery poses, with no gameplay mutation.
let knockdownFrames=0,knockdownWarm=0,knockdownControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const f=new Fighter(c,'enemy',600,500,face);f.state='knockdown';f.knockdownAnimationDuration=34;
 for(let elapsed=0;elapsed<34;elapsed++){f.stateFrame=elapsed-34;await assertThrowBody(f,animationSequenceSample(f,0),c.id+'/knockdown/'+elapsed);knockdownFrames++;}
 // The actual pair may end with only ten grounded recovery ticks left.
 lite.release();f.stateFrame=-34;f.beginThrowSync('victim',face,1,24,c.id);const seq=animationSequenceFor(c.id,'knockdown',true);assert(seq);paints.length=0;drawCombatFighter(ctx,f,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert(lite.selection(seq,true),'Live grounded pair must prepare only its own knockdown');f.throwSyncFrames=0;f.stateFrame=-10;paints.length=0;const before=JSON.stringify(f);drawCombatFighter(ctx,f,1,999);assert.equal(paints.filter(a=>a[0].__lite).length,1);assert.equal(JSON.stringify(f),before);knockdownWarm++;
 for(const control of['airborne','super','ko']){lite.release();f.state='knockdown';f.stateFrame=-34;f.throwSyncFrames=24;f.airborne=control==='airborne';f.jumpHeight=f.airborne?80:0;f.superVictimFrames=control==='super'?12:0;f.hp=control==='ko'?0:f.maxHp;if(control==='ko')f.state='ko';drawCombatFighter(ctx,f,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(seq,true),null,'Do not prepare grounded knockdown for '+control);knockdownControls++;}
}
textures.clearFocus();console.log(JSON.stringify({passed:true,knockdownFrames,knockdownWarm,knockdownControls}));

// Nonlethal airborne reactions retain the authored LOW fall strip.
import {airFallSample} from '../dist/assets/render/AirFallProfiles.js';
let airKnockdownFrames=0,airKnockdownWarm=0,airKnockdownFrozen=0,airKnockdownControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const f=new Fighter(c,'enemy',600,500,face);f.state='knockdown';f.stateFrame=-20;f.knockdownAnimationDuration=34;f.airborne=true;
 for(const height of[8,80])for(const velocity of[-20,-8,-1,0,1,8,20]){f.jumpHeight=height;f.jumpVelocity=velocity;const s=airFallSample(f);await assertThrowBody(f,s,c.id+'/air-knockdown/'+height+'/'+velocity);airKnockdownFrames++;if(height===80&&velocity===0){const before=JSON.stringify(f);for(let n=0;n<3;n++){paints.length=0;drawCombatFighter(ctx,f,1,n*999);assert.equal(paints.filter(a=>a[0].__lite)[0][1],s.frame*paints.filter(a=>a[0].__lite)[0][0].width/s.sequence.frameCount);assert.equal(JSON.stringify(f),before);airKnockdownFrozen++;}}}
 lite.release();f.jumpHeight=80;f.jumpVelocity=-4;drawCombatFighter(ctx,f,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);const ground=animationSequenceFor(c.id,'knockdown');assert(lite.selection(ground,true),'Actual flight prepares same owner ground recovery');f.airborne=false;f.jumpHeight=f.jumpVelocity=0;f.stateFrame=-7;paints.length=0;drawCombatFighter(ctx,f,1,0);assert.equal(paints.filter(a=>a[0].__lite).length,1);airKnockdownWarm++;
 const fall=animationSequenceFor(c.id,'fall');for(const control of['dead-hit','living-ko','super','wall','ground','escape','attack']){lite.release();const g=new Fighter(c,'enemy',600,500,face);g.state='knockdown';g.stateFrame=-20;g.airborne=true;g.jumpHeight=80;g.jumpVelocity=-4;if(control==='dead-hit'){g.state='hit';g.hp=0;}if(control==='living-ko'){g.state='ko';g.hp=g.maxHp;}if(control==='super')g.superVictimFrames=12;if(control==='wall')g.wallBounceFrames=6;if(control==='ground')g.groundBounceFrames=6;if(control==='escape')g.throwEscapeFrames=12;if(control==='attack')g.state='attack';drawCombatFighter(ctx,g,1,0);for(let n=0;n<3;n++)await new Promise(setImmediate);assert.equal(lite.selection(fall,true),null,'No ordinary fall strip for '+control);airKnockdownControls++;}
}
textures.clearFocus();console.log(JSON.stringify({passed:true,airKnockdownFrames,airKnockdownWarm,airKnockdownFrozen,airKnockdownControls}));

// Ordinary grounded stun uses its own live clock, without widening air/special reactions.
import {drawGroundedKoCinematic} from '../dist/assets/render/Visuals.js';
let groundHitFrames=0,groundHitFrozen=0,groundHitControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 for(const duration of[6,14,24]){const f=new Fighter(c,'enemy',600,500,face);f.state='hit';f.hitAnimationDuration=duration;
 for(let elapsed=0;elapsed<duration;elapsed++){f.stateFrame=elapsed-duration;const s=animationSequenceSample(f,0);await assertThrowBody(f,s,c.id+'/ground-hit/'+duration+'/'+elapsed);groundHitFrames++;if(elapsed===Math.floor(duration/2)){f.hitStop=3;for(let n=0;n<3;n++){const pose=animationSequenceSample(f,0),frame=f.stateFrame,hp=f.hp;f.updatePlayer(quiet,new CombatWorld(c,c,'belt').rules);assert.deepEqual(animationSequenceSample(f,0),pose);assert.equal(f.stateFrame,frame);assert.equal(f.hp,hp);paints.length=0;drawCombatFighter(ctx,f,1,n*999);assert.equal(paints.filter(a=>a[0].__lite).length,1);groundHitFrozen++;}}}
 const hitImage=paints.find(a=>a[0].__lite)[0];f.state='idle';f.stateFrame=0;paints.length=0;drawCombatFighter(ctx,f,1,0);assert(!paints.some(a=>a[0]===hitImage),'Expired ordinary hit cannot hold the hit body');}
 const hit=animationSequenceFor(c.id,'hit');for(const control of['air','ko','super','wall','ground','throw','cinematic']){lite.release();const f=new Fighter(c,'enemy',600,500,face);f.state='hit';f.stateFrame=-8;f.hitAnimationDuration=12;if(control==='air'){f.airborne=true;f.jumpHeight=80;}if(control==='ko'){f.state='ko';f.hp=0;}if(control==='super')f.superVictimFrames=12;if(control==='wall')f.wallBounceFrames=6;if(control==='ground')f.groundBounceFrames=6;if(control==='throw')f.beginThrowSync('victim',face,1,24,c.id);if(control==='cinematic')drawGroundedKoCinematic(ctx,f,6);else drawCombatFighter(ctx,f,1,0);for(let n=0;n<3;n++)await new Promise(setImmediate);assert.equal(lite.selection(hit,true),null,'No ordinary hit strip for '+control);groundHitControls++;}
}
lite.release();let hitFailureRequests=0;globalThis.fetch=async()=>{hitFailureRequests++;return{ok:false};};const failedHit=new Fighter(CHARACTERS[0],'enemy',600,500,1);failedHit.state='hit';failedHit.stateFrame=-8;failedHit.hitAnimationDuration=12;const failedBefore=JSON.stringify(failedHit);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedHit,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(hitFailureRequests,2);assert.equal(JSON.stringify(failedHit),failedBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,groundHitFrames,groundHitFrozen,groundHitControls,hitFailureRequests}));

// Ordinary air-hit uses the same live velocity clock, and relinquishes it on recovery.
import {airNormalFor,commandNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['fixture'])});textures.setMode('lite');let airHitFrames=0,airHitFrozen=0,airHitRecoveries=0,airHitNoGroundWarm=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const f=new Fighter(c,'enemy',600,500,face);f.state='hit';f.stateFrame=-8;f.hitAnimationDuration=14;f.airborne=true;
 for(const height of[8,80])for(const velocity of[-20,-8,-1,0,1,8,20]){f.jumpHeight=height;f.jumpVelocity=velocity;const s=airFallSample(f);await assertThrowBody(f,s,c.id+'/air-hit/'+height+'/'+velocity);airHitFrames++;if(height===80&&velocity===0){f.hitStop=3;for(let n=0;n<3;n++){const frame=f.stateFrame,vel=f.jumpVelocity,h=f.jumpHeight,pose=airFallSample(f);f.updatePlayer(quiet,new CombatWorld(c,c,'belt').rules);assert.equal(f.stateFrame,frame);assert.equal(f.jumpVelocity,vel);assert.equal(f.jumpHeight,h);assert.deepEqual(airFallSample(f),pose);paints.length=0;drawCombatFighter(ctx,f,1,n*999);assert.equal(paints.filter(a=>a[0].__lite).length,1);airHitFrozen++;}}}
 f.state='jump';f.stateFrame=0;paints.length=0;drawCombatFighter(ctx,f,1,0);assert.equal(paints.filter(a=>a[0].__lite).length,0,'Hit strip ends when air control returns');f.startMove(airNormalFor(c.id,'lp'));await assertThrowBody(f,animationSequenceSample(f,0),c.id+'/post-air-hit');airHitRecoveries++;
 lite.release();const g=new Fighter(c,'enemy',600,500,face);g.state='hit';g.stateFrame=-8;g.hitAnimationDuration=14;g.airborne=true;g.jumpHeight=80;g.jumpVelocity=-4;drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.snapshot().entries,1,'Ordinary air-hit needs only its current fall strip');assert.equal(lite.selection(animationSequenceFor(c.id,'hit'),true),null);assert.equal(lite.selection(animationSequenceFor(c.id,'knockdown'),true),null);airHitNoGroundWarm++;
}
textures.clearFocus();console.log(JSON.stringify({passed:true,airHitFrames,airHitFrozen,airHitRecoveries,airHitNoGroundWarm}));

// Directly assigned ground KO states exercise rendering only: no lethal input or retry flow.
let groundKoFrames=0,groundKoFrozen=0,groundKoHolds=0,groundKoControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const f=new Fighter(c,'enemy',600,500,face);f.state='ko';f.hp=0;
 for(let elapsed=0;elapsed<=30;elapsed++){f.stateFrame=elapsed-90;await assertThrowBody(f,animationSequenceSample(f,0),c.id+'/ground-ko/'+elapsed);groundKoFrames++;}
 f.stateFrame=-78;f.hitStop=3;const frozen=JSON.stringify({...f,hitStop:0});
 for(let n=0;n<3;n++){f.updatePlayer(quiet,new CombatWorld(c,c,'belt').rules);assert.equal(JSON.stringify({...f,hitStop:0}),frozen);await assertThrowBody(f,animationSequenceSample(f,0),c.id+'/ground-ko/frozen');groundKoFrozen++;}
 for(const frame of[-60,-30,-1,0]){f.stateFrame=frame;const sample=animationSequenceSample(f,0);assert.equal(sample.frame,sample.sequence.frameCount-1);await assertThrowBody(f,sample,c.id+'/ground-ko/hold');groundKoHolds++;}
 for(const control of['living-air','living','super','wall','ground','pair']){lite.release();const g=new Fighter(c,'enemy',600,500,face);g.state='ko';g.hp=control.startsWith('living')?g.maxHp:0;g.stateFrame=-78;if(control==='living-air'){g.airborne=true;g.jumpHeight=80;}if(control==='super')g.superVictimFrames=12;if(control==='wall')g.wallBounceFrames=6;if(control==='ground')g.groundBounceFrames=6;if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);drawCombatFighter(ctx,g,1,0);for(let n=0;n<3;n++)await new Promise(setImmediate);assert.equal(lite.selection(animationSequenceFor(c.id,'ko'),true),null,'No ordinary ground KO strip for '+control);groundKoControls++;}
}
lite.release();let koFailureRequests=0;globalThis.fetch=async()=>{koFailureRequests++;return{ok:false};};const failedKo=new Fighter(CHARACTERS[0],'enemy',600,500,1);failedKo.state='ko';failedKo.hp=0;failedKo.stateFrame=-78;const koBefore=JSON.stringify(failedKo);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedKo,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(koFailureRequests,2);assert.equal(JSON.stringify(failedKo),koBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,groundKoFrames,groundKoFrozen,groundKoHolds,groundKoControls,koFailureRequests}));

// Direct state rendering only: dead airborne fighters keep velocity-owned fall poses.
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
globalThis.createImageBitmap=async(blob,o)=>({__lite:true,__asset:blob.__asset,width:o.resizeWidth,height:o.resizeHeight,close(){this.width=this.height=0;}});
async function assertAirKoBody(f,s,label){await assertThrowBody(f,s,label);assert.equal(paints.find(a=>a[0].__lite)[0].__asset,s.sequence.liteAsset??s.sequence.asset,label+' must draw its own exact strip');}
let airKoFrames=0,airKoFrozen=0,airKoLandings=0,airKoPhysicsTicks=0,airKoControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 const f=new Fighter(c,'enemy',600,500,face);f.state='ko';f.hp=0;f.stateFrame=-90;f.airborne=true;
 for(const height of[8,80])for(const velocity of[-20,-8,-1,0,1,8,20]){f.jumpHeight=height;f.jumpVelocity=velocity;await assertAirKoBody(f,airFallSample(f),c.id+'/air-ko/'+height+'/'+velocity);airKoFrames++;}
 f.jumpHeight=80;f.jumpVelocity=3;f.hitStop=3;const frozen=JSON.stringify({...f,hitStop:0}),rules=new CombatWorld(c,c,'belt').rules;
 for(let n=0;n<3;n++){f.updatePlayer(quiet,rules);assert.equal(JSON.stringify({...f,hitStop:0}),frozen);await assertAirKoBody(f,airFallSample(f),c.id+'/air-ko/frozen');airKoFrozen++;}
 lite.release();drawCombatFighter(ctx,f,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);
 const ground=animationSequenceFor(c.id,'ko');assert(lite.selection(ground,true),'Flight prepares only same-owner ground KO');assert.equal(lite.snapshot().entries,2,'Only fall and own ground KO are needed');
 const reference=Object.assign(Object.create(Object.getPrototypeOf(f)),f);
 for(let n=0;n<120&&f.airborne;n++){f.updatePlayer(quiet,rules);reference.updatePlayer(quiet,rules);assert.equal(JSON.stringify(f),JSON.stringify(reference),'Drawing and preparation cannot change KO physics');const sample=f.airborne?airFallSample(f):animationSequenceSample(f,0);await assertAirKoBody(f,sample,c.id+'/air-ko/physics/'+n);assert.equal(JSON.stringify(f),JSON.stringify(reference));airKoPhysicsTicks++;}
 assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(f.state,'ko');assert.equal(f.hp,0);airKoLandings++;
 for(const control of['living-ko','dead-hit','super','wall','ground','escape','pair','jump']){lite.release();const g=new Fighter(c,'enemy',600,500,face);g.state='ko';g.hp=0;g.stateFrame=-80;g.airborne=true;g.jumpHeight=80;if(control==='living-ko')g.hp=g.maxHp;if(control==='dead-hit')g.state='hit';if(control==='super')g.superVictimFrames=12;if(control==='wall')g.wallBounceFrames=6;if(control==='ground')g.groundBounceFrames=6;if(control==='escape')g.throwEscapeFrames=12;if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);if(control==='jump')g.state='jump';drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(ground,true),null,'No speculative ground KO for '+control);assert.equal(lite.selection(animationSequenceFor(c.id,'fall'),true),null,'No ordinary fall for '+control);airKoControls++;}
}
lite.release();let airKoFailureRequests=0;globalThis.fetch=async()=>{airKoFailureRequests++;return{ok:false};};const failedAirKo=new Fighter(CHARACTERS[0],'enemy',600,500,1);Object.assign(failedAirKo,{state:'ko',hp:0,stateFrame:-80,airborne:true,jumpHeight:80,jumpVelocity:3});const airKoBefore=JSON.stringify(failedAirKo);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedAirKo,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(airKoFailureRequests,4,'Fall and ground KO each try the compact file and original once');assert.equal(JSON.stringify(failedAirKo),airKoBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,airKoFrames,airKoFrozen,airKoLandings,airKoPhysicsTicks,airKoControls,airKoFailureRequests}));

// Explicit cinematic rendering owns its frame, independent of the frozen live fighter.
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let cinematicKoFrames=0,cinematicKoFrozen=0,cinematicKoCold=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 lite.release();const f=new Fighter(c,'enemy',600,500,face);Object.assign(f,{state:'ko',hp:0,stateFrame:-78,airborne:true,jumpHeight:80,jumpVelocity:3,hitStop:3});const before=JSON.stringify(f),seq=animationSequenceFor(c.id,'ko');
 paints.length=0;assert.equal(drawGroundedKoCinematic(ctx,f,0),false,'Pending cinematic body preserves caller fallback');assert.equal(paints.filter(a=>a[0].__lite).length,0);await new Promise(setImmediate);cinematicKoCold++;
 for(const elapsed of[-5,...Array.from({length:61},(_,i)=>i),120,180]){paints.length=0;assert.equal(drawGroundedKoCinematic(ctx,f,elapsed),true,c.id+'/cinematic/'+elapsed+' needs authored Lite body');const body=paints.filter(a=>a[0].__lite);assert.equal(body.length,1);assert.equal(body[0][0].__asset,seq.liteAsset??seq.asset);const expected=Math.min(seq.frameCount-1,Math.floor(Math.max(0,elapsed)*seq.fps/60));assert.equal(body[0][1],expected*body[0][0].width/seq.frameCount);assert.deepEqual(body[0].slice(5),[-seq.frameWidth/4,-220,seq.frameWidth/2,seq.frameHeight/2]);assert.equal(JSON.stringify(f),before);assert.equal(lite.snapshot().entries,1,'Only explicit KO requested');cinematicKoFrames++;}
 for(const state of['idle','hit','attack']){f.state=state;const frozen=JSON.stringify(f);paints.length=0;assert.equal(drawGroundedKoCinematic(ctx,f,180),true);assert.equal(paints.find(a=>a[0].__lite)[1],(seq.frameCount-1)*paints.find(a=>a[0].__lite)[0].width/seq.frameCount);assert.equal(JSON.stringify(f),frozen);cinematicKoFrozen++;}
}
lite.release();let cinematicKoFailureRequests=0;globalThis.fetch=async()=>{cinematicKoFailureRequests++;return{ok:false};};const failedCinematic=new Fighter(CHARACTERS[0],'enemy',600,500,1),cinematicBefore=JSON.stringify(failedCinematic);for(let n=0;n<100;n++){paints.length=0;assert.equal(drawGroundedKoCinematic(ctx,failedCinematic,n),false);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(cinematicKoFailureRequests,2);assert.equal(JSON.stringify(failedCinematic),cinematicBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,cinematicKoFrames,cinematicKoFrozen,cinematicKoCold,cinematicKoFailureRequests}));

// Super-victim pose ownership uses existing counters, not a new LOW animation clock.
import {superHitSample} from '../dist/assets/render/SuperHitProfiles.js';
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let liteSuperFrames=0,liteSuperFrozen=0,liteSuperExpiry=0,liteSuperPhysics=0,liteSuperControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 for(const state of['hit','knockdown','ko'])for(const air of[false,true])for(const total of[12,30]){
  const f=new Fighter(c,'enemy',600,500,face);Object.assign(f,{state,hp:state==='ko'?0:f.maxHp,stateFrame:-90,airborne:air,jumpHeight:air?80:0,jumpVelocity:air?3:0,superVictimTotal:total});
  for(let left=total;left>0;left--){f.superVictimFrames=left;await assertAirKoBody(f,superHitSample(f),c.id+'/super-hit/'+state+'/'+air+'/'+total+'/'+left);liteSuperFrames++;}
  f.superVictimFrames=total;f.hitStop=3;const frozen=JSON.stringify({...f,hitStop:0}),rules=new CombatWorld(c,c,'belt').rules;
  for(let n=0;n<3;n++){f.updatePlayer(quiet,rules);assert.equal(JSON.stringify({...f,hitStop:0}),frozen);await assertAirKoBody(f,superHitSample(f),c.id+'/super-hit/frozen');liteSuperFrozen++;}
  const reference=Object.assign(Object.create(Object.getPrototypeOf(f)),f);
  for(let n=0;n<total;n++){f.updatePlayer(quiet,rules);reference.updatePlayer(quiet,rules);assert.equal(JSON.stringify(f),JSON.stringify(reference));if(f.superVictimFrames>0)await assertAirKoBody(f,superHitSample(f),c.id+'/super-hit/physics');else{assert.equal(superHitSample(f),null);const next=animationSequenceSample(f,0)??airFallSample(f);assert(next);await assertAirKoBody(f,next,c.id+'/super-hit/expiry');assert.notEqual(paints.find(a=>a[0].__lite)[0].__asset,animationSequenceFor(c.id,'super-hit').liteAsset,'Expired super body must stop immediately');liteSuperExpiry++;}assert.equal(JSON.stringify(f),JSON.stringify(reference));liteSuperPhysics++;}
 }
 const superSeq=animationSequenceFor(c.id,'super-hit');for(const control of['expired','missing-total','pair','escape','idle']){lite.release();const g=new Fighter(c,'enemy',600,500,face);Object.assign(g,{state:'hit',stateFrame:-15,superVictimFrames:12,superVictimTotal:12});if(control==='expired')g.superVictimFrames=0;if(control==='missing-total')g.superVictimTotal=0;if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);if(control==='escape')g.throwEscapeFrames=12;if(control==='idle')g.state='idle';drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(superSeq,true),null,'No super strip for '+control);liteSuperControls++;}
}
lite.release();let liteSuperFailureRequests=0;globalThis.fetch=async()=>{liteSuperFailureRequests++;return{ok:false};};const failedSuper=new Fighter(CHARACTERS[0],'enemy',600,500,1);Object.assign(failedSuper,{state:'hit',stateFrame:-15,superVictimFrames:12,superVictimTotal:12});const failedSuperBefore=JSON.stringify(failedSuper);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedSuper,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(liteSuperFailureRequests,2);assert.equal(JSON.stringify(failedSuper),failedSuperBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,liteSuperFrames,liteSuperFrozen,liteSuperExpiry,liteSuperPhysics,liteSuperControls,liteSuperFailureRequests}));

// Bounce samples carry body-specific recoil tags; preserve them on the LOW route.
import {wallBounceSample} from '../dist/assets/render/WallBounceProfiles.js';
import {groundBounceSample} from '../dist/assets/render/GroundBounceProfiles.js';
import {victimReactionSample} from '../dist/assets/render/VictimReactionProfiles.js';
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let liteBounceFrames=0,liteBounceFrozen=0,liteBounceExpiry=0,liteBouncePhysics=0,liteBounceControls=0,liteBouncePriority=0;
const bounceRotation=[],bounceTranslations=[],oldRotate=ctx.rotate,oldTranslate=ctx.translate;
ctx.rotate=v=>bounceRotation.push(v);ctx.translate=(x,y)=>bounceTranslations.push([x,y]);
async function assertBounceBody(f,s,label,kind){bounceRotation.length=bounceTranslations.length=0;await assertAirKoBody(f,s,label);const reaction=victimReactionSample(f),angle=reaction.rotation+f.facing*(kind==='wall'?.36:-.22);assert(bounceRotation.some(v=>Math.abs(v-angle)<1e-12),label+' keeps recoil rotation');assert(bounceTranslations.some(([x,y])=>x===reaction.offsetX&&y===reaction.offsetY),label+' moves body independently of shadow');}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const kind of['wall','ground']){
 const field=kind==='wall'?'wallBounceFrames':'groundBounceFrames',total=kind==='wall'?18:16,sampleFor=kind==='wall'?wallBounceSample:groundBounceSample;
 for(const state of['hit','knockdown','ko']){
  const f=new Fighter(c,'enemy',600,500,face);Object.assign(f,{state,hp:state==='ko'?0:f.maxHp,stateFrame:-90,airborne:true,jumpHeight:180,jumpVelocity:3});
  for(let left=total;left>0;left--){f[field]=left;await assertBounceBody(f,sampleFor(f),c.id+'/'+kind+'/'+state+'/'+left,kind);liteBounceFrames++;}
  f[field]=total;f.hitStop=3;const frozen=JSON.stringify({...f,hitStop:0}),rules=new CombatWorld(c,c,'belt').rules;
  for(let n=0;n<3;n++){f.updatePlayer(quiet,rules);assert.equal(JSON.stringify({...f,hitStop:0}),frozen);await assertBounceBody(f,sampleFor(f),c.id+'/'+kind+'/frozen',kind);liteBounceFrozen++;}
  const reference=Object.assign(Object.create(Object.getPrototypeOf(f)),f);
  for(let n=0;n<total;n++){f.updatePlayer(quiet,rules);reference.updatePlayer(quiet,rules);assert.equal(JSON.stringify(f),JSON.stringify(reference));if(f[field]>0)await assertBounceBody(f,sampleFor(f),c.id+'/'+kind+'/physics',kind);else{assert.equal(sampleFor(f),null);const next=animationSequenceSample(f,0)??airFallSample(f);assert(next);await assertAirKoBody(f,next,c.id+'/'+kind+'/expiry');assert.notEqual(paints.find(a=>a[0].__lite)[0].__asset,animationSequenceFor(c.id,'super-hit').liteAsset);liteBounceExpiry++;}assert.equal(JSON.stringify(f),JSON.stringify(reference));liteBouncePhysics++;}
 }
 for(const control of['expired','grounded','pair','escape','idle']){lite.release();const g=new Fighter(c,'enemy',600,500,face);Object.assign(g,{state:'hit',stateFrame:-15,airborne:true,jumpHeight:80,[field]:total});if(control==='expired')g[field]=0;if(control==='grounded'){g.airborne=false;g.jumpHeight=0;}if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);if(control==='escape')g.throwEscapeFrames=12;if(control==='idle')g.state='idle';drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(animationSequenceFor(c.id,'super-hit'),true),null,'No bounce strip for '+kind+'/'+control);liteBounceControls++;}
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){const f=new Fighter(c,'enemy',600,500,face);Object.assign(f,{state:'hit',stateFrame:-30,airborne:true,jumpHeight:80,wallBounceFrames:14,groundBounceFrames:8,superVictimFrames:3,superVictimTotal:12});await assertAirKoBody(f,superHitSample(f),c.id+'/super-before-bounce');liteBouncePriority++;f.superVictimFrames=0;await assertBounceBody(f,wallBounceSample(f),c.id+'/wall-before-ground','wall');liteBouncePriority++;}
ctx.rotate=oldRotate;ctx.translate=oldTranslate;
lite.release();let liteBounceFailureRequests=0;globalThis.fetch=async()=>{liteBounceFailureRequests++;return{ok:false};};const failedBounce=new Fighter(CHARACTERS[0],'enemy',600,500,1);Object.assign(failedBounce,{state:'hit',stateFrame:-15,airborne:true,jumpHeight:80,wallBounceFrames:18});const failedBounceBefore=JSON.stringify(failedBounce);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedBounce,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(liteBounceFailureRequests,2);assert.equal(JSON.stringify(failedBounce),failedBounceBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,liteBounceFrames,liteBounceFrozen,liteBounceExpiry,liteBouncePhysics,liteBounceControls,liteBouncePriority,liteBounceFailureRequests}));

// Escape presentation follows its existing mapper and relinquishes the body on attack.
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let liteEscapeFrames=0,liteEscapeFrozen=0,liteEscapePhysics=0,liteEscapeAttacks=0,liteEscapeControls=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 for(const state of['idle','walk','crouch']){const f=new Fighter(c,'player',600,500,face);f.state=state;for(let left=12;left>0;left--){f.throwEscapeFrames=left;const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'throw-escape');await assertAirKoBody(f,s,c.id+'/escape/'+state+'/'+left);liteEscapeFrames++;}}
 const rules=new CombatWorld(c,c,'belt').rules;
 for(const side of['player','enemy'])for(const direction of[-1,1]){const f=new Fighter(c,side,600,500,face);f.throwEscaped(direction);const reference=Object.assign(Object.create(Object.getPrototypeOf(f)),f);for(let n=0;n<16;n++){const left=f.throwEscapeFrames,stop=f.hitStop;f.updatePlayer(quiet,rules);reference.updatePlayer(quiet,rules);assert.equal(JSON.stringify(f),JSON.stringify(reference));if(stop){assert.equal(f.throwEscapeFrames,left);liteEscapeFrozen++;}if(f.throwEscapeFrames>0)await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/escape/physics');else{paints.length=0;drawCombatFighter(ctx,f,1,0);assert(!paints.some(a=>a[0].__asset===animationSequenceFor(c.id,'throw-escape').liteAsset),'Expired escape must release body');}assert.equal(JSON.stringify(f),JSON.stringify(reference));liteEscapePhysics++;}}
 const f=new Fighter(c,'player',600,500,face);f.throwEscaped(-face);while(f.hitStop)f.updatePlayer(quiet,rules);assert.equal(f.throwEscapeFrames,12);f.updatePlayer({held:()=>false,pressed:key=>key==='lp',released:()=>false},rules);assert.equal(f.currentMove?.id,'5LP','First actionable LP must start before escape pose countdown expires');assert(f.throwEscapeFrames>0);await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/escape/early-LP');assert.notEqual(paints.find(a=>a[0].__lite)[0].__asset,animationSequenceFor(c.id,'throw-escape').liteAsset);liteEscapeAttacks++;
 for(const control of['expired','air','dash','hit','knockdown','ko','super','pair']){lite.release();const g=new Fighter(c,'player',600,500,face);g.throwEscapeFrames=12;if(control==='expired')g.throwEscapeFrames=0;if(control==='air'){g.airborne=true;g.jumpHeight=80;}if(control==='dash')g.dashFrames=4;if(control==='hit')g.state='hit';if(control==='knockdown')g.state='knockdown';if(control==='ko'){g.state='ko';g.hp=0;}if(control==='super'){g.superVictimFrames=12;g.superVictimTotal=12;}if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(animationSequenceFor(c.id,'throw-escape'),true),null,'No escape body for '+control);liteEscapeControls++;}
}
lite.release();let liteEscapeFailureRequests=0;globalThis.fetch=async()=>{liteEscapeFailureRequests++;return{ok:false};};const failedEscape=new Fighter(CHARACTERS[0],'player',600,500,1);failedEscape.throwEscapeFrames=12;const failedEscapeBefore=JSON.stringify(failedEscape),escapeImages=images.length;for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedEscape,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(liteEscapeFailureRequests,2);assert.equal(JSON.stringify(failedEscape),failedEscapeBefore);assert.equal(images.length,escapeImages,'Failed LOW escape must not allocate a full-size idle Image');textures.clearFocus();
console.log(JSON.stringify({passed:true,liteEscapeFrames,liteEscapeFrozen,liteEscapePhysics,liteEscapeAttacks,liteEscapeControls,liteEscapeFailureRequests}));

// Existing damaging-super event prepares only living scene actors without awaiting decode.
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let superPrepScenes=0,superPrepOwners=0,superPrepControls=0;
const sceneAudio={playStagePulse(){},playHit(){},playParry(){}};
for(const c of [...CHARACTERS,...BOSS_CHARACTERS]){
 textures.setMode('lite');const scene=new Stage1Scene(quiet,sceneAudio,c,c.superArts[0],1);scene.enter();scene.introFrames=0;for(const enemy of scene.world.enemies)enemy.aiCooldown=10000;
 if(c.id==='KEN')scene.world.enemies.at(-1).hp=0;const f=scene.world.player,move=[1,2,3].map(n=>superArtMoveFor(c.id,n)).find(m=>m.damage>0);assert(move);f.superGauge=1000;f.startMove(move);lite.release();scene.fixedUpdate(1/60,0);
 assert(scene.world.events.some(e=>e.type==='super-flash'&&e.power>0));const owners=[...new Set([f,...scene.world.enemies].filter(a=>a.hp>0).map(a=>a.character.id).filter(id=>!id.startsWith('GRUNT_')))];const before=[f,...scene.world.enemies].map(a=>JSON.stringify(a));assert(lite.snapshot().entries>0,'Damaging super flash begins LOW reaction preparation synchronously');assert.equal(lite.snapshot().ready,0,'fixedUpdate must return before asynchronous decoding');
 for(let n=0;n<owners.length+3;n++)await new Promise(setImmediate);assert.equal(lite.snapshot().entries,owners.length);for(const id of owners){assert(lite.selection(animationSequenceFor(id,'super-hit'),true),id+' reaction prepared before contact');superPrepOwners++;}assert.deepEqual([f,...scene.world.enemies].map(a=>JSON.stringify(a)),before);superPrepScenes++;scene.exit();textures.clearFocus();
}
for(const mode of['normal','hd','install']){textures.setMode(mode==='hd'?'hd':'lite');const c=CHARACTERS.find(c=>c.id===(mode==='install'?'YUN':'KEN')),scene=new Stage1Scene(quiet,sceneAudio,c,c.superArts[0],1);scene.enter();scene.introFrames=0;for(const e of scene.world.enemies)e.aiCooldown=10000;const f=scene.world.player;f.superGauge=mode==='normal'?0:1000;f.startMove(mode==='normal'?normalFor('lp',false,c.id):superArtMoveFor(c.id,mode==='install'?3:1));lite.release();scene.fixedUpdate(1/60,0);await new Promise(setImmediate);assert.equal(lite.snapshot().entries,0,'No LOW warm requests for '+mode);scene.exit();textures.clearFocus();superPrepControls++;}
textures.setMode('lite');console.log(JSON.stringify({passed:true,superPrepScenes,superPrepOwners,superPrepControls}));

// Standing defensive clocks retain authored bodies, with immediate ownership at expiry.
globalThis.fetch=async asset=>({ok:true,blob:async()=>Object.assign(new Blob(['fixture']),{__asset:asset})});
let liteDefenseFrames=0,liteDefenseFrozen=0,liteDefenseRecoveries=0,liteDefensePhysics=0,liteDefenseControls=0;
const standingDefenseState = fighter => JSON.stringify(fighter, (key, value) => key === 'uid' ? undefined : value);
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){
 for(const state of['block','parry'])for(const duration of(state==='block'?[6,16,24]:[8,10])){const f=new Fighter(c,'player',600,500,face);f.state=state;f.guardAnimationDuration=f.parryAnimationDuration=duration;for(let elapsed=0;elapsed<duration;elapsed++){f.stateFrame=elapsed-duration;await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/standing-defense/'+state+'/'+duration+'/'+elapsed);liteDefenseFrames++;}f.stateFrame=-duration;f.hitStop=3;const frozen=JSON.stringify({...f,hitStop:0}),rules=new CombatWorld(c,c,'belt').rules;for(let n=0;n<3;n++){f.updatePlayer(quiet,rules);assert.equal(JSON.stringify({...f,hitStop:0}),frozen);await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/standing-defense/frozen');liteDefenseFrozen++;}}
 for(const kind of['guard','parry','red-parry']){const f=new Fighter(c,'player',600,500,face),a=new Fighter(c,'enemy',650,500,-face),rules=new CombatWorld(c,c,'belt').rules;if(kind==='parry')f.parryWindow=1;if(kind==='red-parry')f.redParryWindow=1;assert.equal(f.receiveHit(normalFor('mp',false,c.id),a,kind==='guard'),kind==='guard'?'block':kind);const reference=new Fighter(c,'player',600,500,face);if(kind==='parry')reference.parryWindow=1;if(kind==='red-parry')reference.redParryWindow=1;reference.receiveHit(normalFor('mp',false,c.id),a,kind==='guard');for(let n=0;n<80&&(f.state==='block'||f.state==='parry');n++){await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/standing-defense/actual/'+kind);f.updatePlayer(quiet,rules);reference.updatePlayer(quiet,rules);assert.equal(standingDefenseState(f),standingDefenseState(reference));liteDefensePhysics++;}assert.equal(f.state,'idle');f.updatePlayer({held:()=>false,pressed:key=>key==='lp',released:()=>false},rules);assert.equal(f.currentMove?.id,'5LP');await assertAirKoBody(f,animationSequenceSample(f,0),c.id+'/standing-defense/post-LP');const asset=paints.find(a=>a[0].__lite)[0].__asset;assert.notEqual(asset,animationSequenceFor(c.id,'guard').asset);assert.notEqual(asset,animationSequenceFor(c.id,'parry').asset);liteDefenseRecoveries++;}
 for(const control of['air','low','pair','super','wall','ground','dead','attack']){lite.release();const g=new Fighter(c,'player',600,500,face);Object.assign(g,{state:'block',stateFrame:-8,guardAnimationDuration:16});if(control==='air'){g.airborne=true;g.jumpHeight=80;}if(control==='low')g.crouchAnimationFrame=5;if(control==='pair')g.beginThrowSync('victim',face,1,24,c.id);if(control==='super')g.superVictimFrames=12;if(control==='wall')g.wallBounceFrames=6;if(control==='ground')g.groundBounceFrames=6;if(control==='dead')g.hp=0;if(control==='attack')g.startMove(normalFor('lp',false,c.id));drawCombatFighter(ctx,g,1,0);for(let n=0;n<4;n++)await new Promise(setImmediate);assert.equal(lite.selection(animationSequenceFor(c.id,'guard'),true),null,'No standing guard for '+control);assert.equal(lite.selection(animationSequenceFor(c.id,'parry'),true),null);liteDefenseControls++;}
}
lite.release();let liteDefenseFailureRequests=0;globalThis.fetch=async()=>{liteDefenseFailureRequests++;return{ok:false};};const failedDefense=new Fighter(CHARACTERS[0],'player',600,500,1);Object.assign(failedDefense,{state:'block',stateFrame:-8,guardAnimationDuration:16});const failedDefenseBefore=JSON.stringify(failedDefense);for(let n=0;n<100;n++){paints.length=0;drawCombatFighter(ctx,failedDefense,1,n);await new Promise(setImmediate);assert.equal(paints.filter(a=>a[0].__lite).length,0);}assert.equal(liteDefenseFailureRequests,2);assert.equal(JSON.stringify(failedDefense),failedDefenseBefore);textures.clearFocus();
console.log(JSON.stringify({passed:true,liteDefenseFrames,liteDefenseFrozen,liteDefenseRecoveries,liteDefensePhysics,liteDefenseControls,liteDefenseFailureRequests}));

// A LOW belt stage should prepare both quick standing attacks before input.
globalThis.fetch = async asset => ({ ok: true, blob: async () => Object.assign(new Blob(['fixture']), { __asset: asset }) });
const quickOpeners = [['lp', 'stand-light'], ['lk', 'stand-light-kick']];
const standingNormals = [...quickOpeners, ['mp', 'stand-medium'], ['hp', 'stand-heavy'], ['mk', 'stand-medium-kick'], ['hk', 'stand-heavy-kick']];
const crouchingNormals = [['lp', 'crouch-light'], ['mp', 'crouch-medium'], ['hp', 'crouch-heavy'],
  ['lk', 'crouch-light-kick'], ['mk', 'crouch-medium-kick'], ['hk', 'crouch-heavy-kick']].map(([button, kind]) => [button, kind, 'crouch']);
const airNormals = [['lp', 'air-light-punch'], ['mp', 'air-medium-punch'], ['hp', 'air-heavy-punch'],
  ['lk', 'air-light-kick'], ['mk', 'air-medium-kick'], ['hk', 'air-heavy-kick']].map(([button, kind]) => [button, kind, 'air']);
const basicNormals = [...standingNormals, ...crouchingNormals, ...airNormals];
const assetSize = asset => statSync(new URL('../public' + asset, import.meta.url)).size;
const { CAMPAIGN_OFFLINE_URLS } = await import('../dist/assets/core/AssetManager.js');
const burstMovement = ['dash', 'dash-back', 'landing'];
let compactMovementCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const facing of [-1, 1]) for (const [index, kind] of burstMovement.entries()) {
    const fighter = new Fighter(character, 'player', 600, 500, facing);
    if (kind === 'landing') fighter.landingFrames = 8;
    else Object.assign(fighter, { state: 'walk', dashFrames: 7, dashDirection: index === 0 ? facing : -facing });
    const sequence = animationSequenceFor(character.id, kind, true);
    lite.selection(sequence);
    await new Promise(setImmediate);
    await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/' + kind);
    assert(sequence.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 8);
    compactMovementCases++;
  }
}
lite.release();
const dashFighter = new Fighter(CHARACTERS[0], 'player', 600, 500, 1);
Object.assign(dashFighter, { state: 'walk', dashFrames: 7, dashDirection: 1 });
const dashStrip = animationSequenceFor(dashFighter.character.id, 'dash', true);
paints.length = 0;
drawCombatFighter(ctx, dashFighter, 1, 0);
assert(!paints.some(draw => draw[0].__lite));
await new Promise(setImmediate);
assert(lite.selection(dashStrip, true), 'Cold dash prepares its strip for future dashes');
dashFighter.animationFrame++;
dashFighter.dashFrames--;
paints.length = 0;
drawCombatFighter(ctx, dashFighter, 1, 0);
assert(!paints.some(draw => draw[0].__lite), 'Decode during dash cannot replace its fallback body');
dashFighter.animationFrame += 15;
dashFighter.dashFrames = 7;
await assertAirKoBody(dashFighter, animationSequenceSample(dashFighter, 0), 'Next dash uses the loaded strip');
lite.release();
const landingFighter = new Fighter(CHARACTERS[0], 'player', 600, 500, 1);
Object.assign(landingFighter, { state: 'jump', airborne: true, jumpHeight: 32, jumpVelocity: -8 });
drawCombatFighter(ctx, landingFighter, 1, 0);
await new Promise(setImmediate);
const landingStrip = animationSequenceFor(landingFighter.character.id, 'landing', true);
assert(lite.selection(landingStrip, true), 'Normal descent prepares the immediate landing');
Object.assign(landingFighter, { state: 'walk', airborne: false, jumpHeight: 0, landingFrames: 8 });
paints.length = 0;
drawCombatFighter(ctx, landingFighter, 1, 0);
assert(!paints.some(draw => draw[0].__asset === landingStrip.liteAsset), 'Walking takes priority on contact');
lite.release();
let compactJumpCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const jump = animationSequenceFor(character.id, 'jump', true);
  for (const facing of [-1, 1]) {
    const world = new CombatWorld(character, character, 'duel');
    const fighter = world.player;
    fighter.facing = facing;
    lite.selection(jump);
    await new Promise(setImmediate);
    fighter.updatePlayer({ ...quiet, pressed: key => key === 'jump' }, world.rules);
    const drawnFrames = new Set();
    while (fighter.airborne) {
      const sample = animationSequenceSample(fighter, 0);
      await assertAirKoBody(fighter, sample, character.id + '/jump/' + facing);
      drawnFrames.add(sample.frame);
      fighter.updatePlayer(quiet, world.rules);
    }
    assert.deepEqual([...drawnFrames], [0, 1, 2, 3, 4, 5, 6, 7]);
    fighter.updatePlayer({ ...quiet, pressed: key => key === 'jump' }, world.rules);
    fighter.updatePlayer({ ...quiet, pressed: key => key === 'lp' }, world.rules);
    await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/jump-to-punch');
    assert.notEqual(paints.find(draw => draw[0].__lite)[0].__asset, jump.liteAsset);
    compactJumpCases++;
  }
  assert(jump.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(jump.liteAsset));
  assert(assetSize(jump.liteAsset) < assetSize(jump.asset) / 8);
}
lite.release();
const coldJumpWorld = new CombatWorld(CHARACTERS[0], CHARACTERS[0], 'duel');
const coldJump = coldJumpWorld.player;
const jumpInput = { ...quiet, pressed: key => key === 'jump' };
coldJump.updatePlayer(jumpInput, coldJumpWorld.rules);
drawCombatFighter(ctx, coldJump, 1, 0);
await new Promise(setImmediate);
const coldJumpStrip = animationSequenceFor(coldJump.character.id, 'jump', true);
assert(lite.selection(coldJumpStrip, true), 'First jump warms the next one');
while (coldJump.airborne) {
  paints.length = 0;
  drawCombatFighter(ctx, coldJump, 1, 0);
  assert(!paints.some(draw => draw[0].__asset === coldJumpStrip.liteAsset), 'A late image cannot replace the pose in midair');
  coldJump.updatePlayer(quiet, coldJumpWorld.rules);
}
coldJump.updatePlayer(jumpInput, coldJumpWorld.rules);
await assertAirKoBody(coldJump, animationSequenceSample(coldJump, 0), 'Next jump uses warm strip immediately');
lite.release();
let compactCrouchCases = 0;
const crouchInput = { ...quiet, held: key => key === 'down' };
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const crouch = animationSequenceFor(character.id, 'crouch', true);
  for (const facing of [-1, 1]) {
    const world = new CombatWorld(character, character, 'duel');
    const fighter = world.player;
    fighter.facing = facing;
    lite.selection(crouch);
    await new Promise(setImmediate);
    for (let frame = 0; frame <= 5; frame++) {
      fighter.updatePlayer(crouchInput, world.rules);
      const sample = animationSequenceSample(fighter, 0);
      assert.equal(sample.frame, frame);
      await assertAirKoBody(fighter, sample, character.id + '/crouch-in');
    }
    const forward = facing === 1 ? 'right' : 'left';
    for (let frame = 4; frame >= -1; frame--) {
      fighter.updatePlayer({ ...quiet, held: key => key === forward }, world.rules);
      const sample = animationSequenceSample(fighter, 0);
      assert.equal(sample.sequence.kind, frame < 0 ? 'walk' : 'crouch');
      if (frame >= 0) {
        assert.equal(sample.frame, frame);
        await assertAirKoBody(fighter, sample, character.id + '/crouch-out');
      } else {
        paints.length = 0;
        drawCombatFighter(ctx, fighter, 1, 0);
        assert(!paints.some(draw => draw[0].__asset === crouch.liteAsset));
      }
    }
    fighter.updatePlayer({ ...crouchInput, pressed: key => key === 'lk' }, world.rules);
    assert.equal(fighter.currentMove?.id, '2LK');
    await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/crouch-to-kick');
    compactCrouchCases++;
  }
  assert(crouch.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(crouch.liteAsset));
  assert(assetSize(crouch.liteAsset) < assetSize(crouch.asset) / 8);
}
lite.release();
const coldCrouchWorld = new CombatWorld(CHARACTERS[0], CHARACTERS[0], 'duel');
const coldCrouch = coldCrouchWorld.player;
const coldCrouchStrip = animationSequenceFor(coldCrouch.character.id, 'crouch', true);
coldCrouch.updatePlayer(crouchInput, coldCrouchWorld.rules);
drawCombatFighter(ctx, coldCrouch, 1, 0);
await new Promise(setImmediate);
assert(lite.selection(coldCrouchStrip, true), 'First crouch prepares its strip');
for (const input of [...Array(8).fill(crouchInput), ...Array(6).fill(quiet)]) {
  coldCrouch.updatePlayer(input, coldCrouchWorld.rules);
  paints.length = 0;
  drawCombatFighter(ctx, coldCrouch, 1, 0);
  assert(!paints.some(draw => draw[0].__asset === coldCrouchStrip.liteAsset), 'No late change during the same crouch');
}
coldCrouch.updatePlayer(crouchInput, coldCrouchWorld.rules);
await assertAirKoBody(coldCrouch, animationSequenceSample(coldCrouch, 0), 'Next crouch starts with the prepared strip');
lite.release();
let compactWalkCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const facing of [-1, 1]) {
    for (const mode of ['duel', 'belt']) {
      const world = new CombatWorld(character, character, mode);
      const fighter = world.player;
      fighter.x = fighter.previousX = 600;
      fighter.facing = facing;
      for (const direction of [facing, -facing]) {
        const kind = direction === facing ? 'walk' : 'walk-back';
        const walk = animationSequenceFor(character.id, kind, true);
        lite.selection(walk);
        await new Promise(setImmediate);
        const input = { ...quiet, held: key => key === (direction === 1 ? 'right' : 'left') };
        const startX = fighter.x;
        const frames = new Set();
        for (let tick = 0; tick < 25; tick++) {
          fighter.updatePlayer(input, world.rules);
          const sample = animationSequenceSample(fighter, 0);
          assert.equal(sample.sequence.kind, kind);
          if (tick === 0) assert.equal(sample.frame, 0);
          await assertAirKoBody(fighter, sample, character.id + '/' + kind);
          frames.add(sample.frame);
        }
        assert(frames.size >= 4);
        assert.equal(Math.sign(fighter.x - startX), direction);
        assert(walk.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(walk.liteAsset));
        assert(assetSize(walk.liteAsset) < assetSize(walk.asset) / 8);
        compactWalkCases++;
      }
      fighter.updatePlayer({ ...quiet, pressed: key => key === 'lp' }, world.rules);
      assert.equal(fighter.currentMove?.id, '5LP');
      await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/walk-to-punch');
    }
  }
}
lite.release();
const coldWalkWorld = new CombatWorld(CHARACTERS[0], CHARACTERS[0], 'duel');
const coldWalk = coldWalkWorld.player;
const forwardWalkInput = { ...quiet, held: key => key === 'right' };
const forwardStrip = animationSequenceFor(coldWalk.character.id, 'walk', true);
coldWalk.updatePlayer(forwardWalkInput, coldWalkWorld.rules);
drawCombatFighter(ctx, coldWalk, 1, 0);
await new Promise(setImmediate);
assert(lite.selection(forwardStrip, true), 'First walk prepares its strip');
for (let tick = 0; tick < 12; tick++) {
  coldWalk.updatePlayer(forwardWalkInput, coldWalkWorld.rules);
  paints.length = 0;
  drawCombatFighter(ctx, coldWalk, 1, 0);
  assert(!paints.some(draw => draw[0].__asset === forwardStrip.liteAsset), 'No late replacement during the same walk');
}
coldWalk.updatePlayer(quiet, coldWalkWorld.rules);
coldWalk.updatePlayer(forwardWalkInput, coldWalkWorld.rules);
await assertAirKoBody(coldWalk, animationSequenceSample(coldWalk, 0), 'Next walk starts with the prepared strip');
lite.release();
let compactIdleCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const idle = animationSequenceFor(character.id, 'idle', true);
  for (const facing of [-1, 1]) {
    const world = new CombatWorld(character, character, 'duel');
    const fighter = world.player;
    fighter.facing = facing;
    lite.selection(idle);
    await new Promise(setImmediate);
    const frames = new Set();
    for (let tick = 0; tick < 88; tick++) {
      const sample = animationSequenceSample(fighter, 0);
      assert.equal(sample.sequence.kind, 'idle');
      await assertAirKoBody(fighter, sample, character.id + '/idle/' + facing);
      frames.add(sample.frame);
      fighter.updatePlayer(quiet, world.rules);
    }
    assert.equal(frames.size, idle.frameCount);
    fighter.updatePlayer({ ...quiet, pressed: key => key === 'lp' }, world.rules);
    assert.equal(fighter.currentMove?.id, '5LP');
    await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/idle-to-punch');
    while (fighter.currentMove) fighter.updatePlayer(quiet, world.rules);
    await assertAirKoBody(fighter, animationSequenceSample(fighter, 0), character.id + '/punch-to-idle');
    compactIdleCases++;
  }
  assert(idle.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(idle.liteAsset));
  assert(assetSize(idle.liteAsset) < assetSize(idle.asset) / 8);
}
lite.release();
const coldIdleWorld = new CombatWorld(CHARACTERS[0], CHARACTERS[0], 'duel');
const coldIdle = coldIdleWorld.player;
const coldIdleStrip = animationSequenceFor(coldIdle.character.id, 'idle', true);
while (animationSequenceSample(coldIdle, 0).frame === 0) coldIdle.updatePlayer(quiet, coldIdleWorld.rules);
drawCombatFighter(ctx, coldIdle, 1, 0);
await new Promise(setImmediate);
assert(lite.selection(coldIdleStrip, true), 'Idle can prepare without blocking a paint');
while (animationSequenceSample(coldIdle, 0).frame !== 0) {
  paints.length = 0;
  drawCombatFighter(ctx, coldIdle, 1, 0);
  assert(!paints.some(draw => draw[0].__asset === coldIdleStrip.liteAsset), 'A late idle strip waits for the start of the breathing loop');
  coldIdle.updatePlayer(quiet, coldIdleWorld.rules);
}
await assertAirKoBody(coldIdle, animationSequenceSample(coldIdle, 0), 'First frame of next idle loop');
while (animationSequenceSample(coldIdle, 0).frame === 0) coldIdle.updatePlayer(quiet, coldIdleWorld.rules);
await assertAirKoBody(coldIdle, animationSequenceSample(coldIdle, 0), 'Idle loop stays active after transition');
lite.release();
let compactVictoryCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const victory = animationSequenceFor(character.id, 'victory', true);
  for (const facing of [-1, 1]) {
    const fighter = new Fighter(character, 'player', 600, 500, facing);
    fighter.enterVictoryPose();
    lite.selection(victory);
    await new Promise(setImmediate);
    const frames = new Set();
    for (const tick of [0, 5, 10, 15, 20, 25, 30, 35, 60, 120]) {
      fighter.stateFrame = fighter.animationFrame = tick;
      const sample = animationSequenceSample(fighter, 0);
      assert.equal(sample.frame, Math.min(7, Math.floor(tick / 5)));
      await assertAirKoBody(fighter, sample, character.id + '/victory');
      frames.add(sample.frame);
    }
    assert.equal(frames.size, 8);
    compactVictoryCases++;
  }
  assert(victory.liteAsset && CAMPAIGN_OFFLINE_URLS.includes(victory.liteAsset));
  assert(assetSize(victory.liteAsset) < assetSize(victory.asset) / 8);
}
lite.release();
const coldWinner = new Fighter(CHARACTERS[0], 'player', 600, 500, 1);
coldWinner.enterVictoryPose();
coldWinner.stateFrame = coldWinner.animationFrame = 10;
const coldVictory = animationSequenceFor(coldWinner.character.id, 'victory', true);
drawCombatFighter(ctx, coldWinner, 1, 0);
await new Promise(setImmediate);
assert(lite.selection(coldVictory, true), 'Cold victory prepares without blocking rendering');
coldWinner.stateFrame = coldWinner.animationFrame = 15;
paints.length = 0;
drawCombatFighter(ctx, coldWinner, 1, 0);
assert(!paints.some(draw => draw[0].__asset === coldVictory.liteAsset), 'Do not switch art during the celebration');
coldWinner.stateFrame = coldWinner.animationFrame = 35;
await assertAirKoBody(coldWinner, animationSequenceSample(coldWinner, 0), 'Adopt late final victory pose');
lite.release();
const victoryScene = new Stage1Scene(quiet, sceneAudio, CHARACTERS[0], CHARACTERS[0].superArts[0], 1);
victoryScene.enter();
victoryScene.prepareDuel();
victoryScene.phase = 'duel';
victoryScene.introFrames = 0;
lite.release();
victoryScene.concludeDuelRound('enemy', 'ko');
await new Promise(setImmediate);
assert(lite.selection(animationSequenceFor(victoryScene.world.enemy.character.id, 'victory', true), true));
assert.equal(lite.selection(animationSequenceFor(victoryScene.world.player.character.id, 'victory', true), true), null);
victoryScene.exit();
textures.clearFocus();
textures.focusEnding(CHARACTERS[0].id);
await new Promise(setImmediate);
assert(lite.selection(coldVictory, true), 'Ending prepares the winner strip before reveal');
textures.clearFocus();
let compactCommandNormals = 0;
for (const character of CHARACTERS) {
  const rules = new CombatWorld(character, character, 'duel').rules;
  for (const [button] of standingNormals) {
    const move = commandNormalFor(character.id, button, true);
    if (!move) continue;
    const fighter = new Fighter(character, 'player', 600, 500, 1);
    fighter.updatePlayer({ ...quiet, held: key => key === 'right', pressed: key => key === button }, rules);
    assert.equal(fighter.currentMove?.id, move.id);
    const sample = animationSequenceSample(fighter, 0);
    const sequence = sample?.sequence;
    assert(sequence?.liteAsset, `${move.id} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 8, move.id + ' LOW size budget');
    await assertAirKoBody(fighter, sample, move.id + '/compact');
    compactCommandNormals++;
  }
}
assert.equal(compactCommandNormals, CHARACTERS.length);
let compactSuperHitAssets = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const sequence = animationSequenceFor(character.id, 'super-hit', true);
  assert(sequence?.liteAsset, `${character.id} super-hit has a dedicated LOW file`);
  assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
  assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
  compactSuperHitAssets++;
}
let compactThrowAssets = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const kind of ['throw-attacker', 'throw-victim', 'throw-escape']) {
    const sequence = animationSequenceFor(character.id, kind, true);
    assert(sequence?.liteAsset, `${character.id} ${kind} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    compactThrowAssets++;
  }
}
let compactSpecialAssets = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const slot of ['primary', 'mobility', 'antiAir']) {
    const fighter = new Fighter(character, 'player', 600, 500, 1);
    fighter.startMove(specialMovesFor(character.id)[slot]);
    const sample = animationSequenceSample(fighter, 0);
    const sequence = sample?.sequence;
    assert(sequence?.liteAsset, `${character.id} ${slot} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    await assertAirKoBody(fighter, sample, `${character.id}/${slot}/compact`);
    compactSpecialAssets++;
  }
}
lite.release();
let compactSupers = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  const canonical = specialMovesFor(character.id).super;
  const selectable = CHARACTERS.includes(character)
    ? character.superArts.map(art => superArtMoveFor(character.id, art.id, art.gauge))
    : [];
  for (const move of [canonical, ...selectable]) {
    const fighter = new Fighter(character, 'player', 600, 500, 1);
    fighter.superGauge = move.superCost;
    fighter.startMove(move);
    if (move.kind === 'throw') {
      const opening = animationSequenceSample(fighter, 0);
      assert(opening?.sequence.liteAsset, move.id + ' needs a compact startup strip');
      assert(CAMPAIGN_OFFLINE_URLS.includes(opening.sequence.liteAsset));
      await assertAirKoBody(fighter, opening, move.id + '/startup');
      fighter.beginThrowSync('attacker', 1, 1, 24, character.id);
      if (move.launch) Object.assign(fighter, { airborne: true, jumpHeight: move.launch, moveFrame: move.startup });
    }
    const sample = move.kind === 'throw' ? throwAttackerSample(fighter) : animationSequenceSample(fighter, 0);
    const sequence = sample?.sequence;
    assert(sequence?.liteAsset, `${move.id} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    await assertAirKoBody(fighter, sample, `${move.id}/compact`);
    compactSupers++;
  }
}
lite.release();
let compactDamageAssets = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const kind of ['hit', 'knockdown', 'fall', 'ko']) {
    const sequence = animationSequenceFor(character.id, kind, true);
    assert(sequence.liteAsset, `${character.id} ${kind} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    compactDamageAssets++;
  }
}
let compactDefenseAssets = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const kind of ['guard', 'parry']) {
    const sequence = animationSequenceFor(character.id, kind, true);
    assert(sequence.liteAsset, `${character.id} ${kind} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    compactDefenseAssets++;
  }
}
let compactCrouchDefense = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) {
  for (const [state, kind] of [['block', 'crouch-guard'], ['parry', 'crouch-parry']]) {
    lite.release();
    const fighter = new Fighter(character, 'player', 600, 500, 1);
    Object.assign(fighter, { state, stateFrame: -6, guardAnimationDuration: 16, parryAnimationDuration: 10, crouchAnimationFrame: 1 });
    const sequence = animationSequenceFor(character.id, kind, true);
    paints.length = 0;
    drawCombatFighter(ctx, fighter, 1, 0);
    assert(!paints.some(draw => draw[0].__lite), 'Partial crouch keeps the existing transition');
    await new Promise(setImmediate);
    assert(lite.selection(sequence, true), `${character.id} ${kind} prepares during entry`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(sequence.liteAsset));
    assert(assetSize(sequence.liteAsset) < assetSize(sequence.asset) / 10);
    fighter.crouchAnimationFrame = 5;
    const before = JSON.stringify(fighter);
    paints.length = 0;
    drawCombatFighter(ctx, fighter, 1, 0);
    assert(paints.some(draw => draw[0].__lite && draw[0].__asset === sequence.liteAsset));
    assert.equal(JSON.stringify(fighter), before);
    compactCrouchDefense++;
  }
}
lite.release();
let fullBasicBytes = 0;
let liteBasicBytes = 0;
const basicAttackRoster = [...CHARACTERS, ...BOSS_CHARACTERS];
for (const character of basicAttackRoster) {
  textures.setMode('lite');
  const scene = new Stage1Scene(quiet, sceneAudio, character, character.superArts[0], 1);
  const actor = scene.world.player;
  const before = JSON.stringify(actor);
  scene.enter();
  assert.deepEqual(lite.snapshot(), { entries: 2, ready: 0, pixels: 0, active: true });
  await new Promise(setImmediate);
  assert.equal(JSON.stringify(actor), before);
  for (const [index, [button, kind, stance]] of basicNormals.entries()) {
    const opening = animationSequenceFor(character.id, kind, true);
    assert(opening.liteAsset, `${character.id} ${kind} has a dedicated LOW file`);
    assert(CAMPAIGN_OFFLINE_URLS.includes(opening.liteAsset));
    const fullBytes = assetSize(opening.asset);
    const liteBytes = assetSize(opening.liteAsset);
    assert(liteBytes < fullBytes / 10);
    fullBasicBytes += fullBytes;
    liteBasicBytes += liteBytes;
    const prewarmed = index < quickOpeners.length;
    assert.equal(!!lite.selection(opening, true), prewarmed, `${character.id} ${button} preload policy`);
    actor.airborne = stance === 'air';
    actor.jumpHeight = actor.airborne ? 64 : 0;
    actor.startMove(actor.airborne ? airNormalFor(character.id, button) : normalFor(button, stance === 'crouch', character.id));
    if (!prewarmed) {
      drawCombatFighter(ctx, actor, 1, 0);
      await new Promise(setImmediate);
    }
    paints.length = 0;
    drawCombatFighter(ctx, actor, 1, 0);
    assert(paints.some(draw => draw[0].__asset === opening.liteAsset), `${character.id} draws compact ${button}`);
  }
  scene.exit();
  textures.clearFocus();
}
const compactKick = animationSequenceFor('KEN', 'stand-light-kick', true);
for (const failure of [null, 'http', 'network']) {
  lite.release();
  const requests = [];
  globalThis.fetch = async asset => {
    requests.push(asset);
    if (asset === compactKick.liteAsset && failure === 'http') return { ok: false };
    if (asset === compactKick.liteAsset && failure === 'network') throw new TypeError('offline');
    return { ok: true, blob: async () => Object.assign(new Blob(['fixture']), { __asset: asset }) };
  };
  lite.selection(compactKick);
  await new Promise(setImmediate);
  assert.deepEqual(requests, failure ? [compactKick.liteAsset, compactKick.asset] : [compactKick.liteAsset]);
  assert(lite.selection(compactKick, true));
}
textures.setMode('hd');
const hdOpening = new Stage1Scene(quiet, sceneAudio, CHARACTERS[0], CHARACTERS[0].superArts[0], 1);
hdOpening.enter();
assert.equal(lite.snapshot().entries, 0, 'HD stage entry does not decode a LOW opening strip');
hdOpening.exit();
textures.clearFocus();
textures.setMode('lite');
console.log(JSON.stringify({ quickOpeningAttacks: basicAttackRoster.length * quickOpeners.length, compactBasicAttacks: basicAttackRoster.length * basicNormals.length, compactDefenseAssets, compactCrouchDefense, compactDamageAssets, compactSpecialAssets, compactSupers, compactThrowAssets, compactSuperHitAssets, compactCommandNormals, compactMovementCases, compactJumpCases, compactCrouchCases, compactWalkCases, compactIdleCases, compactVictoryCases, fullBasicBytes, liteBasicBytes, hdOpeningExcluded: true }));

// Exercise the render loop's real adaptive decision without advancing combat.
const { GameApp } = await import('../dist/assets/core/GameApp.js');
const previousTier = runtimeQuality.currentTier;
runtimeQuality.setTier('low', false);
runtimeQuality.setTier('high', false);
textures.setMode('auto');
const adaptiveCharacter = CHARACTERS.find(character => character.id === 'KEN');
const adaptiveScene = new Stage1Scene(quiet, sceneAudio, adaptiveCharacter, adaptiveCharacter.superArts[0], 1);
adaptiveScene.enter();
const adaptiveActor = JSON.stringify(adaptiveScene.world.player);
let qualityChanges = 0;
const fakeApp = {
  telemetry: { sampleFrame() {}, noteQualityChange() { qualityChanges += 1; } },
  scenes: { activeScene: adaptiveScene, render() {} },
  resize() {}, ctx: { setTransform() {}, clearRect() {} },
  canvas: { width: 1280, height: 720 }, dpr: 1, viewScale: 1, logicalWidth: 1280, logicalHeight: 720,
};
for (let tick = 0; tick < 23; tick += 1) GameApp.prototype.render.call(fakeApp, 1, 1 / 12);
assert.equal(runtimeQuality.currentTier, 'balanced');
assert.equal(lite.snapshot().entries, 0);
GameApp.prototype.render.call(fakeApp, 1, 1 / 12);
assert.equal(runtimeQuality.currentTier, 'low');
assert.equal(lite.snapshot().entries, 2, 'LOW downgrade requests both opening strips before input');
await new Promise(setImmediate);
for (const [, kind] of quickOpeners) assert(lite.selection(animationSequenceFor(adaptiveCharacter.id, kind, true), true));
for (let tick = 0; tick < 30; tick += 1) GameApp.prototype.render.call(fakeApp, 1, 1 / 60);
assert.equal(lite.snapshot().entries, 2);
assert.equal(qualityChanges, 2);
assert.equal(JSON.stringify(adaptiveScene.world.player), adaptiveActor);
adaptiveScene.exit();
textures.clearFocus();
runtimeQuality.setTier(previousTier);
textures.setMode('lite');
console.log(JSON.stringify({ adaptiveOpening: true, qualityChanges }));


// The selected LOW super is requested before the input that starts it.
const kenSuperCharacter = CHARACTERS.find(c => c.id === 'KEN');
const kenSuperArt = kenSuperCharacter.superArts[0];
const kenSuperStrip = animationSequenceFor('KEN', 'shoryuken', true);
const { TrainingSession } = await import('../dist/assets/training/TrainingSession.js');
let superWarmCases = 0;
for (const mode of ['training', 'meter', 'empty', 'hd']) {
  textures.clearFocus();
  textures.setMode(mode === 'hd' ? 'hd' : 'lite');
  const requests = [];
  globalThis.fetch = async asset => {
    requests.push(asset);
    return { ok: true, blob: async () => Object.assign(new Blob(['fixture']), { __asset: asset }) };
  };
  const scene = new Stage1Scene(quiet, sceneAudio, kenSuperCharacter, kenSuperArt, 1);
  if (mode === 'training') {
    scene.startTraining(new TrainingSession(), kenSuperCharacter);
  } else {
    scene.enter();
    scene.introFrames = 0;
    if (mode !== 'empty') scene.world.player.superGauge = Math.ceil(kenSuperArt.gauge * .75);
    scene.fixedUpdate(1 / 60, 8);
  }
  const fighter = scene.world.player;
  assert.equal(fighter.currentMove, null);
  assert.equal(lite.selection(kenSuperStrip, true), null, 'Combat does not wait on a pending decode');
  for (let i = 0; i < 5; i++) await new Promise(setImmediate);
  const warm = mode === 'training' || mode === 'meter';
  assert.equal(requests.filter(asset => asset === kenSuperStrip.liteAsset).length, warm ? 1 : 0, mode + ' preparation');
  assert(!requests.includes(kenSuperStrip.asset), 'No HQ decode for LOW preparation');
  assert(!requests.includes(animationSequenceFor('KEN', 'super-rush', true).liteAsset), 'An unselected super stays cold');
  if (warm) {
    fighter.superGauge = kenSuperArt.gauge;
    fighter.startMove(superArtMoveFor('KEN', kenSuperArt.id, kenSuperArt.gauge));
    const before = JSON.stringify(fighter);
    paints.length = 0;
    drawCombatFighter(ctx, fighter, 1, 0);
    assert(paints.some(args => args[0].__asset === kenSuperStrip.liteAsset), mode + ' already draws the authored first frame');
    assert.equal(JSON.stringify(fighter), before);
  }
  scene.exit();
  textures.clearFocus();
  superWarmCases++;
}
textures.setMode('lite');
console.log('LITE_SELECTED_SUPER_PREWARM_PASS', { superWarmCases });


// Grounded supers switch strips on contact, while Alex's aerial one retains its own.
let superGrabWarmCases = 0;
for (const [id, artIndex, startupKind, contactKind] of [
  ['ALEX', 0, 'hyper-bomb', 'throw-attacker'],
  ['ALEX', 2, 'stun-gun-headbutt', 'stun-gun-headbutt'],
  ['IBUKI', 1, 'yoroi-doroshi', 'throw-attacker'],
]) {
  textures.clearFocus();
  const requests = [];
  globalThis.fetch = async asset => {
    requests.push(asset);
    return { ok: true, blob: async () => Object.assign(new Blob(['fixture']), { __asset: asset }) };
  };
  const character = CHARACTERS.find(c => c.id === id);
  const victimCharacter = CHARACTERS.find(c => c.id === 'RYU');
  const art = character.superArts[artIndex];
  const scene = new Stage1Scene(quiet, sceneAudio, character, art, 1);
  scene.startTraining(new TrainingSession(), victimCharacter);
  const wanted = new Set([
    animationSequenceFor(id, startupKind, true),
    animationSequenceFor(id, contactKind, true),
    animationSequenceFor('RYU', 'throw-victim', true),
  ]);
  assert.equal(lite.snapshot().ready, 0, 'Training entry remains synchronous');
  for (let i = 0; i < 8; i++) await new Promise(setImmediate);
  for (const strip of wanted) {
    assert.equal(requests.filter(url => url === strip.liteAsset).length, 1, id + '/' + art.id + ' ' + strip.kind);
    assert(lite.selection(strip, true), strip.id + ' is ready before grabbing');
    assert(CAMPAIGN_OFFLINE_URLS.includes(strip.liteAsset));
    assert(assetSize(strip.liteAsset) < assetSize(strip.asset) / 6);
  }
  if (id === 'ALEX' && artIndex === 2) {
    assert(!requests.includes(animationSequenceFor(id, 'throw-attacker', true).liteAsset));
  }
  const { player, enemy } = scene.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 558;
  player.superGauge = art.gauge;
  player.startMove(superArtMoveFor(id, art.id, art.gauge));
  paints.length = 0;
  drawCombatFighter(ctx, player, 1, 0);
  assert(paints.some(args => args[0].__asset === animationSequenceFor(id, startupKind, true).liteAsset), 'The authored strip owns startup');
  for (let tick = 1; tick < 45 && !player.throwSyncFrames; tick++) scene.fixedUpdate(1 / 60, tick);
  assert(player.throwSyncFrames > 0 && enemy.throwSyncFrames > 0, id + '/' + art.id + ' lands a grab');
  const before = JSON.stringify([player, enemy]);
  paints.length = 0;
  drawCombatFighter(ctx, player, 1, 0);
  drawCombatFighter(ctx, enemy, 1, 0);
  assert(paints.some(args => args[0].__asset === animationSequenceFor(id, contactKind, true).liteAsset));
  assert(paints.some(args => args[0].__asset === animationSequenceFor('RYU', 'throw-victim', true).liteAsset));
  assert.equal(JSON.stringify([player, enemy]), before);
  scene.exit();
  superGrabWarmCases++;
}
textures.clearFocus();
console.log('LITE_SUPER_GRAB_PREWARM_PASS', { superGrabWarmCases });
