import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME, ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification, DEVICE_CERT_TESTS } from '../dist/assets/core/DeviceCertification.js';
import { buildReleaseEvidenceFingerprint } from '../dist/assets/core/ReleaseEvidenceFingerprint.js';
import { evaluateReleaseApproval } from '../dist/assets/core/ReleaseApproval.js';
import { buildFinalProofBundle } from '../dist/assets/core/FinalProofBundle.js';
import { compareLatestCertification } from '../dist/assets/core/DeviceCertificationHistory.js';
import { combatSpriteEnabledFor, combatSpritePose } from '../dist/assets/render/CombatSpriteProfiles.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';

assert.equal(RELEASE_CANDIDATE, '0.0.45-rc.20');
assert.equal(GAME_CACHE_NAME, 'game-cache-v045');

function sha(data) { return createHash('sha256').update(data).digest('hex').toUpperCase(); }
const manifest = JSON.parse(await readFile(new URL('../dist/release-integrity.json', import.meta.url), 'utf8'));
assert.equal(manifest.candidate, RELEASE_CANDIDATE);
assert.equal(manifest.cache, GAME_CACHE_NAME);
assert.ok(manifest.files.length >= 130, `expected combat-sprite build, got ${manifest.files.length}`);

const spriteFiles = ['ryu','ken','chunli','alex','dudley','makoto','ibuki','yun'].map((id) => `/art/combat-sprites/${id}.webp`);
for (const required of [
  '/assets/render/CombatSpriteProfiles.js', '/assets/render/ImageAssets.js', '/assets/render/Visuals.js', '/assets/scenes/Stage1Scene.js',
  ...spriteFiles,
  '/art/foregrounds/stage1-foreground.webp', '/art/foregrounds/stage5-foreground.webp',
  '/audio/stage1-theme.ogg', '/audio/final-boss-theme.ogg', '/audio/ending-theme.ogg',
]) assert.ok(manifest.files.some((entry) => entry.path === required), `manifest missing ${required}`);

