import './verify-throw-escape-assets.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { animationSequenceFor, animationSequencesFor, animationSequenceFrameTotal as registryFrameTotal, enabledAnimationSequenceFrameTotal as registryEnabledFrameTotal } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile, animationFrameProfileDigest } from '../dist/assets/render/AnimationFrameProfiles.js';
import { ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';

// Legacy package budgets and manifests remain unchanged. The independently checked
// throw-escape adds six enabled frames per character; all eight playable low-guard and low-parry supplements each add six
// independently verified supplemental poses without rewriting legacy manifests.
// Promoted command normals add12 independently verified supplemental frames per character.
function reactionFrameTotal(id, enabledOnly) { return animationSequencesFor(id, enabledOnly).filter(s=>s.kind==='fall'||s.kind==='super-hit'||s.kind==='throw-victim'||s.kind==='throw-attacker').reduce((n,s)=>n+s.frameCount,0); }
function animationSequenceFrameTotal(id) {
  const supplemental=animationSequenceFor(id,'throw-escape');
  assert.equal(supplemental?.frameCount,6);assert.equal(supplemental.enabled,true);
  return registryFrameTotal(id)-reactionFrameTotal(id,false)-(['KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'].includes(id)?6:0)-(['URIEN','GILL'].includes(id)?12:0)-(['RYU','KEN','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'].includes(id)?8:0)-6-(['KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN'].includes(id)?12:0)-(['KEN','CHUNLI','RYU','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'].includes(id)?12:0);
}
function enabledAnimationSequenceFrameTotal(id) { animationSequenceFrameTotal(id); return registryEnabledFrameTotal(id)-reactionFrameTotal(id,true)-(['KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'].includes(id)?6:0)-(['URIEN','GILL'].includes(id)?12:0)-(['RYU','KEN','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'].includes(id)?8:0)-6-(['KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN'].includes(id)?12:0)-(['KEN','CHUNLI','RYU','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'].includes(id)?12:0); }
function sha(data) { return createHash('sha256').update(data).digest('hex').toUpperCase(); }

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0,4).toString('ascii'), 'RIFF', 'not RIFF');
  assert.equal(buffer.subarray(8,12).toString('ascii'), 'WEBP', 'not WEBP');
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const fourcc = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (fourcc === 'VP8X') {
      const width = 1 + buffer[data + 4] + (buffer[data + 5] << 8) + (buffer[data + 6] << 16);
      const height = 1 + buffer[data + 7] + (buffer[data + 8] << 8) + (buffer[data + 9] << 16);
      const flags = buffer[data];
      return { width, height, alpha: (flags & 0x10) !== 0 || buffer.includes(Buffer.from('ALPH')) };
    }
    if (fourcc === 'VP8L' && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: true };
    }
    if (fourcc === 'VP8 ' && buffer[data + 3] === 0x9d && buffer[data + 4] === 0x01 && buffer[data + 5] === 0x2a) {
      return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff, alpha: buffer.includes(Buffer.from('ALPH')) };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('unable to read webp dimensions');
}

