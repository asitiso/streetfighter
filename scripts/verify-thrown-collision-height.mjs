import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
let cases=0,highJumpCases=0,contactCases=0,fallbackChecks=0,failures=[];
for(const attackChar of roster)for(const victimChar of roster)for(const facing of [-1,1])for(const phase of ['ground','takeoff','apex','descent']){
 const w=new CombatWorld(attackChar,getCharacter('RYU'),'belt'),p=w.player,v=w.enemy;p.x=p.previousX=500;p.y=p.previousY=500;p.facing=facing;v.x=v.previousX=500+facing*50;v.y=v.previousY=500;v.aiCooldown=1;
 const candidate=new Fighter(victimChar,'enemy',500+facing*140,500,-facing),fallback=new Fighter(getCharacter('KEN'),'enemy',500+facing*140,500,-facing);w.enemies.push(candidate,fallback);
 if(phase!=='ground'){candidate.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);if(phase==='takeoff')candidate.updatePlayer(quiet,w.rules);else{let ticks=0;while(candidate.jumpVelocity>0&&ticks++<120)candidate.updatePlayer(quiet,w.rules);assert(candidate.airborne);if(phase==='descent')while(candidate.jumpHeight>30&&ticks++<120)candidate.updatePlayer(quiet,w.rules);assert(candidate.airborne);}}
 const move=throwMoveFor(attackChar.id),tolerance=Math.max(62,move.hitbox.height*.72),high=phase==='apex';assert.equal(candidate.jumpHeight>tolerance,high,'Actual trajectory must distinguish separated and overlapping heights');
 if(high){const before=[candidate.x,candidate.y,fallback.x,fallback.y];w.separatePair(candidate,fallback,46,32);assert.deepEqual([candidate.x,candidate.y,fallback.x,fallback.y],before,'Existing body collisions allow high jump');}
 const before={hp:candidate.hp,state:candidate.state,x:candidate.x,height:candidate.jumpHeight,velocity:candidate.jumpVelocity,fallbackHp:fallback.hp,primaryHp:v.hp};p.startMove(move);p.moveFrame=move.startup;w.resolveAttack(p,v,quiet);assert.equal(v.throwSyncRole,'victim');const damage=Math.round(move.damage*.62),label=attackChar.id+' → '+victimChar.id+' '+facing+' '+phase;
 const hit=high?fallback:candidate,miss=high?candidate:fallback;if(hit.hp!== (high?before.fallbackHp:before.hp)-damage)failures.push(label+' valid victim not hit');if(miss.hp!== (high?before.hp:before.fallbackHp))failures.push(label+' separated/unselected victim damaged');
 if(high){if(candidate.state!==before.state||candidate.x!==before.x)failures.push(label+' jumping victim interrupted');assert.equal(candidate.jumpHeight,before.height);assert.equal(candidate.jumpVelocity,before.velocity);highJumpCases++;fallbackChecks++;}else{assert.equal(candidate.state,'knockdown');contactCases++;}
 const collateral=w.events.filter(e=>e.type==='enemy-collision');assert.equal(collateral.length,1);assert.equal(w.totalPlayerDamage,before.primaryHp-v.hp+damage,'Exactly one collateral hit recorded');cases++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('THROWN_COLLISION_HEIGHT_PASS',{throwers:10,victims:10,facings:2,cases,highJumpCases,contactCases,fallbackChecks,actualJumpTrajectories:true,groundAndLowAirDamagePreserved:true});
