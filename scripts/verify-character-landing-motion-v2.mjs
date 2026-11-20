import assert from 'node:assert/strict';
import {verifyJumpPeer} from './verify-jump-peer.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {animationSequenceFor,animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const ids=['ALEX','URIEN','GILL','KEN','RYU','CHUNLI','IBUKI','DUDLEY','MAKOTO','YUN'],sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase(),quiet={held:()=>false,pressed:()=>false,released:()=>false};
for(const id of ids){
 const slug=id.toLowerCase(),m=JSON.parse(await readFile(new URL('../public/art/animation-hq/'+slug+'/manifest.json',import.meta.url))),r=m.records.find(r=>r.id==='landing');
 assert.equal(r.motionRevision,'landing-motion-v2','New character-specific landing drawings must be installed');
 const q=JSON.parse(await readFile(new URL('../art-source/landing-motion-v2/'+slug+'/qa.json',import.meta.url))),before=JSON.parse(await readFile(new URL('../art-source/landing-motion-v2/'+slug+'/previous-manifest.json',import.meta.url)));
 assert.equal(r.frames,6);assert.deepEqual(r.frameSize,[384,448]);assert.equal(r.uniqueDrawings,6);assert.equal(q.decodedMemoryDelta,0);assert(q.centroidStepReductionPercent>0);assert.deepEqual(r.encoding,q.encoding);assert(r.encoding.alphaLossless);
 assert(r.poseQa.poseAuthoredPass&&r.semanticQa.semanticQaPass&&Object.values(r.handoffQa).every(x=>x.pass));
 assert.equal(sha(await readFile(new URL('../public/art/animation-hq/'+slug+'/landing.webp',import.meta.url))),r.sha256);assert.equal(sha(await readFile(new URL('../art-source/landing-motion-v2/'+slug+'/previous-landing.webp',import.meta.url))),r.previousRuntimeSha256);assert.equal(sha(await readFile(new URL('../'+r.source,import.meta.url))),r.sourceSha256);
 // Pin landing's installed record to its QA; other motions have independent revisions.
 for(const key of ['poseQa','semanticQa','handoffQa','normalization','metrics'])assert.deepEqual(r[key],q[key],'Landing '+key+' must remain unchanged');
 assert.equal(r.sha256,q.runtimeSha256);assert.equal(r.bytes,q.runtimeBytes);
 if(!await verifyJumpPeer(id,m))assert.equal(sha(await readFile(new URL('../public/art/animation-hq/'+slug+'/jump.webp',import.meta.url))),before.records.find(x=>x.id==='jump').sha256,'Unreplaced jump peer must remain unchanged');
 const cap=({alex:18000000,dudley:13000000,makoto:15000000,yun:17000000,urien:14000000,gill:17000000})[slug];if(cap)assert(m.records.filter(x=>x.enabled).reduce((n,x)=>n+x.bytes,0)<cap);
 const s=animationSequenceFor(id,'landing',true);assert.equal(s.frameCount,6);assert.equal(s.frameWidth,384);assert.equal(s.frameHeight,448);
}
const assets=new Map(ids.flatMap(id=>animationSequencesFor(id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager}=await import('../dist/assets/render/CharacterTextureManager.js');characterTextureManager.setMode('hd');
const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f){const paints=[],stack=[],o={globalAlpha:.4};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){paints.push({src:im.src,args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});drawCombatFighter(ctx,f,1,0);assert.equal(stack.length,0);assert.equal(o.globalAlpha,.4);return paints;}
function landed(id,facing){const c=getCharacter(id),w=new CombatWorld(c,getCharacter('RYU'),'duel',c.superArts[0]),f=w.player;f.x=f.previousX=500;f.facing=facing;f.updatePlayer({...quiet,pressed:k=>k==='jump'},w.rules);assert(f.airborne);let ticks=0;while(f.airborne&&ticks++<120)f.updatePlayer(quiet,w.rules);assert(!f.airborne);assert.equal(f.state,'idle');assert.equal(f.landingFrames,8);return {w,f};}
let cases=0,draws=0,hitstopControls=0,recoveryControls=0,interruptControls=0;
for(const id of ids)for(const facing of [-1,1]){
 characterTextureManager.focusCharacter(id);characterTextureManager.preloadCharacter(id);animationTextureManager.preloadCharacter(id,'combat');const {w,f}=landed(id,facing),hp=f.hp,first=animationSequenceSample(f,0);assert.equal(first.sequence.kind,'landing');f.hitStop=3;
 for(let tick=0;tick<3;tick++){f.updatePlayer(quiet,w.rules);assert.deepEqual(animationSequenceSample(f,0),first);assert.equal(f.landingFrames,8);hitstopControls++;}
 const frames=new Set();let prev=-1,ticks=0;
 while(f.landingFrames>0&&ticks++<16){const s=animationSequenceSample(f,0);assert.equal(s.sequence.kind,'landing');assert(s.frame>=prev);prev=s.frame;frames.add(s.frame);assert(draw(f).some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/landing.webp'&&p.args[0]===s.frame*384));draws++;f.updatePlayer(quiet,w.rules);}
 assert.equal(f.landingFrames,0);assert.deepEqual([...frames],[0,1,2,3,4,5]);assert.equal(f.hp,hp);assert.equal(animationSequenceSample(f,0).sequence.kind,'idle');f.updatePlayer({...quiet,pressed:k=>k==='lp'},w.rules);assert.equal(f.state,'attack');assert.equal(animationSequenceSample(f,0).sequence.kind,'stand-light');assert(draw(f).some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/stand-light.webp'));recoveryControls++;
 const early=landed(id,facing);early.f.updatePlayer({...quiet,pressed:k=>k==='lp'},early.w.rules);assert(early.f.landingFrames>0);assert.equal(early.f.state,'attack');assert.equal(animationSequenceSample(early.f,0).sequence.kind,'stand-light');const earlyPaints=draw(early.f);assert(!earlyPaints.some(p=>p.src.endsWith('/landing.webp')),'Early next action must replace the landing art immediately');assert(earlyPaints.some(p=>p.src==='/art/animation-hq/'+id.toLowerCase()+'/stand-light.webp'));interruptControls++;cases++;
}
console.log('CHARACTER_LANDING_MOTION_V2_PASS',{characters:ids.length,facings:2,totalDrawings:ids.length*6,cases,draws,hitstopControls,recoveryControls,interruptControls,actualJumpLanding:true,allSixFramesVisible:true,combatTimingAndMemoryUnchanged:true});
