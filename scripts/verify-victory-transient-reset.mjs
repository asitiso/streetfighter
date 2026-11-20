import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const images=[],stack=[],o={globalAlpha:1,filter:'none'};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push({...o});},restore(){Object.assign(o,stack.pop());},drawImage(im){images.push({asset:im.src,filter:o.filter});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);return images.at(-1);}
const input={pressed:()=>false,held:()=>false,released:()=>false},audio={playStagePulse(){},playHit(){},playParry(){}};
let trades=0,cases=0;
for(const c of roster){
 textures.setMode('lite');textures.setMode('hd');
 const scene=new Stage1Scene(input,audio,c,c.superArts[0]);scene.enter();scene.introFrames=0;scene.prepareDuel();scene.phase='duel';
 const f=scene.world.player,e=scene.world.enemy;f.receiveHit(normalFor('mp',false,e.character.id),e,false);assert(f.hitFlash>0);e.hp=0;
 const hp=f.hp,gauge=f.superGauge;scene.fixedUpdate(1/60,1);assert.equal(scene.phase,'clear');
 assert.equal(draw(f).filter,'none',c.id+' victory after trade must not retain hit flash');
 assert.equal(f.hp,hp);assert.equal(f.superGauge,gauge);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'victory');trades++;
 for(const kind of ['throw','super-victim','bounce','air','attack','combined']){
  const hero=new Fighter(c,'player',400,500,1,c.superArts[0]);hero.animationFrame=80;hero.hp=400;hero.superGauge=42;hero.installFrames=120;hero.installLabel='TEST';
  hero.startMove(kind==='throw'?throwMoveFor(c.id):normalFor('hp',false,c.id));
  if(kind==='throw'||kind==='combined')hero.beginThrowSync('attacker',e.uid,1,24,c.id);
  if(kind==='super-victim'||kind==='combined'){hero.syncSuperVictimHit(2,3);hero.superVictimMotif='rush';}
  if(kind==='bounce'||kind==='combined'){hero.wallBounceFrames=12;hero.groundBounceFrames=14;hero.juggleHits=2;}
  if(kind==='air'||kind==='combined'){hero.airborne=true;hero.jumpHeight=40;hero.jumpVelocity=5;hero.landingFrames=6;hero.crouchAnimationFrame=3;hero.throwEscapeFrames=8;}
  hero.hitFlash=4;hero.hitStop=3;hero.syncVisualHitSequence(2,4);hero.attackVictims.add(e.uid);hero.attackVictimFrames.set(e.uid,2);hero.attackVictimHits.set(e.uid,1);hero.moveFrame=8;hero.dashFrames=5;hero.attackConnected=true;hero.moveEffectTriggered=true;hero.moveStartAnnounced=true;
  const snapshot=[hero.hp,hero.superGauge,hero.x,hero.y,hero.animationFrame,hero.installFrames,hero.installLabel];hero.enterVictoryPose();
  assert.equal(animationSequenceSample(hero,0)?.sequence.kind,'victory',c.id+' '+kind+' must select victory strip');
  assert.equal(draw(hero).asset,'/art/animation-hq/'+c.id.toLowerCase()+'/victory.webp');assert.equal(draw(hero).filter,'none');
  for(const key of ['hitStop','hitFlash','wallBounceFrames','groundBounceFrames','juggleHits','landingFrames','throwEscapeFrames','throwSyncFrames','throwSyncTotal','superVictimFrames','superVictimTotal','visualHitSequenceFrames','visualHitSequenceTotalFrames','moveFrame','dashFrames','jumpHeight','jumpVelocity'])assert.equal(hero[key],0,key+' must clear on victory');
  assert.equal(hero.throwSyncRole,null);assert.equal(hero.throwSyncPartnerUid,null);assert.equal(hero.currentMove,null);assert.equal(hero.visualRecoveryMoveId,null);assert.equal(hero.airborne,false);assert.equal(hero.crouchAnimationFrame,-1);
  assert.equal(hero.attackVictims.size,0);assert.equal(hero.attackVictimFrames.size,0);assert.equal(hero.attackVictimHits.size,0);assert.equal(hero.attackConnected,false);assert.equal(hero.moveEffectTriggered,false);assert.equal(hero.moveStartAnnounced,false);
  assert.deepEqual([hero.hp,hero.superGauge,hero.x,hero.y,hero.animationFrame,hero.installFrames,hero.installLabel],snapshot,'Victory preserves result/buff/clock state');
  const clean=draw(hero);hero.enterVictoryPose();assert.deepEqual(draw(hero),clean,'Repeated victory preparation is visually stable');cases++;
 }
}
textures.setMode('lite');console.log('VICTORY_TRANSIENT_RESET_PASS',{characters:10,trades,cases,authoredVictoryUnblocked:true,flashCleared:true,resultsAndBuffsPreserved:true,monotonicClockPreserved:true,idempotent:true});
