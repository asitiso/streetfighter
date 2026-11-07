import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor,superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('IBUKI'),move=superArtMoveFor('IBUKI',3),input={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[2]);f.superGauge=f.superGaugeMax;f.startMove(move);
 assert.equal(animationSequenceSample(f,0)?.sequence.id,'IBUKI_HASHIN_SHO_HQ');
 for(const [tick,frame,contact] of [[0,0,false],[move.startup,3,true],[move.startup+move.active-1,11,true],[move.startup+move.active,12,false],[move.startup+move.active+move.recovery-1,15,false]]){f.moveFrame=tick;const s=animationSequenceSample(f,0);assert.equal(s.frame,frame);assert.equal(s.contact,contact);}
 const hits=[];for(let hit=0;hit<move.multiHit.hits;hit++){f.moveFrame=move.startup+hit*move.multiHit.interval;const s=animationSequenceSample(f,0);assert.equal(s.contact,true);hits.push(s.frame);}assert.equal(new Set(hits).size,5);
 f.superGauge=f.superGaugeMax;f.startMove(move);const frames=new Set();while(f.state==='attack'){frames.add(animationSequenceSample(f,0).frame);f.updatePlayer(input,rules);}assert.ok(frames.has(0)&&frames.has(3)&&frames.has(11)&&frames.has(15));assert.equal(f.state,'idle');
 console.log('HASHIN_REACHABLE',{facing,frames:[...frames],hits});
 f.state='attack';f.currentMove=move;f.airborne=true;assert.equal(animationSequenceSample(f,0),null);
 for(const other of [specialMovesFor('IBUKI').super,superArtMoveFor('IBUKI',1),superArtMoveFor('IBUKI',2)]){f.airborne=false;f.currentMove=other;assert.notEqual(animationSequenceSample(f,0)?.sequence.kind,'super-rush');}
}
console.log('IBUKI_HASHIN_SHO_PASS');
for(const facing of [-1,1]) {
 const w=new CombatWorld(def,getCharacter('RYU'),'belt',def.superArts[2]);const wall=facing===1?w.rules.arenaRight-2:w.rules.arenaLeft+2;
 w.player.x=wall-facing*150;w.player.facing=facing;w.player.superGauge=w.player.superGaugeMax;w.enemy.x=wall;w.enemy.y=w.player.y;w.enemy.aiCooldown=999;w.enemy.aiProfile.guardChance=0;w.enemy.aiProfile.parryChance=0;w.player.startMove(move);
 const hits=new Set();let bounced=false;
 for(let tick=0;tick<240;tick++){w.update(input,tick);for(const event of w.events){if(event.moveId==='IBUKI_SA3'&&event.hitIndex)hits.add(event.hitIndex);if(event.type==='wall-bounce')bounced=true;}if(hits.size===5&&bounced)break;}
 assert.equal(hits.size,5,'Real combat connects all five strikes');assert.ok(bounced,'Finisher retains wall bounce');
}
