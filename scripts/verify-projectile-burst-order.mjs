import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
const moves=roster.flatMap(c=>[...new Map([...Object.values(specialMovesFor(c.id)),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>(m.projectile?.count??0)>1).map(m=>[m.id,m])).values()].map(move=>({c,move})));
let cases=0,lethalControls=0,finisherChecks=0,removalControls=0,updatedShots=0,failures=[];
for(const def of roster)for(const direction of [-1,1])for(const {c,move}of moves)for(const lethal of [false,true]){
 const w=new CombatWorld(def,c,'duel'),f=w.player,a=w.enemy;f.x=f.previousX=500;f.facing=-direction;a.x=f.x-direction*(54+move.projectile.speed);a.y=f.y;a.facing=direction;a.superGauge=1000;a.startMove(move);a.moveFrame=a.currentMove.startup;w.spawnProjectileIfNeeded(a);assert.equal(w.projectiles.length,move.projectile.count);assert.deepEqual(w.projectiles.map(q=>q.burstIndex),Array.from({length:move.projectile.count},(_,i)=>i+1));if(lethal)f.hp=1;
 const eligible=w.projectiles.filter(q=>Math.abs(f.x-q.x-q.vx)<=q.radius+34&&Math.abs(f.y-88-q.y-q.vy)<=Math.max(55,move.hitbox.lane)).map(q=>q.burstIndex);assert(eligible.length>=2);const hp=f.hp;w.updateProjectiles(quiet);const impacts=w.events.filter(e=>['hit','counter','air-hit','command-hit','target-hit'].includes(e.type)),indices=impacts.map(e=>e.hitIndex);assert(indices.length>=1);const label=def.id+' '+direction+' '+move.id+' '+lethal;
 if(indices[0]!==eligible[0])failures.push(label+' newer shot hit before first valid shot');if(indices.some((n,i)=>i>0&&n<indices[i-1]))failures.push(label+' reverse impact order '+indices);
 const last=indices.at(-1);assert.equal(f.visualHitSequenceIndex,last);assert.equal(f.visualHitSequenceTotal,move.projectile.count);assert.equal(f.visualHitSequenceFrames,last===move.projectile.count?18:11);if(last===move.projectile.count)finisherChecks++;
 if(move.superCost){assert.equal(f.superVictimHitIndex,last);assert.equal(f.superVictimHitTotal,move.projectile.count);assert.equal(f.superVictimFrames,last===move.projectile.count?30:12);}assert.equal(w.totalEnemyDamage,hp-f.hp);if(lethal){assert.equal(impacts.length,1);assert.equal(f.hp,0);lethalControls++;}cases++;
}
for(const def of roster)for(const direction of [-1,1])for(const variant of [0,1,2]){
 const w=new CombatWorld(def,getCharacter('RYU'),'duel'),f=w.player,a=w.enemy;f.x=500;a.facing=direction;const ordinary=specialMovesFor('RYU').primary,piercing=superArtMoveFor('RYU',1),shots=[];
 for(let j=0;j<5;j++){w.spawnScriptedProjectile(a,j===3?piercing:ordinary);const q=w.projectiles.at(-1);q.x=j===1||j===3?f.x-q.vx:400;q.y=j===1||j===3?f.y-88:200;q.vy=0;if(j===0||j===2)q.life=1;shots.push({q,x:q.x,y:q.y,life:q.life,j});}
 const ordered=variant===0?shots:variant===1?[shots[4],shots[0],shots[1],shots[2],shots[3]]:[shots[0],shots[3],shots[2],shots[1],shots[4]];w.projectiles.splice(0,w.projectiles.length,...ordered.map(s=>s.q));const hp=f.hp;w.updateProjectiles(quiet);
 for(const s of shots){assert.equal(s.q.life,s.life-1,'Every projectile ages exactly once even around removal');assert.equal(s.q.x,s.x+s.q.vx);assert.equal(s.q.y,s.y);updatedShots++;}
 assert.deepEqual(w.projectiles,ordered.filter(s=>s.j===3||s.j===4).map(s=>s.q),'Retain piercing and missed shots in insertion order');assert(f.hp<hp);assert.equal(w.totalEnemyDamage,hp-f.hp);removalControls++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('PROJECTILE_BURST_ORDER_PASS',{victims:10,burstMoves:moves.length,cases,lethalControls,finisherChecks,removalControls,updatedShots,insertionOrderPreserved:true,noSkippedOrDoubleUpdatedShots:true});
