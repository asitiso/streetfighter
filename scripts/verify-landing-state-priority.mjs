import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor,specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {motionClipForFighter,sampleFighterMotion} from '../dist/assets/render/AnimationPoseLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
import {combatSpritePose} from '../dist/assets/render/CombatSpriteProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
function landed(c,facing){const w=new CombatWorld(c,getCharacter('RYU'),'duel',c.superArts[0]),f=w.player;f.x=f.previousX=500;f.facing=facing;f.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);assert(f.airborne);let ticks=0;while(f.airborne&&ticks++<120)f.updatePlayer(quiet,w.rules);assert(!f.airborne);assert.equal(f.state,'idle');assert.equal(f.landingFrames,8);assert.equal(motionClipForFighter(f,0).clip,'landing');return {w,f};}
let cases=0,sequenceChecks=0,spriteChecks=0,neutralControls=0,rejectControls=0;
for(const c of roster)for(const facing of [-1,1])for(const route of ['lp','hk','special','super','jump','hit','block','parry','crouch','dash-forward','dash-back']){
 const {w,f}=landed(c,facing),beforeHp=f.hp;
 if(['lp','hk','jump'].includes(route))f.updatePlayer({...quiet,pressed:k=>k===route},w.rules);
 else if(route==='special'||route==='super'){f.superGauge=1000;f.startMove(route==='special'?specialMovesFor(c.id).primary:superArtMoveFor(c.id,1,c.superArts[0].gauge));}
 else if(route==='crouch')f.updatePlayer({...quiet,held:k=>k==='down'},w.rules);
 else if(route.startsWith('dash-')){const direction=route==='dash-forward'?facing:-facing,key=direction===1?'right':'left',tap={...quiet,pressed:k=>k===key};f.captureInput(tap,1);f.updatePlayer(tap,w.rules);f.captureInput(quiet,2);f.updatePlayer(quiet,w.rules);f.captureInput(tap,3);f.updatePlayer(tap,w.rules);assert(f.dashFrames>0);assert.equal(f.dashDirection,direction);}
 else{const owner=w.enemy;owner.facing=-f.facing;if(route==='parry'){const key=f.facing===1?'right':'left';f.updatePlayer({...quiet,pressed:k=>k===key},w.rules);assert(f.parryWindow>0);}const outcome=f.receiveHit(normalFor('mp',false,'RYU'),owner,route==='block');assert.equal(outcome,route);assert.equal(f.state,route);if(route==='hit')assert(f.hp<beforeHp);else assert.equal(f.hp,beforeHp);}
 if(['lp','hk','special','super'].includes(route))assert.equal(f.state,'attack');if(route==='jump'){assert(f.airborne);assert.equal(f.state,'jump');}if(route==='crouch')assert.equal(f.state,'crouch');
 const remaining=f.landingFrames;assert(remaining>0);const clean=new Fighter(c,f.side,f.x,f.y,f.facing,c.superArts[0]);Object.assign(clean,f);clean.landingFrames=0;
 const label=c.id+' '+route;assert.notEqual(motionClipForFighter(clean,0).clip,'landing');assert.deepEqual(motionClipForFighter(f,0),motionClipForFighter(clean,0),label+' must replace old landing clip');assert.deepEqual(sampleFighterMotion(f,0),sampleFighterMotion(clean,0),label+' vector motion');assert.deepEqual(animationSequenceSample(f,0),animationSequenceSample(clean,0),label+' authored sequence');sequenceChecks++;assert.deepEqual(combatSpritePose(f,0),combatSpritePose(clean,0),label+' base sprite pose');spriteChecks++;assert.equal(f.landingFrames,remaining,'Sampling must retain real landing timer');cases++;
}
for(const c of roster)for(const facing of [-1,1])for(const route of ['idle','walk']){
 const {w,f}=landed(c,facing);if(route==='walk')f.updatePlayer({...quiet,held:k=>k===(facing===1?'right':'left')},w.rules);assert.equal(f.state,route);const entryClip=route==='walk'?'walk':'landing';assert.equal(motionClipForFighter(f,0).clip,entryClip);
 f.superGauge=0;const remaining=f.landingFrames;for(const move of [specialMovesFor(c.id).exPrimary,superArtMoveFor(c.id,1,c.superArts[0].gauge)]){f.startMove(move);assert.equal(f.currentMove,null);assert.equal(f.landingFrames,remaining);assert.equal(motionClipForFighter(f,0).clip,entryClip,'Rejected move retains current neutral or walking pose');rejectControls++;}
 let ticks=0;while(f.landingFrames>0&&ticks++<12){assert.equal(motionClipForFighter(f,0).clip,route==='walk'&&ticks===1?'walk':'landing','Releasing movement restores neutral landing on its next actual tick');f.updatePlayer(quiet,w.rules);}assert.equal(f.landingFrames,0);assert.notEqual(motionClipForFighter(f,0).clip,'landing');neutralControls++;
}
console.log('LANDING_STATE_PRIORITY_PASS',{characters:10,facings:2,cases,sequenceChecks,spriteChecks,neutralControls,rejectControls,actualJumpLanding:true,combatTimersPreserved:true});
