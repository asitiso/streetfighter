import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const recording=process.argv.includes('--record-controls'),roster=[...CHARACTERS,...BOSS_CHARACTERS];
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const records=[];let cases=0,airSamples=0,freezes=0,groundCases=0,naturalChases=0;
function rules(mode){return {mode,depthMovement:mode==='belt',laneTolerance:mode==='belt'?54:22,arenaLeft:120,arenaRight:1160,arenaTop:mode==='belt'?394:500,arenaBottom:mode==='belt'?580:500};}
function snapshot(f,ground){return [f.x,f.y,f.previousX,f.previousY,f.facing,ground?f.stateFrame:null,f.hp,f.superGauge,f.airborne,f.jumpHeight,f.jumpVelocity,f.landingFrames,f.aiCooldown,f.currentMove?.id??null,f.moveFrame,f.visualRecoveryMoveId,...(ground?[f.state,sample(f,0)?.sequence.kind,sample(f,0)?.frame]:[])];}
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const relative of [-1,0,1])for(const attack of [false,true]){
 const f=new Fighter(c,'enemy',600,500,facing),target=new Fighter(c,'player',600+facing*200,500,-facing),r=rules(mode),rows=[];
 // Begin with the same accepted jump physics used by the player, then give control to AI.
 f.updatePlayer({...quiet,pressed:k=>k==='jump'},r);if(attack)f.startMove(airNormalFor(c.id,'lp'));
 let landed=false,airSeen=0;
 for(let tick=0;tick<85;tick++){
  const directive={role:'attack',desiredX:f.x+relative*facing*200,desiredY:500,attackAllowed:false,rangedAllowed:false};
  if(tick===8){const before=snapshot(f,false).filter((_,i)=>i!==2&&i!==3),visual=sample(f,0);f.hitStop=3;for(let n=0;n<3;n++){f.updateAiDirected(target,r,directive);assert.deepEqual(snapshot(f,false).filter((_,i)=>i!==2&&i!==3),before);assert.deepEqual(sample(f,0),visual);freezes++;}}
  f.updateAiDirected(target,r,directive);rows.push(snapshot(f,false));
  if(f.airborne&&f.state!=='attack'){airSeen++;airSamples++;if(!recording){assert.equal(f.state,'jump',c.id+'/'+mode+'/'+relative+' AI must stay in jump until landing');assert.equal(sample(f,0)?.sequence.kind,'jump','No ground walking/idle strip in flight');}}
  if(!f.airborne)landed=true;
 }
 assert(landed&&airSeen>0);records.push({character:c.id,mode,facing,relative,attack,rows});cases++;
}
// Ground decisions and animations must retain their existing behavior.
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const relative of [-1,0,1]){
 const f=new Fighter(c,'enemy',600,500,facing),target=new Fighter(c,'player',600+facing*200,500,-facing),r=rules(mode),rows=[];
 for(let tick=0;tick<40;tick++){f.updateAiDirected(target,r,{role:'attack',desiredX:f.x+relative*facing*200,desiredY:500,attackAllowed:false,rangedAllowed:false});rows.push(snapshot(f,true));}records.push({character:c.id,mode,facing,relative,ground:true,rows});groundCases++;
}
// Reproduce genuine AI chase entry without assigning airborne/state fields.
for(const c of roster.filter(c=>['KEN','CHUNLI','DUDLEY','IBUKI','YUN','GILL'].includes(c.id)))for(const mode of ['duel','belt'])for(const facing of [-1,1]){
 const f=new Fighter(c,'enemy',500,500,facing),target=new Fighter(c,'player',500+facing*150,500,-facing),r=rules(mode);
 target.updatePlayer({...quiet,pressed:k=>k==='jump'},r);while(target.jumpHeight<90)target.updatePlayer(quiet,r);
 f.updateAiDirected(target,r,{role:'attack',desiredX:target.x,desiredY:500,attackAllowed:true,rangedAllowed:false});assert(f.airborne&&f.currentMove?.technique==='air');
 let recovered=false;for(let t=0;t<60;t++){f.updateAiDirected(target,r,{role:'attack',desiredX:f.x+facing*200,desiredY:500,attackAllowed:false,rangedAllowed:false});if(f.airborne&&f.state!=='attack'){recovered=true;if(!recording){assert.equal(f.state,'jump');assert.equal(sample(f,0)?.sequence.kind,'jump');}}}assert(recovered);naturalChases++;
}
if(recording)console.log(JSON.stringify(records));else console.log('AI_AIR_RECOVERY_PASS',{cases,airSamples,freezes,groundCases,naturalChases,characters:roster.length});
