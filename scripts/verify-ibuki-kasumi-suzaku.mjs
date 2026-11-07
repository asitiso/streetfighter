import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
const def=getCharacter('IBUKI'),moves=[specialMovesFor('IBUKI').super,superArtMoveFor('IBUKI',1)];
const input={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const move of moves) for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[0]);f.superGauge=f.superGaugeMax;f.startMove(move);
 const initial=animationSequenceSample(f,0);assert.equal(initial?.sequence.id,'IBUKI_KUNAI_HQ','Kasumi Suzaku reuses complete authored throwing motion');
 for(const [gameFrame,artFrame,contact] of [[0,0,false],[move.startup-1,4,false],[move.startup,5,true],[move.startup+move.active-1,6,true],[move.startup+move.active,7,false],[move.startup+move.active+move.recovery-1,11,false]]) {
  f.moveFrame=gameFrame;const s=animationSequenceSample(f,0);assert.equal(s.frame,artFrame);assert.equal(s.contact,contact);
 }
 f.superGauge=f.superGaugeMax;f.startMove(move);f.moveFrame=0;const frames=new Set();
 while(f.state==='attack'){const s=animationSequenceSample(f,0);frames.add(s.frame);f.updatePlayer(input,rules);}
 assert.ok(frames.has(0)&&frames.has(5)&&frames.has(6)&&frames.has(11));assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 f.state='attack';f.currentMove=move;f.airborne=true;assert.equal(animationSequenceSample(f,0),null,'Does not replace arbitrary air attacks');
 console.log('KASUMI_REACHABLE',{move:move.id,facing,frames:[...frames]});
}
for(const id of [2,3]){const f=new Fighter(def,'player',600,460,1);f.state='attack';f.currentMove=superArtMoveFor('IBUKI',id);assert.notEqual(animationSequenceSample(f,0)?.sequence.kind,'hadoken');}
for(const [index,move] of moves.entries()) for(const facing of [-1,1]) {
 const world=new CombatWorld(def,getCharacter('RYU'),'belt',def.superArts[0]);world.player.x=600;world.player.facing=facing;world.player.superGauge=world.player.superGaugeMax;
 world.enemy.x=facing===1?1100:120;world.enemy.aiCooldown=999;world.player.startMove(move);
 let emitted=false;
 for(let tick=0;tick<100;tick++){world.update(input,tick);const burst=world.projectiles.filter(p=>p.owner===world.player);if(burst.length){assert.equal(burst.length,index===0?4:5,'Existing projectile burst count retained');assert.equal(animationSequenceSample(world.player,0).contact,true,'Throw release matches actual projectile emission');assert.ok(burst.every(p=>Math.sign(p.vx)===facing));emitted=true;break;}}
 assert.ok(emitted,'Real combat emits the burst');
}
console.log('IBUKI_KASUMI_SUZAKU_PASS');
