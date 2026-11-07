import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
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
const translations=[];
let canvasDraws=0;
const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),drawImage:(...a)=>calls.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
function checkCanvas(fighter,seq){
 calls.length=0;translations.length=0;drawCombatFighter(ctx,fighter,0,0);
 const call=calls.find(c=>c[0].src===seq.asset);assert.ok(call,`${seq.id} must reach Canvas`);
 canvasDraws++;
 assert.deepEqual(call.slice(5),[-seq.frameWidth/4,-220,seq.frameWidth/2,224]);
 assert.ok(call[1]>=0&&call[1]+call[3]<=seq.frameWidth*seq.frameCount);
 if(fighter.jumpHeight>0)assert.equal(translations.filter(([x,y])=>x===0&&y===-fighter.jumpHeight).length,1,'Airborne body must follow physical height exactly once');
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
   for(const direction of [-1,1]) {
    const dash=new Fighter(def,'player',600,460,facing),action=direction===1?'right':'left';
    const tap={held:key=>key===action,pressed:key=>key===action,released:()=>false};
    for(const [tick,input] of [[0,tap],[1,quiet],[2,tap]]){dash.captureInput(input,tick);dash.updatePlayer(input,rules);}
    assert.equal(dash.dashFrames,8,'Double tap must start the unchanged eight-tick dash');
    const dashSeq=animationSequenceFor(def.id,'dash');assert.ok(dashSeq?.enabled&&dashSeq.poseAuthored,`${def.id} needs authored forward dash`);
    const frames=new Set();let ticks=0;
    while(dash.dashFrames>0) {
     const sample=animationSequenceSample(dash,0);
     if(direction===facing){assert.equal(sample?.sequence.id,dashSeq.id);frames.add(sample.frame);checkCanvas(dash,dashSeq);}
     else {assert.equal(sample,null,'Forward drive art must not replace a backward dash');calls.length=0;drawCombatFighter(ctx,dash,0,0);assert.ok(!calls.some(c=>c[0].src===dashSeq.asset));}
     const before=dash.x;dash.captureInput(quiet,3+ticks);dash.updatePlayer(quiet,rules);
     assert.ok((dash.x-before)*direction>0);assert.equal(dash.facing,facing);ticks++;
    }
    assert.equal(ticks,8);
    if(direction===facing)assert.deepEqual([...frames],[0,1,3,4,5,6],'Launch/drive/braking/recovery must all be reached');
    dash.updatePlayer(quiet,rules);assert.equal(animationSequenceSample(dash,0)?.sequence.id,seq.id);
   }
   const jumping=new Fighter(def,'player',600,460,facing),jumpSeq=animationSequenceFor(def.id,'jump'),landingSeq=animationSequenceFor(def.id,'landing');
   assert.ok(jumpSeq?.enabled&&jumpSeq.poseAuthored,`${def.id} needs authored jump`);
   assert.ok(landingSeq?.enabled&&landingSeq.poseAuthored,`${def.id} needs authored landing`);
   jumping.updatePlayer({...quiet,pressed:key=>key==='jump'},rules);
   const airFrames=new Set(),landingFrames=new Set();let rise=false,fall=false,landed=false,apex=false;
   for(let tick=0;tick<120;tick++) {
    const sample=animationSequenceSample(jumping,0);
    if(jumping.airborne) {
     assert.equal(sample?.sequence.id,jumpSeq.id);airFrames.add(sample.frame);checkCanvas(jumping,jumpSeq);
     rise ||= jumping.jumpVelocity>0;fall ||= jumping.jumpVelocity<0;
     if(Math.abs(jumping.jumpVelocity)<jumping.combatProfile.gravity*1.5){assert.ok([3,4,5].includes(sample.frame),'Physical apex must show tucked knees');apex=true;}
    } else if(jumping.landingFrames>0) {
     landed=true;assert.equal(sample?.sequence.id,landingSeq.id);landingFrames.add(sample.frame);checkCanvas(jumping,landingSeq);
    } else if(landed){assert.equal(sample?.sequence.id,seq.id);break;}
    jumping.updatePlayer(quiet,rules);
   }
   assert.ok(rise&&fall&&landed&&apex);assert.equal(airFrames.size,8);assert.equal(landingFrames.size,6);
   assert.equal(jumping.jumpHeight,0);assert.equal(jumping.state,'idle');
   const hitSeq=animationSequenceFor(def.id,'hit');assert.ok(hitSeq?.enabled&&hitSeq.poseAuthored);
   for(const air of [false,true]) {
    const victim=new Fighter(def,'player',600,460,facing),attacker=new Fighter(getCharacter('RYU'),'enemy',600+facing*60,460,-facing);
    if(air){victim.updatePlayer({...quiet,pressed:k=>k==='jump'},rules);for(let t=0;t<10;t++)victim.updatePlayer(quiet,rules);assert.ok(victim.jumpHeight>0);}
    assert.equal(victim.receiveHit({...normalFor('lp'),hitStun:24},attacker,false),'hit');
    const frames=new Set();let tick=0,airDraw=false;
    while(victim.state==='hit'&&tick++<120) {
     const sample=animationSequenceSample(victim,0);assert.equal(sample?.sequence.id,hitSeq.id);frames.add(sample.frame);checkCanvas(victim,hitSeq);
     if(victim.hitStop>0)assert.equal(sample.frame,0,'Impact must freeze during hit stop');
     airDraw ||= victim.jumpHeight>0;victim.updatePlayer(quiet,rules);
    }
    assert.equal(frames.size,8);assert.notEqual(victim.state,'hit');if(air)assert.ok(airDraw,'Air hit must render above ground');
   }
   const defender=new Fighter(def,'player',600,460,facing),opponent=new Fighter(getCharacter('RYU'),'enemy',600+facing*60,460,-facing);
   assert.equal(defender.receiveHit(normalFor('lp'),opponent,true),'block');assert.notEqual(animationSequenceSample(defender,0)?.sequence.id,hitSeq.id,'Blocking must not play hit recoil');
  }
 }
 if(added.includes(def.id)) {
  const manifest=JSON.parse(await readFile(new URL(`../public/art/animation-hq/${def.id.toLowerCase()}/manifest.json`,import.meta.url),'utf8'));
  for(const record of manifest.records){
   const data=await readFile(new URL(`../public/art/animation-hq/${def.id.toLowerCase()}/${record.id}.webp`,import.meta.url));
   assert.equal(record.sha256,createHash('sha256').update(data).digest('hex').toUpperCase());
   assert.equal(record.enabled,true);assert.equal(record.poseAuthored,true);
   assert.equal(record.poseQa.poseAuthoredPass,true);assert.equal(record.semanticQa.semanticQaPass,true);
   if(record.id==='dash') {
    assert.deepEqual(record.frameSize,[640,448]);assert.equal(record.facingRelativeDirection,'forward');
    for(const metric of record.metrics)assert.ok(Math.abs(metric.scaledSize[1]-metric.sourceBodyHeight*record.normalization.uniformScale)<=1,'Dash must use one body scale without per-frame fit shrinkage');
    for(const input of [{source:record.source,sourceSha256:record.sourceSha256},...(record.sourceOverrides??[])]) {
     const bytes=await readFile(new URL(`../${input.source}`,import.meta.url));
     assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(),input.sourceSha256,'Dash source provenance must match');
    }
   }
   if(record.id==='jump'||record.id==='landing'||record.id==='hit') {
    const source=await readFile(new URL(`../${record.source}`,import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(),record.sourceSha256,'Source provenance must match');
    for(const metric of record.metrics)assert.ok(Math.abs(metric.scaledSize[1]-metric.sourceBodyHeight*record.normalization.uniformScale)<=1,'Poses must preserve one anatomical scale');
    if(record.id!=='hit') {
     const peer=manifest.records.find(r=>r.id===(record.id==='jump'?'landing':'jump'));
     assert.equal(record.normalization.uniformScale,peer.normalization.uniformScale,'Jump and landing must share body scale');
    }
   }
  }
  assert.equal(manifest.enabledFrameTotal,57);
 }
}
// Boss AI also advances the idle clock when waiting at its assigned position.
for(const id of ['URIEN','GILL']) {
 const fighter=new Fighter(getCharacter(id),'enemy',600,460,1),target=new Fighter(getCharacter('RYU'),'player',850,460,-1);
 for(let tick=0;tick<20;tick++)fighter.updateAiDirected(target,rules,{role:'wait',desiredX:600,desiredY:460,attackAllowed:false,rangedAllowed:false});
 assert.equal(fighter.state,'idle');assert.ok(fighter.stateFrame>0);
}
console.log('ROSTER_MOVEMENT_PASS',{characters:10,facings:2,airCharacters:6,airFrames:84,hitCharacters:6,hitFrames:48,canvasDraws});
