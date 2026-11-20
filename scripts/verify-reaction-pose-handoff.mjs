import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],recording=process.argv.includes('--record-controls'),q={held:()=>false,pressed:()=>false,released:()=>false},records=[];
let tick=0,cases=0,frames=0,freezeControls=0,rejectedControls=0,cleanControls=0,staleBefore=0;
function step(f,input,r){f.captureInput(input,tick++);f.updatePlayer(input,r);}
function physics(f){return[f.x,f.y,f.previousX,f.previousY,f.state,f.stateFrame,f.animationFrame,f.hp,f.superGauge,f.airborne,f.jumpHeight,f.jumpVelocity,f.juggleHits,f.landingFrames,f.hitStop,f.hitFlash,f.currentMove?.id??null,f.moveFrame,f.visualRecoveryMoveId,f.visualHitSequenceFrames,f.attackConnected];}
function reactions(f){return[f.superVictimFrames,f.superVictimTotal,f.superVictimMotif,f.wallBounceFrames,f.groundBounceFrames,f.throwSyncFrames];}
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const bounce of ['wall','ground'])for(const follow of [false,true])for(const button of ['lp','hk']){
 const ownerId=bounce==='wall'?'RYU':'ALEX',w=new CombatWorld(c,getCharacter(ownerId),mode),f=w.player,a=w.enemy,move=superArtMoveFor(ownerId,bounce==='wall'?2:1,120),rows=[];
 f.x=f.previousX=bounce==='wall'?(facing===1?w.rules.arenaLeft:w.rules.arenaRight):600;f.y=f.previousY=500;f.facing=facing;a.x=f.x+facing*50;a.y=500;a.facing=-facing;a.superGauge=1000;a.startMove(move);a.moveFrame=move.startup;w.resolveAttack(a,f,q);assert(w.events.some(e=>e.type===bounce+'-bounce'));assert(f.hp>0&&f.airborne);assert.equal(f.state,'hit');
 if(follow)f.receiveHit(normalFor('lp',true,'RYU'),a,false);
 const held=reactions(f),clock=f.animationFrame,height=f.jumpHeight;assert(f.hitStop>0);step(f,{...q,pressed:k=>k==='lp'},w.rules);assert.equal(f.currentMove,null);assert.deepEqual(reactions(f),held);assert.equal(f.animationFrame,clock);assert.equal(f.jumpHeight,height);freezeControls++;
 let recovery=0;while((f.hitStop>0||f.state==='hit'||f.state==='knockdown')&&recovery++<160){step(f,q,w.rules);rows.push(physics(f));}assert.equal(f.state,'jump');assert(f.airborne);if(reactions(f).slice(0,5).some(v=>typeof v==='number'&&v>0))staleBefore++;
 const gauge=f.superGauge;f.superGauge=0;for(const denied of [specialMovesFor(c.id).exPrimary,specialMovesFor(c.id).super]){const fields=JSON.stringify(f);f.startMove(denied);assert.equal(JSON.stringify(f),fields,'Rejected moves must not release victim pose');rejectedControls++;}f.superGauge=gauge;
 const juggle=f.juggleHits;step(f,{...q,pressed:k=>k===button},w.rules);assert.equal(f.state,'attack');assert.equal(f.currentMove?.technique,'air');assert.equal(f.moveFrame,0);assert.equal(f.juggleHits,juggle);rows.push(physics(f));
 if(!recording){assert.equal(f.superVictimFrames,0,c.id+' '+bounce+' '+follow+' accepted air attack must release super victim pose');assert.equal(f.superVictimTotal,0);assert.equal(f.superVictimMotif,'');assert.equal(f.wallBounceFrames,0);assert.equal(f.groundBounceFrames,0);assert.equal(animationSequenceSample(f,0)?.sequence.kind,button==='lp'?'air-light-punch':'air-heavy-kick');}
 for(let n=0;n<12;n++){step(f,q,w.rules);rows.push(physics(f));if(!recording&&f.airborne&&f.currentMove?.technique==='air')assert.equal(animationSequenceSample(f,0)?.sequence.kind,button==='lp'?'air-light-punch':'air-heavy-kick');frames++;}
 records.push([c.id,mode,facing,bounce,follow,button,rows]);cases++;
}
for(const c of roster)for(const facing of [-1,1])for(const button of ['lp','hk']){const w=new CombatWorld(c,c,'duel'),f=w.player;f.facing=facing;step(f,{...q,pressed:k=>k==='jump'},w.rules);step(f,{...q,pressed:k=>k===button},w.rules);assert.equal(f.currentMove?.technique,'air');assert.equal(animationSequenceSample(f,0)?.sequence.kind,button==='lp'?'air-light-punch':'air-heavy-kick');cleanControls++;}
if(recording)console.log(JSON.stringify(records));else console.log('REACTION_POSE_HANDOFF_PASS',JSON.stringify({cases,frames,freezeControls,rejectedControls,cleanControls,staleBefore,characters:10,modes:2,facings:2,actualSuperBounceAndNewInput:true,physicalJuggleAndMoveTimingPreserved:true}));
