import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter, CHARACTERS, BOSS_CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { techniqueCatalogFor } from '../dist/assets/combat/TechniqueLibrary.js';
import { animationSequenceFor, animationSequencesFor } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { animationSequenceKindForAttack, animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';

const roster=['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'];
const normalKinds={lp:'stand-light',mp:'stand-medium',hp:'stand-heavy',lk:'stand-light-kick',mk:'stand-medium-kick',hk:'stand-heavy-kick'};
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
// Exact move identity matters: button strength alone also includes kicks,
// crouching punches, command normals, air attacks and target-combo variants.
for(const id of roster) {
 for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']) {
  const move=normalFor(button,crouch,id),expected=crouch?(button==='lp'?'crouch-light':button==='mp'?'crouch-medium':button==='hp'?'crouch-heavy':button==='lk'?'crouch-light-kick':button==='mk'?'crouch-medium-kick':'crouch-heavy-kick'):normalKinds[button];
  assert.equal(animationSequenceKindForAttack(id,move),expected,`${id} ${move.id} must keep its own presentation`);
 }
 const catalog=techniqueCatalogFor(id);
 for(const move of [catalog.command,...catalog.air,...Object.values(specialMovesFor(id)),{...normalFor('lp',false,id),id:`${id}_TARGET_TEST`}].filter(Boolean)) {
  assert.equal(animationSequenceKindForAttack(id,move),null,`${id} ${move.id} must not borrow standing punches`);
 }
}
for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']){
 const move=normalFor(button,crouch,'RYU'),expected=crouch&&button==='lp'?'crouch-light':crouch&&button==='mp'?'crouch-medium':crouch&&button==='hp'?'crouch-heavy':crouch&&button==='lk'?'crouch-light-kick':crouch&&button==='mk'?'crouch-medium-kick':crouch&&button==='hk'?'crouch-heavy-kick':!crouch&&button==='lp'?'stand-light':!crouch&&button==='hp'?'stand-heavy':!crouch&&button==='mp'?'stand-medium':!crouch&&button==='lk'?'stand-light-kick':!crouch&&button==='mk'?'stand-medium-kick':!crouch&&button==='hk'?'stand-heavy-kick':null;
 assert.equal(animationSequenceKindForAttack('RYU',move),expected,'Ryu '+move.id+' must keep exact presentation');
}
const ryuCatalog=techniqueCatalogFor('RYU');
for(const move of [ryuCatalog.command,...ryuCatalog.air,{...normalFor('lp',false,'RYU'),id:'RYU_TARGET_TEST'}].filter(Boolean))assert.equal(animationSequenceKindForAttack('RYU',move),null,'Ryu command/air/target variants must keep fallback');
for(const id of ['RYU_PRIMARY','RYU_EX_PRIMARY','RYU_SUPER','RYU_SA1','RYU_SA3'])assert.equal(animationSequenceKindForAttack('RYU',{id}),'hadoken');
for(const id of ['RYU_ANTI_AIR','RYU_SA2'])assert.equal(animationSequenceKindForAttack('RYU',{id}),'shoryuken');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('hk',false,'CHUNLI')),'stand-heavy-kick','Chun-Li standing HK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('mk',false,'CHUNLI')),'stand-medium-kick','Chun-Li standing MK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('lk',false,'CHUNLI')),'stand-light-kick','Chun-Li standing LK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('mp',false,'CHUNLI')),'stand-medium','Chun-Li standing MP needs its own authored palm');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('hk',false,'KEN')),'stand-heavy-kick','Ken standing HK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mk',false,'KEN')),'stand-medium-kick','Ken standing MK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('lk',false,'KEN')),'stand-light-kick','Ken standing LK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mp',false,'KEN')),'stand-medium','Ken standing MP needs its own authored presentation');
for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']){
 const expected=!crouch?({lp:'stand-light',mp:'stand-medium',hp:'stand-heavy',lk:'stand-light-kick',mk:'stand-medium-kick',hk:'stand-heavy-kick'}[button]??null):null;
 assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor(button,crouch,'CHUNLI')),expected,'Chun-Li exact normal identity');
}
const chunliCatalog=techniqueCatalogFor('CHUNLI');
for(const move of [chunliCatalog.command,...chunliCatalog.air,{...normalFor('mp',false,'CHUNLI'),id:'CHUNLI_TARGET_TEST'}].filter(Boolean))assert.equal(animationSequenceKindForAttack('CHUNLI',move),null,'Chun-Li command/air/target retain presentation');
for(const [id,kind] of [['CHUNLI_PRIMARY','hadoken'],['CHUNLI_EX_PRIMARY','hadoken'],['CHUNLI_ANTI_AIR','shoryuken'],['CHUNLI_MOBILITY','tatsumaki'],['CHUNLI_SUPER','super-rush'],['CHUNLI_SA1','kikosho'],['CHUNLI_SA2','super-rush'],['CHUNLI_SA3','tensei-ranka']])assert.equal(animationSequenceKindForAttack('CHUNLI',{id}),kind);
const assets=new Map([...CHARACTERS,...BOSS_CHARACTERS].flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,s]));
globalThis.Image=class {
 complete=true;
 set src(value){this.url=value;const s=assets.get(value);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}
 get src(){return this.url;}
};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
const draws=[],translations=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
for(const id of [...roster,'RYU','KEN','CHUNLI'])for(const facing of [-1,1])for(const [button,kind,count,contactFrames] of [['lp','stand-light',7,[3]],['mp','stand-medium',8,[3]],['hp','stand-heavy',10,[4,5]],['lk','stand-light-kick',8,[3]],['mk','stand-medium-kick',10,[4,5]],['hk','stand-heavy-kick',12,[5,6]]]) {

 if(id==='CHUNLI'&&!['lp','mp','hp','lk','mk','hk'].includes(button))continue;
 const def=getCharacter(id),fighter=new Fighter(def,'player',600,460,facing),seq=animationSequenceFor(id,kind);
 assert.ok(seq?.enabled&&seq.poseAuthored,`${id} needs authored ${kind}`);assert.equal(seq.frameCount,count);
 fighter.updatePlayer({...quiet,pressed:key=>key===button},rules);
 assert.equal(fighter.currentMove?.id,`5${button.toUpperCase()}`);
 const move=fighter.currentMove,frames=new Set();let ticks=0,contacts=0,frozen=false;
 while(fighter.state==='attack'&&ticks<150) {
  const sample=animationSequenceSample(fighter,0);assert.equal(sample?.sequence.id,seq.id);frames.add(sample.frame);
  assert.ok(sample.frame>=0&&sample.frame<count,'Attack frame must stay inside its strip');
  const active=fighter.moveFrame>=move.startup&&fighter.moveFrame<move.startup+move.active;
  assert.equal(sample.contact,active,'Visual contact must coincide with gameplay active frames');
  if(active){contacts++;assert.ok(contactFrames.includes(sample.frame));}
  if(id==='KEN'&&['lp','hp'].includes(button)&&fighter.moveFrame===move.startup+move.active)assert.equal(sample.frame,button==='lp'?4:6,'Ken recovery must begin at its first authored withdrawal frame');
  if(fighter.moveFrame===0)assert.equal(sample.frame,0);
  if(fighter.moveFrame===move.startup+move.active+move.recovery-1)assert.equal(sample.frame,count-1);
  draws.length=0;translations.length=0;drawCombatFighter(ctx,fighter,0,0);const draw=draws.find(d=>d[0].src===seq.asset);assert.ok(draw,'Standing attack must reach Canvas');canvasDraws++;
  if(id==='RYU'||(id==='CHUNLI'&&['mp','lk','mk','hk'].includes(button))||(id==='KEN'&&!['lp','hp'].includes(button)))assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted Ryu normal art must not inherit staging anchor drift');
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
 assert.equal(animationSequenceSample(fighter,0),null,'Grounded normal must not replace an airborne attack');
 fighter.airborne=false;
 for(const crouch of [false,true])for(const other of ['lp','mp','hp','lk','mk','hk']) {
  if(id==='CHUNLI'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):id==='KEN'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):id==='RYU'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):(!crouch&&Object.hasOwn(normalKinds,other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)))continue;
  fighter.currentMove=normalFor(other,crouch,id);assert.equal(animationSequenceSample(fighter,0),null);
 }
}
console.log('ROSTER_STANDING_ATTACKS_PASS',{characters:9,facings:2,attackStrips:54,storedFrames:495,canvasDraws});
