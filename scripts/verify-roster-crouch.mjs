import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {getCharacter,CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const down={...quiet,held:key=>key==='down'};
const duel={mode:'duel',depthMovement:false,laneTolerance:22,arenaLeft:100,arenaRight:1180,arenaTop:500,arenaBottom:500};
const assets=new Map([...CHARACTERS,...BOSS_CHARACTERS].flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,s]));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const draws=[];let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
for(const id of ['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'])for(const facing of [-1,1]){
 const f=new Fighter(getCharacter(id),'player',600,500,facing);f.stateFrame=10000;
 const seen=new Set();
 for(let tick=0;tick<6;tick++){
  f.updatePlayer(down,duel);const s=animationSequenceSample(f,0);
  assert.equal(s?.sequence.kind,'crouch',`${id} needs authored crouch, even after a long idle`);
  assert.equal(s.frame,tick);assert.equal(s.contact,false);seen.add(s.frame);
  draws.length=0;drawCombatFighter(ctx,f,0,0);const d=draws.find(a=>a[0].src===s.sequence.asset);assert.ok(d);canvasDraws++;
  assert.equal(d[1],s.frame*384);assert.deepEqual(d.slice(5),[-96,-220,192,224]);
  assert.deepEqual([f.x,f.y],[600,500]);assert.equal(f.state,'crouch');
 }
 assert.equal(seen.size,6);
 for(let tick=0;tick<90;tick++){f.updatePlayer(down,duel);assert.equal(animationSequenceSample(f,0).frame,5);}
 for(const frame of [4,3,2,1,0]){f.updatePlayer(quiet,duel);const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'crouch');assert.equal(s.frame,frame);}
 f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 f.updatePlayer(down,duel);f.updatePlayer(down,duel);assert.equal(animationSequenceSample(f,0).frame,1);
 f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).frame,0);
 f.updatePlayer(down,duel);assert.equal(animationSequenceSample(f,0).frame,1,'Rapid repress resumes current pose');
 f.hitStop=3;
 for(let stop=0;stop<3;stop++){f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).frame,1,'Hit stop freezes the crouch pose');}
 for(let tick=0;tick<6;tick++)f.updatePlayer(down,duel);
 f.updatePlayer({...down,pressed:key=>key==='mk'},duel);assert.equal(f.currentMove.id,'2MK');
 while(f.state==='attack'){assert.equal(animationSequenceSample(f,0),null,'Crouch art must not replace unfinished crouching attacks');f.updatePlayer(down,duel);}
 assert.equal(animationSequenceSample(f,0).sequence.kind,'crouch');assert.equal(animationSequenceSample(f,0).frame,5,'No standing flash after crouching attack');
 f.updatePlayer({...down,pressed:key=>key==='mk'},duel);
 while(f.state==='attack')f.updatePlayer(quiet,duel);
 assert.equal(animationSequenceSample(f,0).sequence.kind,'crouch','Released crouching attack must recover low before rising');
 assert.equal(animationSequenceSample(f,0).frame,5);
 for(const frame of [4,3,2,1,0]){f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).frame,frame);}
 f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');
 f.updatePlayer({...down,pressed:key=>key==='jump'},duel);assert.equal(animationSequenceSample(f,0).sequence.kind,'jump');
 const beltF=new Fighter(getCharacter(id),'player',600,450,facing);
 beltF.updatePlayer(down,{...duel,mode:'belt',depthMovement:true,arenaTop:380,arenaBottom:590});
 assert.equal(beltF.state,'walk');assert.ok(beltF.y>450);assert.equal(animationSequenceSample(beltF,0).sequence.kind,'walk');
}
for(const id of ['RYU','KEN','CHUNLI','IBUKI']){
 const f=new Fighter(getCharacter(id),'player',600,500,1);
 for(let tick=0;tick<8;tick++)f.updatePlayer(down,duel);
 assert.equal(animationSequenceFor(id,'crouch'),null);assert.equal(animationSequenceSample(f,0),null);
 f.updatePlayer(quiet,duel);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle','Existing characters keep authored idle on release');
}
console.log('ROSTER_CROUCH_PASS',{characters:6,facings:2,storedFrames:36,canvasDraws,entryExitReversal:true,longIdle:true,rapidToggle:true,hitStop:true,crouchAttackRecovery:true,beltMovement:true});
