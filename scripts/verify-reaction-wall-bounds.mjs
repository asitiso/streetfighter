import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
let wallCases=0,frozenChecks=0,koCases=0,centralControls=0,nonreactionControls=0;
function setup(c,mode,side,wall,outcome,central=false){const w=new CombatWorld(side==='player'?c:getCharacter('RYU'),side==='enemy'?c:getCharacter('RYU'),mode),d=side==='player'?w.player:w.enemy,a=side==='player'?w.enemy:w.player,edge=central?600:wall==='left'?w.rules.arenaLeft:w.rules.arenaRight,dir=wall==='left'?-1:1;d.x=d.previousX=edge;d.facing=-dir;a.x=a.previousX=edge-dir*60;a.facing=dir;a.y=d.y;w.director.update=()=>new Map([[w.enemy.uid,{role:'attack',desiredX:w.enemy.x,desiredY:w.enemy.y,attackAllowed:false,rangedAllowed:false}]]);w.enemyDefenseDecision=()=>outcome==='block';if(outcome==='ko')d.hp=1;a.startMove(normalFor(outcome==='knockdown'?'hk':'hp',false,a.character.id));a.moveFrame=a.currentMove.startup-1;return{w,d,a,dir};}
function state(w){return{fighters:[w.player,...w.enemies].map(f=>[f.x,f.y,f.previousX,f.previousY,f.state,f.stateFrame,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.currentMove?.id??null,f.moveFrame,f.airborne,f.jumpHeight]),events:w.events.map(({type,x,y,power,ttl,moveId})=>({type,x,y,power,ttl,moveId})),combo:[w.totalPlayerDamage,w.totalEnemyDamage,w.playerComboHits,w.playerComboDamage,w.enemyComboHits,w.enemyComboDamage]};}
for(const c of roster)for(const mode of ['duel','belt'])for(const side of ['player','enemy'])for(const wall of ['left','right'])for(const outcome of ['hit','block','knockdown','ko']){
 const {w,d,dir}=setup(c,mode,side,wall,outcome),input={...q,held:k=>outcome==='block'&&k===(dir===-1?'left':'right')};
 w.update(input,0);assert.equal(d.state,outcome);if(!recording)assert.equal(d.x,wall==='left'?w.rules.arenaLeft:w.rules.arenaRight,c.id+'/'+side+'/'+outcome+' must stay at wall after push');
 const frozen=d.hitStop;for(let tick=1;tick<=frozen;tick++){w.update(input,tick);if(!recording)assert(d.x>=w.rules.arenaLeft&&d.x<=w.rules.arenaRight,'Stay inside through terminal frozen tick');frozenChecks++;}
 wallCases++;if(outcome==='ko')koCases++;
}
// Existing response physics away from boundaries is unchanged.
for(const c of roster)for(const mode of ['duel','belt'])for(const side of ['player','enemy'])for(const wall of ['left','right'])for(const outcome of ['hit','block','knockdown','ko']){
 const {w,dir}=setup(c,mode,side,wall,outcome,true),input={...q,held:k=>outcome==='block'&&k===(dir===-1?'left':'right')},rows=[];
 for(let tick=0;tick<14;tick++){w.update(input,tick);rows.push(state(w));}records.push({character:c.id,mode,side,wall,outcome,rows});centralControls++;
}
// Offscreen neutral/attack/jump entrants are outside this reaction-only policy.
for(const stateName of ['idle','walk','attack','jump','victory'])for(const side of ['player','enemy'])for(const edge of ['left','right']){
 const w=new CombatWorld(getCharacter('KEN'),getCharacter('RYU'),'belt'),f=side==='player'?w.player:w.enemy;w.player.x=side==='player'?(edge==='left'?50:1250):600;w.enemy.x=side==='enemy'?(edge==='left'?50:1250):600;f.state=stateName;const x=f.x;w.resolveBodyCollisions();assert.equal(f.x,x);records.push({stateName,side,edge,x:f.x,y:f.y});nonreactionControls++;
}
if(recording)console.log(JSON.stringify(records));else console.log('REACTION_WALL_BOUNDS_PASS',{wallCases,frozenChecks,koCases,centralControls,nonreactionControls,characters:roster.length});
