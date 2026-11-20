import {verifyChunliDashPeer} from './verify-chunli-dash-motion-v2.mjs';
import {verifyKenDashPeer} from './verify-ken-dash-motion-v2.mjs';
import {verifyRyuDashPeer} from './verify-ryu-dash-motion-v2.mjs';
import assert from 'node:assert/strict';
import {verifyJumpPeer} from './verify-jump-peer.mjs';
import {verifyForwardWalkPeer} from './verify-walk-forward-peer.mjs';
import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{animationSequenceFor}from'../dist/assets/render/AnimationSequenceLibrary.js';
const ids=['RYU','KEN','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'],sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
for(const id of ids){const slug=id.toLowerCase(),read=async p=>readFile(new URL('../'+p,import.meta.url)),m=JSON.parse(await read('public/art/animation-hq/'+slug+'/manifest.json')),r=m.records.find(x=>x.id==='dash-back');
 assert.equal(r.motionRevision,'backdash-motion-v2','New original dash-back drawings must be installed');
 const q=JSON.parse(await read('art-source/backdash-motion-v2/'+slug+'/qa.json')),before=JSON.parse(await read('art-source/backdash-motion-v2/'+slug+'/previous-manifest.json')),old=before.records.find(x=>x.id==='dash-back'),seq=animationSequenceFor(id,'dash-back',true);
 assert.equal(r.frames,7);assert.deepEqual(r.frameSize,old.frameSize);assert.deepEqual(r.stripSize,old.stripSize);assert.equal(r.uniqueDrawings,7);assert(q.previousUniqueDrawings<7);assert.equal(q.decodedMemoryDelta,0);assert.equal(q.decodedBytes,r.frameSize[0]*448*7*4);assert(q.centroidStepReductionPercent>0);assert(r.enabled&&r.poseAuthored);assert.equal(r.facingRelativeDirection,'backward');assert.equal(seq.frameCount,7);assert.equal(seq.frameWidth,r.frameSize[0]);assert.equal(seq.timing,'linear');
 assert.deepEqual(r.sourceOverrides,q.sourceOverrides);assert.equal(r.sourceOverrides.length,id==='KEN'?1:0);for(const override of r.sourceOverrides){assert.deepEqual(override.frames,[7]);assert.equal(override.sourcePose,8);assert.equal(override.referencePose,1);assert.deepEqual(override.sourceGrid,[4,2]);assert.equal(override.referenceScaleMode,'source-idle-height');assert.equal(override.uniformScale,override.primaryReferenceHeight/override.sourceReferenceHeight);assert.equal(sha(await read(override.source)),override.sourceSha256);}
 assert.deepEqual(r.sourceGrid,[4,2]);assert.deepEqual(r.sourceOrder,[2,3,4,5,6,7,8]);assert.deepEqual(r.encoding,q.encoding);assert(r.encoding.alphaLossless);
 for(const k of['poseQa','semanticQa','handoffQa','normalization','metrics'])assert.deepEqual(r[k],q[k]);assert(r.poseQa.poseAuthoredPass&&r.semanticQa.semanticQaPass&&Object.values(r.handoffQa).every(v=>v.pass));
 assert.equal(sha(await read('public/art/animation-hq/'+slug+'/dash-back.webp')),r.sha256);assert.equal(r.sha256,q.runtimeSha256);assert.equal(r.bytes,q.runtimeBytes);assert.equal(sha(await read(r.source)),r.sourceSha256);assert.equal(r.sourceSha256,q.sourceSha256);assert.equal(sha(await read('art-source/backdash-motion-v2/'+slug+'/previous-dash-back.webp')),r.previousRuntimeSha256);assert.equal(r.previousRuntimeSha256,old.sha256);
 const peerKinds=new Set(['CHUNLI','IBUKI','MAKOTO','YUN','KEN','ALEX','DUDLEY','RYU','URIEN','GILL'].includes(id)?['dash-back','walk-back']:['dash-back']);
 if(['CHUNLI','IBUKI','MAKOTO','YUN','KEN','ALEX','DUDLEY','RYU','URIEN','GILL'].includes(id)){const walk=m.records.find(x=>x.id==='walk-back'),wq=JSON.parse(await read('art-source/walk-back-motion-v2/'+slug+'/qa.json'));assert.equal(walk.motionRevision,'walk-back-motion-v2');assert.equal(walk.sha256,wq.runtimeSha256);assert.equal(sha(await read('public/art/animation-hq/'+slug+'/walk-back.webp')),walk.sha256);for(const k of['poseQa','semanticQa','handoffQa','normalization','metrics'])assert.deepEqual(walk[k],wq[k]);}
 if(await verifyForwardWalkPeer(id,m))peerKinds.add('walk');
 if(await verifyJumpPeer(id,m))peerKinds.add('jump');
 if(verifyRyuDashPeer(id,m)||verifyKenDashPeer(id,m)||verifyChunliDashPeer(id,m))peerKinds.add('dash');
 assert.deepEqual({...m,records:m.records.filter(x=>!peerKinds.has(x.id))},{...before,records:before.records.filter(x=>!peerKinds.has(x.id))},'Unrelated records must remain unchanged');
 const cap={ryu:18000000,ken:19000000,chunli:20000000,ibuki:17000000,alex:18000000,dudley:13000000,makoto:15000000,yun:17000000,urien:14000000,gill:17000000}[slug];if(cap)assert(m.records.filter(x=>x.enabled).reduce((n,x)=>n+x.bytes,0)<cap);
 assert.equal(r.metrics.length,7);assert.equal(q.sourceMetrics.length,8);assert.equal(r.normalization.reference,'idle-reference-height');for(const v of q.sourceMetrics)assert(Math.abs(v.scaledSize[1]-v.sourceBodyHeight*r.normalization.uniformScale)<=1,'All drawn bodies must use one anatomical scale');
}
console.log('BACKDASH_MOTION_V2_ASSETS_PASS',{characters:ids.length,originalRuntimeDrawings:ids.length*7,decodedMemoryDelta:0,originalGatesRetained:true});
