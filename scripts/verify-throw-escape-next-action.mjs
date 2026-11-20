import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor,superArtMoveFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
function fixture(c,facing,role){const w=new CombatWorld(role==='attacker'?c:getCharacter('RYU'),role==='victim'?c:getCharacter('RYU'),'duel',c.superArts[0]);const p=w.player,e=w.enemy;p.x=p.previousX=500;p.facing=facing;e.x=e.previousX=p.x+facing*45;e.y=e.previousY=p.y;e.facing=-facing;e.aiCooldown=9;p.startMove(throwMoveFor(p.character.id));p.moveFrame=p.currentMove.startup;w.resolveAttack(p,e,quiet);assert.equal(w.events.filter(x=>x.type==='throw-escape').length,1);assert.equal(w.totalPlayerDamage,0);assert.equal(w.totalEnemyDamage,0);for(const f of [p,e]){assert.equal(f.throwEscapeFrames,12);assert.equal(f.hitStop,4);assert.equal(f.state,'idle');assert.equal(motionClipForFighter(f,0).clip,'throwEscape');}return {w,f:role==='attacker'?p:e};}
let cases=0,rejectedControls=0,idleControls=0,protectionChecks=0,normalInputs=0;
for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const kind of ['lp','mp','hp','hk','special','super']){
 const {w,f}=fixture(c,facing,role);while(f.hitStop>0)f.updatePlayer(quiet,w.rules);assert.equal(f.throwEscapeFrames,12);assert.equal(f.canBeThrown(),false);
 f.superGauge=0;for(const move of [specialMovesFor(c.id).exPrimary,superArtMoveFor(c.id,1,c.superArts[0].gauge)]){f.startMove(move);assert.equal(f.currentMove,null);assert.equal(f.throwEscapeFrames,12);assert.equal(motionClipForFighter(f,0).clip,'throwEscape');rejectedControls++;}
 const move=kind==='special'?specialMovesFor(c.id).primary:kind==='super'?superArtMoveFor(c.id,1,c.superArts[0].gauge):normalFor(kind,false,c.id);
 if(['lp','mp','hp','hk'].includes(kind)){f.updatePlayer({...quiet,pressed:k=>k===kind},w.rules);normalInputs++;}else{f.superGauge=1000;f.startMove(move);}
 assert.equal(f.currentMove?.id,move.id);assert.equal(f.state,'attack');assert(f.throwEscapeFrames>0);assert.equal(f.canBeThrown(),false,'New attack retains throw escape protection');protectionChecks++;
 const fresh=new Fighter(c,f.side,f.x,f.y,f.facing,c.superArts[0]);fresh.superGauge=1000;fresh.startMove(move);fresh.moveFrame=f.moveFrame;
 assert.deepEqual(motionClipForFighter(f,0),motionClipForFighter(fresh,0),c.id+' '+role+' '+kind+' new attack must replace stale escape pose');assert.deepEqual(sampleFighterMotion(f,0),sampleFighterMotion(fresh,0));assert.equal(w.totalPlayerDamage,0);assert.equal(w.totalEnemyDamage,0);cases++;
}
for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim']){const {w,f}=fixture(c,facing,role);while(f.hitStop>0)f.updatePlayer(quiet,w.rules);for(let t=0;t<12;t++){assert.equal(f.throwEscapeFrames,12-t);assert.equal(f.canBeThrown(),false);assert.equal(motionClipForFighter(f,0).clip,'throwEscape');f.updatePlayer(quiet,w.rules);protectionChecks++;}assert.equal(f.throwEscapeFrames,0);assert.equal(f.canBeThrown(),true);assert.equal(motionClipForFighter(f,0).clip,'idle');idleControls++;}
console.log('THROW_ESCAPE_NEXT_ACTION_PASS',{characters:10,facings:2,cases,normalInputs,rejectedControls,idleControls,protectionChecks,escapeDamageUnchanged:true,rethrowProtectionPreserved:true});
