import assert from 'node:assert/strict';
import { CHARACTERS, getCharacter } from '../dist/assets/game/characters.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { normalFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { combatSpritePose } from '../dist/assets/render/CombatSpriteProfiles.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
const moves=CHARACTERS.flatMap(c=>c.superArts.map(a=>superArtMoveFor(c.id,a.id))).filter(m=>!m.install&&m.level!=='throw');
const prepare=(victim,attacker,outcome)=>{
 if(outcome==='red-parry') {
  assert.equal(victim.receiveHit(normalFor('lp'),attacker,true),'block');
  while(victim.hitStop>0)victim.updatePlayer(quiet,rules);
 }
 if(outcome!=='block')victim.updatePlayer({...quiet,pressed:key=>key===(victim.facing===1?'right':'left')},rules);
};
const assertDefense=victim=>{
 assert.equal(victim.superVictimFrames,0,'Successful defense must not play a Super Art victim reaction');
 assert.equal(victim.superVictimTotal,0);assert.equal(victim.superVictimMotif,'');
 assert.equal(victim.superVictimHitIndex,1);assert.equal(victim.superVictimHitTotal,1);
 assert.ok(combatSpritePose(victim,0).useSprite,'Defense must retain normal rendering');
 if(victim.character.id==='KEN')assert.equal(animationSequenceSample(victim,0)?.sequence.kind,victim.state==='block'?'guard':'parry');
};
let defenses=0,hits=0;
for(const id of ['KEN','CHUNLI'])for(const facing of [-1,1])for(const move of moves) {
 const attacker=new Fighter(getCharacter('RYU'),'enemy',650,460,-facing);
 for(const outcome of ['block','parry','red-parry']) {
  if(outcome==='block'&&move.guardBreak)continue;
  const victim=new Fighter(getCharacter(id),'player',600,460,facing);
  prepare(victim,attacker,outcome);
  assert.equal(victim.receiveHit(move,attacker,outcome==='block'),outcome);
  assert.equal(victim.hp,victim.maxHp);assertDefense(victim);defenses++;
 }
 const victim=new Fighter(getCharacter(id),'player',600,460,facing);
 assert.equal(victim.receiveHit(move,attacker,false),'hit');
 assert.ok(victim.hp<victim.maxHp);assert.ok(victim.superVictimFrames>0);
 assert.equal(victim.superVictimMotif,move.superPresentation?.motif??'burst');hits++;
}
// A real prior hit can finish stun before its victim reaction has expired.
for(const outcome of ['block','parry','red-parry']) {
 const victim=new Fighter(getCharacter('KEN'),'player',600,460,1);
 const attacker=new Fighter(getCharacter('RYU'),'enemy',650,460,-1);
 victim.receiveHit({...superArtMoveFor('RYU',1),hitStun:4,knockdown:false,launch:undefined},attacker,false);
 while(victim.state==='hit')victim.updatePlayer(quiet,rules);
 assert.ok(victim.superVictimFrames>0,'Fixture must retain the prior hit effect');
 prepare(victim,attacker,outcome);
 assert.equal(victim.receiveHit(normalFor('lp'),attacker,outcome==='block'),outcome);
 assertDefense(victim);
}
// Exercise actual projectile collision at both corners: defense must not emit
// hit-only wall effects or increase parry hit stop to the wall-impact value.
for(const facing of [-1,1])for(const outcome of ['block','parry','red-parry','hit']) {
 const world=new CombatWorld(getCharacter('KEN'),getCharacter('RYU'),'duel');
 const victim=world.player,attacker=world.enemy;
 victim.facing=facing;victim.x=facing===1?world.rules.arenaLeft:world.rules.arenaRight;
 attacker.facing=-facing;attacker.x=victim.x+facing*60;attacker.y=victim.y;
 if(outcome!=='hit')prepare(victim,attacker,outcome);
 const move=superArtMoveFor('RYU',1);
 world.spawnScriptedProjectile(attacker,move);
 const projectile=world.projectiles[0];assert.ok(projectile);
 projectile.x=victim.x;projectile.y=victim.y-88;projectile.vx=projectile.vy=0;
 world.updateProjectiles({...quiet,held:key=>outcome==='block'&&key===(facing===1?'left':'right')});
 assert.ok(world.events.some(e=>e.type===outcome),'Collision must produce the requested outcome');
 if(outcome==='hit') {
  assert.ok(victim.hp<victim.maxHp&&victim.superVictimFrames>0);
  assert.ok(world.events.some(e=>e.type==='wall-impact'),'Actual hit retains wall impact');
 } else {
  assert.equal(victim.hp,victim.maxHp);assertDefense(victim);
  assert.ok(!world.events.some(e=>['wall-impact','wall-bounce','ground-bounce','super-impact'].includes(e.type)),'Defense must not emit hit-only effects');
  if(outcome.includes('parry'))assert.equal(victim.hitStop,2);
 }
}
console.log('DEFENSE_OUTCOMES_PASS',{defenses,hitControls:hits,projectileCases:8,priorHitCases:3});
