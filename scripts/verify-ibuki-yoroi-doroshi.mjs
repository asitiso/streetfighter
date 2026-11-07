import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor,superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
const def=getCharacter('IBUKI'),move=superArtMoveFor('IBUKI',2),input={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
for(const facing of [-1,1]) {
 const f=new Fighter(def,'player',600,460,facing,def.superArts[1]);f.superGauge=f.superGaugeMax;f.startMove(move);
 assert.equal(animationSequenceSample(f,0)?.sequence.id,'IBUKI_YOROI_DOROSHI_HQ','SA2 needs authored entry/whiff/recovery');
 for(const [frame,art,contact] of [[0,0,false],[move.startup-1,3,false],[move.startup,4,true],[move.startup+move.active-1,5,true],[move.startup+move.active,6,false],[move.startup+move.active+move.recovery-1,9,false]]){f.moveFrame=frame;const s=animationSequenceSample(f,0);assert.equal(s.frame,art);assert.equal(s.contact,contact);}
 f.superGauge=f.superGaugeMax;f.startMove(move);let last=-1;const frames=new Set();while(f.state==='attack'){last=animationSequenceSample(f,0).frame;frames.add(last);f.updatePlayer(input,rules);}assert.equal(last,9);assert.equal(f.state,'idle');assert.deepEqual([...frames],[0,3,4,5,6,7,8,9]);
 const w=new CombatWorld(def,getCharacter('RYU'),'belt',def.superArts[1]);w.player.x=600;w.player.facing=facing;w.player.superGauge=w.player.superGaugeMax;w.enemy.x=600+facing*65;w.enemy.y=w.player.y;w.enemy.aiCooldown=999;const hp=w.enemy.hp;w.player.startMove(move);let synced=false,recovered=false;
 for(let tick=0;tick<150;tick++){w.update(input,tick);if(w.player.throwSyncFrames>0){synced=true;assert.equal(w.player.throwSyncRole,'attacker');assert.equal(w.enemy.throwSyncRole,'victim');assert.equal(animationSequenceSample(w.player,0),null,'Paired throw owns attacker while synchronized');assert.equal(animationSequenceSample(w.enemy,0),null,'Paired throw owns victim');}else if(synced&&w.player.state==='idle'){recovered=true;break;}}
 assert.ok(synced&&recovered);assert.equal(hp-w.enemy.hp,334,'SA2 retains existing throw damage');
 f.state='attack';f.currentMove=move;f.airborne=true;assert.equal(animationSequenceSample(f,0),null);
 for(const other of [specialMovesFor('IBUKI').super,superArtMoveFor('IBUKI',1),superArtMoveFor('IBUKI',3)]){f.airborne=false;f.currentMove=other;assert.notEqual(animationSequenceSample(f,0)?.sequence.kind,'yoroi-doroshi');}
}
console.log('IBUKI_YOROI_DOROSHI_PASS');
