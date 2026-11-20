import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
function fixture(c,facing,role){const w=new CombatWorld(role==='attacker'?c:getCharacter('RYU'),role==='victim'?c:getCharacter('RYU'),'duel',c.superArts[0]);const p=w.player,e=w.enemy;p.x=p.previousX=500;p.facing=facing;e.x=e.previousX=p.x+facing*45;e.y=e.previousY=p.y;e.facing=-facing;e.aiCooldown=9;p.startMove(throwMoveFor(p.character.id));p.moveFrame=p.currentMove.startup;w.resolveAttack(p,e,quiet);assert.equal(w.events.filter(x=>x.type==='throw-escape').length,1);assert.equal(w.totalPlayerDamage,0);assert.equal(w.totalEnemyDamage,0);for(const f of [p,e]){assert.equal(f.throwEscapeFrames,12);assert.equal(f.hitStop,4);assert.equal(f.state,'idle');assert.equal(motionClipForFighter(f,0).clip,'throwEscape');}return {w,f:role==='attacker'?p:e};}
let cases=0,neutralControls=0,immunityChecks=0;
for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const route of ['hit','block','parry','jump','dash']){
 const {w,f}=fixture(c,facing,role);while(f.hitStop>0)f.updatePlayer(quiet,w.rules);const beforeHp=f.hp;
 if(['hit','block','parry'].includes(route)){
  const owner=f===w.player?w.enemy:w.player;owner.facing=-f.facing;
  if(route==='parry'){const key=f.facing===1?'right':'left';f.updatePlayer({...quiet,pressed:k=>k===key},w.rules);assert(f.parryWindow>0);}
  const result=f.receiveHit(normalFor('mp',false,'RYU'),owner,route==='block');assert.equal(result,route==='parry'?'parry':route==='block'?'block':'hit');assert.equal(f.state,route);if(route==='hit')assert(f.hp<beforeHp);else assert.equal(f.hp,beforeHp);
 }else if(route==='jump'){f.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);assert(f.airborne);assert.equal(f.state,'jump');}
 else{const key=f.facing===1?'right':'left',tap={...quiet,pressed:k=>k===key};f.captureInput(tap,1);f.updatePlayer(tap,w.rules);f.captureInput(quiet,2);f.updatePlayer(quiet,w.rules);f.captureInput(tap,3);f.updatePlayer(tap,w.rules);assert(f.dashFrames>0);}
 const remaining=f.throwEscapeFrames;assert(remaining>0);assert.equal(f.canBeThrown(),false);immunityChecks++;
 const fresh=new Fighter(c,f.side,f.x,f.y,f.facing,c.superArts[0]);Object.assign(fresh,f);fresh.throwEscapeFrames=0;
 const expected=motionClipForFighter(fresh,0);assert.notEqual(expected.clip,'throwEscape');assert.deepEqual(motionClipForFighter(f,0),expected,c.id+' '+role+' '+route+' should replace stale escape motion');assert.deepEqual(sampleFighterMotion(f,0),sampleFighterMotion(fresh,0));assert.equal(f.throwEscapeFrames,remaining);cases++;
}
for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const route of ['idle','walk','crouch']){
 const {w,f}=fixture(c,facing,role);while(f.hitStop>0)f.updatePlayer(quiet,w.rules);
 const held=route==='walk'?(f.facing===1?'right':'left'):route==='crouch'?'down':null;f.updatePlayer({...quiet,held:k=>k===held},w.rules);assert.equal(f.state,route);assert.equal(motionClipForFighter(f,0).clip,'throwEscape');assert.equal(f.canBeThrown(),false);immunityChecks++;neutralControls++;
}
console.log('THROW_ESCAPE_STATE_PRIORITY_PASS',{characters:10,facings:2,cases,neutralControls,immunityChecks,combatTimersPreserved:true,hitBlockParryJumpDashVisible:true});
