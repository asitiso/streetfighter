import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { commandNormalFor, targetComboFollowUp } from '../dist/assets/combat/TechniqueLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationSequencesFor } from '../dist/assets/render/AnimationSequenceLibrary.js';

const sequences=new Map(animationSequencesFor('KEN',false).map(s=>[s.asset,s]));
globalThis.Image=class {
 complete=true;
 set src(value){this.url=value;const s=sequences.get(value);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}
 get src(){return this.url;}
};
const { runtimeQuality }=await import('../dist/assets/core/RuntimeQuality.js');
const { drawCombatFighter }=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
const calls=[];
const ctx=new Proxy({globalAlpha:1,drawImage:(...args)=>calls.push(args),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});

const def=getCharacter('KEN');
const rules={mode:'versus',depthMovement:false,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
let cases=0;
for(const facing of [-1,1]) {
 for(const stance of ['standing','crouching','airborne']) {
  for(const button of ['lp','mp','hp','lk','mk','hk']) {
   const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);
   if(stance==='airborne'){fighter.airborne=true;fighter.jumpHeight=80;fighter.jumpVelocity=4;fighter.state='jump';}
   fighter.updatePlayer({held:key=>stance==='crouching'&&key==='down',pressed:key=>key===button,released:()=>false},rules);
   assert.equal(fighter.state,'attack');
   const move=fighter.currentMove;
   const expected=stance==='standing'?(button==='lp'?'stand-light':button==='mp'?'stand-medium':button==='hp'?'stand-heavy':button==='lk'?'stand-light-kick':button==='mk'?'stand-medium-kick':button==='hk'?'stand-heavy-kick':null):stance==='crouching'&&button==='lp'?'crouch-light':stance==='crouching'&&button==='mp'?'crouch-medium':stance==='crouching'&&button==='hp'?'crouch-heavy':stance==='crouching'&&button==='lk'?'crouch-light-kick':null;
   let contact=false;
   while(fighter.state==='attack') {
    const sample=animationSequenceSample(fighter,0);
    assert.equal(sample?.sequence.kind??null,expected,`${stance} ${move.id} must keep its own attack visual`);
    if(fighter.moveFrame===move.startup) {
     calls.length=0;drawCombatFighter(ctx,fighter,0,0);
     const strips=calls.filter(c=>(c[0].src?.includes('/animation-hq/ken/stand-')||c[0].src?.includes('/animation-hq/ken/crouch-light.webp')||c[0].src?.includes('/animation-hq/ken/crouch-medium.webp')||c[0].src?.includes('/animation-hq/ken/crouch-heavy.webp')||c[0].src?.includes('/animation-hq/ken/crouch-light-kick.webp')));
     assert.equal(strips.length,expected?1:0,`${stance} ${move.id}: Canvas must draw the correct attack family`);
    }
    contact ||= sample?.contact??false;
    fighter.updatePlayer(quiet,rules);
   }
   if(expected)assert.ok(contact,`${move.id} must show its authored contact`);
   cases++;
  }
 }
 const fighter=new Fighter(def,'player',600,460,facing,def.superArts[0]);
 fighter.state='attack';fighter.currentMove=normalFor('lp',false,'KEN');fighter.airborne=true;
 assert.equal(animationSequenceSample(fighter,0),null,'A ground punch must not replace airborne animation');
 fighter.airborne=false;fighter.currentMove=commandNormalFor('KEN','mk',true);
 assert.ok(fighter.currentMove,'Ken command kick fixture must exist');
 assert.equal(animationSequenceSample(fighter,0),null,'Command kick must retain its own visual');
 for(const [from,button] of [['5LP','mp'],['KEN_TC_RUSH_2','hp'],['5LK','mk'],['KEN_TC_KICK_2','hk']]) {
  fighter.currentMove=targetComboFollowUp('KEN',from,button);
  assert.ok(fighter.currentMove,'Target combo fixture must exist');
  fighter.moveFrame=fighter.currentMove.startup;
  assert.equal(animationSequenceSample(fighter,0),null,`${fighter.currentMove.id} must retain its target combo visual`);
 }
 const specials=specialMovesFor('KEN');
 for(const [move,kind] of [[specials.primary,'hadoken'],[specials.exPrimary,'hadoken'],[specials.antiAir,'shoryuken'],[specials.mobility,'tatsumaki'],[specials.super,'super-rush'],[superArtMoveFor('KEN',1),'shoryuken'],[superArtMoveFor('KEN',2),'shoryuken'],[superArtMoveFor('KEN',3),'super-rush']]) {
  assert.ok(move);fighter.currentMove=move;fighter.moveFrame=move.startup;
  assert.equal(animationSequenceSample(fighter,0)?.sequence.kind,kind,`${move.id} special mapping must remain available`);
 }
}
console.log('KEN_NORMAL_MAPPING_PASS',{inputCases:cases,facings:2});
