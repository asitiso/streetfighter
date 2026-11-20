import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample,animationSequenceKindForAttack} from '../dist/assets/render/AnimationTimingMapper.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {getCharacter} from '../dist/assets/game/characters.js';
import {specialMovesFor,superArtMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('YUN','genei-jin-install',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Genei Jin install needs full authored action');
assert.equal(seq.frameWidth,640);assert.equal(seq.frameCount,12);assert.deepEqual(seq.phase,{startupEnd:1,activeStart:2,activeEnd:2,recoveryStart:3});
const requests=[],assets=new Map(animationSequencesFor('YUN',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('YUN');requests.length=0;animationTextureManager.preloadCharacter('YUN','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('YUN','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/yun/manifest.json',import.meta.url),'utf8')),urls=new Set(requests);
const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/yun/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,347);assert.equal(manifest.records.length,37);assert.ok(entryBytes>0);assert.ok(entryBytes<17_000_000,'Yun authored entry exceeds17MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},def=getCharacter('YUN');

export const timelines={};
const move=superArtMoveFor('YUN',3,def.superArts[2].gauge);
assert.deepEqual(move.install,{duration:720,powerScale:.94,frameScale:.68,moveScale:1.18,label:'GENEI JIN'});
assert.equal(move.damage,0);assert.equal(move.startup,3);assert.equal(move.active,1);assert.equal(move.recovery,12);assert.equal(move.superCost,104);
let canvasDraws=0,freezeChecks=0,hitStopChecks=0,zeroDamageChecks=0,timerChecks=0;const reached=new Set();
for(const facing of[-1,1])for(const button of['lp','mp','hp']){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[2]),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[];
 for(let tick=0;tick<6;tick++)w.update({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 assert.equal(f.currentMove.id,'YUN_SA3');assert.equal(f.superGauge,396);assert.equal(f.installFrames,720);assert.equal(f.installLabel,'GENEI JIN');assert.equal(f.installPowerScale,.94);assert.equal(f.installFrameScale,.68);assert.equal(f.installMoveScale,1.18);
 const startX=f.x,freeze=w.superFreezeFrames;assert.equal(freeze,move.superPresentation.freezeFrames);let observedFreeze=0,stopped=false;const seen=new Set();
 for(let tick=6;tick<100;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);assert.equal(s.contact,false,'Install activation cannot advertise strike contact');assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);assert.equal(f.x,startX);assert.equal(w.projectiles.length,0);
  if(f.currentMove){assert.equal(s.sequence.id,seq.id);seen.add(s.frame);reached.add(s.frame);draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,tick/60);const d=draws.find(d=>d[0].src===seq.asset);assert.ok(d);canvasDraws++;assert.equal(d[1],s.frame*640);assert.deepEqual(d.slice(5),[-160,-220,320,224]);
   if(f.moveFrame===3&&!stopped){assert.ok(f.isMoveActive());assert.equal(s.contact,false);assert.equal(s.frame,2);stopped=true;f.hitStop=3;const clock=f.moveFrame,remaining=f.installFrames;for(let i=0;i<3;i++){w.update(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(f.installFrames,remaining);assert.equal(animationSequenceSample(f,0).frame,2);hitStopChecks++;}}
  }
  rows.push({frame:s.frame,kind:s.sequence.kind,contact:s.contact,install:f.installFrames,freeze:w.superFreezeFrames});
  const paused=w.superFreezeFrames>0,clock=f.moveFrame,remaining=f.installFrames;w.update(quiet,tick);
  if(paused){observedFreeze++;freezeChecks++;assert.equal(f.moveFrame,clock);assert.equal(f.installFrames,remaining);assert.equal(animationSequenceSample(f,0).frame,s.frame);}else assert.equal(f.installFrames,Math.max(0,remaining-1));
 }
 assert.equal(observedFreeze,freeze);assert.equal(seen.size,12);assert.equal(f.state,'idle');assert.ok(f.installFrames>0);assert.equal(animationSequenceSample(f,0)?.sequence.kind,'idle','Active buff must not lock the activation strip');timelines[button+' '+facing]=rows;
}
assert.equal(reached.size,12);
for(const facing of[-1,1]){
 const w=new CombatWorld(def,getCharacter('KEN'),'duel',def.superArts[2]),f=w.player,e=w.enemies[0];f.x=f.previousX=600;f.facing=facing;f.superGauge=500;e.x=e.previousX=f.x+facing*45;e.y=f.y;e.hp=e.maxHp=10000;e.state='hit';e.stateFrame=-10000;e.aiCooldown=10000;const hp=e.hp;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,'lp']];
 for(let tick=0;tick<90;tick++){const held=inputs[tick]??[];w.update({held:k=>held.includes(k),pressed:k=>tick===5&&k==='lp',released:()=>false},tick);assert.equal(e.hp,hp);assert.equal(w.projectiles.length,0);assert.equal(w.totalPlayerDamage,0);assert.equal(f.attackVictims.size,0);if(f.currentMove?.id==='YUN_SA3')assert.equal(animationSequenceSample(f,0)?.contact,false);zeroDamageChecks++;}
}
const timerWorld=new CombatWorld(def,getCharacter('KEN'),'duel'),timer=timerWorld.player;timerWorld.enemies.length=0;timer.superGauge=500;timer.startMove(move);let spent=0;
for(let tick=0;tick<800&&timer.installFrames>0;tick++){const before=timer.installFrames,paused=timerWorld.superFreezeFrames>0;timerWorld.update(quiet,tick);assert.equal(timer.installFrames,Math.max(0,before-(paused?0:1)));if(!paused)spent++;timerChecks++;}
assert.equal(spent,720);assert.equal(timer.installFrames,0);assert.equal(timer.installPowerScale,1);assert.equal(timer.installFrameScale,1);assert.equal(timer.installMoveScale,1);assert.equal(timer.installLabel,'');
const base=normalFor('hp',false,'YUN');timer.startMove(base);assert.equal(timer.currentMove.damage,base.damage);assert.equal(timer.currentMove.startup,base.startup);assert.equal(timer.currentMove.recovery,base.recovery);
const powered=new CombatWorld(def,getCharacter('KEN'),'duel').player;powered.superGauge=500;powered.startMove(move);powered.startMove(base);assert.equal(powered.currentMove.damage,Math.round(base.damage*.94));assert.equal(powered.currentMove.startup,Math.max(1,Math.round(base.startup*.68)));assert.equal(powered.currentMove.recovery,Math.max(2,Math.round(base.recovery*.68)));assert.equal(animationSequenceSample(powered,0)?.sequence.kind,'stand-heavy');
powered.installFrames=123;const gauge=powered.superGauge;powered.startMove(move);assert.equal(powered.installFrames,720);assert.equal(powered.superGauge,gauge-104);assert.equal(powered.currentMove.damage,0);
let movementChecks=0;for(const buff of[false,true]){const w=new CombatWorld(def,getCharacter('KEN'),'duel'),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.superGauge=500;if(buff){f.startMove(move);f.currentMove=null;f.state='idle';}const x=f.x;w.update({held:k=>k==='right',pressed:()=>false,released:()=>false},0);assert.ok(Math.abs(f.x-x-4.3*def.speed*f.combatProfile.walkScale*(buff?1.18:1))<1e-8);movementChecks++;}
const low=new CombatWorld(def,getCharacter('KEN'),'duel').player;low.superGauge=103;low.startMove(move);assert.equal(low.currentMove,null);assert.equal(low.installFrames,0);assert.equal(low.superGauge,103);
powered.superGauge=500;powered.startMove(move);powered.airborne=true;powered.jumpHeight=40;assert.equal(animationSequenceSample(powered,0),null,'Ground-only activation retains aerial fallback');powered.state='hit';assert.equal(animationSequenceSample(powered,0)?.sequence.kind,'fall');assert.equal(powered.installFrames,720);
for(const id of['YUN_SA3_TEST','YUN_TC_TEST','THROW','MAKOTO_SA3'])assert.equal(animationSequenceKindForAttack('YUN',{id}),null);assert.equal(animationSequenceKindForAttack('KEN',{id:'YUN_SA3'}),null);
assert.equal(animationSequenceKindForAttack('YUN',{id:'YUN_SUPER'}),'genei-jin');assert.equal(animationSequenceKindForAttack('YUN',{id:'YUN_SA1'}),'you-hou');assert.equal(animationSequenceKindForAttack('YUN',{id:'YUN_SA2'}),'sourai-rengeki');
console.log('YUN_GENEI_JIN_INSTALL_PASS',{buttons:3,facings:2,canvasDraws,freezeChecks,hitStopChecks,zeroDamageChecks,timerChecks,activeInstallTicks:spent,movementChecks,entryBytes,noncontact:true});
