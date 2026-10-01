import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  animationSequenceFor,
  animationSequenceFrameTotal,
  enabledAnimationSequenceFrameTotal,
  KEN_RC39_ATTACK_FRAME_TOTAL,
  KEN_RC39_DEFENSE_FRAME_TOTAL,
  KEN_RC39_TARGET_FRAME_TOTAL,
} from '../dist/assets/render/AnimationSequenceLibrary.js';
import { animationSequenceKindForAttack } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile } from '../dist/assets/render/AnimationFrameProfiles.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';

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
      return { width, height, alpha:(flags & 0x10) !== 0 || buffer.includes(Buffer.from('ALPH')) };
    }
    if (fourcc === 'VP8L' && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return { width:(bits & 0x3fff)+1, height:((bits >>> 14)&0x3fff)+1, alpha:true };
    }
    if (fourcc === 'VP8 ' && buffer[data+3] === 0x9d && buffer[data+4] === 0x01 && buffer[data+5] === 0x2a) {
      return { width:buffer.readUInt16LE(data+6)&0x3fff, height:buffer.readUInt16LE(data+8)&0x3fff, alpha:buffer.includes(Buffer.from('ALPH')) };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('unable to read webp dimensions');
}

assert.equal(KEN_RC39_ATTACK_FRAME_TOTAL, 69);
assert.equal(KEN_RC39_DEFENSE_FRAME_TOTAL, 11);
assert.equal(KEN_RC39_TARGET_FRAME_TOTAL, 137);
assert.equal(animationSequenceFrameTotal('KEN'), 137);

const manifest = JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.character, 'KEN');
assert.match(manifest.pipeline, /^rc39-ken-authored-gated-v\d+$/);
assert.equal(manifest.frameTotal, 137);
assert.equal(manifest.records.length, 15);

const enabledFrames = manifest.records.filter(r=>r.enabled).reduce((sum,r)=>sum+r.frames,0);
const stagingFrames = manifest.records.filter(r=>r.stagingOnly).reduce((sum,r)=>sum+r.frames,0);
const fullFrames = manifest.records.filter(r=>r.enabled && r.renderMode==='full').reduce((sum,r)=>sum+r.frames,0);
assert.equal(manifest.enabledFrameTotal, enabledFrames, 'manifest enabledFrameTotal drift');
assert.equal(manifest.stagingFrameTotal, stagingFrames, 'manifest stagingFrameTotal drift');
assert.equal(manifest.fullFrameTotal, fullFrames, 'manifest fullFrameTotal drift');
assert.equal(enabledAnimationSequenceFrameTotal('KEN'), enabledFrames, 'registry enabled total must match manifest');

const attackExpected = new Map([
  ['stand-light', 7], ['stand-heavy', 10], ['hadoken', 12], ['shoryuken', 12], ['tatsumaki', 12], ['super-rush', 16],
]);
for (const record of manifest.records) {
  const seq = animationSequenceFor('KEN', record.id, false);
  assert.ok(seq, `missing KEN ${record.id}`);
  assert.equal(seq.frameCount, record.frames, `${record.id} frame count`);
  assert.equal(seq.enabled, Boolean(record.enabled), `${record.id} enabled registry/manifest mismatch`);
  assert.equal(seq.poseAuthored, Boolean(record.poseAuthored), `${record.id} poseAuthored registry/manifest mismatch`);

  const data = await readFile(new URL(`../public/art/animation-hq/ken/${record.id}.webp`, import.meta.url));
  const dim = webpDimensions(data);
  assert.equal(dim.width, 384 * record.frames, `${record.id} strip width`);
  assert.equal(dim.height, 448, `${record.id} strip height`);
  assert.equal(dim.alpha, true, `${record.id} strip alpha`);
  assert.equal(record.sha256, sha(data), `${record.id} strip sha`);

  if (record.enabled) {
    assert.equal(record.poseAuthored, true, `${record.id}: enabled requires authored pose`);
    assert.notEqual(record.stagingOnly, true, `${record.id}: enabled sequence cannot remain stagingOnly`);
    assert.equal(seq.source, 'authored-hq', `${record.id}: active source must be authored-hq`);
    assert.ok(record.poseQa?.poseAuthoredPass, `${record.id}: active record requires passing pose QA`);
    if (['idle','walk','walk-back','dash','jump','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','super-rush'].includes(record.id)) {
      assert.ok(record.semanticQa?.semanticQaPass, `${record.id}: active record requires passing semantic QA`);
    }
    if (record.id === 'idle') {
      assert.ok(record.semanticQa?.checks?.loopClosure, 'idle: loop closure');
      assert.ok(record.semanticQa?.checks?.feetPlanted, 'idle: feet planted');
      assert.ok(record.semanticQa?.checks?.stanceWidthStable, 'idle: stance width stable');
    }
  }
  if (record.stagingOnly) {
    assert.equal(record.enabled, false, `${record.id}: staging sequence must stay disabled`);
    assert.equal(record.poseAuthored, false, `${record.id}: staging sequence must stay un-authored`);
  }

  if (attackExpected.has(record.id)) {
    assert.equal(record.frames, attackExpected.get(record.id));
    const profile = animationFrameProfile('KEN', record.id);
    assert.equal(profile.weights.length, record.frames, `${record.id} weights`);
    assert.equal(profile.anchorX.length, record.frames, `${record.id} anchorX`);
    assert.equal(profile.anchorY.length, record.frames, `${record.id} anchorY`);
  }
}

