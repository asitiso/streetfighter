import assert from 'node:assert/strict';
import {getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample as sample} from '../dist/assets/render/AnimationTimingMapper.js';
const ids=['KEN','CHUNLI','IBUKI'];const assets=new Map(ids.flatMap(id=>animationSequencesFor(id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},failures=[];let airborneRecovery=0,postMoveFlight=0,landingChecks=0,cropChecks=0,freezeChecks=0,interruptChecks=0;
for(const id of ids)for(const facing of[-1,1]){const c=getCharacter(id),w=new CombatWorld(c,c,'duel');w.enemies.length=0;const f=w.player,move=specialMovesFor(id).antiAir;f.facing=facing;f.startMove(move);assert.deepEqual(f.currentMove,move);let froze=false,landed=false,sawRecovery=false;
 for(let tick=0;tick<110;tick++){
  const s=sample(f,0),recovering=f.currentMove?.id===move.id&&f.moveFrame>=move.startup+move.active,tail=!f.currentMove&&f.visualRecoveryMoveId===move.id;
  if(f.airborne&&(recovering||tail)){sawRecovery=true;const expected=id==='IBUKI'?(recovering&&f.jumpVelocity>0?8:9):(recovering&&f.jumpVelocity>0?7:8);if(s?.sequence.kind!=='shoryuken'||s.frame!==expected)failures.push(id+' '+facing+' airborne '+f.moveFrame+' expected '+expected+' got '+s?.sequence.kind+'/'+s?.frame);assert.equal(s?.contact,false);airborneRecovery++;if(tail)postMoveFlight++;
   if(!froze&&recovering){froze=true;f.hitStop=3;const before=sample(f,0);for(let i=0;i<3;i++){w.update(quiet,tick);assert.deepEqual(sample(f,0),before);freezeChecks++;}}
  }
  if(!f.airborne&&f.landingFrames>0&&(recovering||tail)){const expected=f.landingFrames>=6?(id==='IBUKI'?10:9):f.landingFrames>=3?10:11;if(s?.sequence.kind!=='shoryuken'||s.frame!==expected)failures.push(id+' '+facing+' landing '+f.landingFrames+' expected '+expected+' got '+s?.sequence.kind+'/'+s?.frame);landingChecks++;landed=true;}
  if(s?.sequence.kind==='shoryuken'){const calls=[],translations=[],ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>calls.push(a),translate:(...a)=>translations.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});drawCombatFighter(ctx,f,1,0);const body=calls.filter(a=>a[0].src===s.sequence.asset);assert.equal(body.length,1);assert.deepEqual(body[0].slice(1,5),[s.frame*s.sequence.frameWidth,0,s.sequence.frameWidth,448]);if(f.jumpHeight>0)assert.equal(translations.filter(a=>a[0]===0&&a[1]===-f.jumpHeight).length,1);cropChecks++;}
  if(sawRecovery&&!f.airborne&&f.landingFrames===0&&f.state==='idle'){assert.equal(sample(f,0)?.sequence.kind,'idle');break;}w.update(quiet,tick);
 }
 assert(sawRecovery&&landed);
 for(const interrupt of['attack','hit']){
  const tailWorld=new CombatWorld(c,c,'duel');tailWorld.enemies.length=0;const tail=tailWorld.player;tail.facing=facing;tail.startMove(move);let owned=false,at=0;
  for(;at<110;at++){tailWorld.update(quiet,at);if(!tail.currentMove&&tail.visualRecoveryMoveId===move.id&&(tail.airborne||tail.landingFrames>0)){owned=true;break;}}
  assert(owned,'Exercise real post-move flight or landing ownership');assert.equal(sample(tail,0)?.sequence.kind,'shoryuken');assert.equal(tail.visualRecoveryMoveId,move.id);
  if(interrupt==='attack'){const wasAirborne=tail.airborne,button=wasAirborne?'lp':'hp';tailWorld.update({...quiet,pressed:k=>k===button},at+1);assert.equal(tail.currentMove?.id,wasAirborne?airNormalFor(id,'lp').id:normalFor('hp',false,id).id);assert.equal(sample(tail,0)?.sequence.kind,wasAirborne?'air-light-punch':'stand-heavy');}
  else{const attacker=new CombatWorld(c,c,'duel').enemy;tail.receiveHit(normalFor('mp',false,id),attacker,false);assert.equal(sample(tail,0)?.sequence.kind,tail.airborne||tail.jumpHeight>0?'fall':'hit');}
  assert.equal(tail.visualRecoveryMoveId,null,'Actual new action/reaction releases previous recovery ownership');interruptChecks++;
 }
}
console.log('LEGACY_RISING_RECOVERY_COUNTS',{airborneRecovery,postMoveFlight,landingChecks,cropChecks,freezeChecks,interruptChecks});assert.deepEqual(failures,[],'Rising poses must stay airborne until native touchdown and own their post-move flight');
console.log('LEGACY_RISING_RECOVERY_PASS');
