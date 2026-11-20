import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];let cases=0,frameChecks=0;
for(const c of roster)for(const facing of [-1,1])for(const side of ['player','enemy'])for(const from of ['attack-recovery','landing']){
 const w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing);
 if(from==='attack-recovery'){f.startMove(normalFor('lp',false,c.id));sample(f);while(f.state==='attack')f.updatePlayer(q,w.rules);assert.equal(sample(f).kind,'attack-neutral');}
 else{f.state='jump';f.airborne=true;f.jumpHeight=.1;f.jumpVelocity=-.2;sample(f);f.updatePlayer(q,w.rules);assert.equal(f.state,'idle');assert.equal(sample(f).kind,'landing-neutral');}
 f.updatePlayer({...q,pressed:key=>key==='jump'},w.rules);assert.equal(f.state,'jump');assert(f.airborne);
 for(let tick=0;tick<10;tick++){const fields=JSON.stringify(f),s=sample(f);if(!recording)assert.equal(s.active,false,c.id+'/'+from+' plain jump must not keep previous ground settle');assert.equal(JSON.stringify(f),fields);records.push([c.id,facing,side,from,tick,f.state,f.stateFrame,f.hp,f.superGauge,f.x,f.y,f.animationFrame,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.dashFrames,f.currentMove?.id??null]);f.updatePlayer(q,w.rules);frameChecks++;}cases++;
}
let sparseInstallChecks=0;
if(!recording)for(const facing of [-1,1])for(const side of ['player','enemy']){const c=CHARACTERS.find(c=>c.id==='YUN'),w=new CombatWorld(c,c,'duel'),f=new Fighter(c,side,500,350,facing,c.superArts[2]),a=new Fighter(c,side==='player'?'enemy':'player',545,350,-facing);f.superGauge=f.superGaugeMax;f.startMove(superArtMoveFor(c.id,3,c.superArts[2].gauge));while(f.state==='attack')f.updatePlayer(q,w.rules);f.parryWindow=3;f.receiveHit(normalFor('mp',false,c.id),a,false);while(f.hitStop||f.stateFrame<-1)f.updatePlayer(q,w.rules);sample(f);f.updatePlayer(q,w.rules);f.updatePlayer({...q,pressed:key=>key==='lp'},w.rules);assert.equal(sample(f).kind,'parry-punish');while(f.state==='attack')f.updatePlayer(q,w.rules);f.updatePlayer({...q,pressed:key=>key==='jump'},w.rules);assert(f.airborne);assert.equal(f.state,'jump');assert.equal(sample(f).active,false,'Sparse boosted recovery must not distort plain jump');sparseInstallChecks++;}
if(recording)console.log(JSON.stringify(records));else console.log('JUMP_TRANSITION_PASS',{cases,frameChecks,sparseInstallChecks});