const pose = JSON.parse(await readFile(new URL('../RC39_KEN_POSE_VARIANCE.json', import.meta.url), 'utf8'));
assert.equal(pose.character, 'KEN');
assert.equal(pose.missingCount, 0);
for (const measured of pose.records) {
  const rec = manifest.records.find(r=>r.id===measured.sequence);
  assert.ok(rec, `pose report has unknown ${measured.sequence}`);
  if (rec.enabled) {
    assert.equal(measured.poseAuthoredPass, true, `${measured.sequence}: active art must pass affine gate`);
    assert.ok(measured.affineResidualAverage >= measured.fullPoseAverageThreshold, `${measured.sequence}: active average residual`);
    assert.ok(measured.affineResidualMax >= measured.fullPoseMaxThreshold, `${measured.sequence}: active max residual`);
  } else if (rec.stagingOnly) {
    assert.equal(measured.poseAuthoredPass, false, `${measured.sequence}: affine staging art must be rejected`);
  }
}

const idleSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_IDLE_SEMANTIC_QA.json', import.meta.url), 'utf8'));
assert.equal(idleSemantic.verdict, 'KEN_IDLE_SEMANTIC_QA_PASS');
assert.equal(idleSemantic.sequence, 'idle');
assert.ok(idleSemantic.cases.length >= 5);

const locomotionSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_LOCOMOTION_SEMANTIC_QA.json', import.meta.url), 'utf8'));
assert.equal(locomotionSemantic.verdict, 'KEN_LOCOMOTION_SEMANTIC_QA_PASS');
assert.deepEqual(locomotionSemantic.sequences, ['dash','jump','landing']);

const walkBackHitSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_WALKBACK_HIT_SEMANTIC_QA.json', import.meta.url), 'utf8'));
assert.equal(walkBackHitSemantic.verdict, 'KEN_WALKBACK_HIT_SEMANTIC_QA_PASS');
assert.deepEqual(walkBackHitSemantic.sequences, ['walk-back','hit']);

const defenseSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_DEFENSE_SEMANTIC_QA.json', import.meta.url), 'utf8'));
assert.equal(defenseSemantic.verdict, 'KEN_DEFENSE_SEMANTIC_QA_PASS');
assert.deepEqual(defenseSemantic.sequences, ['guard','parry']);

const standingAttackSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_STANDING_ATTACKS_SEMANTIC_QA.json', import.meta.url), 'utf8'));
const specialAttackSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_SPECIAL_ATTACKS_SEMANTIC_QA.json', import.meta.url), 'utf8'));
const advancedSpecialSemantic = JSON.parse(await readFile(new URL('../RC39_KEN_ADVANCED_SPECIALS_SEMANTIC_QA.json', import.meta.url), 'utf8'));
assert.equal(standingAttackSemantic.verdict, 'KEN_STANDING_ATTACKS_SEMANTIC_QA_PASS');
assert.deepEqual(standingAttackSemantic.sequences, ['stand-light','stand-heavy']);
assert.equal(specialAttackSemantic.verdict, 'KEN_SPECIAL_ATTACKS_SEMANTIC_QA_PASS');
assert.deepEqual(specialAttackSemantic.sequences, ['hadoken','shoryuken']);
assert.equal(advancedSpecialSemantic.verdict, 'KEN_ADVANCED_SPECIALS_SEMANTIC_QA_PASS');
assert.deepEqual(advancedSpecialSemantic.sequences, ['tatsumaki','super-rush']);

