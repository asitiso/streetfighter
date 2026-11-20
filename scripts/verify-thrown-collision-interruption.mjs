import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor,superArtMoveFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter} from '../dist/assets/render/AnimationPoseLibrary.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false},roster=[...CHARACTERS,...BOSS_CHARACTERS];
const pairState=f=>[f.throwSyncFrames,f.throwSyncTotal,f.throwSyncRole,f.throwSyncPartnerUid,f.throwSyncStyle];
function seeded(c,facing,seed){let other=new Fighter(c,'enemy',640,500,-facing,c.superArts[0]),partner=null;
 if(seed.startsWith('paired-')){const pair=new CombatWorld(getCharacter('RYU'),c,'duel'),a=seed==='paired-attacker'?pair.enemy:pair.player,v=a===pair.player?pair.enemy:pair.player;a.x=500;a.y=v.y=500;a.facing=facing;v.x=500+facing*45;v.aiCooldown=1;a.startMove(throwMoveFor(a.character.id));a.moveFrame=a.currentMove.startup;pair.resolveAttack(a,v,quiet);assert.equal(a.throwSyncRole,'attacker');assert.equal(v.throwSyncRole,'victim');other=pair.enemy;partner=pair.player;}
 else if(seed==='super-victim'){const owner=new Fighter(getCharacter('RYU'),'player',600,500,facing);other.receiveHit(superArtMoveFor('RYU',1),owner,false);assert(other.superVictimFrames>0);}
 else if(seed!=='idle'){other.superGauge=1000;other.startMove(seed==='normal'?normalFor('hp',false,c.id):seed==='special'?specialMovesFor(c.id).primary:superArtMoveFor(c.id,1,c.superArts[0].gauge));assert(other.currentMove);}
 return {other,partner};}
let cases=0,lethalCases=0,partnerControls=0,offTargetControls=0,failures=[];
for(const c of roster)for(const facing of [-1,1])for(const seed of ['idle','normal','special','super','paired-attacker','paired-victim','super-victim'])for(const lethal of [false,true]){
 const {other,partner}=seeded(c,facing,seed),w=new CombatWorld(getCharacter('RYU'),getCharacter('KEN'),'belt'),p=w.player,v=w.enemy;p.x=p.previousX=500;p.y=p.previousY=500;p.facing=facing;v.x=v.previousX=500+facing*50;v.y=v.previousY=500;v.aiCooldown=1;other.x=other.previousX=500+facing*140;other.y=other.previousY=500;if(lethal)other.hp=1;
 const far=new Fighter(c,'enemy',500+facing*400,500,-facing);far.startMove(normalFor('hp',false,c.id));w.enemies.push(other,far);
 const farBefore=[far.hp,far.currentMove,far.state],partnerBefore=partner?pairState(partner):null,before={hp:other.hp,x:other.x,gauge:other.superGauge,hitStop:other.hitStop},primaryHp=v.hp;
 const move=throwMoveFor('RYU');p.startMove(move);p.moveFrame=move.startup;w.resolveAttack(p,v,quiet);const expectedDamage=Math.min(before.hp,Math.round(move.damage*.62));
 assert.equal(other.hp,before.hp-expectedDamage);assert.equal(other.x,before.x+facing*38);assert.equal(other.superGauge,before.gauge);assert.equal(other.hitFlash,7);assert.equal(other.hitStop,Math.max(before.hitStop,8));assert.equal(other.state,lethal?'ko':'knockdown');assert.equal(other.stateFrame,lethal?-90:-30);assert.equal(w.events.filter(e=>e.type==='enemy-collision').length,1);assert.deepEqual([far.hp,far.currentMove,far.state],farBefore);offTargetControls++;
 if(partner){assert.deepEqual(pairState(partner),partnerBefore);partnerControls++;}
 const actualTotal=primaryHp-v.hp+expectedDamage,label=c.id+' '+facing+' '+seed+' '+(lethal?'lethal':'alive');
 if(other.currentMove!==null)failures.push(label+' retained attack');if(other.throwSyncFrames!==0||other.throwSyncRole!==null)failures.push(label+' retained paired pose');if(other.superVictimFrames!==0)failures.push(label+' retained super reaction');if(motionClipForFighter(other,0).clip!=='ko')failures.push(label+' wrong knockdown pose');if(w.totalPlayerDamage!==actualTotal||w.playerComboDamage!==actualTotal)failures.push(label+' overcounted damage');
 assert.equal(w.totalEnemyDamage,0);assert.equal(w.events.filter(e=>e.type==='ko'&&e.x===other.x).length,lethal?1:0);cases++;if(lethal)lethalCases++;
}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,12)},null,2));
console.log('THROWN_COLLISION_INTERRUPTION_PASS',{characters:10,facings:2,cases,lethalCases,partnerControls,offTargetControls,originalDamageTimingAndPushPreserved:true,actualDamageRecorded:true,obsoletePosesCleared:true});
