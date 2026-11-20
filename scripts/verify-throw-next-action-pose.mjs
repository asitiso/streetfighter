import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor,superArtMoveFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false},pair=f=>[f.throwSyncFrames,f.throwSyncTotal,f.throwSyncRole,f.throwSyncPartnerUid,f.throwSyncStyle];
let cases=0,installCases=0,rejectControls=0,idleControls=0,normalInputCases=0,maxPendingFrames=0,authoredChecks=0,fallbackChecks=0;
for(const c of roster)for(const facing of [-1,1])for(const boosted of superArtMoveFor(c.id,3,c.superArts[2].gauge).install?[false,true]:[false])for(const nextKind of ['lp','hk','special','super']){
 const w=new CombatWorld(c,getCharacter('RYU'),'duel',c.superArts[2]),f=w.player,e=w.enemy;f.x=f.previousX=500;f.facing=facing;e.x=e.previousX=500+facing*45;e.y=e.previousY=f.y;e.aiCooldown=1;
 if(boosted){f.superGauge=1000;f.startMove(superArtMoveFor(c.id,3,c.superArts[2].gauge));let ticks=0;while(f.currentMove&&ticks++<100)f.updatePlayer(quiet,w.rules);assert.equal(f.currentMove,null);assert(f.installFrames>0);}
 const move=throwMoveFor(c.id);f.startMove(move);f.moveFrame=f.currentMove.startup;const hp=e.hp;w.resolveAttack(f,e,quiet);assert.equal(f.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');const throwDamage=hp-e.hp;
 let ticks=0;while(f.currentMove&&ticks++<120){f.updatePlayer(quiet,w.rules);e.updateAi(f,w.rules);}assert.equal(f.currentMove,null);assert.equal(f.state,'idle');assert(f.throwSyncFrames>0,'Fixture must retain intentional idle throw followthrough');assert.equal(animationSequenceSample(f,0),null);idleControls++;maxPendingFrames=Math.max(maxPendingFrames,f.throwSyncFrames);
 f.superGauge=0;const before=pair(f);f.startMove(specialMovesFor(c.id).exPrimary);assert.deepEqual(pair(f),before,'Rejected move cannot consume prior followthrough');assert.equal(f.currentMove,null);assert.equal(f.superGauge,0);rejectControls++;f.startMove(superArtMoveFor(c.id,1,c.superArts[0].gauge));assert.deepEqual(pair(f),before,'Rejected super cannot consume prior followthrough');assert.equal(f.currentMove,null);assert.equal(f.superGauge,0);rejectControls++;
 const partner=pair(e),score=w.totalPlayerDamage;
 let next;
 if(nextKind==='lp'||nextKind==='hk'){next=normalFor(nextKind,false,c.id);f.updatePlayer({...quiet,pressed:key=>key===nextKind},w.rules);normalInputCases++;}
 else{next=nextKind==='special'?specialMovesFor(c.id).primary:superArtMoveFor(c.id,1,c.superArts[0].gauge);f.superGauge=1000;f.startMove(next);}
 assert.equal(f.currentMove?.id,next.id);assert.equal(f.state,'attack');assert.equal(f.throwSyncFrames,0,c.id+' '+nextKind+' new action must replace obsolete throw followthrough');assert.equal(f.throwSyncTotal,0);assert.equal(f.throwSyncRole,null);assert.equal(f.throwSyncPartnerUid,null);const fresh=new Fighter(c,'player',f.x,f.y,f.facing,c.superArts[2]);for(const key of ['installFrames','installPowerScale','installFrameScale','installMoveScale','installLabel'])fresh[key]=f[key];fresh.superGauge=1000;fresh.startMove(next);const expected=animationSequenceSample(fresh,0);assert.deepEqual(animationSequenceSample(f,0),expected,'Next action must match its normal authored/fallback rendering path');if(expected)authoredChecks++;else fallbackChecks++;
 assert.deepEqual(pair(e),partner,'Partner keeps own completed-throw followthrough');assert.equal(w.totalPlayerDamage,score);assert.equal(score,throwDamage);assert.equal(e.hp,hp-throwDamage);cases++;if(boosted)installCases++;
}
console.log('THROW_NEXT_ACTION_POSE_PASS',{characters:10,facings:2,cases,installCases,normalInputCases,rejectControls,idleControls,maxPendingFrames,authoredChecks,fallbackChecks,newActionVisible:true,throwDamagePreserved:true,partnerFollowthroughPreserved:true});