const runtimeSemantic = JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/semantic-audit.json', import.meta.url), 'utf8'));
assert.equal(runtimeSemantic.character, 'KEN');
const idleRuntimeSemantic = runtimeSemantic.records.find(r=>r.sequence==='idle');
assert.ok(idleRuntimeSemantic, 'runtime semantic idle audit');
const idleManifest = manifest.records.find(r=>r.id==='idle');
assert.ok(idleManifest, 'idle manifest record');
if (idleManifest.enabled) {
  assert.equal(idleManifest.poseAuthored, true, 'active idle must be authored');
  assert.equal(idleRuntimeSemantic.runtimePromotionPass, true, 'active idle must pass runtime semantic promotion');
  assert.equal(idleRuntimeSemantic.poseQa.poseAuthoredPass, true, 'active idle must pass authored pose threshold');
  assert.equal(idleRuntimeSemantic.semanticQa.semanticQaPass, true, 'active idle must pass semantic threshold');
} else {
  assert.equal(idleRuntimeSemantic.runtimePromotionPass, false, 'gated idle must not pass runtime promotion');
}
const walkRuntimeSemantic = runtimeSemantic.records.find(r=>r.sequence==='walk');
assert.ok(walkRuntimeSemantic, 'runtime semantic walk audit');
const walkManifest = manifest.records.find(r=>r.id==='walk');
assert.ok(walkManifest, 'walk manifest record');
if (walkManifest.enabled) {
  assert.equal(walkManifest.poseAuthored, true, 'active walk must be authored');
  assert.equal(walkRuntimeSemantic.runtimePromotionPass, true, 'active walk must pass runtime semantic promotion');
  assert.equal(walkRuntimeSemantic.semanticQa.semanticQaPass, true, 'active walk must pass semantic threshold');
  assert.equal(walkRuntimeSemantic.semanticQa.checks.oppositeContactDifferent, true, 'active walk must alternate contact pose');
  assert.equal(walkRuntimeSemantic.semanticQa.checks.footTravelPresent, true, 'active walk must show foot travel');
} else {
  assert.equal(walkRuntimeSemantic.runtimePromotionPass, false, 'gated walk must not pass runtime promotion');
}

for (const kind of ['walk-back','dash','jump','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','super-rush']) {
  const audit = runtimeSemantic.records.find(r=>r.sequence===kind);
  const rec = manifest.records.find(r=>r.id===kind);
  assert.ok(audit, `runtime semantic ${kind} audit`);
  assert.ok(rec, `${kind} manifest record`);
  if (rec.enabled) {
    assert.equal(rec.poseAuthored, true, `active ${kind} must be authored`);
    assert.equal(audit.runtimePromotionPass, true, `active ${kind} must pass runtime semantic promotion`);
    assert.equal(audit.semanticQa.semanticQaPass, true, `active ${kind} must pass semantic threshold`);
  } else {
    assert.equal(audit.runtimePromotionPass, false, `gated ${kind} must not pass runtime promotion`);
  }
}

const handoffAudit = JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/handoff-audit.json', import.meta.url), 'utf8'));
assert.equal(handoffAudit.character, 'KEN');
assert.equal(handoffAudit.runtimeHandoffPass, true, 'Ken runtime handoff compatibility must pass');
assert.equal(handoffAudit.fallbackBridgePass, true, 'Idle endpoints must remain compatible with base Ken renderer');
if (handoffAudit.pairAuthoredActive) {
  assert.equal(handoffAudit.pairPass, true, 'Authored idle/walk pair must pass bidirectional handoff');
}
assert.equal(handoffAudit.locomotion?.locomotionHandoffPass, true, 'Active Ken locomotion handoffs must pass');
assert.equal(handoffAudit.reactionAndRetreat?.reactionHandoffPass, true, 'Active Ken walk-back/hit handoffs must pass');

