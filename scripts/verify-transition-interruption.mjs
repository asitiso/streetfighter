import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor,throwMoveFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS];
const cases=[['dash-attack','walk','attack'],['landing-attack','jump','attack'],['parry-punish','parry','attack'],['crouch-attack','crouch','attack'],['attack-neutral','attack','idle'],['landing-neutral','jump','idle']];
function seed(c,facing,[kind,from,to]){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=from;f.dashFrames=kind==='dash-attack'?4:0;f.airborne=from==='jump';sample(f);f.state=to;f.airborne=false;f.dashFrames=0;f.landingFrames=kind.startsWith('landing')?8:0;f.currentMove=to==='attack'?normalFor('hp',false,c.id):null;assert.equal(sample(f).kind,kind);return f;}
const failures=[];let reactions=0,repeatChecks=0,resumeChecks=0;
for(const c of roster)for(const facing of[-1,1])for(const spec of cases)for(const reaction of ['hit','knockdown','ko','victory','throw-sync','super-victim','wall-bounce','ground-bounce','block','parry']){
 if((reaction==='block'||reaction==='parry')&&spec[2]!=='idle')continue;
 const f=seed(c,facing,spec),a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]),incoming=normalFor('hp',false,c.id);
 if(reaction==='hit')assert.equal(f.receiveHit(incoming,a,false),'hit');
 if(reaction==='knockdown'){f.receiveHit(throwMoveFor(c.id),a,false);assert.equal(f.state,'knockdown');}
 if(reaction==='ko'){f.hp=1;f.receiveHit(incoming,a,false);assert.equal(f.state,'ko');}
 if(reaction==='victory')f.enterVictoryPose();
 if(reaction==='throw-sync')f.beginThrowSync('victim',a.uid,facing,24,c.id);
 if(reaction==='super-victim')f.syncSuperVictimHit(1,3);
 if(reaction==='wall-bounce')f.applyWallBounce(facing);
 if(reaction==='ground-bounce')f.applyGroundBounce();
 if(reaction==='block')assert.equal(f.receiveHit(incoming,a,true),'block');
 if(reaction==='parry'){f.parryWindow=6;assert.equal(f.receiveHit(incoming,a,false),'parry');}
 const s=sample(f);if(s.active||s.kind!==null||s.offsetX!==0||s.offsetY!==0||s.rotation!==0||s.scaleX!==1||s.scaleY!==1||s.echo!==0)failures.push(c.id+' '+facing+' '+spec[0]+' '+reaction);reactions++;
 for(let i=0;i<3;i++){assert.deepEqual(sample(f),s,'Redraw cannot resurrect cleared transition');repeatChecks++;}
 f.throwSyncFrames=0;f.superVictimFrames=0;f.wallBounceFrames=0;f.groundBounceFrames=0;if(sample(f).active)failures.push(c.id+' '+facing+' '+spec[0]+' '+reaction+' resumes old transition');resumeChecks++;
}
assert.deepEqual(failures,[],'Forced reactions must clear the old movement/attack transition');
let punishChecks=0;
for(const c of roster)for(const facing of[-1,1]){const f=seed(c,facing,cases[4]),a=new Fighter(c,'enemy',600,500,-facing,c.superArts[0]);f.parryWindow=6;f.receiveHit(normalFor('hp',false,c.id),a,false);assert.equal(sample(f).active,false);f.startMove(normalFor('lp',false,c.id));assert.equal(sample(f).kind,'parry-punish','New intentional punish transition still starts after a parry');punishChecks++;}
console.log('TRANSITION_INTERRUPTION_PASS',{reactions,repeatChecks,resumeChecks,punishChecks});

// Exercise real touchdown and reaction recovery with an unrendered interruption.
{
const q={held:()=>false,pressed:()=>false,released:()=>false};
function setup(c,face,mode){const w=new CombatWorld(c,c,mode),f=w.player;f.x=f.previousX=500;f.facing=face;const step=(i=q)=>f.updatePlayer(i,w.rules);step({...q,pressed:k=>k==='jump'});let ticks=0;while(f.airborne){step();assert(++ticks<100);}sample(f);step({...q,pressed:k=>k==='hp'});assert(f.attackLandingFrames>0);assert.equal(sample(f).kind,'landing-attack');return{w,f,step};}
function physics(f){return[f.state,f.moveFrame,f.stateFrame,f.animationFrame,f.x,f.y,f.hp,f.superGauge,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.currentMove?.id,f.attackAnimationStartFrame,f.attackLandingFrames];}
let cases=0,recoveryFrames=0,newAttacks=0,terminalChecks=0;
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['belt','duel'])for(const reaction of['hit','throw','launch','collision','ko','victory']){
 const a=setup(c,face,mode),b=setup(c,face,mode);
 for(const r of[a,b]){const f=r.f,e=r.w.enemy;if(reaction==='victory')f.enterVictoryPose();else if(reaction==='collision')f.receiveThrownCollision(20,face);else{if(reaction==='ko')f.hp=1;const move=reaction==='throw'?throwMoveFor(c.id):reaction==='launch'?specialMovesFor(c.id).antiAir:normalFor('hp',false,c.id);f.receiveHit(move,e,false);}if(reaction==='launch')assert(f.airborne,'anti-air must actually launch victim');assert.equal(f.currentMove,null);assert.equal(f.attackLandingFrames,0);}
 assert.equal(sample(a.f).active,false,'reaction releases entry distortion');assert.deepEqual(physics(a.f),physics(b.f));
 if(reaction==='ko'||reaction==='victory'){for(let k=0;k<20;k++){a.step();sample(a.f);b.step();assert.deepEqual(physics(a.f),physics(b.f));}assert.equal(sample(b.f).active,false);terminalChecks++;}
 else{let ticks=0;while(a.f.state==='hit'||a.f.state==='knockdown'||a.f.airborne||a.f.hitStop>0||a.f.landingFrames>0){a.step();sample(a.f);b.step();assert.deepEqual(physics(a.f),physics(b.f));assert(++ticks<240);recoveryFrames++;}const attack={...q,pressed:k=>k==='hp'};a.step(attack);b.step(attack);assert.equal(a.f.currentMove.id,'5HP');assert.equal(a.f.attackLandingFrames,0);assert.deepEqual(sample(a.f),sample(b.f),'unrendered reaction cannot resurrect landing entry');assert.equal(sample(b.f).active,false);newAttacks++;}
 cases++;
}
console.log('LANDING_INTERRUPTION_CONTEXT_PASS',JSON.stringify({passed:true,cases,recoveryFrames,newAttacks,terminalChecks}));
}