// Supplemental KO is verified independently and does not rewrite the legacy manifest.
const ryuGroundKo=animationSequenceFor('RYU','ko');assert.equal(ryuGroundKo?.id,'RYU_GROUND_KO_V1_HQ');assert.equal(ryuGroundKo.frameCount,8);assert(ryuGroundKo.enabled&&ryuGroundKo.poseAuthored);
const ryuGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/ryu/qa.json',import.meta.url),'utf8')),ryuGroundKoData=await readFile(new URL('../public'+ryuGroundKo.asset,import.meta.url)),ryuGroundKoBytes=ryuGroundKoData.length;
assert.equal(sha(ryuGroundKoData),ryuGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+ryuGroundKoQa.source,import.meta.url))),ryuGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(ryuGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(ryuGroundKoQa.uniqueDrawings,8);assert(ryuGroundKoQa.noClippingPass&&ryuGroundKoQa.horizontalRestPass);assert(ryuGroundKoBytes<750000);
const kenGroundKo=animationSequenceFor('KEN','ko');assert.equal(kenGroundKo?.id,'KEN_GROUND_KO_V1_HQ');assert.equal(kenGroundKo.frameCount,8);assert(kenGroundKo.enabled&&kenGroundKo.poseAuthored);
const kenGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/ken/qa.json',import.meta.url),'utf8')),kenGroundKoData=await readFile(new URL('../public'+kenGroundKo.asset,import.meta.url)),kenGroundKoBytes=kenGroundKoData.length;
assert.equal(sha(kenGroundKoData),kenGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+kenGroundKoQa.source,import.meta.url))),kenGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(kenGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(kenGroundKoQa.uniqueDrawings,8);assert(kenGroundKoQa.noClippingPass&&kenGroundKoQa.horizontalRestPass);assert(kenGroundKoBytes<750000);
const chunliGroundKo=animationSequenceFor('CHUNLI','ko');assert.equal(chunliGroundKo?.id,'CHUNLI_GROUND_KO_V1_HQ');assert.equal(chunliGroundKo.frameCount,8);assert(chunliGroundKo.enabled&&chunliGroundKo.poseAuthored);
const chunliGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/chunli/qa.json',import.meta.url),'utf8')),chunliGroundKoData=await readFile(new URL('../public'+chunliGroundKo.asset,import.meta.url)),chunliGroundKoBytes=chunliGroundKoData.length;
assert.equal(sha(chunliGroundKoData),chunliGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+chunliGroundKoQa.source,import.meta.url))),chunliGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(chunliGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(chunliGroundKoQa.uniqueDrawings,8);assert(chunliGroundKoQa.noClippingPass&&chunliGroundKoQa.horizontalRestPass);assert(chunliGroundKoBytes<750000);
const ibukiGroundKo=animationSequenceFor('IBUKI','ko');assert.equal(ibukiGroundKo?.id,'IBUKI_GROUND_KO_V1_HQ');assert.equal(ibukiGroundKo.frameCount,8);assert(ibukiGroundKo.enabled&&ibukiGroundKo.poseAuthored);
const ibukiGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/ibuki/qa.json',import.meta.url),'utf8')),ibukiGroundKoData=await readFile(new URL('../public'+ibukiGroundKo.asset,import.meta.url)),ibukiGroundKoBytes=ibukiGroundKoData.length;
assert.equal(sha(ibukiGroundKoData),ibukiGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+ibukiGroundKoQa.source,import.meta.url))),ibukiGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(ibukiGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(ibukiGroundKoQa.uniqueDrawings,8);assert(ibukiGroundKoQa.noClippingPass&&ibukiGroundKoQa.horizontalRestPass);assert(ibukiGroundKoBytes<750000);
const alexGroundKo=animationSequenceFor('ALEX','ko');assert.equal(alexGroundKo?.id,'ALEX_GROUND_KO_V1_HQ');assert.equal(alexGroundKo.frameCount,8);assert(alexGroundKo.enabled&&alexGroundKo.poseAuthored);
const alexGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/alex/qa.json',import.meta.url),'utf8')),alexGroundKoData=await readFile(new URL('../public'+alexGroundKo.asset,import.meta.url)),alexGroundKoBytes=alexGroundKoData.length;
assert.equal(sha(alexGroundKoData),alexGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+alexGroundKoQa.source,import.meta.url))),alexGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(alexGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(alexGroundKoQa.uniqueDrawings,8);assert(alexGroundKoQa.noClippingPass&&alexGroundKoQa.horizontalRestPass);assert(alexGroundKoBytes<750000);
const dudleyGroundKo=animationSequenceFor('DUDLEY','ko');assert.equal(dudleyGroundKo?.id,'DUDLEY_GROUND_KO_V1_HQ');assert.equal(dudleyGroundKo.frameCount,8);assert(dudleyGroundKo.enabled&&dudleyGroundKo.poseAuthored);
const dudleyGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/dudley/qa.json',import.meta.url),'utf8')),dudleyGroundKoData=await readFile(new URL('../public'+dudleyGroundKo.asset,import.meta.url)),dudleyGroundKoBytes=dudleyGroundKoData.length;
assert.equal(sha(dudleyGroundKoData),dudleyGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+dudleyGroundKoQa.source,import.meta.url))),dudleyGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(dudleyGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(dudleyGroundKoQa.uniqueDrawings,8);assert(dudleyGroundKoQa.noClippingPass&&dudleyGroundKoQa.horizontalRestPass);assert(dudleyGroundKoBytes<750000);
const makotoGroundKo=animationSequenceFor('MAKOTO','ko');assert.equal(makotoGroundKo?.id,'MAKOTO_GROUND_KO_V1_HQ');assert.equal(makotoGroundKo.frameCount,8);assert(makotoGroundKo.enabled&&makotoGroundKo.poseAuthored);
const makotoGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/makoto/qa.json',import.meta.url),'utf8')),makotoGroundKoData=await readFile(new URL('../public'+makotoGroundKo.asset,import.meta.url)),makotoGroundKoBytes=makotoGroundKoData.length;
assert.equal(sha(makotoGroundKoData),makotoGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+makotoGroundKoQa.source,import.meta.url))),makotoGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(makotoGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(makotoGroundKoQa.uniqueDrawings,8);assert(makotoGroundKoQa.noClippingPass&&makotoGroundKoQa.horizontalRestPass);assert(makotoGroundKoBytes<750000);
const yunGroundKo=animationSequenceFor('YUN','ko');assert.equal(yunGroundKo?.id,'YUN_GROUND_KO_V1_HQ');assert.equal(yunGroundKo.frameCount,8);assert(yunGroundKo.enabled&&yunGroundKo.poseAuthored);
const yunGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/yun/qa.json',import.meta.url),'utf8')),yunGroundKoData=await readFile(new URL('../public'+yunGroundKo.asset,import.meta.url)),yunGroundKoBytes=yunGroundKoData.length;
assert.equal(sha(yunGroundKoData),yunGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+yunGroundKoQa.source,import.meta.url))),yunGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(yunGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(yunGroundKoQa.uniqueDrawings,8);assert(yunGroundKoQa.noClippingPass&&yunGroundKoQa.horizontalRestPass);assert(yunGroundKoBytes<750000);
const urienGroundKo=animationSequenceFor('URIEN','ko');assert.equal(urienGroundKo?.id,'URIEN_GROUND_KO_V1_HQ');assert.equal(urienGroundKo.frameCount,8);assert(urienGroundKo.enabled&&urienGroundKo.poseAuthored);
const urienGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/urien/qa.json',import.meta.url),'utf8')),urienGroundKoData=await readFile(new URL('../public'+urienGroundKo.asset,import.meta.url)),urienGroundKoBytes=urienGroundKoData.length;
assert.equal(sha(urienGroundKoData),urienGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+urienGroundKoQa.source,import.meta.url))),urienGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(urienGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(urienGroundKoQa.uniqueDrawings,8);assert(urienGroundKoQa.noClippingPass&&urienGroundKoQa.horizontalRestPass);assert(urienGroundKoBytes<750000);
const gillGroundKo=animationSequenceFor('GILL','ko');assert.equal(gillGroundKo?.id,'GILL_GROUND_KO_V1_HQ');assert.equal(gillGroundKo.frameCount,8);assert(gillGroundKo.enabled&&gillGroundKo.poseAuthored);
const gillGroundKoQa=JSON.parse(await readFile(new URL('../art-source/ko-motion-v1/gill/qa.json',import.meta.url),'utf8')),gillGroundKoData=await readFile(new URL('../public'+gillGroundKo.asset,import.meta.url)),gillGroundKoBytes=gillGroundKoData.length;
assert.equal(sha(gillGroundKoData),gillGroundKoQa.runtimeSha256);assert.equal(sha(await readFile(new URL('../'+gillGroundKoQa.source,import.meta.url))),gillGroundKoQa.sourceSha256);assert.deepEqual({...webpDimensions(gillGroundKoData)}, {width:4096,height:448,alpha:true});assert.equal(gillGroundKoQa.uniqueDrawings,8);assert(gillGroundKoQa.noClippingPass&&gillGroundKoQa.horizontalRestPass);assert(gillGroundKoBytes<750000);
const manifestUrl = new URL('../public/art/animation-hq/ryu/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
assert.equal(manifest.candidate, '0.0.63-rc.38');
assert.equal(manifest.character, 'RYU');
assert.equal(manifest.pipeline, 'roster-movement-authored-v1');
assert.deepEqual(manifest.sourceSize, [384,448]);
assert.equal(manifest.frameTotal, 297);
assert.equal(manifest.enabledFrameTotal, 297);
assert.equal(manifest.fullFrameTotal, 297);
assert.equal(manifest.bridgeFrameTotal, 0);
assert.equal(manifest.records.length, 33);

const hqSource = await readFile(new URL('../public/art/combat-sprites-hq/ryu.webp', import.meta.url));
const hdSource = await readFile(new URL('../public/art/combat-sprites-hd/ryu.webp', import.meta.url));
const liteSource = await readFile(new URL('../public/art/combat-sprites/ryu.webp', import.meta.url));
const hqDim = webpDimensions(hqSource);
const hdDim = webpDimensions(hdSource);
const liteDim = webpDimensions(liteSource);
assert.deepEqual({width:hqDim.width,height:hqDim.height}, {width:384,height:448});
assert.deepEqual({width:hdDim.width,height:hdDim.height}, {width:384,height:448});
assert.deepEqual({width:liteDim.width,height:liteDim.height}, {width:192,height:224});
assert.equal(manifest.sourceSha256, sha(hqSource), 'animation pilot must remain bound to approved HQ source');

let totalBytes = 0, catalogBytes = 0;
const catalogUrls=new Set(Object.values(ASSET_GROUPS).flat());
for (const rec of manifest.records) {
  const data = await readFile(new URL(`../public/art/animation-hq/ryu/${rec.id}.webp`, import.meta.url));
  const dim = webpDimensions(data);
  assert.equal(dim.width, rec.frameSize[0] * rec.frames, `${rec.id} strip width mismatch`);
  assert.equal(dim.height, 448, `${rec.id} strip height mismatch`);
  assert.equal(dim.alpha, true, `${rec.id} should preserve transparency`);
  assert.equal(rec.frameSize[0], ['victory','air-medium-kick','air-medium-punch','air-light-kick','air-light-punch','air-heavy-kick','air-heavy-punch','tatsumaki','shoryuken','hadoken','dash-back','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'].includes(rec.id)?640:384);
  assert.equal(rec.frameSize[1], 448);
  assert.deepEqual(rec.stripSize, [rec.frameSize[0] * rec.frames, 448]);
  assert.equal(rec.sha256, sha(data), `${rec.id} sha mismatch`);
  assert.ok(data.byteLength > rec.frames * 18_000, `${rec.id} suspiciously small for HQ frames`);
  const url=`/art/animation-hq/ryu/${rec.id}.webp`;
  assert.equal(catalogUrls.has(url),rec.enabled,`${rec.id}: catalog must include enabled art and skip staged-disabled art`);
  if(catalogUrls.has(url))catalogBytes+=data.byteLength;
  totalBytes += data.byteLength;
}
assert.ok(totalBytes > 5_000_000, `HQ pilot payload unexpectedly small: ${totalBytes}`);


assert.equal(animationSequenceFrameTotal('RYU'), 297);
assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 297);
assert.equal(animationSequenceFrameTotal('KEN'), 311, 'Ken registry should include 70 movement + 11 defense + 222 attack + 8 victory frames');
// Ken enabled-frame total is validated against its manifest below so partial authored promotion stays supported.
for (const kind of ['idle','walk','walk-back','dash','jump','landing','hit','guard','crouch-guard','crouch-parry','parry']) {
  const sequence = animationSequenceFor('KEN', kind, false);
  assert.ok(sequence, `missing Ken sequence ${kind}`);
  const profile = animationFrameProfile('KEN', kind);
  assert.equal(profile.weights.length, sequence.frameCount, `KEN ${kind} timing weight count mismatch`);
  assert.equal(profile.anchorX.length, sequence.frameCount, `KEN ${kind} anchorX count mismatch`);
  assert.equal(profile.anchorY.length, sequence.frameCount, `KEN ${kind} anchorY count mismatch`);
}
assert.ok(animationSequenceFor('KEN','dash', false).fps > animationSequenceFor('RYU','dash', false).fps, 'Ken dash should animate faster than Ryu');
for (const id of ['CHUNLI','IBUKI']) {
  assert.equal(animationSequenceFrameTotal(id), id === 'CHUNLI' ? 335 : 321, `${id} frame total mismatch`);
  assert.equal(enabledAnimationSequenceFrameTotal(id), id === 'CHUNLI' ? 335 : 321, `${id} enabled frame total mismatch`);
  for (const kind of ['idle','walk','walk-back','dash','jump','landing','hit']) {
    const sequence = animationSequenceFor(id, kind, false);
    assert.ok(sequence, `missing ${id} sequence ${kind}`);
    const profile = animationFrameProfile(id, kind);
    assert.equal(profile.weights.length, sequence.frameCount, `${id} ${kind} timing weight count mismatch`);
    assert.equal(profile.anchorX.length, sequence.frameCount, `${id} ${kind} anchorX count mismatch`);
    assert.equal(profile.anchorY.length, sequence.frameCount, `${id} ${kind} anchorY count mismatch`);
  }
}
assert.ok(animationSequenceFor('IBUKI','dash', false).fps > animationSequenceFor('CHUNLI','dash', false).fps, 'Ibuki dash should animate faster than Chun-Li');
assert.ok(animationSequenceFor('CHUNLI','walk', false).fps > animationSequenceFor('RYU','walk', false).fps, 'Chun-Li walk cadence should exceed Ryu');
assert.equal(animationSequenceFor('RYU','idle')?.frameCount, 8);
assert.equal(animationSequenceFor('RYU','idle')?.enabled, true);
assert.equal(animationSequenceFor('RYU','idle')?.poseAuthored, true);
assert.equal(animationSequenceFor('RYU','idle')?.source, 'authored-hq');
assert.equal(manifest.records.find((record) => record.id === 'idle')?.poseAuthored, true);
assert.equal(manifest.records.find((record) => record.id === 'idle')?.enabled, true);
assert.equal(animationSequenceFor('RYU','walk')?.frameCount, 12);
assert.equal(animationSequenceFor('RYU','walk')?.poseAuthored, true, 'Ryu walk must use actual authored intermediate HQ frames');
assert.equal(manifest.records.find((record) => record.id === 'walk')?.poseAuthored, true, 'Ryu walk manifest must be pose-authored');
assert.equal(animationSequenceFor('RYU','dash', false)?.frameCount, 7);
assert.equal(animationSequenceFor('RYU','jump', false)?.frameCount, 8);
assert.equal(animationSequenceFor('RYU','landing', false)?.frameCount, 6);
assert.equal(animationSequenceFor('RYU','hit', false)?.frameCount, 8);
assert.equal(animationSequenceFor('RYU','hadoken', false)?.renderMode, 'full');
assert.equal(animationSequenceFor('RYU','shoryuken', false)?.renderMode, 'full');

for (const kind of ['shoryuken']) {
  const seq = animationSequenceFor('RYU', kind, false);
  assert.ok(seq, `missing Ryu staging sequence ${kind}`);
  assert.equal(seq.enabled, true, `${kind} now has authored action art`);
  assert.equal(seq.poseAuthored, true, `${kind} must use original authored poses`);
}
for(const [kind,count] of [['dash-back',7],['walk-back',10],['hit',8],['guard',5],['parry',6],['stand-light',7],['stand-medium',8],['stand-heavy',10],['stand-light-kick',8],['stand-medium-kick',10],['stand-heavy-kick',12],['crouch',6],['crouch-light',7],['crouch-medium',8],['crouch-heavy',10],['crouch-light-kick',8],['crouch-medium-kick',10],['crouch-heavy-kick',12]]){
 const seq=animationSequenceFor('RYU',kind),rec=manifest.records.find(r=>r.id===kind);
 assert.ok(seq?.enabled&&seq.poseAuthored&&rec.enabled&&rec.poseAuthored);assert.equal(seq.frameCount,count);
 assert.equal(rec.poseQa.poseAuthoredPass,true);assert.equal(rec.semanticQa.semanticQaPass,true);
 assert.equal(rec.sourceSha256,sha(await readFile(new URL('../'+rec.source,import.meta.url))),'Ryu authored source provenance mismatch');
 if(kind==='walk-back')assert.equal(rec.motionRevision,'walk-back-motion-v2');
 assert.equal(rec.normalization.reference,(kind==='dash-back'||kind==='walk-back')?'idle-reference-height':kind==='crouch'?'idle-standing-height':kind.startsWith('crouch-')?'crouch-recovery-height':'idle-recovery-height');
 assert.equal(rec.normalization.footBaselineReference,kind.startsWith('crouch-')?'installed-crouch':'installed-idle');
}
assert.equal(animationSequenceFor('RYU','walk')?.enabled, true);
assert.equal(animationSequenceFor('RYU','walk')?.poseAuthored, true);
assert.equal(animationSequenceFor('RYU','walk')?.source, 'authored-hq');
assert.equal(animationSequenceFor('RYU','dash')?.enabled, true);
assert.equal(animationSequenceFor('RYU','dash')?.poseAuthored, true);
assert.equal(animationSequenceFor('RYU','dash')?.source, 'authored-hq');
assert.equal(manifest.records.find((record) => record.id === 'dash')?.poseAuthored, true);
assert.equal(manifest.records.find((record) => record.id === 'dash')?.enabled, true);
assert.equal(animationSequenceFor('RYU','jump')?.enabled, true);
assert.equal(animationSequenceFor('RYU','jump')?.poseAuthored, true);
assert.equal(animationSequenceFor('RYU','jump')?.source, 'authored-hq');
assert.equal(animationSequenceFor('RYU','landing')?.enabled, true);
assert.equal(animationSequenceFor('RYU','landing')?.poseAuthored, true);
assert.equal(animationSequenceFor('RYU','landing')?.source, 'authored-hq');

for (const kind of ['idle','walk','walk-back','dash','dash-back','jump','landing','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','hit','hadoken','shoryuken','tatsumaki']) {
  const sequence = animationSequenceFor('RYU', kind, false);
  assert.ok(sequence, `missing Ryu sequence ${kind}`);
  const profile = animationFrameProfile('RYU', kind);
  assert.equal(profile.weights.length, sequence.frameCount, `${kind} timing weight count mismatch`);
  assert.equal(profile.anchorX.length, sequence.frameCount, `${kind} anchorX count mismatch`);
  assert.equal(profile.anchorY.length, sequence.frameCount, `${kind} anchorY count mismatch`);
  assert.ok(profile.weights.every((value) => value > 0), `${kind} frame weights must stay positive`);
  assert.ok(profile.footLockStrength >= 0 && profile.footLockStrength <= 1, `${kind} foot lock strength out of range`);
  assert.ok(animationFrameProfileDigest('RYU', kind).length > 12, `${kind} frame profile digest missing`);
}
assert.ok(animationFrameProfile('RYU','landing').footLockStrength > animationFrameProfile('RYU','dash').footLockStrength, 'landing foot lock should exceed dash');
assert.ok(animationFrameProfile('RYU','walk').weights[0] > animationFrameProfile('RYU','walk').weights[2], 'walk contact should hold longer than lift/passing');
const kenManifest = JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/manifest.json', import.meta.url), 'utf8'));
assert.equal(kenManifest.candidate, '0.0.63-rc.38');
assert.equal(kenManifest.character, 'KEN');
assert.equal(kenManifest.frameTotal, 311);
assert.equal(kenManifest.records.length, 34);
assert.match(kenManifest.pipeline, /^rc39-ken-authored-gated-v\d+$/);
const kenEnabledFrames = kenManifest.records.filter((record) => record.enabled).reduce((sum, record) => sum + record.frames, 0);
const kenStagingFrames = kenManifest.records.filter((record) => record.stagingOnly).reduce((sum, record) => sum + record.frames, 0);
assert.equal(kenManifest.enabledFrameTotal, kenEnabledFrames);
assert.equal(kenManifest.stagingFrameTotal, kenStagingFrames);
assert.equal(enabledAnimationSequenceFrameTotal('KEN'), kenEnabledFrames);
const kenHqSource = await readFile(new URL('../public/art/combat-sprites-hq/ken.webp', import.meta.url));
assert.equal(kenManifest.sourceSha256, sha(kenHqSource));
for (const rec of kenManifest.records) {
  const data = await readFile(new URL(`../public/art/animation-hq/ken/${rec.id}.webp`, import.meta.url));
  const dim = webpDimensions(data);
  assert.equal(dim.width, rec.frameSize[0] * rec.frames, `KEN ${rec.id} strip width mismatch`);
  assert.equal(dim.height, 448, `KEN ${rec.id} strip height mismatch`);
  assert.equal(dim.alpha, true, `KEN ${rec.id} transparency missing`);
  assert.equal(rec.sha256, sha(data), `KEN ${rec.id} sha mismatch`);
  const seq = animationSequenceFor('KEN', rec.id, false);
  assert.ok(seq, `KEN ${rec.id} registry entry missing`);
  assert.equal(seq.enabled, Boolean(rec.enabled), `KEN ${rec.id} enabled mismatch`);
  assert.equal(seq.poseAuthored, Boolean(rec.poseAuthored), `KEN ${rec.id} poseAuthored mismatch`);
  if (rec.enabled) {
    assert.equal(rec.poseAuthored, true, `KEN ${rec.id} enabled frame must be authored`);
    assert.equal(seq.source, 'authored-hq', `KEN ${rec.id} active source must be authored-hq`);
  }
  if (rec.stagingOnly) {
    assert.equal(rec.enabled, false, `KEN ${rec.id} staging must remain disabled`);
  }
}

for (const [id, slug] of [['CHUNLI','chunli'],['IBUKI','ibuki']]) {
  const extraManifest = JSON.parse(await readFile(new URL(`../public/art/animation-hq/${slug}/manifest.json`, import.meta.url), 'utf8'));
  assert.equal(extraManifest.candidate, '0.0.63-rc.38');
  assert.equal(extraManifest.character, id);
  assert.equal(extraManifest.frameTotal, id === 'CHUNLI' ? 335 : 321);
  const activeFrames = extraManifest.records.filter(rec => rec.enabled).reduce((sum, rec) => sum + rec.frames, 0);
  assert.equal(extraManifest.enabledFrameTotal, activeFrames);
  assert.equal(enabledAnimationSequenceFrameTotal(id), activeFrames);
  assert.equal(extraManifest.records.length, id === 'CHUNLI' ? 36 : 35);
  const source = await readFile(new URL(`../public/art/combat-sprites-hq/${slug}.webp`, import.meta.url));
  assert.equal(extraManifest.sourceSha256, sha(source));
  for (const rec of extraManifest.records) {
    const data = await readFile(new URL(`../public/art/animation-hq/${slug}/${rec.id}.webp`, import.meta.url));
    const dim = webpDimensions(data);
    assert.equal(dim.width, rec.frameSize[0] * rec.frames, `${id} ${rec.id} strip width mismatch`);
    assert.equal(dim.height, 448, `${id} ${rec.id} strip height mismatch`);
    assert.equal(dim.alpha, true, `${id} ${rec.id} transparency missing`);
    assert.equal(rec.sha256, sha(data), `${id} ${rec.id} checksum mismatch`);
    const seq = animationSequenceFor(id, rec.id, false);
    assert.equal(seq?.frameWidth, rec.frameSize[0], `${id} ${rec.id} frame width mismatch`);
    assert.equal(seq?.enabled, Boolean(rec.enabled), `${id} ${rec.id} enabled mismatch`);
    assert.equal(seq?.poseAuthored, Boolean(rec.poseAuthored), `${id} ${rec.id} authored mismatch`);
    if (rec.enabled) {
      assert.equal(rec.poseQa?.poseAuthoredPass, true, `${id} ${rec.id} pose gate`);
      assert.equal(rec.semanticQa?.semanticQaPass, true, `${id} ${rec.id} motion gate`);
      assert.equal(seq.source, 'authored-hq');
    }
  }
}

const ryuDef = getCharacter('RYU');
const ryu = new Fighter(ryuDef, 'player', 300, 460, 1, ryuDef.superArts[0]);
ryu.state = 'idle'; ryu.stateFrame = 0;
let sampled = animationSequenceSample(ryu, 0);
assert.ok(sampled, 'authored idle sequence must sample');
assert.equal(sampled.sequence.kind, 'idle');
ryu.stateFrame = 24;
sampled = animationSequenceSample(ryu, .4);
assert.ok(sampled, 'authored idle must remain active');
ryu.state = 'walk'; ryu.stateFrame = 30; ryu.previousX = 300; ryu.x = 306;
sampled = animationSequenceSample(ryu, .5);
assert.equal(sampled?.sequence.kind, 'walk');
assert.ok((sampled?.frame ?? -1) >= 0 && (sampled?.frame ?? 99) < 12);

const chunliDef = getCharacter('CHUNLI');
const chunli = new Fighter(chunliDef, 'player', 300, 460, 1, chunliDef.superArts[0]);
chunli.state = 'walk'; chunli.stateFrame = 30; chunli.previousX = 300; chunli.x = 306;
sampled = animationSequenceSample(chunli, .5);
assert.equal(sampled?.sequence.kind, 'walk', 'Chun-Li forward movement must use the authored walk');
assert.ok(sampled.frame >= 0 && sampled.frame < 12);
chunli.previousX = 306; chunli.x = 300;
sampled = animationSequenceSample(chunli, .5);
assert.equal(sampled?.sequence.kind, 'walk-back', 'Chun-Li retreat must use the authored backward walk');
assert.ok(sampled.frame >= 0 && sampled.frame < 10);
chunli.facing = -1; chunli.previousX = 300; chunli.x = 306;
sampled = animationSequenceSample(chunli, .5);
assert.equal(sampled?.sequence.kind, 'walk-back', 'Retreat must follow facing when Chun-Li faces left');
chunli.dashFrames = 8;
sampled = animationSequenceSample(chunli, 0);
assert.equal(sampled?.sequence.kind, 'dash-back', 'Chun-Li backward dash must use its directional authored motion');
assert.equal(sampled.frame, 0);
chunli.dashFrames = 1;
sampled = animationSequenceSample(chunli, .1);
assert.equal(sampled?.sequence.kind, 'dash-back');
assert.ok(sampled.frame > 0 && sampled.frame < 7, 'Dash must advance toward recovery');
chunli.dashFrames = 0;
sampled = animationSequenceSample(chunli, .2);
assert.equal(sampled?.sequence.kind, 'walk-back', 'Dash completion must restore movement sampling');
chunli.state = 'jump'; chunli.airborne = true; chunli.jumpHeight = 40;
chunli.jumpVelocity = chunli.combatProfile.jumpVelocity;
sampled = animationSequenceSample(chunli, .3);
assert.equal(sampled?.sequence.kind, 'jump');
const riseFrame = sampled.frame;
chunli.jumpVelocity = 0;
sampled = animationSequenceSample(chunli, .4);
assert.ok(sampled.frame > riseFrame, 'Jump must advance to the apex pose');
const apexFrame = sampled.frame;
chunli.jumpVelocity = -chunli.combatProfile.jumpVelocity;
sampled = animationSequenceSample(chunli, .5);
assert.ok(sampled.frame > apexFrame && sampled.frame < 8, 'Fall must advance toward contact');
chunli.airborne = false; chunli.jumpHeight = 0; chunli.jumpVelocity = 0; chunli.state = 'idle'; chunli.landingFrames = 8;
sampled = animationSequenceSample(chunli, .6);
assert.equal(sampled?.sequence.kind, 'landing', 'Ground contact must sample authored landing');
assert.equal(sampled.frame, 0);
chunli.landingFrames = 1;
sampled = animationSequenceSample(chunli, .7);
assert.equal(sampled?.sequence.kind, 'landing');
assert.ok(sampled.frame > 0 && sampled.frame < 6, 'Landing must advance toward recovery');
chunli.landingFrames = 0; chunli.state = 'walk';
sampled = animationSequenceSample(chunli, .8);
assert.equal(sampled?.sequence.kind, 'walk-back', 'Landing completion must restore movement sampling');
chunli.state = 'idle'; chunli.stateFrame = 0;
sampled = animationSequenceSample(chunli, 0);
assert.equal(sampled?.sequence.kind, 'idle', 'Neutral Chun-Li must sample the authored breathing loop');
assert.equal(sampled.frame, 0);
chunli.stateFrame = 15;
sampled = animationSequenceSample(chunli, .25);
assert.equal(sampled?.sequence.kind, 'idle');
assert.ok(sampled.frame > 0, 'Idle must advance with the fighter state clock');
const idleCycleFrames = animationFrameProfile('CHUNLI', 'idle').weights.reduce((sum, weight) => sum + Math.max(.05, weight), 0) / sampled.sequence.fps * 60;
chunli.stateFrame = Math.ceil(idleCycleFrames);
sampled = animationSequenceSample(chunli, 0);
assert.equal(sampled.frame, 0, 'Idle must wrap to the initial pose after one cycle');
chunli.stateFrame = 612;
sampled = animationSequenceSample(chunli, 10.2);
assert.ok(sampled.frame >= 0 && sampled.frame < 6, 'Idle must keep looping within the six authored frames');
chunli.state = 'hit'; chunli.stateFrame = 0; chunli.dashFrames = 4;
sampled = animationSequenceSample(chunli, .1);
assert.equal(sampled?.sequence.kind, 'hit', 'Hit reaction must override an interrupted dash');
assert.equal(sampled.frame, 0);
chunli.stateFrame = 8;
sampled = animationSequenceSample(chunli, .2);
assert.equal(sampled?.sequence.kind, 'hit');
assert.ok(sampled.frame > 0 && sampled.frame < 8, 'Hit reaction must advance toward recovery');
chunli.state = 'idle'; chunli.stateFrame = 0; chunli.dashFrames = 0;
sampled = animationSequenceSample(chunli, .3);
assert.equal(sampled?.sequence.kind, 'idle', 'Hit recovery must return to authored idle');


ryu.state = 'attack';
const normal = (await import('../dist/assets/combat/MoveLibrary.js')).normalFor('lp', false, 'RYU');
ryu.currentMove = normal;
ryu.moveFrame = 0;
sampled = animationSequenceSample(ryu, .1);
assert.equal(sampled.sequence.kind,'stand-light');assert.equal(sampled.frame,0);assert.equal(sampled.contact,false);

const sequenceSource = await readFile(new URL('../src/render/AnimationSequenceLibrary.ts', import.meta.url), 'utf8');
for (const token of ['RYU_IDLE_HQ','RYU_WALK_HQ','RYU_DASH_HQ','RYU_JUMP_HQ','RYU_LANDING_HQ','RYU_HIT_HQ','RYU_RC36_TARGET_FRAME_TOTAL = 100']) {
  assert.ok(sequenceSource.includes(token), `missing sequence registry token ${token}`);
}
const timingSource = await readFile(new URL('../src/render/AnimationTimingMapper.ts', import.meta.url), 'utf8');
for (const token of ['animationSequenceSample','movementKind','animationSequenceKindForAttack','attackFrame','frameAt','loopFrame','animationFrameProfile']) {
  assert.ok(timingSource.includes(token), `missing timing mapper token ${token}`);
}
const textureSource = await readFile(new URL('../src/render/AnimationTextureManager.ts', import.meta.url), 'utf8');
for (const token of ['preloadCharacter','releaseCharacter','readyCount','wantsHighFrame']) {
  assert.ok(textureSource.includes(token), `missing texture manager token ${token}`);
}
const visualSource = await readFile(new URL('../src/render/Visuals.ts', import.meta.url), 'utf8');
assert.ok(visualSource.includes('drawHighFrameSequenceSprite'), 'high-frame renderer missing');
assert.ok(visualSource.includes('footLockStrength'), 'high-frame foot-lock correction missing');
assert.ok(visualSource.includes('if (!characterTextureManager.wantsHd()) return false;'), 'LITE fallback quality gate missing');
assert.ok(visualSource.indexOf('drawHighFrameSequenceSprite') < visualSource.indexOf('drawAttackAtlasSprite'), 'HQ sequence renderer must have priority');

const {animationTextureManager}=await import('../dist/assets/render/AnimationTextureManager.js');
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');
const savedImage=globalThis.Image,savedTier=runtimeQuality.currentTier,requests=[];
globalThis.Image=class {complete=true;naturalWidth=1;naturalHeight=1;set src(v){this.url=v;if(v)requests.push(v);this.onload?.();}get src(){return this.url;}};
const ryuLowGuard=animationSequenceFor('RYU','crouch-guard');
assert.equal(ryuLowGuard?.frameCount,6);assert.ok(catalogUrls.has(ryuLowGuard.asset));
const ryuLowGuardBytes=(await stat(new URL('../public'+ryuLowGuard.asset,import.meta.url))).size;
const ryuLowParry=animationSequenceFor('RYU','crouch-parry');assert.equal(ryuLowParry?.frameCount,6);assert.ok(catalogUrls.has(ryuLowParry.asset));
const ryuLowParryBytes=(await stat(new URL('../public'+ryuLowParry.asset,import.meta.url))).size;
const ryuKnockdown=animationSequenceFor('RYU','knockdown');assert.equal(ryuKnockdown?.frameCount,6);assert.ok(catalogUrls.has(ryuKnockdown.asset));
const ryuKnockdownBytes=(await stat(new URL('../public'+ryuKnockdown.asset,import.meta.url))).size;
const ryuReactionAssets=new Map();for(const[kind,folder]of[['fall','air-fall-v1'],['super-hit','super-hit-v1'],['throw-victim','throw-victim-v1'],['throw-attacker','throw-attacker-v1']]){const seq=animationSequenceFor('RYU',kind);assert.deepEqual([seq?.frameCount,seq.frameWidth,seq.frameHeight],[kind==='throw-attacker'?8:6,512,448]);assert(catalogUrls.has(seq.asset));const meta=JSON.parse(await readFile(new URL('../art-source/'+folder+'/ryu/manifest.json',import.meta.url),'utf8')),data=await readFile(new URL('../public'+seq.asset,import.meta.url));assert.equal(sha(data),meta.sha256['ryu.webp'].toUpperCase());assert.equal(data.byteLength,meta.bytes);ryuReactionAssets.set(seq.asset,data.byteLength);}const ryuReactionBytes=[...ryuReactionAssets.values()].reduce((a,b)=>a+b,0);
const ryuOverhead=animationSequenceFor('RYU','collarbone-breaker');assert.equal(ryuOverhead?.frameCount,12);assert.ok(catalogUrls.has(ryuOverhead.asset));
const ryuOverheadBytes=(await stat(new URL('../public'+ryuOverhead.asset,import.meta.url))).size;
assert(catalogUrls.has(ryuGroundKo.asset));
catalogBytes+=ryuReactionBytes+ryuKnockdownBytes+ryuLowGuardBytes+ryuLowParryBytes+ryuOverheadBytes+ryuGroundKoBytes;
let movementPreloadBytes=0,stageEntryPreloadBytes=0;
try {
 runtimeQuality.setTier('high');animationTextureManager.releaseCharacter('RYU');
 animationTextureManager.preloadCharacter('RYU','movement');
 assert.ok(requests.includes('/art/animation-hq/ryu/dash-back.webp'),'Backward dash preparation must start with movement');
 const movementKinds=new Set(['throw-attacker','throw-victim','super-hit','fall','knockdown','idle','crouch','walk','walk-back','dash','dash-back','jump','landing','hit','guard','crouch-guard','crouch-parry','parry']);
 const expected=animationSequencesFor('RYU',true).filter(s=>s.poseAuthored&&movementKinds.has(s.kind)).map(s=>s.asset);
 assert.deepEqual([...new Set(requests)].sort(),expected.sort(),'Movement preload must include movement/normal-throw art and defer unrelated attacks');
 for(const url of new Set(requests)){if(url.startsWith('/art/throw-escape-v1/'))continue;if(ryuReactionAssets.has(url)){movementPreloadBytes+=ryuReactionAssets.get(url);continue;}if(url===ryuLowGuard.asset){movementPreloadBytes+=ryuLowGuardBytes;continue;}if(url===ryuLowParry.asset){movementPreloadBytes+=ryuLowParryBytes;continue;}if(url===ryuKnockdown.asset){movementPreloadBytes+=ryuKnockdownBytes;continue;}const rec=manifest.records.find(r=>url===`/art/animation-hq/ryu/${r.id}.webp`);assert.ok(rec?.enabled);movementPreloadBytes+=rec.bytes;}
 // Count the low-guard supplement; the separate escape bundle retains its own budget.
 // Stage1Scene.enter follows movement preparation with combat preparation; measure their union.
 animationTextureManager.preloadCharacter('RYU','combat');
 assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('RYU',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort(),'Stage entry movement + combat preload must exclude staged-disabled art');
 for(const url of new Set(requests)){if(url.startsWith('/art/throw-escape-v1/'))continue;if(ryuReactionAssets.has(url)){stageEntryPreloadBytes+=ryuReactionAssets.get(url);continue;}if(url===ryuLowGuard.asset){stageEntryPreloadBytes+=ryuLowGuardBytes;continue;}if(url===ryuLowParry.asset){stageEntryPreloadBytes+=ryuLowParryBytes;continue;}if(url===ryuKnockdown.asset){stageEntryPreloadBytes+=ryuKnockdownBytes;continue;}if(url===ryuGroundKo.asset){stageEntryPreloadBytes+=ryuGroundKoBytes;continue;}if(url===ryuOverhead.asset){stageEntryPreloadBytes+=ryuOverheadBytes;continue;}const rec=manifest.records.find(r=>url===`/art/animation-hq/ryu/${r.id}.webp`);assert.ok(rec?.enabled);stageEntryPreloadBytes+=rec.bytes;}
 assert.equal(stageEntryPreloadBytes,catalogBytes,'Stage entry must cover the complete enabled Ryu catalog');
 // Authored airborne medium punch raises Ryu budget16MB→17MB, preserving all30prior lossless strips.
 // Keep the legacy18MB budget; only the hash-verified optional KO strip adds its own cost.
 assert.ok(stageEntryPreloadBytes-ryuGroundKoBytes-ryuKnockdownBytes-ryuReactionBytes<18_000_000,`Legacy Ryu preload excluding verified KO exceeds18MB: ${stageEntryPreloadBytes-ryuGroundKoBytes}`);
 assert.equal(stageEntryPreloadBytes-ryuReactionBytes,19_022_970,'Preserve complete prior Ryu catalog');assert.ok(stageEntryPreloadBytes-ryuReactionBytes<19_200_000,'Preserve previous19.2MB cap excluding separately verified reactions');assert.equal(ryuReactionAssets.get('/art/throw-victim-v1/ryu.webp'),421676);assert.equal(ryuReactionAssets.get('/art/throw-attacker-v1/ryu.webp'),746934);assert.equal(sha(await readFile(new URL('../public/art/throw-attacker-v1/ryu.webp',import.meta.url))),'324537CE57A61CE1ACDD533CFBEF180546CEB35F57303EB9278FA3E0BE0A8832');assert.ok(stageEntryPreloadBytes-421676-746934<20_000_000,'Preserve previous20MB cap excluding strictly verified new throw strip');assert.ok(stageEntryPreloadBytes-746934<20_500_000,'Preserve previous20.5MB cap excluding verified attacker art');assert.ok(stageEntryPreloadBytes<21_000_000,'Complete Ryu catalog including throw attacker stays below21MB');
 animationTextureManager.releaseCharacter('RYU');requests.length=0;
 const chunliManifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/chunli/manifest.json',import.meta.url),'utf8'));
 animationTextureManager.releaseCharacter('CHUNLI');
 animationTextureManager.preloadCharacter('CHUNLI','movement');
 for(const kind of ['crouch','guard','parry'])assert.ok(requests.includes('/art/animation-hq/chunli/'+kind+'.webp'),'Defense preparation must start with movement');
 assert.ok(requests.includes('/art/animation-hq/chunli/dash-back.webp'),'Chun-Li backward dash must start preparation with movement');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-heavy-kick.webp'),'Movement preparation must not load heavy low kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-medium-kick.webp'),'Movement preparation must not load medium low kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-light-kick.webp'),'Movement preparation must not load low kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-heavy.webp'),'Movement preparation must not load heavy low attacks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-medium.webp'),'Movement preparation must not load medium low attacks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/crouch-light.webp'),'Movement preparation must not load low attacks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/stand-heavy-kick.webp'),'Movement preparation must not load heavy kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/stand-medium-kick.webp'),'Movement preparation must not load medium kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/stand-light-kick.webp'),'Movement preparation must not load kicks');
 assert.ok(!requests.includes('/art/animation-hq/chunli/stand-medium.webp'),'Movement preparation must not load palm attacks');
 animationTextureManager.preloadCharacter('CHUNLI','combat');
 assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('CHUNLI',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());
 const chunliLowGuard=animationSequenceFor('CHUNLI','crouch-guard');assert.equal(chunliLowGuard?.frameCount,6);assert.ok(requests.includes(chunliLowGuard.asset));
 const chunliLowGuardBytes=(await stat(new URL('../public'+chunliLowGuard.asset,import.meta.url))).size;
 const chunliLowParry=animationSequenceFor('CHUNLI','crouch-parry');assert.ok(requests.includes(chunliLowParry.asset));
 const chunliLowParryBytes=(await stat(new URL('../public'+chunliLowParry.asset,import.meta.url))).size;
 const backfist=animationSequenceFor('CHUNLI','forward-backfist');assert.equal(backfist?.frameCount,12);assert.ok(requests.includes(backfist.asset));
 const backfistBytes=(await stat(new URL('../public'+backfist.asset,import.meta.url))).size;
 const chunliKnockdown=animationSequenceFor('CHUNLI','knockdown');assert.equal(chunliKnockdown?.frameCount,6);assert.ok(requests.includes(chunliKnockdown.asset));
 const chunliKnockdownBytes=(await stat(new URL('../public'+chunliKnockdown.asset,import.meta.url))).size;
 const chunliReactionAssets=new Map();for(const[kind,folder]of[['fall','air-fall-v1'],['super-hit','super-hit-v1'],['throw-victim','throw-victim-v1'],['throw-attacker','throw-attacker-v1']]){const seq=animationSequenceFor('CHUNLI',kind);assert.deepEqual([seq?.frameCount,seq.frameWidth,seq.frameHeight],[kind==='throw-attacker'?8:6,512,448]);assert.ok(requests.includes(seq.asset));const meta=JSON.parse(await readFile(new URL('../art-source/'+folder+'/chunli/manifest.json',import.meta.url),'utf8')),data=await readFile(new URL('../public'+seq.asset,import.meta.url));assert.equal(sha(data),meta.sha256['chunli.webp'].toUpperCase());assert.equal(data.byteLength,meta.bytes);chunliReactionAssets.set(seq.asset,data.byteLength);}const chunliReactionBytes=[...chunliReactionAssets.values()].reduce((a,b)=>a+b,0);
 const chunliEntryBytes=chunliReactionBytes+chunliKnockdownBytes+chunliGroundKoBytes+backfistBytes+chunliLowParryBytes+chunliLowGuardBytes+chunliManifest.records.filter(r=>requests.includes('/art/animation-hq/chunli/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
 // Count both low-defense strips explicitly; preserve legacy authored art.
 assert.ok(requests.includes(chunliGroundKo.asset));
 assert.ok(chunliEntryBytes-chunliReactionBytes-chunliGroundKoBytes-chunliKnockdownBytes<21_000_000,'Legacy Chun-Li stage-entry animations exceed21MB excluding separately verified KO');
 const back=chunliManifest.records.find(r=>r.id==='dash-back');
 assert.equal(back.facingRelativeDirection,'backward');
 assert.equal(back.motionRevision,'backdash-motion-v2');assert.deepEqual(back.sourceOrder,[2,3,4,5,6,7,8]);
 assert.equal(back.sourceSha256,sha(await readFile(new URL('../'+back.source,import.meta.url))));
 assert.ok(catalogUrls.has('/art/animation-hq/chunli/dash-back.webp'));
 assert.equal(chunliEntryBytes-chunliReactionBytes,21_713_402,'Preserve complete prior Chun-Li catalog');assert.ok(chunliEntryBytes-chunliReactionBytes<22_000_000,'Preserve previous22MB cap excluding verified reactions');assert.equal(chunliReactionAssets.get('/art/throw-victim-v1/chunli.webp'),383776);assert.equal(chunliReactionAssets.get('/art/throw-attacker-v1/chunli.webp'),715804);assert.equal(sha(await readFile(new URL('../public/art/throw-attacker-v1/chunli.webp',import.meta.url))),'348C2ED698011A9AC5CA149A9541474D14804028B407ACD7698F1B1216811677');assert.ok(chunliEntryBytes-715804<23_000_000,'Preserve previous23MB cap excluding verified attacker art');assert.ok(chunliEntryBytes<24_000_000,'Complete Chun-Li catalog including throw attacker stays below24MB');
 console.log('CHUNLI_STAGE_ENTRY_PRELOAD_BYTES',chunliEntryBytes);
 animationTextureManager.releaseCharacter('CHUNLI');requests.length=0;
 {
 const ibukiManifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/ibuki/manifest.json',import.meta.url),'utf8'));
 animationTextureManager.releaseCharacter('IBUKI');
 animationTextureManager.preloadCharacter('IBUKI','movement');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-heavy-kick.webp'),'Movement preparation must not load Ibuki low heavy kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-medium-kick.webp'),'Movement preparation must not load Ibuki low medium kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-light-kick.webp'),'Movement preparation must not load Ibuki low light kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-heavy.webp'),'Movement preparation must not load Ibuki heavy low attacks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-medium.webp'),'Movement preparation must not load Ibuki medium low attacks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/crouch-light.webp'),'Movement preparation must not load Ibuki low attacks');
 assert.ok(requests.includes('/art/animation-hq/ibuki/crouch.webp'),'Ibuki crouch must prepare with movement');
 for(const kind of ['guard','parry'])assert.ok(requests.includes('/art/animation-hq/ibuki/'+kind+'.webp'),'Ibuki defense preparation must start with movement');
 assert.ok(requests.includes('/art/animation-hq/ibuki/dash-back.webp'),'Ibuki backward dash must start preparation with movement');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/stand-heavy-kick.webp'),'Movement preparation must not load spinning heavy kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/stand-medium-kick.webp'),'Movement preparation must not load medium kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/stand-light-kick.webp'),'Movement preparation must not load low kicks');
 assert.ok(!requests.includes('/art/animation-hq/ibuki/stand-medium.webp'),'Movement preparation must not load palm attacks');
 assert.ok(!requests.includes('/art/command-motion-v1/ibuki-spin-heel.webp'),'Movement preparation must defer heel-kick art');
 animationTextureManager.preloadCharacter('IBUKI','combat');
 assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('IBUKI',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());
 const ibukiLowGuard=animationSequenceFor('IBUKI','crouch-guard');assert.equal(ibukiLowGuard?.frameCount,6);assert.ok(requests.includes(ibukiLowGuard.asset));
 const ibukiLowGuardBytes=(await stat(new URL('../public'+ibukiLowGuard.asset,import.meta.url))).size;
 const ibukiLowParry=animationSequenceFor('IBUKI','crouch-parry');assert.ok(requests.includes(ibukiLowParry.asset));
 const ibukiLowParryBytes=(await stat(new URL('../public'+ibukiLowParry.asset,import.meta.url))).size;
 const ibukiHeel=animationSequenceFor('IBUKI','spin-heel');assert.equal(ibukiHeel?.frameCount,12);assert.ok(requests.includes(ibukiHeel.asset));
 const ibukiHeelBytes=(await stat(new URL('../public'+ibukiHeel.asset,import.meta.url))).size;
 const ibukiKnockdown=animationSequenceFor('IBUKI','knockdown');assert.equal(ibukiKnockdown?.frameCount,6);assert.ok(requests.includes(ibukiKnockdown.asset));
 const ibukiKnockdownBytes=(await stat(new URL('../public'+ibukiKnockdown.asset,import.meta.url))).size;
 const ibukiReactionAssets=new Map();for(const[kind,folder]of[['fall','air-fall-v1'],['super-hit','super-hit-v1'],['throw-victim','throw-victim-v1'],['throw-attacker','throw-attacker-v1']]){const seq=animationSequenceFor('IBUKI',kind);assert.deepEqual([seq?.frameCount,seq.frameWidth,seq.frameHeight],[kind==='throw-attacker'?8:6,512,448]);assert.ok(requests.includes(seq.asset));const meta=JSON.parse(await readFile(new URL('../art-source/'+folder+'/ibuki/manifest.json',import.meta.url),'utf8')),data=await readFile(new URL('../public'+seq.asset,import.meta.url));assert.equal(sha(data),meta.sha256['ibuki.webp'].toUpperCase());assert.equal(data.byteLength,meta.bytes);ibukiReactionAssets.set(seq.asset,data.byteLength);}const ibukiReactionBytes=[...ibukiReactionAssets.values()].reduce((a,b)=>a+b,0);
 const ibukiEntryBytes=ibukiReactionBytes+ibukiKnockdownBytes+ibukiGroundKoBytes+ibukiHeelBytes+ibukiLowParryBytes+ibukiLowGuardBytes+ibukiManifest.records.filter(r=>requests.includes('/art/animation-hq/ibuki/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
 // Count both low-defense supplements alongside legacy lossless art.
 assert.ok(requests.includes(ibukiGroundKo.asset));
 assert.ok(ibukiEntryBytes-ibukiReactionBytes-ibukiGroundKoBytes-ibukiKnockdownBytes<18_500_000,'Legacy Ibuki stage-entry animations exceed18.5MB excluding separately verified KO');
 const back=ibukiManifest.records.find(r=>r.id==='dash-back');
 assert.equal(back.facingRelativeDirection,'backward');
 assert.equal(back.motionRevision,'backdash-motion-v2');assert.deepEqual(back.sourceOrder,[2,3,4,5,6,7,8]);
 assert.equal(back.sourceSha256,sha(await readFile(new URL('../'+back.source,import.meta.url))));
 assert.ok(catalogUrls.has('/art/animation-hq/ibuki/dash-back.webp'));
 assert.equal(ibukiEntryBytes-ibukiReactionBytes,19_402_900,'Preserve complete prior Ibuki catalog');assert.ok(ibukiEntryBytes-ibukiReactionBytes<19_600_000,'Preserve previous19.6MB cap excluding verified reactions');assert.equal(ibukiReactionAssets.get('/art/throw-victim-v1/ibuki.webp'),418060);assert.equal(ibukiReactionAssets.get('/art/throw-attacker-v1/ibuki.webp'),726890);assert.equal(sha(await readFile(new URL('../public/art/throw-attacker-v1/ibuki.webp',import.meta.url))),'BAECA5C41F9D8FE3A906C7391B8BD3796D805A399F62D7463C701479A3C298C7');assert.ok(ibukiEntryBytes-726890<21_000_000,'Preserve previous21MB cap excluding verified attacker art');assert.ok(ibukiEntryBytes<21_500_000,'Complete Ibuki catalog including throw attacker stays below21.5MB');
 console.log('IBUKI_STAGE_ENTRY_PRELOAD_BYTES',ibukiEntryBytes);
 }
 {
 animationTextureManager.releaseCharacter('IBUKI');requests.length=0;
 const kenManifest=JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/manifest.json',import.meta.url),'utf8'));
 animationTextureManager.releaseCharacter('KEN');
 animationTextureManager.preloadCharacter('KEN','movement');
 assert.ok(requests.includes('/art/animation-hq/ken/crouch.webp'),'Ken crouch must prepare with movement');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-heavy-kick.webp'),'Movement preparation must not load heavy low kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-medium-kick.webp'),'Movement preparation must not load medium low kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-light-kick.webp'),'Movement preparation must not load low kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-heavy.webp'),'Movement preparation must not load heavy low attacks');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-medium.webp'),'Movement preparation must not load medium low attacks');
 assert.ok(!requests.includes('/art/animation-hq/ken/crouch-light.webp'),'Movement preparation must not load low attacks');
 assert.ok(requests.includes('/art/animation-hq/ken/dash-back.webp'),'Ken backward dash must start preparation with movement');
 assert.ok(!requests.includes('/art/animation-hq/ken/stand-heavy-kick.webp'),'Movement preparation must not load heavy kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/stand-medium-kick.webp'),'Movement preparation must not load medium kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/stand-light-kick.webp'),'Movement preparation must not load standing kicks');
 assert.ok(!requests.includes('/art/animation-hq/ken/stand-medium.webp'),'Movement preparation must not load normal attacks');
 animationTextureManager.preloadCharacter('KEN','combat');
 assert.deepEqual([...new Set(requests)].sort(),animationSequencesFor('KEN',true).filter(s=>s.poseAuthored).map(s=>s.asset).sort());
 const lowGuard=animationSequenceFor('KEN','crouch-guard');assert.equal(lowGuard?.frameCount,6);assert.ok(requests.includes(lowGuard.asset));
 const lowGuardBytes=(await stat(new URL('../public'+lowGuard.asset,import.meta.url))).size;
 const kenLowParry=animationSequenceFor('KEN','crouch-parry');assert.ok(requests.includes(kenLowParry.asset));
 const kenLowParryBytes=(await stat(new URL('../public'+kenLowParry.asset,import.meta.url))).size;
 const kenStepKick=animationSequenceFor('KEN','step-kick');assert.equal(kenStepKick?.frameCount,12);assert.ok(requests.includes(kenStepKick.asset));
 const kenStepKickBytes=(await stat(new URL('../public'+kenStepKick.asset,import.meta.url))).size;
 const kenKnockdown=animationSequenceFor('KEN','knockdown');assert.equal(kenKnockdown?.frameCount,6);assert.ok(requests.includes(kenKnockdown.asset));
 const kenKnockdownBytes=(await stat(new URL('../public'+kenKnockdown.asset,import.meta.url))).size;
 const kenReactionAssets=new Map();for(const[kind,folder]of[['fall','air-fall-v1'],['super-hit','super-hit-v1'],['throw-victim','throw-victim-v1'],['throw-attacker','throw-attacker-v1']]){const seq=animationSequenceFor('KEN',kind);assert.deepEqual([seq?.frameCount,seq.frameWidth,seq.frameHeight],[kind==='throw-attacker'?8:6,512,448]);assert.ok(requests.includes(seq.asset));const meta=JSON.parse(await readFile(new URL('../art-source/'+folder+'/ken/manifest.json',import.meta.url),'utf8')),data=await readFile(new URL('../public'+seq.asset,import.meta.url));assert.equal(sha(data),meta.sha256['ken.webp'].toUpperCase());assert.equal(data.byteLength,meta.bytes);kenReactionAssets.set(seq.asset,data.byteLength);}const kenReactionBytes=[...kenReactionAssets.values()].reduce((a,b)=>a+b,0);
 const kenEntryBytes=kenReactionBytes+kenKnockdownBytes+kenGroundKoBytes+kenStepKickBytes+kenLowParryBytes+lowGuardBytes+kenManifest.records.filter(r=>requests.includes('/art/animation-hq/ken/'+r.id+'.webp')).reduce((n,r)=>n+r.bytes,0);
 // Count both low-defense supplements alongside legacy lossless art.
 assert.ok(requests.includes(kenGroundKo.asset));
 assert.ok(kenEntryBytes-kenReactionBytes-kenGroundKoBytes-kenKnockdownBytes<20_000_000,'Legacy Ken stage-entry animations exceed20MB excluding separately verified KO');
 const back=kenManifest.records.find(r=>r.id==='dash-back');
 assert.equal(back.facingRelativeDirection,'backward');
 assert.equal(back.motionRevision,'backdash-motion-v2');assert.deepEqual(back.sourceOrder,[2,3,4,5,6,7,8]);
 assert.equal(back.sourceSha256,sha(await readFile(new URL('../'+back.source,import.meta.url))));
 assert.ok(catalogUrls.has('/art/animation-hq/ken/dash-back.webp'));
 assert.equal(kenEntryBytes-kenReactionBytes,20_980_196,'Preserve complete prior Ken catalog');assert.ok(kenEntryBytes-kenReactionBytes<21_000_000,'Preserve previous21MB cap excluding verified reactions');assert.equal(kenReactionAssets.get('/art/throw-victim-v1/ken.webp'),379600);assert.equal(kenReactionAssets.get('/art/throw-attacker-v1/ken.webp'),722700);assert.equal(sha(await readFile(new URL('../public/art/throw-attacker-v1/ken.webp',import.meta.url))),'282CF615C3D0B0C4D28843E1BE1509B46BDF76A9B928E4BB4E8B589ED70015D2');assert.ok(kenEntryBytes-379600-722700<22_000_000,'Preserve previous22MB cap excluding strictly verified new throw strip');assert.ok(kenEntryBytes-722700<22_500_000,'Preserve prior22.5MB cap excluding verified attacker art');assert.ok(kenEntryBytes<23_000_000,'Complete Ken catalog including throw attacker stays below23MB');
 console.log('KEN_STAGE_ENTRY_PRELOAD_BYTES',kenEntryBytes);
 }
}finally{animationTextureManager.releaseCharacter('KEN');animationTextureManager.releaseCharacter('IBUKI');animationTextureManager.releaseCharacter('CHUNLI');animationTextureManager.releaseCharacter('RYU');runtimeQuality.setTier(savedTier);if(savedImage===undefined)delete globalThis.Image;else globalThis.Image=savedImage;}

console.log('ANIMATION_SEQUENCE_VERIFY_PASS', {
  candidate: manifest.candidate,
  source: `${hqDim.width}x${hqDim.height} HQ ORIGINAL`,
  lite: `${liteDim.width}x${liteDim.height}`,
  frameTotal: manifest.frameTotal,
  kenFrameTotal: kenManifest.frameTotal,
  chunliFrameTotal: 335,
  ibukiFrameTotal: 321,
  ibukiEnabledFrameTotal: 321,
  enabledFrameTotal: manifest.enabledFrameTotal,
  strips: manifest.records.length,
  payloadKb: Math.round(totalBytes / 1024),
  catalogPayloadKb: Math.round(catalogBytes / 1024),
  movementPreloadKb: Math.round(movementPreloadBytes / 1024),
  stageEntryPreloadKb: Math.round(stageEntryPreloadBytes / 1024),
  alpha: true,
  verdict: 'HQ_ANIMATION_ASSET_QUALITY_PASS',
});
