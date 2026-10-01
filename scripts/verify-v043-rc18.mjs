import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME, ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';
import { createDeviceCertification, DEVICE_CERT_TESTS } from '../dist/assets/core/DeviceCertification.js';
import { buildReleaseEvidenceFingerprint } from '../dist/assets/core/ReleaseEvidenceFingerprint.js';
import { evaluateReleaseApproval } from '../dist/assets/core/ReleaseApproval.js';
import { buildFinalProofBundle } from '../dist/assets/core/FinalProofBundle.js';
import { buildAcceptanceMatrix } from '../dist/assets/core/AcceptanceMatrix.js';
import { compareLatestCertification } from '../dist/assets/core/DeviceCertificationHistory.js';

assert.equal(RELEASE_CANDIDATE, '0.0.43-rc.18');
assert.equal(GAME_CACHE_NAME, 'game-cache-v043');

function sha(data) { return createHash('sha256').update(data).digest('hex').toUpperCase(); }
const manifest = JSON.parse(await readFile(new URL('../dist/release-integrity.json', import.meta.url), 'utf8'));
assert.equal(manifest.schema, 1);
assert.equal(manifest.candidate, RELEASE_CANDIDATE);
assert.equal(manifest.cache, GAME_CACHE_NAME);
assert.ok(manifest.files.length >= 98);
for (const required of [
  '/index.html', '/manifest.webmanifest', '/sw.js', '/assets/main.js', '/assets/core/GameApp.js', '/assets/render/ImageAssets.js',
  '/assets/scenes/CharacterSelectScene.js', '/assets/scenes/SuperArtSelectScene.js', '/assets/scenes/Stage1Scene.js',
  '/art/title-keyart.png', '/art/roster-mural.png', '/art/stage1-newyork.png', '/art/stage5-secretsociety.png', '/art/ending-keyart.png',
  '/art/portraits/ryu.webp', '/art/portraits/ken.webp', '/art/portraits/chunli.webp', '/art/portraits/alex.webp',
  '/art/portraits/dudley.webp', '/art/portraits/makoto.webp', '/art/portraits/ibuki.webp', '/art/portraits/yun.webp',
  '/art/portraits/urien.webp', '/art/portraits/gill.webp',
]) assert.ok(manifest.files.some((entry) => entry.path === required), `manifest missing ${required}`);
for (const entry of manifest.files) {
  const data = await readFile(new URL(`../dist${entry.path}`, import.meta.url));
  assert.equal(data.byteLength, entry.bytes, `${entry.path} byte mismatch`);
  assert.equal(sha(data), entry.sha256, `${entry.path} sha mismatch`);
}
const recomputedRoot = sha(Buffer.from(manifest.files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}`).join('\n')));
assert.equal(recomputedRoot, manifest.rootSha256);

assert.ok(ASSET_GROUPS['app-shell'].includes('/art/portraits/ryu.webp'));
assert.ok(ASSET_GROUPS['app-shell'].includes('/art/portraits/yun.webp'));
assert.ok(ASSET_GROUPS['stage-5'].includes('/art/portraits/gill.webp'));
assert.ok(ASSET_GROUPS['stage-5'].includes('/art/portraits/urien.webp'));

function passedCertification() {
  const cert = createDeviceCertification(RELEASE_CANDIDATE, new Date('2026-09-24T13:00:00Z'), 'RC18 TARGET PHONE');
  for (const test of DEVICE_CERT_TESTS) cert.tests[test.id] = { status: 'pass', updatedAt: '2026-09-24T13:01:00Z', note: `PASS ${test.id}` };
  cert.touchLatency = { samples: [18,18,19,20,20,21,22,23], averageMs: 20.1, p95Ms: 23, status: 'pass', measuredAt: '2026-09-24T13:02:00Z' };
  cert.lastAcceptance = { status: 'pass', passed: 25, checks: 0, blocked: 0, total: 25, items: [{ id: 'release-gate', label: 'AUTOMATED RELEASE GATE', status: 'pass', detail: 'READY' }] };
  return cert;
}
const cleanErrors = { candidate: RELEASE_CANDIDATE, total: 0, fatal: 0, errors: 0, warnings: 0, entries: [] };
const integrityPass = { status: 'pass', checkedAt: '2026-09-24T13:03:00Z', candidate: RELEASE_CANDIDATE, cache: GAME_CACHE_NAME, manifestRoot: manifest.rootSha256, checked: manifest.files.length, total: manifest.files.length, mismatches: [], message: `${manifest.files.length}/${manifest.files.length} FILES SHA-256 MATCH` };
const integrityFail = { ...integrityPass, status: 'fail', checkedAt: '2026-09-24T13:04:00Z', mismatches: ['/assets/main.js SHA256 BAD'], message: '1 DEPLOYED FILE MISMATCH(ES)' };
const cert = passedCertification();
const comparison = compareLatestCertification([], RELEASE_CANDIDATE, cert);
const passFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: cleanErrors, integrity: integrityPass });
const repeatFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: cleanErrors, integrity: { ...integrityPass, checkedAt: '2026-09-24T14:00:00Z' } });
const failFingerprint = buildReleaseEvidenceFingerprint({ candidate: RELEASE_CANDIDATE, certification: cert, errors: cleanErrors, integrity: integrityFail });
assert.equal(passFingerprint, repeatFingerprint);
assert.notEqual(passFingerprint, failFingerprint);

const untested = { status: 'untested', checkedAt: null, candidate: null, cache: null, manifestRoot: null, checked: 0, total: 0, mismatches: [], message: 'NOT CHECKED' };
let approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: cleanErrors, integrity: untested });
assert.equal(approval.verdict, 'blocked');
approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: cleanErrors, integrity: integrityFail });
assert.equal(approval.verdict, 'blocked');
const storedApproval = { candidate: RELEASE_CANDIDATE, verdict: 'approved', approvedAt: '2026-09-24T13:05:00Z', deviceLabel: cert.deviceLabel, detail: 'SEALED', evidenceFingerprint: passFingerprint };
approval = evaluateReleaseApproval({ candidate: RELEASE_CANDIDATE, acceptance: cert.lastAcceptance, certification: cert, comparison, errors: cleanErrors, integrity: integrityPass, storedApproval, currentFingerprint: passFingerprint });
assert.equal(approval.verdict, 'approved');

const telemetry = { sampleCount: 42000, sessionSeconds: 720, averageFps: 59.1, lowFps: 52.2, maxFrameMs: 31, longFrameRate: .01, heapUsedMb: 123, heapPeakMb: 132, heapGrowthMb: 3, heapTrendMbPerMin: .4, memoryStability: 'good', qualityChanges: 0, stability: 'good', baselineFps: 60, recentFps: 56, sustainedDegradationPct: 6.5, sustainedStability: 'good' };
const recovery = { candidate: RELEASE_CANDIDATE, total: 0, success: 0, checks: 0, failed: 0, entries: [] };
const safeArea = { supported: true, landscape: true, viewportWidth: 1280, viewportHeight: 720, insets: { top: 0, right: 34, bottom: 21, left: 44 }, canvasInsideSafeArea: true, ready: true, note: 'AUTO: safe area ready' };
const environment = { online: true, standalone: true, serviceWorkerControlled: true, userAgent: 'RC18 TEST', viewport: '1280x720' };
let proof = buildFinalProofBundle({ candidate: RELEASE_CANDIDATE, certification: cert, telemetry, errors: cleanErrors, recovery, safeArea, environment, approval: storedApproval, integrity: integrityPass }, new Date('2026-09-24T13:06:00Z'));
assert.equal(proof.complete, true);
assert.equal(proof.sealed, true);
proof = buildFinalProofBundle({ candidate: RELEASE_CANDIDATE, certification: cert, telemetry, errors: cleanErrors, recovery, safeArea, environment, approval: storedApproval, integrity: integrityFail }, new Date('2026-09-24T13:07:00Z'));
assert.equal(proof.complete, false);
assert.equal(proof.sealed, false);

const gate = { verdict: 'ready', blockers: [], warnings: [] };
const saveHealth = { source: 'primary', repaired: false, backupReady: true, issues: [] };
const matrix = buildAcceptanceMatrix({ gate, saveHealth, portableSaveReady: true, updatePlan: { safe: true, staleGameCaches: [], preservedCaches: [], saveDbName: 'save', nextCacheName: GAME_CACHE_NAME }, offline: { ready: true, cached: 1, total: 1, missing: [] }, transitions: null, loadingRecoveryReady: true, serviceWorkerSupported: true, serviceWorkerControlled: true, standalone: true, landscape: true, telemetry, deviceCertification: cert, errorJournal: cleanErrors, sessionRecoveryReady: true, updateAutoRecoveryReady: true, releaseIntegrity: integrityPass });
assert.ok(matrix.items.some((item) => item.id === 'release-integrity' && item.status === 'pass'));

const imageAssets = await readFile(new URL('../src/render/ImageAssets.ts', import.meta.url), 'utf8');
for (const token of ['PLAYABLE_PORTRAIT_KEYS', "'portrait-gill'", 'characterPortraitKey']) assert.ok(imageAssets.includes(token), `missing RC18 image asset token ${token}`);
const select = await readFile(new URL('../src/scenes/CharacterSelectScene.ts', import.meta.url), 'utf8');
for (const token of ['PLAYABLE_PORTRAIT_KEYS', 'this.drawPortraitCover', 'characterPortraitKey(character.id)']) assert.ok(select.includes(token), `missing RC18 select integration ${token}`);
const superArt = await readFile(new URL('../src/scenes/SuperArtSelectScene.ts', import.meta.url), 'utf8');
for (const token of ['characterPortraitKey(this.character.id)', 'this.drawPortraitCover(ctx, portraitImage, 0, 0, 550, 720, .08)', "startFrontendTheme?.('select')"]) assert.ok(superArt.includes(token), `missing RC18 super art integration ${token}`);
const stage = await readFile(new URL('../src/scenes/Stage1Scene.ts', import.meta.url), 'utf8');
for (const token of ['drawPortraitIntroCard', 'characterPortraitKey(this.playerDef.id)', 'preloadArtAssets(preload)']) assert.ok(stage.includes(token), `missing RC18 stage intro integration ${token}`);
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes("const CACHE_VERSION = 'game-cache-v043'"));
for (const token of ['/art/portraits/ryu.webp', '/art/portraits/gill.webp']) assert.ok(sw.includes(token), `missing RC18 sw asset ${token}`);

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  manifestFiles: manifest.files.length,
  manifestRoot: manifest.rootSha256,
  manifestRecomputed: recomputedRoot === manifest.rootSha256,
  characterPortraitAssetsBundled: true,
  characterSelectPortraitsIntegrated: true,
  superArtPortraitsIntegrated: true,
  stageIntroPortraitIntegrated: true,
  releaseSealStable: true,
  verdict: 'CHARACTER_ART_RELEASE_SEAL_PASS',
};
await writeFile(new URL('../RC18_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V043_RC18_PASS', result);
