import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {getCharacter,CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceKindForAttack,animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
assert.equal(animationSequenceKindForAttack('KEN',normalFor('hk',true,'KEN')),'crouch-heavy-kick','Ken2HK needs its own low heavy kick');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mk',true,'KEN')),'crouch-medium-kick','Ken2MK needs its own low medium kick');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('lk',true,'KEN')),'crouch-light-kick','Ken2LK needs its own low kick');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('hp',true,'KEN')),'crouch-heavy','Ken2HP needs its own low heavy punch');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('mp',true,'KEN')),'crouch-medium','Ken2MP needs its own low medium punch');
assert.equal(animationSequenceKindForAttack('KEN',normalFor('lp',true,'KEN')),'crouch-light','Ken2LP needs its own low jab');
const quiet={held:()=>false,pressed:()=>false,released:()=>false},down={...quiet,held:k=>k==='down'};
const rules={mode:'duel',depthMovement:false,laneTolerance:22,arenaLeft:100,arenaRight:1180,arenaTop:500,arenaBottom:500};
const assets=new Map([...CHARACTERS,...BOSS_CHARACTERS].flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const draws=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
for(const [button,kind,count,contactStart,contactEnd] of [['lp','crouch-light',7,3,3],['mp','crouch-medium',8,3,3],['hp','crouch-heavy',10,4,5],['lk','crouch-light-kick',8,3,3],['mk','crouch-medium-kick',10,4,5],['hk','crouch-heavy-kick',12,5,6]])
for(const id of ['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','RYU','KEN'])for(const facing of [-1,1])for(const heldAfter of [true,false]){
 const f=new Fighter(getCharacter(id),'player',600,500,facing),seq=animationSequenceFor(id,kind);
 assert.ok(seq?.enabled&&seq.poseAuthored,`${id} needs authored crouching ${button.toUpperCase()}`);assert.equal(seq.frameCount,count);
 for(let t=0;t<6;t++)f.updatePlayer(down,rules);
 f.updatePlayer({...down,pressed:k=>k===button},rules);assert.equal(f.currentMove.id,'2'+button.toUpperCase());
 if(button==='hk'){assert.equal(f.currentMove.knockdown,true);assert.equal(f.currentMove.level,'low');}
 const move=f.currentMove,seen=new Set(),contactFrames=new Set();let ticks=0,contacts=0,frozen=false;
 while(f.state==='attack'&&ticks<100){
  const s=animationSequenceSample(f,0);assert.equal(s.sequence.id,seq.id);seen.add(s.frame);
  const active=f.moveFrame>=move.startup&&f.moveFrame<move.startup+move.active;
  assert.equal(s.contact,active);if(active){contacts++;assert.ok(s.frame>=contactStart&&s.frame<=contactEnd);contactFrames.add(s.frame);}
  draws.length=0;drawCombatFighter(ctx,f,0,0);const d=draws.find(a=>a[0].src===seq.asset);assert.ok(d);canvasDraws++;
  assert.equal(d[1],s.frame*640);assert.deepEqual(d.slice(5),[-160,-220,320,224]);
  assert.ok(d[1]>=0&&d[1]+d[3]<=640*count);assert.deepEqual([f.x,f.y],[600,500]);
  if(active&&!frozen){frozen=true;f.hitStop=3;const clock=f.moveFrame;
   for(let stop=0;stop<3;stop++){f.updatePlayer(heldAfter?down:quiet,rules);assert.equal(f.moveFrame,clock);assert.equal(animationSequenceSample(f,0).frame,s.frame);ticks++;}
  }
  f.updatePlayer(heldAfter?down:quiet,rules);ticks++;
 }
 assert.deepEqual([...contactFrames].sort((a,b)=>a-b),Array.from({length:contactEnd-contactStart+1},(_,n)=>n+contactStart));
 assert.equal(seen.size,count);assert.equal(contacts,move.active);assert.equal(ticks,move.startup+move.active+move.recovery+3);
 assert.equal(animationSequenceSample(f,0).sequence.kind,'crouch');assert.equal(animationSequenceSample(f,0).frame,5);
 if(heldAfter){for(let t=0;t<10;t++){f.updatePlayer(down,rules);assert.equal(animationSequenceSample(f,0).frame,5);}}
 else{for(const frame of [4,3,2,1,0]){f.updatePlayer(quiet,rules);assert.equal(animationSequenceSample(f,0).frame,frame);}f.updatePlayer(quiet,rules);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');}
 f.state='attack';f.currentMove=move;f.airborne=true;assert.equal(animationSequenceSample(f,0),null,'Grounded crouching art must not replace air attacks');
 assert.equal(animationSequenceKindForAttack(id,{...normalFor('hk',true,id),id:id+'_COMMAND_2HK'}),null,'Command moves keep their own presentation');
}
console.log('ROSTER_CROUCH_ATTACKS_PASS',{characters:8,completeSets:8,facings:2,releaseDuringAttack:true,storedFrames:440,canvasDraws});
