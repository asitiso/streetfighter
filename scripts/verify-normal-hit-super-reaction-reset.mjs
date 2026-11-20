import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],supers=roster.flatMap(c=>c.superArts.map(a=>({character:c,move:superArtMoveFor(c.id,a.id,a.gauge)}))).filter(x=>x.move.damage>0&&!x.move.install),seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const images=[],stack=[],o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im){images.push(im.src);},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);return images;}
const quiet={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,melee=0,projectiles=0,superControls=0;
for(const def of roster)for(const facing of [-1,1])for(const prior of supers)for(const path of ['melee','projectile']){
 textures.setMode('lite');textures.setMode('hd');textures.preloadCharacter(def.id);
 const w=new CombatWorld(def,prior.character,'duel'),v=w.player,a=w.enemy;v.facing=facing;a.facing=facing;a.x=v.x-facing*60;a.y=v.y;
 assert.equal(v.receiveHit(prior.move,a,false),'hit');assert(v.superVictimFrames>0);v.syncSuperVictimHit(2,3);assert.equal(animationSequenceSample(v,0),null,'Prior cinematic owns initial victim pose');
 const next=new Fighter(CHARACTERS.find(c=>c.id==='RYU'),'enemy',v.x+facing*45,v.y,-facing);w.enemies.push(next);const hp=v.hp;
 if(path==='melee'){
  const move=normalFor('mp',false,'RYU');next.startMove(move);next.moveFrame=move.startup;w.resolveAttack(next,v,quiet);melee++;
 }else{
  const move=specialMovesFor('RYU').primary;w.spawnScriptedProjectile(next,move);const q=w.projectiles[0];q.x=v.x;q.y=v.y-88;q.vx=q.vy=0;w.updateProjectiles(quiet);projectiles++;
 }
 assert(v.hp<hp&&v.hp>0);assert.equal(v.superVictimFrames,0,'New normal hit must replace prior super victim reaction');assert.equal(v.superVictimTotal,0);assert.equal(v.superVictimMotif,'');assert.equal(v.superVictimHitIndex,1);assert.equal(v.superVictimHitTotal,1);assert.equal(v.lastHitDirection,-facing,'Newest attacker controls reaction direction');assert.equal(v.state,'hit');const airborne=v.airborne||v.jumpHeight>0;assert.equal(animationSequenceSample(v,0)?.sequence.kind,airborne?'fall':'hit');assert(draw(v).includes(airborne?'/art/air-fall-v1/'+def.id.toLowerCase()+'.webp':'/art/animation-hq/'+def.id.toLowerCase()+'/hit.webp'),'Actual renderer must use ordinary recoil artwork after super interruption');
 assert.equal(w.totalEnemyDamage,hp-v.hp,'Followup damage counted once');assert.equal(w.events.filter(e=>['hit','counter','air-hit','command-hit','target-hit'].includes(e.type)).length,1);assert(!w.events.some(e=>e.type==='super-impact'),'Normal followup cannot replay super impact');cases++;
}
for(const def of roster)for(const prior of supers){const v=new Fighter(def,'player',500,500,1),a=new Fighter(prior.character,'enemy',440,500,1);assert.equal(v.receiveHit(prior.move,a,false),'hit');assert(v.superVictimFrames>0);assert.equal(v.superVictimMotif,prior.move.superPresentation?.motif??'burst');superControls++;}
textures.setMode('lite');console.log('NORMAL_HIT_SUPER_REACTION_RESET_PASS',{victims:10,facings:2,priorSupers:supers.length,cases,melee,projectiles,superControls,latestHitStrip:true,latestDirection:true,singleDamage:true});
