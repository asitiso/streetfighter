import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { animationSequenceFor, animationSequenceFrameTotal, enabledAnimationSequenceFrameTotal } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { animationSequenceSample } from '../dist/assets/render/AnimationTimingMapper.js';
import { animationFrameProfile, animationFrameProfileDigest } from '../dist/assets/render/AnimationFrameProfiles.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';

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

const manifestUrl = new URL('../public/art/animation-hq/ryu/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
assert.equal(manifest.candidate, '0.0.63-rc.38');
assert.equal(manifest.character, 'RYU');
assert.equal(manifest.pipeline, 'rc37-authored-gated-v3');
assert.deepEqual(manifest.sourceSize, [384,448]);
assert.equal(manifest.frameTotal, 100);
assert.equal(manifest.enabledFrameTotal, 41);
assert.equal(manifest.fullFrameTotal, 41);
assert.equal(manifest.bridgeFrameTotal, 0);
assert.equal(manifest.records.length, 11);

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

let totalBytes = 0;
for (const rec of manifest.records) {
  const data = await readFile(new URL(`../public/art/animation-hq/ryu/${rec.id}.webp`, import.meta.url));
  const dim = webpDimensions(data);
  assert.equal(dim.width, 384 * rec.frames, `${rec.id} strip width mismatch`);
  assert.equal(dim.height, 448, `${rec.id} strip height mismatch`);
  assert.equal(dim.alpha, true, `${rec.id} should preserve transparency`);
  assert.equal(rec.frameSize[0], 384);
  assert.equal(rec.frameSize[1], 448);
  assert.deepEqual(rec.stripSize, [384 * rec.frames, 448]);
  assert.equal(rec.sha256, sha(data), `${rec.id} sha mismatch`);
  assert.ok(data.byteLength > rec.frames * 18_000, `${rec.id} suspiciously small for HQ frames`);
  totalBytes += data.byteLength;
}
assert.ok(totalBytes > 5_000_000, `HQ pilot payload unexpectedly small: ${totalBytes}`);
assert.ok(totalBytes < 12_000_000, `HQ pilot payload too large: ${totalBytes}`);

assert.equal(animationSequenceFrameTotal('RYU'), 100);
assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 41);
assert.equal(animationSequenceFrameTotal('KEN'), 137, 'Ken registry should include 57 movement + 11 defense + 69 staged attack frames');
// Ken enabled-frame total is validated against its manifest below so partial authored promotion stays supported.
for (const kind of ['idle','walk','walk-back','dash','jump','landing','hit','guard','parry']) {
  const sequence = animationSequenceFor('KEN', kind, false);
  assert.ok(sequence, `missing Ken sequence ${kind}`);
  const profile = animationFrameProfile('KEN', kind);
  assert.equal(profile.weights.length, sequence.frameCount, `KEN ${kind} timing weight count mismatch`);
  assert.equal(profile.anchorX.length, sequence.frameCount, `KEN ${kind} anchorX count mismatch`);
  assert.equal(profile.anchorY.length, sequence.frameCount, `KEN ${kind} anchorY count mismatch`);
}
assert.ok(animationSequenceFor('KEN','dash', false).fps > animationSequenceFor('RYU','dash', false).fps, 'Ken dash should animate faster than Ryu');
for (const id of ['CHUNLI','IBUKI']) {
  assert.equal(animationSequenceFrameTotal(id), id === 'CHUNLI' ? 150 : 57, `${id} frame total mismatch`);
  assert.equal(enabledAnimationSequenceFrameTotal(id), id === 'CHUNLI' ? 150 : 0, `${id} enabled frame total mismatch`);
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
assert.equal(animationSequenceFor('RYU','hadoken', false)?.renderMode, 'bridge');
assert.equal(animationSequenceFor('RYU','shoryuken', false)?.renderMode, 'bridge');

for (const kind of ['walk-back','stand-light','stand-heavy','hit','hadoken','shoryuken']) {
  const seq = animationSequenceFor('RYU', kind, false);
  assert.ok(seq, `missing Ryu staging sequence ${kind}`);
  assert.equal(seq.enabled, false, `${kind} must stay disabled until pose-authored art is available`);
  assert.equal(seq.poseAuthored, false, `${kind} must not be marked pose-authored`);
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

for (const kind of ['idle','walk','walk-back','dash','jump','landing','stand-light','stand-heavy','hit','hadoken','shoryuken']) {
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
assert.equal(kenManifest.frameTotal, 137);
assert.equal(kenManifest.records.length, 15);
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
  assert.equal(dim.width, 384 * rec.frames, `KEN ${rec.id} strip width mismatch`);
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
  assert.equal(extraManifest.frameTotal, id === 'CHUNLI' ? 150 : 57);
  const activeFrames = extraManifest.records.filter(rec => rec.enabled).reduce((sum, rec) => sum + rec.frames, 0);
  assert.equal(extraManifest.enabledFrameTotal, activeFrames);
  assert.equal(enabledAnimationSequenceFrameTotal(id), activeFrames);
  assert.equal(extraManifest.records.length, id === 'CHUNLI' ? 15 : 7);
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
assert.equal(sampled?.sequence.kind, 'dash', 'Chun-Li dash must use its authored motion instead of walking');
assert.equal(sampled.frame, 0);
chunli.dashFrames = 1;
sampled = animationSequenceSample(chunli, .1);
assert.equal(sampled?.sequence.kind, 'dash');
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
assert.equal(sampled, null, 'non-authored attack pilot must stay disabled');

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

console.log('ANIMATION_SEQUENCE_VERIFY_PASS', {
  candidate: manifest.candidate,
  source: `${hqDim.width}x${hqDim.height} HQ ORIGINAL`,
  lite: `${liteDim.width}x${liteDim.height}`,
  frameTotal: manifest.frameTotal,
  kenFrameTotal: kenManifest.frameTotal,
  chunliFrameTotal: 150,
  ibukiFrameTotal: 57,
  enabledFrameTotal: manifest.enabledFrameTotal,
  strips: manifest.records.length,
  payloadKb: Math.round(totalBytes / 1024),
  alpha: true,
  verdict: 'HQ_ANIMATION_ASSET_QUALITY_PASS',
});
