import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {specialMovesFor,superArtMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
const moves=roster.flatMap(c=>[...new Map([...Object.values(specialMovesFor(c.id)),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.projectile).map(m=>[m.id,m])).values()].map(move=>({c,move})));
let cases=0,nearHitCases=0,nearParryControls=0,piercingControls=0,repeatControls=0,failures=[];
for(const victimChar of roster)for(const direction of [-1,1])for(const {c,move}of moves)for(const reverse of [false,true])for(const turned of [false,true])for(const mode of move.projectile.piercing?['hit']:['hit','parry']){
 const w=new CombatWorld(c,getCharacter('RYU'),'belt'),p=w.player;p.x=500-direction*54;p.y=500;p.facing=direction;const speed=move.projectile.speed,radius=move.projectile.radius+34;
 const near=new Fighter(victimChar,'enemy',500+direction*(radius+speed*.25),520,-direction),far=new Fighter(victimChar,'enemy',500+direction*(radius+speed*.75),480,-direction),offLane=new Fighter(victimChar,'enemy',500+direction*(radius+speed*.1),640,-direction),dead=new Fighter(victimChar,'enemy',near.x,near.y,-direction);dead.hp=0;
 for(const f of [near,far,offLane])f.startMove(normalFor('hp',false,f.character.id));if(mode==='parry'){near.currentMove=null;near.state='idle';near.parryWindow=6;}
 w.enemies.splice(0,w.enemies.length,...(reverse?[far,offLane,dead,near]:[near,offLane,dead,far]));const originalOrder=w.enemies.map(f=>f.uid),hp=[near.hp,far.hp,offLane.hp];
 w.spawnScriptedProjectile(p,move);const q=w.projectiles[0];assert.equal(q.x,500);assert(Math.abs(near.x-q.x)>radius&&Math.abs(far.x-q.x)>radius,'Both candidates start outside projectile');if(turned)p.facing=-direction;w.updateProjectiles(quiet);assert.deepEqual(w.enemies.map(f=>f.uid),originalOrder,'Do not reorder gameplay enemy list');assert.equal(offLane.hp,hp[2]);assert.equal(dead.hp,0);const label=victimChar.id+' '+c.id+' '+move.id+' '+direction+' '+reverse+' '+turned+' '+mode;
 if(move.projectile.piercing){assert(near.hp<hp[0]&&far.hp<hp[1]);assert.equal(q.hitVictims.size,2);assert.equal(w.projectiles.length,1);piercingControls++;}
 else{assert.equal(w.projectiles.length,0);if(mode==='parry'){if(near.state!=='parry'||far.hp!==hp[1])failures.push(label+' nearest parry bypassed');assert.equal(near.hp,hp[0]);nearParryControls++;}else{if(!(near.hp<hp[0])||far.hp!==hp[1])failures.push(label+' far target selected before near');nearHitCases++;}}
 assert.equal(w.totalPlayerDamage,hp[0]-near.hp+hp[1]-far.hp);const after=[near.hp,far.hp,w.totalPlayerDamage];w.updateProjectiles(quiet);assert.deepEqual([near.hp,far.hp,w.totalPlayerDamage],after,'No duplicate hit next tick');repeatControls++;cases++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('PROJECTILE_CONTACT_ORDER_PASS',{victims:10,projectileMoves:moves.length,cases,nearHitCases,nearParryControls,piercingControls,repeatControls,spawnOrderAndOwnerFacingIndependent:true,originalEnemyOrderPreserved:true});
