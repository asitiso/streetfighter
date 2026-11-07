import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter, CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { techniqueCatalogFor } from '../dist/assets/combat/TechniqueLibrary.js';
import { animationSequenceFor, animationSequencesFor } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { animationSequenceKindForAttack, animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const roster=['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'];
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
// Exact move identity matters: button strength alone also includes kicks,
// crouching punches, command normals, air attacks and target-combo variants.
for(const id of roster) {
 for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']) {
  const move=normalFor(button,crouch,id),expected=!crouch&&button==='lp'?'stand-light':!crouch&&button==='mp'?'stand-medium':!crouch&&button==='hp'?'stand-heavy':null;
  assert.equal(animationSequenceKindForAttack(id,move),expected,`${id} ${move.id} must keep its own presentation`);
 }
 const catalog=techniqueCatalogFor(id);
 for(const move of [catalog.command,...catalog.air,...Object.values(specialMovesFor(id)),{...normalFor('lp',false,id),id:`${id}_TARGET_TEST`}].filter(Boolean)) {
  assert.equal(animationSequenceKindForAttack(id,move),null,`${id} ${move.id} must not borrow standing punches`);
 }
}
const assets=new Map([...CHARACTERS,...BOSS_CHARACTERS].flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,s]));
globalThis.Image=class {
 complete=true;
 set src(value){this.url=value;const s=assets.get(value);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}
 get src(){return this.url;}
};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
const draws=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
for(const id of roster)for(const facing of [-1,1])for(const [button,kind,count,contactFrames] of [['lp','stand-light',7,[3]],['mp','stand-medium',8,[3]],['hp','stand-heavy',10,[4,5]]]) {
 const def=getCharacter(id),fighter=new Fighter(def,'player',600,460,facing),seq=animationSequenceFor(id,kind);
 assert.ok(seq?.enabled&&seq.poseAuthored,`${id} needs authored ${kind}`);assert.equal(seq.frameCount,count);
 fighter.updatePlayer({...quiet,pressed:key=>key===button},rules);
 assert.equal(fighter.currentMove?.id,button==='lp'?'5LP':button==='mp'?'5MP':'5HP');
 const move=fighter.currentMove,frames=new Set();let ticks=0,contacts=0,frozen=false;
 while(fighter.state==='attack'&&ticks<150) {
  const sample=animationSequenceSample(fighter,0);assert.equal(sample?.sequence.id,seq.id);frames.add(sample.frame);
  assert.ok(sample.frame>=0&&sample.frame<count,'Attack frame must stay inside its strip');
  const active=fighter.moveFrame>=move.startup&&fighter.moveFrame<move.startup+move.active;
  assert.equal(sample.contact,active,'Visual contact must coincide with gameplay active frames');
  if(active){contacts++;assert.ok(contactFrames.includes(sample.frame));}
  if(fighter.moveFrame===0)assert.equal(sample.frame,0);
  if(fighter.moveFrame===move.startup+move.active+move.recovery-1)assert.equal(sample.frame,count-1);
  draws.length=0;drawCombatFighter(ctx,fighter,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw,'Standing attack must reach Canvas');canvasDraws++;
  assert.equal(draw[1],sample.frame*seq.frameWidth);assert.deepEqual(draw.slice(5),[-seq.frameWidth/4,-220,seq.frameWidth/2,224]);
  assert.ok(draw[1]>=0&&draw[1]+draw[3]<=seq.frameWidth*seq.frameCount,'Canvas source crop must stay inside the strip');
  if(active&&!frozen) {
   frozen=true;fighter.hitStop=3;const clock=fighter.moveFrame;
   for(let stop=0;stop<3;stop++){fighter.updatePlayer(quiet,rules);assert.equal(fighter.moveFrame,clock);assert.equal(animationSequenceSample(fighter,0).frame,sample.frame);ticks++;}
  }
  fighter.updatePlayer(quiet,rules);ticks++;
 }
 assert.equal(ticks,move.startup+move.active+move.recovery+3,'Art must preserve attack duration');
 assert.equal(contacts,move.active);assert.equal(frames.size,count,'Every stored attack frame must be reachable');
 assert.equal(fighter.state,'idle');assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,'idle');
 fighter.state='attack';fighter.currentMove=move;fighter.moveFrame=move.startup;fighter.airborne=true;
 assert.equal(animationSequenceSample(fighter,0),null,'Grounded punch must not replace an airborne attack');
 fighter.airborne=false;
 for(const crouch of [false,true])for(const other of ['lp','mp','hp','lk','mk','hk']) {
  if(!crouch&&['lp','mp','hp'].includes(other))continue;
  fighter.currentMove=normalFor(other,crouch,id);assert.equal(animationSequenceSample(fighter,0),null);
 }
}
console.log('ROSTER_STANDING_ATTACKS_PASS',{characters:6,facings:2,attackStrips:18,storedFrames:150,canvasDraws});
