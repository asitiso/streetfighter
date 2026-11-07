import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const added=['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'];
const quiet={held:()=>false,pressed:()=>false,released:()=>false};
// Keep repeated cycle sampling away from arena clamping, including fast Yun.
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:-10000,arenaRight:10000,arenaTop:380,arenaBottom:590};
const sequences=new Map([...CHARACTERS,...BOSS_CHARACTERS].flatMap(c=>animationSequencesFor(c.id)).map(s=>[s.asset,s]));
globalThis.Image=class {
 complete=true;
 set src(value){this.url=value;const s=sequences.get(value);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}
 get src(){return this.url;}
};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
const calls=[];
let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,drawImage:(...a)=>calls.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
function checkCanvas(fighter,seq){
 calls.length=0;drawCombatFighter(ctx,fighter,0,0);
 const call=calls.find(c=>c[0].src===seq.asset);assert.ok(call,`${seq.id} must reach Canvas`);
 canvasDraws++;
 assert.deepEqual(call.slice(5),[-96,-220,192,224]);
 assert.ok(call[1]>=0&&call[1]+call[3]<=seq.frameWidth*seq.frameCount);
}
for(const def of [...CHARACTERS,...BOSS_CHARACTERS]) {
 const seq=animationSequenceFor(def.id,'idle');
 assert.ok(seq?.enabled&&seq.poseAuthored,`${def.id} must have an authored idle`);
 for(const facing of [-1,1]) {
  const fighter=new Fighter(def,'player',600,460,facing),frames=new Set();let wrapped=false,previous=0;
  for(let tick=0;tick<180;tick++) {
   const sample=animationSequenceSample(fighter,tick/60);
   assert.equal(sample?.sequence.id,seq.id);frames.add(sample.frame);
   checkCanvas(fighter,seq);
   if(sample.frame<previous)wrapped=true;previous=sample.frame;
   fighter.updatePlayer(quiet,rules);
  }
  assert.equal(frames.size,seq.frameCount,`${def.id} must reach every idle frame`);assert.ok(wrapped);
  fighter.state='hit';fighter.hitAnimationDuration=24;fighter.stateFrame=-24;
  assert.notEqual(animationSequenceSample(fighter,0)?.sequence.id,seq.id,'Idle must not hide hit reactions');
  const walking=new Fighter(def,'player',600,460,facing),walk=animationSequenceFor(def.id,'walk'),walkFrames=new Set();
  assert.ok(walk?.enabled&&walk.poseAuthored,`${def.id} must have an authored walk`);
  for(let tick=0;tick<100;tick++) {
   walking.updatePlayer({...quiet,held:key=>key===(facing===1?'right':'left')},rules);
   const sample=animationSequenceSample(walking,0);assert.equal(sample?.sequence.id,walk.id);walkFrames.add(sample.frame);checkCanvas(walking,walk);
  }
  assert.equal(walkFrames.size,walk.frameCount);walking.updatePlayer(quiet,rules);
  assert.equal(animationSequenceSample(walking,0)?.sequence.id,seq.id,'Releasing movement returns to idle');
  if(added.includes(def.id)) {
   const retreat=new Fighter(def,'player',600,460,facing),back=animationSequenceFor(def.id,'walk-back'),backFrames=new Set();
   assert.ok(back?.enabled&&back.poseAuthored,`${def.id} must have an authored retreat`);
   let previous=0,wrapped=false;
   for(let tick=0;tick<100;tick++) {
    const before=retreat.x;
    retreat.updatePlayer({...quiet,held:key=>key===(facing===1?'left':'right')},rules);
    assert.ok((retreat.x-before)*facing<0,'Retreat must move away without turning');assert.equal(retreat.facing,facing);
    const sample=animationSequenceSample(retreat,0);assert.equal(sample?.sequence.id,back.id);backFrames.add(sample.frame);checkCanvas(retreat,back);
    if(sample.frame<previous)wrapped=true;previous=sample.frame;
   }
   assert.equal(backFrames.size,10);assert.ok(wrapped);
   retreat.updatePlayer({...quiet,held:key=>key===(facing===1?'right':'left')},rules);
   assert.equal(animationSequenceSample(retreat,0)?.sequence.id,walk.id,'Forward switch must use forward walking');
   retreat.updatePlayer(quiet,rules);assert.equal(animationSequenceSample(retreat,0)?.sequence.id,seq.id);
  }
 }
 if(added.includes(def.id)) {
  const manifest=JSON.parse(await readFile(new URL(`../public/art/animation-hq/${def.id.toLowerCase()}/manifest.json`,import.meta.url),'utf8'));
  for(const record of manifest.records){
   const data=await readFile(new URL(`../public/art/animation-hq/${def.id.toLowerCase()}/${record.id}.webp`,import.meta.url));
   assert.equal(record.sha256,createHash('sha256').update(data).digest('hex').toUpperCase());
   assert.equal(record.enabled,true);assert.equal(record.poseAuthored,true);
   assert.equal(record.poseQa.poseAuthoredPass,true);assert.equal(record.semanticQa.semanticQaPass,true);
  }
  assert.equal(manifest.enabledFrameTotal,28);
 }
}
// Boss AI also advances the idle clock when waiting at its assigned position.
for(const id of ['URIEN','GILL']) {
 const fighter=new Fighter(getCharacter(id),'enemy',600,460,1),target=new Fighter(getCharacter('RYU'),'player',850,460,-1);
 for(let tick=0;tick<20;tick++)fighter.updateAiDirected(target,rules,{role:'wait',desiredX:600,desiredY:460,attackAllowed:false,rangedAllowed:false});
 assert.equal(fighter.state,'idle');assert.ok(fighter.stateFrame>0);
}
console.log('ROSTER_MOVEMENT_PASS',{characters:10,facings:2,retreatCharacters:6,retreatFrames:60,canvasDraws});
