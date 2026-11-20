import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {specialMovesFor,superArtMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
const moves=roster.flatMap(c=>[...new Map([...Object.values(specialMovesFor(c.id)),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.projectile).map(m=>[m.id,m])).values()].map(move=>({c,move})));
let cases=0,turnedCases=0,airCases=0,defenseControls=0,meleeControls=0,failures=[];
for(const def of roster)for(const direction of [-1,1])for(const {c,move}of moves)for(const turned of [false,true])for(const mode of ['hit','air-hit','block','parry']){
 if(mode==='block'&&move.guardBreak)continue;const w=new CombatWorld(def,c,'duel'),f=w.player,owner=w.enemy;f.x=f.previousX=500;f.facing=-direction;owner.x=f.x-direction*100;owner.y=f.y;owner.facing=direction;
 if(mode==='air-hit'){f.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);for(let t=0;t<3;t++)f.updatePlayer(quiet,w.rules);assert(f.airborne);airCases++;}
 if(mode==='parry'){const key=f.facing===1?'right':'left';f.updatePlayer({...quiet,pressed:k=>k===key},w.rules);assert(f.parryWindow>0);}
 w.spawnScriptedProjectile(owner,move);const q=w.projectiles[0];assert.equal(Math.sign(q.vx),direction);q.x=f.x-q.vx;q.y=f.y-88-f.jumpHeight*.9;q.vy=0;if(turned)owner.facing=-direction;
 const hp=f.hp,x=f.x,ownerFacing=owner.facing,input=mode==='block'?{...quiet,held:k=>k===(f.facing===1?'left':'right')}:quiet;w.updateProjectiles(input);const expectedState=mode==='block'?'block':mode==='parry'?'parry':f.hp<=0?'ko':move.knockdown?'knockdown':'hit';assert.equal(f.state,expectedState);assert.equal(owner.facing,ownerFacing,'Impact cannot turn its owner');
 const hit=mode==='hit'||mode==='air-hit',push=mode==='parry'?0:move.pushback*(mode==='block'?.3:.45),label=def.id+' '+c.id+' '+move.id+' '+direction+' '+turned+' '+mode;
 if(Math.abs(f.x-(x+direction*push))>1e-8)failures.push(label+' wrong push direction');if(f.lastHitDirection!==direction)failures.push(label+' wrong recoil direction');if(hit&&move.superCost&&f.superVictimDirection!==direction)failures.push(label+' wrong super reaction direction');
 if(hit){assert(f.hp<hp);assert.equal(w.totalEnemyDamage,hp-f.hp);}else{assert.equal(f.hp,hp);assert.equal(w.totalEnemyDamage,0);defenseControls++;}cases++;if(turned)turnedCases++;
}
for(const c of roster)for(const direction of [-1,1])for(const superHit of [false,true]){const f=new Fighter(c,'player',500,500,-direction),a=new Fighter(getCharacter('RYU'),'enemy',500-direction*45,500,direction),move=superHit?superArtMoveFor('RYU',1):normalFor('mp',false,'RYU'),x=f.x;assert.equal(f.receiveHit(move,a,false),'hit');assert.equal(f.lastHitDirection,direction);assert.equal(f.x,x+direction*move.pushback*.45);if(superHit)assert.equal(f.superVictimDirection,direction);meleeControls++;}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('PROJECTILE_IMPACT_DIRECTION_PASS',{victims:10,projectileMoves:moves.length,cases,turnedCases,airCases,defenseControls,meleeControls,flightAndRecoilAgree:true,damageDefenseAndOwnerPreserved:true});
