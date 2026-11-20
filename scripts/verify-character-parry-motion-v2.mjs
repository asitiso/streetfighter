import assert from 'node:assert/strict';
import {verifyJumpPeer} from './verify-jump-peer.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getCharacter} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const ids=['RYU','DUDLEY','GILL','KEN','CHUNLI','IBUKI','ALEX','MAKOTO','YUN','URIEN'],sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase(),quiet={held:()=>false,pressed:()=>false,released:()=>false};
for(const id of ids){
 const slug=id.toLowerCase(),m=JSON.parse(await readFile(new URL('../public/art/animation-hq/'+slug+'/manifest.json',import.meta.url))),r=m.records.find(r=>r.id==='parry');
 assert.equal(r.motionRevision,'parry-motion-v2','New character-specific parry drawings must be installed');
 const q=JSON.parse(await readFile(new URL('../art-source/parry-motion-v2/'+slug+'/qa.json',import.meta.url))),before=JSON.parse(await readFile(new URL('../art-source/parry-motion-v2/'+slug+'/previous-manifest.json',import.meta.url)));
 assert.deepEqual(r.sourceGrid,[3,2]);assert.deepEqual(r.sourceOrder,[1,2,3,4,5,6]);assert.deepEqual(q.sourceGrid,r.sourceGrid);
 assert.equal(r.frames,6);assert.deepEqual(r.frameSize,[384,448]);assert.equal(r.uniqueDrawings,6);assert.equal(q.decodedMemoryDelta,0);assert(q.centroidStepReductionPercent>0);assert.deepEqual(r.encoding,q.encoding);assert(r.encoding.alphaLossless);
 assert(r.poseQa.poseAuthoredPass&&r.semanticQa.semanticQaPass&&Object.values(r.handoffQa).every(x=>x.pass));
 assert.equal(sha(await readFile(new URL('../public/art/animation-hq/'+slug+'/parry.webp',import.meta.url))),r.sha256);assert.equal(sha(await readFile(new URL('../art-source/parry-motion-v2/'+slug+'/previous-parry.webp',import.meta.url))),r.previousRuntimeSha256);assert.equal(sha(await readFile(new URL('../'+r.source,import.meta.url))),r.sourceSha256);
 // Pin this motion's QA while other independently verified motions evolve.
 for(const key of ['poseQa','semanticQa','handoffQa','normalization','metrics'])assert.deepEqual(r[key],q[key],'Parry '+key+' must remain unchanged');
 assert.equal(r.sha256,q.runtimeSha256);assert.equal(r.bytes,q.runtimeBytes);
 if(!await verifyJumpPeer(id,m))assert.equal(sha(await readFile(new URL('../public/art/animation-hq/'+slug+'/jump.webp',import.meta.url))),before.records.find(x=>x.id==='jump').sha256,'Unreplaced jump peer must remain unchanged');
 const cap=({alex:18000000,dudley:13000000,makoto:15000000,yun:17000000,urien:14000000,gill:17000000})[slug];if(cap)assert(m.records.filter(x=>x.enabled).reduce((n,x)=>n+x.bytes,0)<cap);
 const s=animationSequenceFor(id,'parry',true);assert.equal(s.frameCount,6);assert.equal(s.frameWidth,384);assert.equal(s.frameHeight,448);
}
const assets=new Map(ids.flatMap(id=>animationSequencesFor(id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('hd');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const paints=[],stack=[],o={globalAlpha:.4};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){paints.push({src:im.src,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert.equal(o.globalAlpha,.4);return paints;}

let cases=0,draws=0,hitstopControls=0,nextAttackControls=0,durationResetControls=0;
for(const id of ids)for(const facing of [-1,1])for(const red of [false,true])for(const mode of ['duel','belt']){
 const rules={mode,depthMovement:mode==='belt',laneTolerance:54,arenaLeft:-10000,arenaRight:10000,arenaTop:380,arenaBottom:590};
 characterTextureManager.focusCharacter(id);characterTextureManager.preloadCharacter(id);animationTextureManager.preloadCharacter(id,'combat');
 const f=new Fighter(getCharacter(id),'player',600,460,facing),enemy=new Fighter(getCharacter('RYU'),'enemy',600+facing*60,460,-facing),hp=f.hp;
 if(red){assert.equal(f.receiveHit(normalFor('lp'),enemy,true),'block');while(f.hitStop>0)f.updatePlayer(quiet,rules);}
 f.updatePlayer({...quiet,pressed:k=>k===(facing===1?'right':'left')},rules);assert.equal(f.receiveHit(normalFor('lp'),enemy,false),red?'red-parry':'parry');
 const first=animationSequenceSample(f,0),initialTimer=f.stateFrame;assert.equal(first.sequence.kind,'parry');assert.equal(first.frame,0,'Every normal/red parry must start from the authored anticipation pose');let frozen=0;
 while(f.hitStop>0&&frozen++<60){assert(draw(f).some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/parry.webp'&&p.args[0]===first.frame*384));f.updatePlayer(quiet,rules);assert.equal(f.stateFrame,initialTimer);assert.deepEqual(animationSequenceSample(f,0),first);hitstopControls++;}
 assert.equal(f.hitStop,0);const frames=new Set();let ticks=0,prev=-1;
 while(f.state==='parry'&&ticks++<30){const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'parry');assert(s.frame>=prev);prev=s.frame;frames.add(s.frame);assert(draw(f).some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/parry.webp'&&p.args[0]===s.frame*384));draws++;f.updatePlayer(quiet,rules);}
 assert.equal(ticks,red?10:8);assert.equal(f.hp,hp);assert.equal(f.state,'idle');assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');assert(frames.has(2)||frames.has(3));assert(frames.has(5));assert.deepEqual([...frames],[0,1,2,3,4,5],'Normal and red parries must display all six original drawings');
 // A normal parry after red (and red after normal) must replace the old duration.
 const repeatRed=!red;if(repeatRed){assert.equal(f.receiveHit(normalFor('lp'),enemy,true),'block');while(f.hitStop>0)f.updatePlayer(quiet,rules);}
 f.updatePlayer({...quiet,pressed:k=>k===(facing===1?'right':'left')},rules);assert.equal(f.receiveHit(normalFor('lp'),enemy,false),repeatRed?'red-parry':'parry');assert.equal(f.parryAnimationDuration,repeatRed?10:8);const repeatFirst=animationSequenceSample(f,0);assert.equal(repeatFirst.frame,0);while(f.hitStop>0){f.updatePlayer(quiet,rules);assert.deepEqual(animationSequenceSample(f,0),repeatFirst);hitstopControls++;}
 const repeated=new Set();let repeatTicks=0;while(f.state==='parry'){const sample=animationSequenceSample(f,0);repeated.add(sample.frame);assert(draw(f).some(p=>p.src.endsWith('/parry.webp')&&p.args[0]===sample.frame*384));draws++;repeatTicks++;f.updatePlayer(quiet,rules);}
 assert.equal(repeatTicks,repeatRed?10:8);assert.deepEqual([...repeated],[0,1,2,3,4,5]);assert.equal(f.hp,hp);durationResetControls++;
 f.updatePlayer({...quiet,pressed:k=>k==='lp'},rules);assert.equal(f.state,'attack');assert.equal(animationSequenceSample(f,0).sequence.kind,'stand-light');const paints=draw(f);assert(paints.some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/stand-light.webp'));assert(!paints.some(p=>p.src.endsWith('/parry.webp')));nextAttackControls++;cases++;
}
console.log('CHARACTER_PARRY_MOTION_V2_PASS',{characters:ids.length,modes:2,totalDrawings:ids.length*6,cases,draws,hitstopControls,nextAttackControls,durationResetControls,normalParryFrames:8,redParryFrames:10,combatTimingAndMemoryUnchanged:true});
