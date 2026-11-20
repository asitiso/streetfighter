import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample,animationTransitionDuration as duration} from '../dist/assets/render/AnimationTransitionProfiles.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const rules=new CombatWorld(CHARACTERS[0],CHARACTERS[1],'duel').rules;
const cases=[['dash-attack','walk','attack'],['landing-attack','jump','attack'],['parry-punish','parry','attack'],['crouch-attack','crouch','attack'],['attack-neutral','attack','idle'],['landing-neutral','jump','idle']];
function setup(c,facing,[kind,from,to]){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=from;f.stateFrame=20;f.dashFrames=kind==='dash-attack'?5:0;f.airborne=from==='jump';sample(f);f.state=to;f.stateFrame=0;f.dashFrames=0;f.airborne=false;f.landingFrames=kind.startsWith('landing')?8:0;f.currentMove=to==='attack'?normalFor('hp',false,c.id):null;const start=sample(f);assert.equal(start.kind,kind);assert.equal(start.strength,1);return f;}
let scenarios=0,repeatChecks=0,freezeChecks=0,skipChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of[-1,1])for(const spec of cases){
 const f=setup(c,facing,spec),first=sample(f);assert.equal(first.strength,1,'Rendering twice without a simulation step must preserve transition strength');
 for(let i=0;i<8;i++){assert.deepEqual(sample(f),first,'High-refresh redraw must not consume transition time');repeatChecks++;}
 for(let tick=0;tick<2;tick++)f.updatePlayer(quiet,rules);const beforeFreeze=sample(f);assert(beforeFreeze.strength<first.strength);f.hitStop=3;
 for(let i=0;i<3;i++){f.updatePlayer(quiet,rules);assert.deepEqual(sample(f),beforeFreeze,'Every hit-stop tick, including the last, must freeze transition geometry');freezeChecks++;}
 const dense=setup(c,facing,spec),sparse=setup(c,facing,spec);let expected;
 for(let tick=1;tick<=5;tick++){dense.updatePlayer(quiet,rules);expected=sample(dense);sample(dense);}
 for(let tick=1;tick<=5;tick++)sparse.updatePlayer(quiet,rules);assert.deepEqual(sample(sparse),expected,'Skipped renders must consume the elapsed simulation frames');skipChecks++;
 for(let tick=0;tick<duration(spec[0]);tick++)f.updatePlayer(quiet,rules);assert.equal(sample(f).active,false,'Transition ends after its simulation duration');scenarios++;
}
let worldFreezeChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of[-1,1]){
 const w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player;f.facing=facing;f.state='walk';f.dashFrames=4;sample(f);
 w.update({...quiet,pressed:k=>k==='hp'},0);assert.equal(f.state,'attack');const first=sample(f);assert.equal(first.kind,'dash-attack');
 f.hitStop=3;for(let tick=1;tick<=3;tick++){w.update(quiet,tick);assert.deepEqual(sample(f),first);worldFreezeChecks++;}
 w.superFreezeFrames=3;for(let tick=4;tick<=6;tick++){w.update(quiet,tick);assert.deepEqual(sample(f),first);worldFreezeChecks++;}
 w.update(quiet,7);assert(sample(f).strength<first.strength,'Real simulation resumes transition after freeze');
}
let chainChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS]){
 function chainSeed(){const f=new Fighter(c,'player',400,500,1,c.superArts[0]);f.state='walk';f.dashFrames=4;sample(f);f.startMove(normalFor('lp',false,c.id));sample(f);return f;}
 const dense=chainSeed(),sparse=chainSeed();
 for(let tick=1;tick<=4;tick++){dense.updatePlayer(quiet,rules);sample(dense);sparse.updatePlayer(quiet,rules);}
 dense.attackConnected=sparse.attackConnected=true;
 const follow={...quiet,pressed:k=>k==='mp'};dense.updatePlayer(follow,rules);sparse.updatePlayer(follow,rules);
 if(dense.moveFrame===0){assert.deepEqual(sample(sparse),sample(dense),'Actual target-combo clock reset must not make dense and sparse renders diverge');chainChecks++;}
}
assert(chainChecks>=5,'Exercise actual roster target combo resets');
let aiClockChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS]){
 const f=setup(c,1,cases[0]),target=new Fighter(c,'player',700,500,-1,c.superArts[0]);const first=sample(f);const directive={role:'attack',desiredX:f.x,desiredY:f.y,attackAllowed:false,rangedAllowed:false};
 f.updateAiDirected(target,rules,directive);assert(sample(f).strength<first.strength);const before=sample(f);f.hitStop=3;
 for(let tick=0;tick<3;tick++){f.updateAiDirected(target,rules,directive);assert.deepEqual(sample(f),before);aiClockChecks++;}
}
console.log('TRANSITION_SIMULATION_CLOCK_PASS',{scenarios,repeatChecks,freezeChecks,skipChecks,worldFreezeChecks,chainChecks,aiClockChecks});
