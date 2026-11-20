import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {combatSpritePose} from '../dist/assets/render/CombatSpriteProfiles.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],buttons=['lp','mp','hp','lk','mk','hk'],recording=process.argv.includes('--record-controls'),records=[];
const input=(down,button)=>({held:k=>down&&k==='down',pressed:k=>k===button,released:()=>false});
let cases=0,continuations=0,controls=0;let tick=0;
function step(f,i,rules){f.captureInput(i,tick++);f.updatePlayer(i,rules);}
function trace(f){return [f.state==='crouch'?'idle':f.state,f.stateFrame,f.animationFrame,f.moveFrame,f.currentMove?.id??null,f.x,f.y,f.hp,f.superGauge,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.crouchAnimationFrame,f.attackConnected,f.attackVictims.size];}
for(const c of roster)for(const facing of [-1,1])for(const button of buttons)for(const scenario of ['held','released','standing','belt']){
 const mode=scenario==='belt'?'belt':'duel',rules=new CombatWorld(c,c,mode).rules,f=new Fighter(c,'player',500,500,facing),crouching=scenario!=='standing';
 if(scenario==='belt'){f.startMove(normalFor(button,true,c.id));}else step(f,input(crouching,button),rules);
 assert.equal(f.currentMove.id,(crouching?'2':'5')+button.toUpperCase());const initialHP=f.hp,move=f.currentMove,total=move.startup+move.active+move.recovery,frames=[];let updates=0;
 while(f.currentMove&&updates++<160){const last=f.moveFrame===total-1;step(f,input(scenario!=='released'||!last),rules);frames.push(trace(f));}
 assert.equal(updates,total);assert.equal(f.currentMove,null);assert.equal(f.moveFrame,total);assert.equal(f.stateFrame,0);assert.equal(f.hp,initialHP);assert.equal(f.superGauge,0);assert(!f.airborne);
 if(scenario==='held'){
  if(!recording){assert.equal(f.state,'crouch',c.id+' '+facing+' '+button+' must remain crouched on the exact recovery completion tick');assert.equal(f.crouchAnimationFrame,5);if(CHARACTERS.includes(c))assert.equal(combatSpritePose(f,0).scaleY,.79);assert.equal(animationSequenceSample(f,0).sequence?.kind,'crouch');}
  cases++;
 }else{assert.equal(f.state,'idle',scenario+' control stays unchanged');controls++;}
 records.push([c.id,facing,button,scenario,frames]);
 if(scenario==='held'){
  step(f,input(true,'lp'),rules);assert.equal(f.currentMove?.id,'2LP');assert.equal(f.moveFrame,0);continuations++;
 }
}
// Separate controls: AI has no held-down input, and grounded recovery cannot replace air state.
for(const c of roster)for(const facing of [-1,1]){
 const rules=new CombatWorld(c,c,'duel').rules,f=new Fighter(c,'enemy',500,500,facing),target=new Fighter(c,'player',800,500,-facing),move=normalFor('hp',true,c.id);f.startMove(move);f.moveFrame=move.startup+move.active+move.recovery-1;f.updateAiDirected(target,rules,{role:'attack',desiredX:f.x,desiredY:f.y,attackAllowed:false,rangedAllowed:false});assert.equal(f.state,'idle');controls++;
 const air=new Fighter(c,'player',500,500,facing);air.startMove(move);air.airborne=true;air.jumpHeight=100;air.jumpVelocity=0;air.moveFrame=move.startup+move.active+move.recovery-1;step(air,input(true),rules);assert.equal(air.state,'jump');assert(air.airborne);controls++;
}
if(recording)console.log(JSON.stringify(records));else console.log('CROUCH_RECOVERY_CONTINUITY_PASS',JSON.stringify({characters:roster.length,facings:2,buttons:6,cases,continuations,controls,actualInputAndFrameProgression:true,moveDurationPreserved:true}));
