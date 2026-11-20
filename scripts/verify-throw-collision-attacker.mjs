import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {throwMoveFor,superArtMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
const moves=roster.flatMap(c=>[throwMoveFor(c.id),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.level==='throw').map(move=>({c,move})));
let enemyCases=0,playerControls=0,secondaryHits=0,lethalSecondary=0,duelControls=0,previousSelfOverlapCases=0,landingCrossups=0;
function fighter(f){return[f.x,f.y,f.hp,f.superGauge,f.state,f.stateFrame,f.currentMove?.id??null,f.moveFrame,f.attackConnected,f.hitStop,f.throwSyncFrames,f.throwSyncTotal,f.throwSyncRole,f.superVictimFrames,f.airborne,f.jumpHeight];}
for(const {c,move}of moves)for(const side of ['player','enemy'])for(const mode of ['belt','duel'])for(const facing of [-1,1])for(const offset of [-8,-7,0,45])for(const kind of ['none','near','near-lethal','far']){
 const w=new CombatWorld(side==='player'?c:getCharacter('KEN'),side==='enemy'?c:getCharacter('KEN'),mode),a=side==='player'?w.player:w.enemy,d=side==='player'?w.enemy:w.player;a.x=a.previousX=600;a.y=a.previousY=500;a.facing=facing;d.x=d.previousX=600+facing*offset;d.y=d.previousY=500;d.facing=-facing;d.aiCooldown=1;
 const other=kind==='none'?null:new Fighter(getCharacter('IBUKI'),'enemy',d.x+facing*(move.pushback*.45+72+(kind==='far'?350:0)),500,-facing);if(other){if(kind==='near-lethal')other.hp=1;other.startMove(normalFor('hp',false,'IBUKI'));w.enemies.push(other);}
 a.superGauge=1000;a.startMove(move);a.moveFrame=a.currentMove.startup;const hp=a.hp,dhp=d.hp,ohp=other?.hp??0,active=a.currentMove;w.resolveAttack(a,d,q);
 const selfOverlap=side==='enemy'&&mode==='belt'&&Math.abs(offset+move.pushback*.45+72)<=92;if(selfOverlap)previousSelfOverlapCases++;
 if(!recording){assert.equal(a.hp,hp,c.id+'/'+side+'/'+mode+'/'+offset+' attacker cannot collide with its own throw');assert.equal(a.state,'attack');assert.equal(a.currentMove,active);assert.equal(a.throwSyncRole,'attacker');assert.equal(d.throwSyncRole,'victim');assert(d.hp<dhp);}
 const shouldCollide=mode==='belt'&&kind.startsWith('near');if(!recording){assert.equal(w.events.filter(e=>e.type==='enemy-collision').length,shouldCollide?1:0);if(other){assert.equal(other.hp,shouldCollide?Math.max(0,ohp-Math.round(active.damage*.62)):ohp);assert.equal(other.state,shouldCollide?(kind==='near-lethal'?'ko':'knockdown'):'attack');}const total=dhp-d.hp+(other?ohp-other.hp:0);assert.equal(side==='player'?w.totalPlayerDamage:w.totalEnemyDamage,total,'Combo damage reflects the actual victim and secondary target, excluding attacker');}
 if(shouldCollide){secondaryHits++;if(kind==='near-lethal')lethalSecondary++;}if(side==='enemy')enemyCases++;else playerControls++;if(mode==='duel')duelControls++;
 if(!selfOverlap)records.push({c:c.id,move:move.id,side,mode,facing,offset,kind,attacker:fighter(a),defender:fighter(d),other:other?fighter(other):null,events:w.events.map(({type,x,y,power,ttl,moveId})=>({type,x,y,power,ttl,moveId})),combo:[w.totalPlayerDamage,w.totalEnemyDamage,w.playerComboHits,w.playerComboDamage,w.enemyComboHits,w.enemyComboDamage]});
}
// Resolve a genuine landing cross-up through the complete world update order.
for(const c of roster)for(const facing of [-1,1]){
 const w=new CombatWorld(c,getCharacter('RYU'),'belt'),d=w.player,a=w.enemy;
 d.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);
 while(d.jumpHeight+d.jumpVelocity>0)d.updatePlayer(q,w.rules);
 assert(d.airborne);d.x=d.previousX=600+facing*.001;d.y=d.previousY=500;a.x=a.previousX=600;a.y=a.previousY=500;a.facing=facing;a.startMove(throwMoveFor('RYU'));a.moveFrame=a.currentMove.startup-1;const hp=a.hp;
 w.update({...q,held:k=>k===(facing===1?'left':'right')},100);
 assert(!d.airborne&&d.hp<d.maxHp,'Landing cross-up must resolve the real throw');if(!recording){assert.equal(a.hp,hp,'Landing cross-up attacker cannot hit itself');assert.equal(a.throwSyncRole,'attacker');}landingCrossups++;
}
if(recording)console.log(JSON.stringify(records));else console.log('THROW_COLLISION_ATTACKER_PASS',{throwMoves:moves.length,enemyCases,playerControls,secondaryHits,lethalSecondary,duelControls,previousSelfOverlapCases,landingCrossups,recordedControls:records.length});
