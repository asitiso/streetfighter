import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter,chipDamageFor} from '../dist/assets/combat/Fighter.js';
import {specialMovesFor,superArtMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {victimReactionSample} from '../dist/assets/render/VictimReactionProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
const moves=roster.flatMap(c=>[...new Map([...Object.values(specialMovesFor(c.id)),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.projectile).map(m=>[m.id,m])).values()].map(move=>({c,move})));
const fields=f=>[f.visualHitSequenceIndex,f.visualHitSequenceTotal,f.visualHitSequenceFrames,f.visualHitSequenceTotalFrames];
function fire(w,f,owner,move,index,total,input=quiet){w.spawnScriptedProjectile(owner,move,0,0,1,index,total);const q=w.projectiles.at(-1);q.x=f.x;q.y=f.y-88;q.vx=q.vy=0;w.updateProjectiles(input);}
let cases=0,priorMeleeCases=0,defenseControls=0,freezeChecks=0,failures=[];
for(const def of roster)for(const facing of [-1,1])for(const {c,move}of moves)for(let index=1;index<=(move.projectile.count??1);index++)for(const prior of [false,true]){
 const w=new CombatWorld(def,c,'duel'),f=w.player,owner=w.enemy;f.x=f.previousX=500;f.facing=facing;owner.facing=-facing;owner.x=500+facing*45;owner.y=f.y;
 if(prior){const a=new Fighter(getCharacter('DUDLEY'),'enemy',500+facing*45,f.y,-facing);w.enemies.push(a);a.startMove(specialMovesFor('DUDLEY').primary);a.moveFrame=a.currentMove.startup;w.resolveAttack(a,f,quiet);a.moveFrame+=a.currentMove.multiHit.interval;w.resolveAttack(a,f,quiet);assert.equal(f.visualHitSequenceIndex,2);assert.equal(f.visualHitSequenceTotal,3);while(f.hitStop>0)f.updatePlayer(quiet,w.rules);for(let t=0;t<3;t++)f.updatePlayer(quiet,w.rules);assert(f.visualHitSequenceFrames>0&&f.visualHitSequenceFrames<11);priorMeleeCases++;}
 const total=move.projectile.count??1,hp=f.hp,score=w.totalEnemyDamage,eventStart=w.events.length;fire(w,f,owner,move,index,total);assert(f.hp<hp);assert.equal(w.totalEnemyDamage-score,hp-f.hp);const impact=w.events.slice(eventStart).find(e=>['hit','counter','air-hit','command-hit','target-hit'].includes(e.type));assert(impact);assert.equal(impact.hitIndex,index);assert.equal(impact.hitTotal,total);
 const duration=index>=total?18:11,expected=[index,total,duration,duration],label=def.id+' '+facing+' '+c.id+' '+move.id+' '+index+'/'+total+' '+(prior?'old-melee':'fresh');if(JSON.stringify(fields(f))!==JSON.stringify(expected))failures.push(label+' missing fresh recoil '+JSON.stringify(fields(f)));if(!victimReactionSample(f).active)failures.push(label+' no recoil');
 if(move.superCost){assert(f.superVictimFrames>0);assert.equal(f.superVictimHitIndex,index);assert.equal(f.superVictimHitTotal,total);}else assert.equal(f.superVictimFrames,0);
 const snapshot=fields(f);while(f.hitStop>0){f.updatePlayer(quiet,w.rules);assert.deepEqual(fields(f),snapshot,'Recoil freezes during real hitstop');freezeChecks++;}cases++;
}
for(const def of roster)for(const facing of [-1,1])for(const {c,move}of moves)for(const defense of ['block','parry']){
 if(defense==='block'&&move.guardBreak)continue;const w=new CombatWorld(def,c,'duel'),f=w.player,owner=w.enemy;f.facing=facing;owner.facing=-facing;
 if(defense==='parry'){const forward=facing===1?'right':'left';f.updatePlayer({...quiet,pressed:k=>k===forward},w.rules);assert(f.parryWindow>0);}
 const hp=f.hp,before=fields(f),input=defense==='block'?{...quiet,held:k=>k===(facing===1?'left':'right')}:quiet;fire(w,f,owner,move,1,move.projectile.count??1,input);assert.equal(f.state,defense);assert.equal(f.hp,defense==='block'?hp-chipDamageFor(move):hp);assert.deepEqual(fields(f),before,'Defense must not start a hit recoil sequence');assert.equal(w.totalEnemyDamage,0);defenseControls++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('PROJECTILE_HIT_RECOIL_PASS',{victims:10,facings:2,projectileMoves:moves.length,cases,priorMeleeCases,defenseControls,freezeChecks,actualBurstMetadata:true,damageAndDefensePreserved:true});
