import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
import {motionClipForFighter} from '../dist/assets/render/AnimationPoseLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
const specs=[['dash-attack','walk','attack'],['landing-attack','jump','attack'],['parry-punish','parry','attack'],['crouch-attack','crouch','attack'],['attack-neutral','attack','idle'],['landing-neutral','jump','idle']];
function seed(f,[kind,from,to]){f.state=from;f.dashFrames=kind==='dash-attack'?4:0;f.airborne=from==='jump';sample(f);f.state=to;f.airborne=false;f.dashFrames=0;f.landingFrames=kind.startsWith('landing')?8:0;f.currentMove=to==='attack'?normalFor('hp',false,f.character.id):null;assert.equal(sample(f).kind,kind);}
function fixture(c,facing,role,spec){const w=new CombatWorld(c,c,'duel'),p=w.player,e=w.enemy,f=role==='attacker'?p:e;seed(f,spec);p.x=p.previousX=500;p.facing=facing;e.x=e.previousX=500+facing*45;e.y=e.previousY=p.y;e.facing=-facing;e.aiCooldown=9;p.startMove(throwMoveFor(c.id));p.moveFrame=p.currentMove.startup;w.resolveAttack(p,e,q);assert.equal(w.events.filter(ev=>ev.type==='throw-escape').length,1);assert.equal(f.throwEscapeFrames,12);return{w,f};}
const fields=f=>[f.x,f.y,f.state,f.stateFrame,f.hp,f.superGauge,f.hitStop,f.animationFrame,f.throwEscapeFrames,f.airborne,f.jumpHeight,f.dashFrames,f.landingFrames,f.currentMove?.id??null,f.moveFrame];
function clear(f,label){const s=sample(f);if(!recording)assert.deepEqual([s.active,s.kind,s.offsetX,s.offsetY,s.rotation,s.scaleX,s.scaleY,s.echo],[false,null,0,0,0,1,1,0],label+' previous transition cannot distort throw escape');return s;}
let cases=0,freezeChecks=0,escapeTicks=0;
for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const spec of specs){const {w,f}=fixture(c,facing,role,spec),label=c.id+'/'+facing+'/'+role+'/'+spec[0];clear(f,label);while(f.hitStop){f.updatePlayer(q,w.rules);clear(f,label);freezeChecks++;}for(let tick=0;tick<12;tick++){assert.equal(motionClipForFighter(f,0).clip,'throwEscape');clear(f,label);records.push([c.id,facing,role,spec[0],tick,fields(f)]);f.updatePlayer(q,w.rules);escapeTicks++;}assert.equal(f.throwEscapeFrames,0);cases++;}
let nextActionChecks=0;
if(!recording)for(const c of roster)for(const facing of [-1,1])for(const role of ['attacker','victim'])for(const from of ['idle','walk','crouch'])for(const action of ['attack','jump','dash']){
 const {w,f}=fixture(c,facing,role,specs[3]);while(f.hitStop)f.updatePlayer(q,w.rules);f.state=from;sample(f);
 const fresh=new Fighter(c,f.side,f.x,f.y,f.facing);Object.assign(fresh,f);fresh.throwEscapeFrames=0;sample(fresh);
 for(const target of [f,fresh]){if(action==='attack')target.startMove(normalFor('lp',false,c.id));else if(action==='dash')target.startDash(target.facing);else target.updatePlayer({...q,pressed:key=>key==='jump'},w.rules);}
 assert(f.throwEscapeFrames>0);assert.notEqual(motionClipForFighter(f,0).clip,'throwEscape');assert.deepEqual(sample(f),sample(fresh),'Accepted next action must retain normal transition while immunity continues');if(action==='attack'&&from==='crouch')assert.equal(sample(f).kind,'crouch-attack');nextActionChecks++;
}
if(recording)console.log(JSON.stringify(records));else console.log('THROW_ESCAPE_TRANSITION_PASS',{cases,freezeChecks,escapeTicks,nextActionChecks});
