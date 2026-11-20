import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
let hitCases=0,frozenTicks=0,terminalTicks=0,resumeChecks=0,controlCases=0,superFreezeChecks=0;
function setup(c,mode,facing,button='hp'){const w=new CombatWorld(c,getCharacter('RYU'),mode),p=w.player,e=w.enemy;p.x=p.previousX=600;p.y=p.previousY=mode==='belt'?480:500;p.facing=facing;e.x=e.previousX=600+facing*50;e.y=e.previousY=p.y+(mode==='belt'?52:0);e.state='hit';e.stateFrame=-100;e.updateAiDirected=()=>{};e.updateAi=()=>{};p.startMove(normalFor(button,false,c.id));return{w,p,e};}
function state(w){return {fighters:[w.player,w.enemy].map(f=>[f.x,f.y,f.previousX,f.previousY,f.state,f.stateFrame,f.moveFrame,f.currentMove?.id??null,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.airborne,f.jumpHeight]),events:w.events.map(({type,x,y,power,ttl,moveId})=>({type,x,y,power,ttl,moveId})),combo:[w.playerComboHits,w.playerComboDamage,w.totalPlayerDamage]};}
for(const c of roster)for(const facing of [-1,1])for(const button of ['lp','hp','mk']){
 const {w,p,e}=setup(c,'belt',facing,button);p.moveFrame=p.currentMove.startup-1;const hp=e.hp;w.update(q,0);assert(e.hp<hp&&p.hitStop>0,'Actual melee hit must create hit stop');const hitY=p.y,moveFrame=p.moveFrame,animation=p.animationFrame;let tick=1;
 while(p.hitStop>0){const stop=p.hitStop;w.update(q,tick++);if(!recording){assert.equal(p.y,hitY,c.id+' automatic lane alignment must freeze');assert.equal(p.previousY,hitY);assert.equal(p.moveFrame,moveFrame);assert.equal(p.animationFrame,animation);}assert.equal(p.hitStop,stop-1);frozenTicks++;if(stop===1){terminalTicks++;if(!recording)assert.equal(p.y,hitY,'Terminal 1→0 hitstop tick is still frozen');}}
 const y=p.y;w.update(q,tick++);if(!recording)assert(p.y>y,'Automatic alignment resumes on first unfrozen active tick');resumeChecks++;hitCases++;
}
// A separately frozen, still-active move verifies terminal tick independently.
for(const c of roster)for(const facing of [-1,1]){
 const {w,p}=setup(c,'belt',facing);p.moveFrame=p.currentMove.startup;p.hitStop=1;const y=p.y;w.update(q,0);if(!recording)assert.equal(p.y,y);terminalTicks++;
 p.hitStop=0;w.superFreezeFrames=3;const before=state(w).fighters;for(let t=1;t<=3;t++){w.update(q,t);assert.deepEqual(state(w).fighters,before);superFreezeChecks++;}
}
// Unfrozen whiff alignment, duel combat, and projectile exclusions must be identical.
for(const c of roster)for(const facing of [-1,1])for(const mode of ['duel','belt'])for(const kind of ['whiff','projectile']){
 if(kind==='projectile'&&specialMovesFor(c.id).primary.kind!=='projectile')continue;
 const {w,p,e}=setup(c,mode,facing);if(kind==='projectile'){p.superGauge=100;p.startMove(specialMovesFor(c.id).primary);}else e.x=e.previousX=p.x+facing*(p.currentMove.hitbox.forward*c.reach+12);
 const rows=[];for(let tick=0;tick<8;tick++){w.update(q,tick);rows.push(state(w));}records.push({character:c.id,facing,mode,kind,rows});controlCases++;
}
if(recording)console.log(JSON.stringify(records));else console.log('HITSTOP_LANE_ALIGNMENT_PASS',{hitCases,frozenTicks,terminalTicks,resumeChecks,controlCases,superFreezeChecks,characters:roster.length});