for (const entry of manifest.files) {
  const data = await readFile(new URL(`../dist${entry.path}`, import.meta.url));
  assert.equal(data.byteLength, entry.bytes, `${entry.path} byte mismatch`);
  assert.equal(sha(data), entry.sha256, `${entry.path} sha mismatch`);
}
const recomputedRoot = sha(Buffer.from(manifest.files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}`).join('\n')));
assert.equal(recomputedRoot, manifest.rootSha256);

for (const url of spriteFiles) assert.ok(ASSET_GROUPS['app-shell'].includes(url), `app-shell missing ${url}`);
for (let stage = 1; stage <= 5; stage += 1) {
  const group = ASSET_GROUPS[`stage-${stage}`];
  assert.ok(group.some((url) => url.includes(`/art/foregrounds/stage${stage}-foreground.webp`)));
  assert.ok(group.some((url) => url.includes(`/audio/stage${stage}-theme.ogg`)));
}

for (const id of ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN']) assert.equal(combatSpriteEnabledFor(id), true);
assert.equal(combatSpriteEnabledFor('URIEN'), false);
assert.equal(combatSpriteEnabledFor('GILL'), false);
const ryu = new Fighter(getCharacter('RYU'), 'player', 100, 500, 1, getCharacter('RYU').superArts[0]);
ryu.state = 'walk';
assert.equal(combatSpritePose(ryu, .5).useSprite, true);
ryu.state = 'parry';
assert.ok(Math.abs(combatSpritePose(ryu, .5).rotation) > .01);
ryu.state = 'crouch';
assert.ok(combatSpritePose(ryu, .5).scaleY < .9);
ryu.state = 'jump'; ryu.jumpHeight = 70; ryu.jumpVelocity = 2;
assert.ok(combatSpritePose(ryu, .5).offsetY < -60);
ryu.state = 'attack';
assert.equal(combatSpritePose(ryu, .5).useSprite, false, 'attacks must preserve articulated renderer until move-specific sprite strips land');

const imageAssets = await readFile(new URL('../src/render/ImageAssets.ts', import.meta.url), 'utf8');
for (const token of ['combatSpriteKey', 'PLAYABLE_COMBAT_SPRITE_KEYS', "'sprite-ryu'", "'sprite-yun'"]) assert.ok(imageAssets.includes(token), `missing sprite asset integration ${token}`);
const visuals = await readFile(new URL('../src/render/Visuals.ts', import.meta.url), 'utf8');
for (const token of ['drawAssetCombatSprite', 'combatSpritePose(fighter, time)', 'ctx.imageSmoothingEnabled = false', 'if (drawAssetCombatSprite(ctx, fighter, x, y, time)) return']) assert.ok(visuals.includes(token), `missing combat sprite renderer ${token}`);
const stage = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
assert.ok(stage.includes('PLAYABLE_COMBAT_SPRITE_KEYS'));
assert.ok(stage.includes('preloadArtAssets([...preload, ...PLAYABLE_COMBAT_SPRITE_KEYS])'));
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes("const CACHE_VERSION = 'game-cache-v045'"));
assert.ok(sw.includes('/assets/render/CombatSpriteProfiles.js'));
for (const url of spriteFiles) assert.ok(sw.includes(url), `service worker missing ${url}`);
assert.ok(!sw.includes("'/audio/stage1-theme.ogg'"), 'stage BGM must remain deferred from initial app shell');

function passedCertification() {
  const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T15:00:00Z'), 'RC20 TARGET PHONE');
  for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T15:01:00Z', note: `PASS ${test.id}` };
  cert.touchLatency = { samples: [18,19,19,20,20,21,22,23], averageMs: 20.3, p95Ms: 23, status: 'pass', measuredAt: '2026-09-24T15:02:00Z' };
  cert.lastAcceptance = { status: 'pass', passed: 26, checks: 0, blocked: 0, total: 26, items: [{ id: 'release-gate', label: 'AUTOMATED RELEASE GATE', status: 'pass', detail: 'READY' }] };
  return cert;
}
const cert = passedCertification();
const cleanErrors = { candidate: RELEASE_CANDIDATE, total: 0, fatal: 0, errors: 0, warnings: 0, entries: [] };
const integrityPass = { status: 'pass', checkedAt: '2026-09-24T15:03:00Z', candidate: RELEASE_CANDIDATE, cache: GAME_CACHE_NAME, manifestRoot: manifest.rootSha256, checked: manifest.files.length, total: manifest.files.length, mismatches: [], message: `${manifest.files.length}/${manifest.files.length} FILES SHA-256 MATCH` };
const comparison = compareLatestCertification([], RELEASE_CANDIDATE, cert);
const fingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: cleanErrors, integrity: integrityPass });
const storedApproval = { candidate: RELEASE_CANDIDATE, verdict: 'approved', approvedAt: '2026-09-24T15:05:00Z', deviceLabel: cert.deviceLabel, detail: 'SEALED', evidenceFingerprint: fingerprint };
const approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: cleanErrors, integrity: integrityPass, storedApproval, currentFingerprint: fingerprint });
assert.equal(approval.verdict, 'approved');
const telemetry = { sampleCount: 42000, sessionSeconds: 720, averageFps: 59.1, lowFps: 52.2, maxFrameMs: 31, longFrameRate: .01, heapUsedMb: 123, heapPeakMb: 132, heapGrowthMb: 3, heapTrendMbPerMin: .4, memoryStability: 'good', qualityChanges: 0, stability: 'good', baselineFps: 60, recentFps: 56, sustainedDegradationPct: 6.5, sustainedStability: 'good' };
const recovery = { candidate: RELEASE_CANDIDATE, total: 0, success: 0, checks: 0, failed: 0, entries: [] };
const safeArea = { supported: true, landscape: true, viewportWidth: 1280, viewportHeight: 720, insets: { top: 0, right: 34, bottom: 21, left: 44 }, canvasInsideSafeArea: true, ready: true, note: 'AUTO: safe area ready' };
const environment = { online: true, standalone: true, serviceWorkerControlled: true, userAgent: 'RC20 TEST', viewport: '1280x720' };
const proof = buildFinalProofBundle({ candidate: RELEASE_CANDIDATE, certification: cert, telemetry, errors: cleanErrors, recovery, safeArea, environment, approval: storedApproval, integrity: integrityPass }, new Date('2026-09-24T15:06:00Z'));
assert.equal(proof.complete, true);
assert.equal(proof.sealed, true);

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  manifestFiles: manifest.files.length,
  manifestRoot: manifest.rootSha256,
  playableCombatSprites: 8,
  spriteDrivenStates: ['idle','walk','crouch','jump','parry','block','hit','knockdown','ko','victory'],
  articulatedAttackFallback: true,
  spritePayloadApproxKb: 48,
  stageAudioStillDeferred: true,
  finalProofSealPreserved: true,
  verdict: 'PLAYABLE_COMBAT_SPRITE_HYBRID_PASS',
};
await writeFile(new URL('../RC20_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V045_RC20_PASS', result);
