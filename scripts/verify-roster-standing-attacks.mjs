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
  const expected=id==='YUN'&&move.id==='YUN_CMD_HP'?'shoulder-palm':id==='MAKOTO'&&move.id==='MAKOTO_CMD_HP'?'forward-chop':id==='DUDLEY'&&move.id==='DUDLEY_CMD_HK'?'dart-shot':id==='ALEX'&&move.id==='ALEX_CMD_HP'?'lariat-press':id==='GILL'&&move.id==='GILL_AIR_MK'?'air-medium-kick':id==='GILL'&&move.id==='GILL_AIR_MP'?'air-medium-punch':id==='GILL'&&move.id==='GILL_AIR_LK'?'air-light-kick':id==='GILL'&&move.id==='GILL_AIR_LP'?'air-light-punch':id==='GILL'&&move.id==='GILL_AIR_HK'?'air-heavy-kick':id==='GILL'&&move.id==='GILL_AIR_HP'?'air-heavy-punch':id==='URIEN'&&move.id==='URIEN_AIR_MK'?'air-medium-kick':id==='URIEN'&&move.id==='URIEN_AIR_MP'?'air-medium-punch':id==='URIEN'&&move.id==='URIEN_AIR_LK'?'air-light-kick':id==='URIEN'&&move.id==='URIEN_AIR_LP'?'air-light-punch':id==='URIEN'&&move.id==='URIEN_AIR_HK'?'air-heavy-kick':id==='URIEN'&&move.id==='URIEN_AIR_HP'?'air-heavy-punch':id==='YUN'&&move.id==='YUN_AIR_MK'?'air-medium-kick':id==='YUN'&&move.id==='YUN_AIR_MP'?'air-medium-punch':id==='YUN'&&move.id==='YUN_AIR_LK'?'air-light-kick':id==='YUN'&&move.id==='YUN_AIR_LP'?'air-light-punch':id==='YUN'&&move.id==='YUN_AIR_HK'?'air-heavy-kick':id==='YUN'&&move.id==='YUN_AIR_HP'?'air-heavy-punch':id==='MAKOTO'&&move.id==='MAKOTO_AIR_MK'?'air-medium-kick':id==='MAKOTO'&&move.id==='MAKOTO_AIR_MP'?'air-medium-punch':id==='MAKOTO'&&move.id==='MAKOTO_AIR_LK'?'air-light-kick':id==='MAKOTO'&&move.id==='MAKOTO_AIR_LP'?'air-light-punch':id==='MAKOTO'&&move.id==='MAKOTO_AIR_HK'?'air-heavy-kick':id==='MAKOTO'&&move.id==='MAKOTO_AIR_HP'?'air-heavy-punch':id==='DUDLEY'&&move.id==='DUDLEY_AIR_MK'?'air-medium-kick':id==='DUDLEY'&&move.id==='DUDLEY_AIR_MP'?'air-medium-punch':id==='DUDLEY'&&move.id==='DUDLEY_AIR_LK'?'air-light-kick':id==='DUDLEY'&&move.id==='DUDLEY_AIR_LP'?'air-light-punch':id==='DUDLEY'&&move.id==='DUDLEY_AIR_HK'?'air-heavy-kick':id==='DUDLEY'&&move.id==='DUDLEY_AIR_HP'?'air-heavy-punch':id==='ALEX'&&move.id==='ALEX_AIR_MK'?'air-medium-kick':id==='ALEX'&&move.id==='ALEX_AIR_MP'?'air-medium-punch':id==='ALEX'&&move.id==='ALEX_AIR_LK'?'air-light-kick':id==='ALEX'&&move.id==='ALEX_AIR_LP'?'air-light-punch':id==='ALEX'&&move.id==='ALEX_AIR_HK'?'air-heavy-kick':id==='ALEX'&&move.id==='ALEX_AIR_HP'?'air-heavy-punch':id==='YUN'&&move.id==='YUN_SA3'?'genei-jin-install':id==='MAKOTO'&&move.id==='MAKOTO_SA3'?'tanden-renki':id==='MAKOTO'&&move.id==='MAKOTO_SA2'?'abare-tosanami':id==='ALEX'&&move.id==='ALEX_SA3'?'stun-gun-headbutt':id==='DUDLEY'&&move.id==='DUDLEY_SA1'?'rocket-uppercut':id==='YUN'&&move.id==='YUN_SA1'?'you-hou':id==='YUN'&&move.id==='YUN_SA2'?'sourai-rengeki':id==='DUDLEY'&&move.id==='DUDLEY_SA2'?'rolling-thunder':id==='ALEX'&&move.id==='ALEX_SA2'?'boomerang-raid':id==='ALEX'&&['ALEX_SUPER','ALEX_SA1'].includes(move.id)?'hyper-bomb':id==='YUN'&&move.id==='YUN_SUPER'?'genei-jin':id==='MAKOTO'&&['MAKOTO_SUPER','MAKOTO_SA1'].includes(move.id)?'seichusen-godanzuki':id==='GILL'&&move.id==='GILL_SUPER'?'seraphic-storm':id==='URIEN'&&move.id==='URIEN_SUPER'?'aegis-reflector':id==='DUDLEY'&&['DUDLEY_SUPER','DUDLEY_SA3'].includes(move.id)?'corkscrew-blow':id==='ALEX'&&move.id==='ALEX_ANTI_AIR'?'shoryuken':id==='ALEX'&&['ALEX_PRIMARY','ALEX_EX_PRIMARY'].includes(move.id)?'flash-chop':id==='ALEX'&&move.id==='ALEX_MOBILITY'?'slash-elbow':id==='DUDLEY'&&move.id==='DUDLEY_MOBILITY'?'ducking-straight':id==='DUDLEY'&&move.id==='DUDLEY_ANTI_AIR'?'shoryuken':id==='DUDLEY'&&['DUDLEY_PRIMARY','DUDLEY_EX_PRIMARY'].includes(move.id)?'machine-gun-blow':id==='MAKOTO'&&move.id==='MAKOTO_MOBILITY'?'tsurugi':id==='MAKOTO'&&move.id==='MAKOTO_ANTI_AIR'?'shoryuken':id==='MAKOTO'&&['MAKOTO_PRIMARY','MAKOTO_EX_PRIMARY'].includes(move.id)?'hayate':id==='YUN'&&move.id==='YUN_MOBILITY'?'shoulder-tackle':id==='YUN'&&move.id==='YUN_ANTI_AIR'?'shoryuken':id==='YUN'&&['YUN_PRIMARY','YUN_EX_PRIMARY'].includes(move.id)?'palm-rush':id==='URIEN'&&move.id==='URIEN_MOBILITY'?'shoulder-tackle':id==='URIEN'&&move.id==='URIEN_ANTI_AIR'?'shoryuken':id==='URIEN'&&['URIEN_PRIMARY','URIEN_EX_PRIMARY'].includes(move.id)?'hadoken':id==='GILL'&&move.id==='GILL_MOBILITY'?'lariat-rush':id==='GILL'&&move.id==='GILL_ANTI_AIR'?'shoryuken':id==='GILL'&&['GILL_PRIMARY','GILL_EX_PRIMARY'].includes(move.id)?'hadoken':null;
  assert.equal(animationSequenceKindForAttack(id,move),expected,`${id} ${move.id} keeps its exact special/fallback identity`);
 }
}
for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']){
 const move=normalFor(button,crouch,'RYU'),expected=crouch&&button==='lp'?'crouch-light':crouch&&button==='mp'?'crouch-medium':crouch&&button==='hp'?'crouch-heavy':crouch&&button==='lk'?'crouch-light-kick':crouch&&button==='mk'?'crouch-medium-kick':crouch&&button==='hk'?'crouch-heavy-kick':!crouch&&button==='lp'?'stand-light':!crouch&&button==='hp'?'stand-heavy':!crouch&&button==='mp'?'stand-medium':!crouch&&button==='lk'?'stand-light-kick':!crouch&&button==='mk'?'stand-medium-kick':!crouch&&button==='hk'?'stand-heavy-kick':null;
 assert.equal(animationSequenceKindForAttack('RYU',move),expected,'Ryu '+move.id+' must keep exact presentation');
}
const ryuCatalog=techniqueCatalogFor('RYU');
for(const move of [ryuCatalog.command,...ryuCatalog.air,{...normalFor('lp',false,'RYU'),id:'RYU_TARGET_TEST'}].filter(Boolean))assert.equal(animationSequenceKindForAttack('RYU',move),move.id==='RYU_CMD_MP'?'collarbone-breaker':move.id==='RYU_AIR_HP'?'air-heavy-punch':move.id==='RYU_AIR_HK'?'air-heavy-kick':move.id==='RYU_AIR_LP'?'air-light-punch':move.id==='RYU_AIR_LK'?'air-light-kick':move.id==='RYU_AIR_MP'?'air-medium-punch':move.id==='RYU_AIR_MK'?'air-medium-kick':null,'Ryu variants must keep exact authored airHP/HK/LP/LK/MP/MK or fallback');
for(const id of ['RYU_PRIMARY','RYU_EX_PRIMARY','RYU_SUPER','RYU_SA1','RYU_SA3'])assert.equal(animationSequenceKindForAttack('RYU',{id}),'hadoken');
for(const id of ['RYU_ANTI_AIR','RYU_SA2'])assert.equal(animationSequenceKindForAttack('RYU',{id}),'shoryuken');
assert.equal(animationSequenceKindForAttack('IBUKI',normalFor('hk',false,'IBUKI')),'stand-heavy-kick','Ibuki standing HK needs its own authored spinning kick');
assert.equal(animationSequenceKindForAttack('IBUKI',normalFor('mk',false,'IBUKI')),'stand-medium-kick','Ibuki standing MK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('IBUKI',normalFor('lk',false,'IBUKI')),'stand-light-kick','Ibuki standing LK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('IBUKI',normalFor('mp',false,'IBUKI')),'stand-medium','Ibuki standing MP needs its own authored palm');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('hk',false,'CHUNLI')),'stand-heavy-kick','Chun-Li standing HK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('mk',false,'CHUNLI')),'stand-medium-kick','Chun-Li standing MK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('lk',false,'CHUNLI')),'stand-light-kick','Chun-Li standing LK needs its own authored kick');
assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor('mp',false,'CHUNLI')),'stand-medium','Chun-Li standing MP needs its own authored palm');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('hk',false,'KEN')),'stand-heavy-kick','Ken standing HK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mk',false,'KEN')),'stand-medium-kick','Ken standing MK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('lk',false,'KEN')),'stand-light-kick','Ken standing LK needs its own authored presentation');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mp',false,'KEN')),'stand-medium','Ken standing MP needs its own authored presentation');
for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk']){
 const expected=!crouch?({lp:'stand-light',mp:'stand-medium',hp:'stand-heavy',lk:'stand-light-kick',mk:'stand-medium-kick',hk:'stand-heavy-kick'}[button]??null):button==='lp'?'crouch-light':button==='mp'?'crouch-medium':button==='hp'?'crouch-heavy':button==='lk'?'crouch-light-kick':button==='mk'?'crouch-medium-kick':button==='hk'?'crouch-heavy-kick':null;
 assert.equal(animationSequenceKindForAttack('CHUNLI',normalFor(button,crouch,'CHUNLI')),expected,'Chun-Li exact normal identity');
}
const chunliCatalog=techniqueCatalogFor('CHUNLI');
for(const move of [chunliCatalog.command,...chunliCatalog.air,{...normalFor('mp',false,'CHUNLI'),id:'CHUNLI_TARGET_TEST'}].filter(Boolean))assert.equal(animationSequenceKindForAttack('CHUNLI',move),move.id==='CHUNLI_CMD_HP'?'forward-backfist':move.id==='CHUNLI_AIR_HP'?'air-heavy-punch':move.id==='CHUNLI_AIR_HK'?'air-heavy-kick':move.id==='CHUNLI_AIR_LP'?'air-light-punch':move.id==='CHUNLI_AIR_LK'?'air-light-kick':move.id==='CHUNLI_AIR_MP'?'air-medium-punch':move.id==='CHUNLI_AIR_MK'?'air-medium-kick':null,'Chun-Li dedicated backfist and exact air/target identity');
for(const [id,kind] of [['CHUNLI_PRIMARY','hadoken'],['CHUNLI_EX_PRIMARY','hadoken'],['CHUNLI_ANTI_AIR','shoryuken'],['CHUNLI_MOBILITY','tatsumaki'],['CHUNLI_SUPER','super-rush'],['CHUNLI_SA1','kikosho'],['CHUNLI_SA2','super-rush'],['CHUNLI_SA3','tensei-ranka']])assert.equal(animationSequenceKindForAttack('CHUNLI',{id}),kind);
for(const crouch of [false,true])for(const button of ['lp','mp','hp','lk','mk','hk'])assert.equal(animationSequenceKindForAttack('IBUKI',normalFor(button,crouch,'IBUKI')),!crouch?({lp:'stand-light',mp:'stand-medium',hp:'stand-heavy',lk:'stand-light-kick',mk:'stand-medium-kick',hk:'stand-heavy-kick'}[button]??null):button==='lp'?'crouch-light':button==='mp'?'crouch-medium':button==='hp'?'crouch-heavy':button==='lk'?'crouch-light-kick':button==='mk'?'crouch-medium-kick':button==='hk'?'crouch-heavy-kick':null,'Ibuki exact normal identity');
const ibukiCatalog=techniqueCatalogFor('IBUKI');
for(const move of [ibukiCatalog.command,...ibukiCatalog.air,{...normalFor('mp',false,'IBUKI'),id:'IBUKI_TARGET_TEST'}].filter(Boolean))assert.equal(animationSequenceKindForAttack('IBUKI',move),move.id==='IBUKI_CMD_MK'?'spin-heel':move.id==='IBUKI_AIR_MK'?'air-medium-kick':move.id==='IBUKI_AIR_MP'?'air-medium-punch':move.id==='IBUKI_AIR_LK'?'air-light-kick':move.id==='IBUKI_AIR_LP'?'air-light-punch':move.id==='IBUKI_AIR_HK'?'air-heavy-kick':move.id==='IBUKI_AIR_HP'?'air-heavy-punch':null,'Ibuki exact AIR PALM or command/air/target fallback');
for(const [id,kind] of [['IBUKI_PRIMARY','hadoken'],['IBUKI_EX_PRIMARY','hadoken'],['IBUKI_SUPER','hadoken'],['IBUKI_SA1','hadoken'],['IBUKI_SA2','yoroi-doroshi'],['IBUKI_SA3','super-rush'],['IBUKI_ANTI_AIR','shoryuken'],['IBUKI_MOBILITY','tatsumaki']])assert.equal(animationSequenceKindForAttack('IBUKI',{id}),kind);
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
for(const id of [...roster,'RYU','KEN','CHUNLI','IBUKI'])for(const facing of [-1,1])for(const [button,kind,count,contactFrames] of [['lp','stand-light',7,[3]],['mp','stand-medium',8,[3]],['hp','stand-heavy',10,[4,5]],['lk','stand-light-kick',8,[3]],['mk','stand-medium-kick',10,[4,5]],['hk','stand-heavy-kick',12,[5,6]]]) {

 if(id==='CHUNLI'&&!['lp','mp','hp','lk','mk','hk'].includes(button))continue;
 if(id==='IBUKI'&&!['lp','mp','hp','lk','mk','hk'].includes(button))continue;
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
  if((id==='IBUKI'&&['mp','lk','mk','hk'].includes(button))||id==='RYU'||(id==='CHUNLI'&&['mp','lk','mk','hk'].includes(button))||(id==='KEN'&&!['lp','hp'].includes(button)))assert.ok(translations.slice(1,3).every(([x,y])=>x===0&&y===0),'Planted Ryu normal art must not inherit staging anchor drift');
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
  if(id==='IBUKI'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):id==='CHUNLI'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):id==='KEN'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):id==='RYU'?(!crouch&&['lp','mp','hp','lk','mk','hk'].includes(other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)):(!crouch&&Object.hasOwn(normalKinds,other))||(crouch&&['lp','mp','hp','lk','mk','hk'].includes(other)))continue;
  fighter.currentMove=normalFor(other,crouch,id);assert.equal(animationSequenceSample(fighter,0),null);
 }
}
console.log('ROSTER_STANDING_ATTACKS_PASS',{characters:10,facings:2,attackStrips:60,storedFrames:550,canvasDraws});
