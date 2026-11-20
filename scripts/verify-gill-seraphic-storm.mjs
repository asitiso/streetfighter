import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{animationSequenceFor,animationSequencesFor}from'../dist/assets/render/AnimationSequenceLibrary.js';
import{animationSequenceSample,animationSequenceKindForAttack}from'../dist/assets/render/AnimationTimingMapper.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{getCharacter}from'../dist/assets/game/characters.js';
import{specialMovesFor}from'../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('GILL','seraphic-storm',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Seraphic Storm needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:1,activeStart:2,activeEnd:3,recoveryStart:4});
const requests=[],assets=new Map(animationSequencesFor('GILL',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const{drawCombatFighter}=await import('../dist/assets/render/Visuals.js');const{runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const{animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');const{ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('GILL');requests.length=0;animationTextureManager.preloadCharacter('GILL','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('GILL','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/gill/manifest.json',import.meta.url),'utf8')),urls=new Set(requests),entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/gill/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,307);assert.equal(manifest.records.length,34);assert.ok(entryBytes<17_000_000,'Gill authored entry exceeds17MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},move=specialMovesFor('GILL').super;
assert.equal(move.damage,246);assert.equal(move.superCost,100);assert.deepEqual(move.projectile,{speed:10.8,life:120,radius:46,piercing:true,count:3,verticalSpread:48});
export const timelines={};let canvasDraws=0,freezeChecks=0,spawnChecks=0,projectileStepChecks=0,boundaryExitChecks=0;
for(const facing of[-1,1])for(const button of['lp','mp','hp']){
 const w=new CombatWorld(getCharacter('GILL'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[],seen=new Set(),contacts=new Set();let refs=[],bursts=0,stopped=false,observedFreeze=0;
 function step(input,tick){
  const freeze=w.superFreezeFrames>0,old=refs.filter(p=>w.projectiles.includes(p)).map(p=>({p,life:p.life,x:p.x,y:p.y}));
  w.update(input,tick);
  if(!freeze)for(const{p,life,x,y}of old){projectileStepChecks++;assert.equal(p.life,life-1);assert.ok(Math.abs(p.x-x-p.vx)<1e-9);assert.ok(Math.abs(p.y-y-p.vy)<1e-9);const alive=p.life>0&&p.x>=w.rules.arenaLeft-120&&p.x<=w.rules.arenaRight+120;assert.equal(w.projectiles.includes(p),alive);}
  if(!refs.length&&w.projectiles.length){
   refs=[...w.projectiles];bursts++;assert.equal(refs.length,3);
   refs.forEach((p,i)=>{const offset=i-1;spawnChecks++;assert.equal(p.owner,f);assert.equal(p.move.id,'GILL_SUPER');assert.equal(p.vx,facing*10.8);assert.equal(p.vy,offset*.16);assert.equal(p.life,119);assert.equal(p.radius,46);assert.equal(p.piercing,true);assert.equal(p.burstIndex,i+1);assert.equal(p.burstTotal,3);assert.ok(Math.abs(p.x-(f.x+facing*54+p.vx))<1e-9);assert.ok(Math.abs(p.y-(f.y-92+offset*48+p.vy))<1e-9);});
   const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.equal(s.frame,2,'All three projectiles must spawn on the authored wide-arm release');assert.ok(s.contact);
  }
  assert.ok(w.projectiles.length<=3);assert.ok(w.projectiles.every(p=>refs.includes(p)));
 }
 for(let tick=0;tick<6;tick++)step({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 assert.equal(f.currentMove.id,'GILL_SUPER');assert.equal(f.superGauge,400);assert.equal(w.superFreezeFrames,9);const startX=f.x;
 for(let tick=6;tick<200;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,superFreeze:w.superFreezeFrames>0,worldX:f.previousX-startX,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y,life:p.life,radius:p.radius}))});
  assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);
  if(f.state==='attack'){
   assert.equal(s.sequence.id,seq.id);seen.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,tick/60);const d=draws.find(d=>d[0].src===seq.asset);assert.ok(d);canvasDraws++;assert.equal(d[1],s.frame*640);assert.deepEqual(d.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0));
   if(s.contact&&!stopped){stopped=true;f.hitStop=3;const clock=f.moveFrame;for(let stop=0;stop<3;stop++){step(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y,life:p.life,radius:p.radius}))});}}
  }
  const freeze=w.superFreezeFrames>0,clock=f.moveFrame,frame=s.frame;step(quiet,tick);if(freeze){observedFreeze++;freezeChecks++;assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,frame);}
 }
 assert.equal(observedFreeze,9);assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[2,3]);assert.equal(bursts,1);assert.equal(refs.length,3);assert.equal(w.projectiles.length,0);assert.equal(f.state,'idle');assert.equal(f.x,startX);
 for(const p of refs){assert.ok(p.life>0&&(p.x<w.rules.arenaLeft-120||p.x>w.rules.arenaRight+120),'Fast storm projectiles must retain original boundary-based removal');boundaryExitChecks++;}
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null);f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
const low=new CombatWorld(getCharacter('GILL'),getCharacter('KEN'),'duel').player;low.superGauge=99;low.startMove(move);assert.equal(low.currentMove,null);assert.equal(low.superGauge,99);
for(const id of['GILL_SUPER_TEST','GILL_CMD_MP','GILL_TC_TEST','GILL_SA1','GILL_SA2','GILL_SA3'])assert.equal(animationSequenceKindForAttack('GILL',{id}),null);assert.equal(animationSequenceKindForAttack('URIEN',{id:'GILL_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('GILL',{id:'GILL_PRIMARY'}),'hadoken');assert.equal(animationSequenceKindForAttack('GILL',{id:'GILL_ANTI_AIR'}),'shoryuken');assert.equal(animationSequenceKindForAttack('GILL',{id:'GILL_MOBILITY'}),'lariat-rush');
console.log('GILL_SERAPHIC_STORM_PASS',{buttons:3,facings:2,canvasDraws,freezeChecks,spawnChecks,projectileStepChecks,boundaryExitChecks,releaseFrame:2,entryBytes});