assert.equal(handoffAudit.defense?.defenseHandoffPass, true, 'Active Ken guard/parry handoffs must pass');
assert.equal(handoffAudit.standingAttacks?.standingAttackHandoffPass, true, 'Active Ken standing attack handoffs must pass');
assert.equal(handoffAudit.specialAttacks?.specialAttackHandoffPass, true, 'Active Ken special attack handoffs must pass');

const sourceAudit = JSON.parse(await readFile(new URL('../public/art/animation-hq/ken/source-audit.json', import.meta.url), 'utf8'));
assert.equal(sourceAudit.character, 'KEN');
assert.equal(sourceAudit.safeToAutoPromote, false, 'overview/reference sheet must never bypass HQ source gate');
assert.equal(sourceAudit.allSourceResolutionPass, false);
assert.ok(sourceAudit.records.every(r=>r.sourceBodyHeightMin < sourceAudit.gate.minimumBodyHeight), 'reference samples should remain below production source threshold');

const qaHtml = await readFile(new URL('../public/animation-qa.html', import.meta.url), 'utf8');
const qaJs = await readFile(new URL('../public/animation-qa.js', import.meta.url), 'utf8');
assert.match(qaHtml, /ANIMATION QA/);
assert.match(qaHtml, /PREVIOUS/);
assert.match(qaHtml, /CURRENT/);
assert.match(qaHtml, /NEXT/);
assert.match(qaJs, /POSE AUTHORED/);
assert.match(qaJs, /STAGING • REJECTED/);
assert.match(qaJs, /RUNTIME GATED/);
assert.match(qaJs, /REFERENCE ONLY/);
assert.match(qaHtml, /POSE QA/);
assert.match(qaHtml, /SEMANTIC QA/);
assert.match(qaHtml, /GATE REASON/);
assert.match(qaHtml, /HANDOFF QA/);
assert.match(qaJs, /POSE CHANGE TOO SMALL/);
assert.match(qaJs, /MOTION SEMANTICS/);
assert.match(qaJs, /handoff-audit\.json/);
assert.match(qaJs, /BASE BRIDGE/);
assert.match(qaJs, /BASE↔DASH/);
assert.match(qaJs, /JUMP→LANDING/);
assert.match(qaJs, /BASE↔WALK-BACK/);
assert.match(qaJs, /BASE↔HIT/);
assert.match(qaJs, /BASE↔GUARD/);
assert.match(qaJs, /BASE↔PARRY/);
assert.match(qaJs, /BASE↔LIGHT/);
assert.match(qaJs, /BASE↔HEAVY/);
assert.match(qaJs, /BASE↔HADOKEN/);
assert.match(qaJs, /BASE↔SHORYUKEN/);
assert.match(qaJs, /BASE↔TATSUMAKI/);
assert.match(qaJs, /BASE↔SUPER RUSH/);

const specials = specialMovesFor('KEN');
assert.equal(animationSequenceKindForAttack('KEN', specials.primary), 'hadoken');
assert.equal(animationSequenceKindForAttack('KEN', specials.exPrimary), 'hadoken');
assert.equal(animationSequenceKindForAttack('KEN', specials.antiAir), 'shoryuken');
assert.equal(animationSequenceKindForAttack('KEN', specials.mobility), 'tatsumaki');
assert.equal(animationSequenceKindForAttack('KEN', specials.super), 'super-rush');
assert.equal(animationSequenceKindForAttack('KEN', normalFor('lp', false, 'KEN')), 'stand-light');
assert.equal(animationSequenceKindForAttack('KEN', normalFor('hk', false, 'KEN')), 'stand-heavy');
getCharacter('KEN');
assert.equal(animationSequenceKindForAttack('KEN', superArtMoveFor('KEN', 1)), 'shoryuken');
assert.equal(animationSequenceKindForAttack('KEN', superArtMoveFor('KEN', 2)), 'shoryuken');
assert.equal(animationSequenceKindForAttack('KEN', superArtMoveFor('KEN', 3)), 'super-rush');

console.log('KEN_AUTHORED_PIPELINE_VERIFY_PASS', {
  frameTotal:137,
  attackFrames:69,
  enabledFrames,
  stagingFrames,
  activeSequences:manifest.records.filter(r=>r.enabled).map(r=>r.id),
  poseGate:'AUTHORED_ONLY',
});
