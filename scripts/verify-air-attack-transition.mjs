import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,specialMovesFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];let cases=0,airCases=0,landingCases=0;
const scenarios=['crouch-jump','landing-jump','moving-air','moving-landing','parry-jump','recovering-jump'];
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const side of ['player','enemy'])for(const scenario of scenarios){
 const w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing),jumpAttack={...q,pressed:key=>key==='jump'||key==='lp'},forward=facing===1?'right':'left';
 if(scenario==='crouch-jump'){f.updatePlayer({...q,held:key=>key==='down'},w.rules);sample(f);f.updatePlayer(jumpAttack,w.rules);}
 if(scenario==='landing-jump'){f.state='jump';f.airborne=true;f.jumpHeight=.1;f.jumpVelocity=-.2;f.updatePlayer(q,w.rules);assert(f.landingFrames>0);sample(f);f.updatePlayer(jumpAttack,w.rules);}
 if(scenario==='moving-air'||scenario==='moving-landing'){f.state='jump';f.airborne=true;f.jumpHeight=scenario==='moving-air'?80:.5;f.jumpVelocity=scenario==='moving-air'?3:-.1;f.updatePlayer({...q,held:key=>key===forward},w.rules);assert(f.airborne);sample(f);f.updatePlayer({...q,pressed:key=>key==='lp'},w.rules);}
 if(scenario==='parry-jump'){f.parryWindow=3;assert.equal(f.receiveHit(normalFor('mp',false,c.id),a,false),'parry');while(f.hitStop||f.stateFrame<-1)f.updatePlayer(q,w.rules);sample(f);f.updatePlayer(q,w.rules);assert.equal(f.state,'idle');f.updatePlayer(jumpAttack,w.rules);}
 if(scenario==='recovering-jump'){f.startMove(normalFor('lp',false,c.id));sample(f);while(f.state==='attack')f.updatePlayer(q,w.rules);assert.equal(sample(f).kind,'attack-neutral');f.updatePlayer(jumpAttack,w.rules);}
 assert.equal(f.state,'attack');if(scenario==='moving-landing'){assert.equal(f.airborne,false);assert(f.landingFrames>0);landingCases++;}else{assert(f.airborne);assert.equal(f.currentMove.technique,'air');airCases++;}
 const first=sample(f);if(!recording){if(scenario==='moving-landing')assert.equal(first.kind,'landing-attack','A fast airborne approach must not be mistaken for a ground dash');else assert.equal(first.active,false,c.id+'/'+scenario+' air normal cannot inherit a grounded squash/lean');}
 for(let tick=0;tick<9;tick++){const s=sample(f);if(!recording&&scenario!=='moving-landing')assert.equal(s.active,false,'Old ground lean cannot return during flight');records.push([c.id,facing,side,scenario,tick,f.state,f.stateFrame,f.hp,f.superGauge,f.x,f.y,f.animationFrame,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.dashFrames,f.currentMove?.id??null,f.moveFrame]);f.updatePlayer(q,w.rules);}cases++;
}
let groundControls=0,risingFlightChecks=0;
if(!recording)for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const kind of ['normal','rising']){const w=new CombatWorld(c,c,'duel'),f=new Fighter(c,'player',500,350,facing);f.startDash(facing);sample(f);f.startMove(kind==='normal'?normalFor('lp',false,c.id):specialMovesFor(c.id).antiAir);assert.equal(sample(f).kind,'dash-attack');for(let tick=1;tick<=8;tick++){f.updatePlayer(q,w.rules);const s=sample(f);if(kind==='rising'&&f.airborne&&f.state==='attack'){assert.equal(s.kind,'dash-attack','Ground-initiated rising moves retain their original transition during flight');risingFlightChecks++;}}groundControls++;}
if(!recording)assert(risingFlightChecks>0,'Exercise genuine rising-move flight during an active ground transition');
let sparseInstallChecks=0;
if(!recording)for(const facing of [-1,1])for(const side of ['player','enemy']){
 const c=CHARACTERS.find(c=>c.id==='YUN'),w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing,c.superArts[2]),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing);f.superGauge=f.superGaugeMax;f.startMove(superArtMoveFor(c.id,3,c.superArts[2].gauge));assert.equal(f.installLabel,'GENEI JIN');while(f.state==='attack')f.updatePlayer(q,w.rules);
 f.parryWindow=3;assert.equal(f.receiveHit(normalFor('mp',false,c.id),a,false),'parry');while(f.hitStop||f.stateFrame<-1)f.updatePlayer(q,w.rules);sample(f);f.updatePlayer(q,w.rules);f.updatePlayer({...q,pressed:key=>key==='lp'},w.rules);assert.equal(sample(f).kind,'parry-punish');assert(f.currentMove.startup+f.currentMove.active+f.currentMove.recovery<10,'Real install must make recovery shorter than previous transition');
 while(f.state==='attack')f.updatePlayer(q,w.rules);assert.equal(f.state,'idle');/* Deliberately skip the idle render. */f.updatePlayer({...q,pressed:key=>key==='jump'||key==='lp'},w.rules);assert(f.airborne);assert.equal(f.currentMove.technique,'air');const fields=JSON.stringify(f);assert.equal(sample(f).active,false,'Sparse renders must not leak a previous boosted attack transition into a new air normal');assert.equal(JSON.stringify(f),fields,'Sampling cannot change gameplay');sparseInstallChecks++;
}
if(recording)console.log(JSON.stringify(records));else console.log('AIR_ATTACK_TRANSITION_PASS',{cases,airCases,landingCases,gameplayRecords:records.length,groundControls,risingFlightChecks,sparseInstallChecks});
