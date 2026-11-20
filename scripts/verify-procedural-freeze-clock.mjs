import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,throwMoveFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {characterTextureManager} from '../dist/assets/render/CharacterTextureManager.js';
import {drawCombatFighter} from '../dist/assets/render/Visuals.js';
characterTextureManager.setMode('lite'); // No images loaded: exercise actual procedural fallback.
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
let cases=0,frozenChecks=0,wallClockChecks=0,resumeChecks=0,reactions=0;
function render(f,time){const calls=[],o={globalAlpha:1},ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return(...args)=>{calls.push([k,...args]);if(k==='createRadialGradient'||k==='createLinearGradient')return{addColorStop(...v){calls.push(['colorStop',...v]);}};};},set(o,k,v){o[k]=v;calls.push(['set',k,typeof v==='object'?'gradient':v]);return true;}});drawCombatFighter(ctx,f,1,time);assert(!calls.some(c=>c[0]==='drawImage'),'No bitmap route in this regression');return calls;}
function selected(f){return[f.x,f.y,f.previousX,f.previousY,f.state,f.stateFrame,f.moveFrame,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.throwSyncFrames,f.superVictimFrames,f.jumpHeight,f.jumpVelocity];}
function setup(c,facing,kind){const w=new CombatWorld(c,getCharacter('RYU'),'duel'),f=w.player,a=w.enemy;f.x=f.previousX=600;f.facing=facing;a.x=600+facing*45;a.facing=-facing;a.aiCooldown=1;
 if(kind==='hit')f.receiveHit(normalFor('hp',false,'RYU'),a,false);
 if(kind==='block')f.receiveHit(normalFor('mp',false,'RYU'),a,true);
 if(kind==='super-victim')f.receiveHit(superArtMoveFor('RYU',1),a,false);
 if(kind==='throw-attacker'||kind==='throw-victim'){const attacker=kind==='throw-attacker'?f:a,defender=kind==='throw-attacker'?a:f;attacker.facing=kind==='throw-attacker'?facing:-facing;attacker.startMove(throwMoveFor(attacker.character.id));attacker.moveFrame=attacker.currentMove.startup;w.resolveAttack(attacker,defender,q);assert(f.throwSyncFrames>0);}
 if(kind==='walk')f.updatePlayer({...q,held:k=>k===(facing===1?'right':'left')},w.rules);
 return {w,f,a};}
for(const c of roster)for(const facing of [-1,1])for(const kind of ['idle','walk','hit','block','super-victim','throw-attacker','throw-victim']){
 const {w,f,a}=setup(c,facing,kind),before=selected(f),initial=render(f,0);
 for(const wallTime of [.016,.25,10,600]){const r=render(f,wallTime);if(!recording)assert.deepEqual(r,initial,c.id+'/'+kind+' procedural geometry/flash must not advance without a simulation tick');assert.deepEqual(selected(f),before);wallClockChecks++;}
 f.hitStop=3;let frozen=render(f,0);for(let t=0;t<3;t++){f.updatePlayer(q,w.rules);const current=render(f,30+t*.3);if(!recording)assert.deepEqual(current,frozen,'Procedural hitstop including terminal tick');frozenChecks++;records.push({c:c.id,facing,kind,route:'hitstop',tick:t,fighter:selected(f)});}
 w.superFreezeFrames=3;for(let t=0;t<3;t++){w.update(q,100+t);if(!recording)assert.deepEqual(render(f,50+t),frozen,'Procedural superfreeze must hold');frozenChecks++;records.push({c:c.id,facing,kind,route:'superfreeze',tick:t,fighter:selected(f)});}
 const clock=f.animationFrame;f.updatePlayer(q,w.rules);assert.equal(f.animationFrame,clock+1);const resumed=render(f,999);if(!recording)assert.deepEqual(resumed,render(f,0),'Resume must follow animation tick, not jumped wall time');resumeChecks++;
 // New combat reactions must still appear immediately even without a tick.
 const old=render(f,0);f.receiveHit(normalFor('mp',false,'RYU'),a,false);assert.notDeepEqual(render(f,0),old,'Reaction cannot be hidden by frozen visual time');reactions++;
 cases++;
}
// Secondary idle motion must animate normally when simulation advances.
for(const c of roster){const f=new Fighter(c,'player',600,500,1),w=new CombatWorld(c,c,'duel'),first=render(f,0);for(let t=0;t<20;t++)f.updatePlayer(q,w.rules);assert.notDeepEqual(render(f,20/60),first);}
if(recording)console.log(JSON.stringify(records));else console.log('PROCEDURAL_FREEZE_CLOCK_PASS',{cases,frozenChecks,wallClockChecks,resumeChecks,reactions,characters:roster.length});
