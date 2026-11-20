import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{animationSequenceFor,animationSequencesFor}from'../dist/assets/render/AnimationSequenceLibrary.js';
import{animationSequenceSample,animationSequenceKindForAttack}from'../dist/assets/render/AnimationTimingMapper.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{getCharacter}from'../dist/assets/game/characters.js';
import{specialMovesFor}from'../dist/assets/combat/MoveLibrary.js';
const seq=animationSequenceFor('URIEN','aegis-reflector',true);
assert.ok(seq?.enabled&&seq.poseAuthored&&seq.renderMode==='full','Aegis Reflector needs full authored action');
assert.equal(seq.frameWidth,640);assert.deepEqual(seq.phase,{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:6});
const requests=[],assets=new Map(animationSequencesFor('URIEN',true).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;requests.push(v);const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const{drawCombatFighter}=await import('../dist/assets/render/Visuals.js');const{runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const{animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');const{ASSET_GROUPS}=await import('../dist/assets/core/AssetManager.js');
assert.ok(ASSET_GROUPS['character-hq'].includes(seq.asset));assert.ok(!ASSET_GROUPS['app-shell'].includes(seq.asset));
animationTextureManager.releaseCharacter('URIEN');requests.length=0;animationTextureManager.preloadCharacter('URIEN','movement');assert.ok(!requests.includes(seq.asset));animationTextureManager.preloadCharacter('URIEN','combat');assert.ok(requests.includes(seq.asset));
const manifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/urien/manifest.json',import.meta.url),'utf8')),urls=new Set(requests);
const entryBytes=manifest.records.filter(r=>urls.has('/art/animation-hq/urien/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
assert.equal(manifest.frameTotal,307);assert.equal(manifest.records.length,34);assert.ok(entryBytes<14_000_000,'Urien authored entry exceeds14MB');
const draws=[],translations=[],ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
const quiet={held:()=>false,pressed:()=>false,released:()=>false},move=specialMovesFor('URIEN').super;
assert.equal(move.damage,190);assert.equal(move.superCost,100);assert.deepEqual(move.projectile,{speed:.08,life:180,radius:54,piercing:true,count:undefined,verticalSpread:undefined});
export const timelines={};let canvasDraws=0,freezeChecks=0,spawnChecks=0,lifetimeChecks=0,piercingChecks=0;
for(const facing of[-1,1])for(const button of['lp','mp','hp']){
 const w=new CombatWorld(getCharacter('URIEN'),getCharacter('KEN'),'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.x=600;f.superGauge=500;
 const forward=facing===1?'right':'left',inputs=[['down'],['down',forward],[forward],['down'],['down',forward],[forward,button]],rows=[],seen=new Set(),contacts=new Set();
 let projectile=null,spawns=0,projectileSteps=0,stopped=false,observedFreeze=0;
 function step(input,tick){
  const freeze=w.superFreezeFrames>0,before=projectile&&w.projectiles.includes(projectile),oldLife=projectile?.life,oldX=projectile?.x;
  w.update(input,tick);
  if(before&&!freeze){projectileSteps++;lifetimeChecks++;assert.equal(projectile.life,oldLife-1);assert.ok(Math.abs(projectile.x-oldX-projectile.vx)<1e-9);assert.equal(w.projectiles.includes(projectile),projectile.life>0);}
  if(!projectile&&w.projectiles.length){
   projectile=w.projectiles[0];spawns++;spawnChecks++;projectileSteps=1;
   assert.equal(w.projectiles.length,1);assert.equal(projectile.owner,f);assert.equal(projectile.move.id,'URIEN_SUPER');assert.equal(projectile.vx,facing*.08);assert.equal(projectile.vy,0);assert.equal(projectile.life,179);assert.equal(projectile.radius,54);assert.equal(projectile.piercing,true);assert.ok(Math.abs(projectile.x-(f.x+facing*54+projectile.vx))<1e-9);
   const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);assert.equal(s.frame,4,'First Aegis must spawn on the two-palm release');assert.ok(s.contact);
  }
 }
 for(let tick=0;tick<6;tick++)step({held:k=>inputs[tick].includes(k),pressed:k=>tick===5&&k===button,released:()=>false},tick);
 assert.equal(f.currentMove.id,'URIEN_SUPER');assert.equal(f.superGauge,400);assert.equal(w.superFreezeFrames,9);const startX=f.x;
 for(let tick=6;tick<250;tick++){
  const s=animationSequenceSample(f,0);assert.ok(s);rows.push({kind:s.sequence.kind,frame:s.frame,width:s.sequence.frameWidth,facing,contact:s.contact,hitStop:f.hitStop>0,superFreeze:w.superFreezeFrames>0,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y,life:p.life,radius:p.radius})),worldX:f.previousX-startX});
  assert.equal(f.airborne,false);assert.equal(f.jumpHeight,0);
  if(f.state==='attack'){
   assert.equal(s.sequence.id,seq.id);seen.add(s.frame);assert.equal(s.contact,f.isMoveActive());if(s.contact)contacts.add(s.frame);
   draws.length=0;translations.length=0;drawCombatFighter(ctx,f,0,tick/60);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw);canvasDraws++;assert.equal(draw[1],s.frame*640);assert.deepEqual(draw.slice(5),[-160,-220,320,224]);assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0));
   if(s.contact&&!stopped){stopped=true;f.hitStop=3;const clock=f.moveFrame;for(let stop=0;stop<3;stop++){step(quiet,tick);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,s.frame);rows.push({...rows.at(-1),hitStop:true,projectiles:w.projectiles.map(p=>({x:p.x-f.x,y:p.y-f.y,life:p.life,radius:p.radius}))});}}
  }
  const freeze=w.superFreezeFrames>0,clock=f.moveFrame,frame=s.frame;step(quiet,tick);
  if(freeze){observedFreeze++;freezeChecks++;assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,frame);}
 }
 assert.equal(observedFreeze,9);assert.equal(seen.size,12);assert.deepEqual([...contacts].sort(),[4,5]);assert.equal(spawns,1);assert.equal(projectileSteps,180);assert.equal(projectile.life,0);assert.equal(w.projectiles.length,0);assert.equal(f.state,'idle');assert.equal(f.x,startX);
 f.superGauge=500;f.startMove(move);f.airborne=true;f.jumpHeight=40;assert.equal(animationSequenceSample(f,0),null);f.state='hit';assert.equal(animationSequenceSample(f,0)?.sequence.kind,'fall');
 timelines[button+' '+(facing===1?'RIGHT':'LEFT')]=rows;
}
for(const facing of[-1,1]){
 const w=new CombatWorld(getCharacter('URIEN'),getCharacter('KEN'),'belt');w.replaceEnemies([{character:getCharacter('KEN'),x:600+facing*54,y:495,hp:10000},{character:getCharacter('KEN'),x:600+facing*72,y:495,hp:10000}]);const f=w.player;f.x=600;f.y=495;f.facing=facing;f.superGauge=500;f.startMove(move);w.spawnScriptedProjectile(f,move);for(const e of w.enemies){e.state='hit';e.stateFrame=-100;}
 w.updateProjectiles(quiet);const p=w.projectiles[0];assert.ok(p&&p.piercing);assert.equal(p.hitVictims.size,2);assert(w.enemies.every(e=>e.hp<10000));const hp=w.enemies.map(e=>e.hp);for(const e of w.enemies){e.state='hit';e.stateFrame=-100;e.hitStop=0;}w.updateProjectiles(quiet);assert.deepEqual(w.enemies.map(e=>e.hp),hp,'Persistent projectile cannot hit the same victim repeatedly');assert.equal(w.projectiles[0],p);piercingChecks+=2;
}
const low=new CombatWorld(getCharacter('URIEN'),getCharacter('KEN'),'duel').player;low.superGauge=99;low.startMove(move);assert.equal(low.currentMove,null);assert.equal(low.superGauge,99);
for(const id of['URIEN_SUPER_TEST','URIEN_CMD_MP','URIEN_TC_TEST','URIEN_SA1','URIEN_SA2','URIEN_SA3'])assert.equal(animationSequenceKindForAttack('URIEN',{id}),null);assert.equal(animationSequenceKindForAttack('GILL',{id:'URIEN_SUPER'}),null);
assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_PRIMARY'}),'hadoken');assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_ANTI_AIR'}),'shoryuken');assert.equal(animationSequenceKindForAttack('URIEN',{id:'URIEN_MOBILITY'}),'shoulder-tackle');
console.log('URIEN_AEGIS_REFLECTOR_PASS',{buttons:3,facings:2,canvasDraws,freezeChecks,spawnChecks,lifetimeChecks,piercingChecks,entryBytes,releaseFrame:4});
