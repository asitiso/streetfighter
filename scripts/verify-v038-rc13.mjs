import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';
import { RuntimeTelemetry } from '../dist/assets/core/RuntimeTelemetry.js';
import { automaticCertificationUpdates } from '../dist/assets/core/DeviceCertification.js';

assert.match(RELEASE_CANDIDATE, /^0\.0\.\d+-rc\.\d+$/);
assert.match(GAME_CACHE_NAME, /^game-cache-v\d+$/);

function runTelemetry({ firstFps = 60, recentFps = 56, seconds = 610 } = {}) {
  const telemetry = new RuntimeTelemetry();
  for (let second = 0; second < seconds; second += 1) {
    const fps = second >= seconds - 120 ? recentFps : firstFps;
    for (let frame = 0; frame < fps; frame += 1) telemetry.sampleFrame(1 / fps);
    if (second % 2 === 0) telemetry.noteHeapSample(120 + second * 0.002);
  }
  return telemetry.snapshot();
}

const stable = runTelemetry();
assert.equal(stable.sustainedStability, 'good');
assert.ok(stable.baselineFps != null && stable.baselineFps >= 59);
assert.ok(stable.recentFps != null && stable.recentFps >= 55);
assert.ok(stable.sustainedDegradationPct != null && stable.sustainedDegradationPct > 5 && stable.sustainedDegradationPct < 10);

const degraded = runTelemetry({ recentFps: 38 });
assert.equal(degraded.sustainedStability, 'poor');
assert.ok((degraded.sustainedDegradationPct ?? 0) > 30);

const updates = automaticCertificationUpdates({
  standalone: true,
  bootedOffline: true,
  audioReady: true,
  sessionSeconds: stable.sessionSeconds,
  frameStability: stable.stability,
  memoryStability: stable.memoryStability,
  sustainedStability: stable.sustainedStability,
  baselineFps: stable.baselineFps,
  recentFps: stable.recentFps,
  sustainedDegradationPct: stable.sustainedDegradationPct,
  qualityChanges: stable.qualityChanges,
  heapTrendMbPerMin: stable.heapTrendMbPerMin,
});
const endurance = updates.find((item) => item.id === 'ten-minute-play');
assert.equal(endurance?.status, 'check');
assert.ok(endurance?.note.includes('runtime clear'));
assert.ok(endurance?.note.includes('confirm device heat'));

const telemetrySource = await readFile(new URL('../src/core/RuntimeTelemetry.ts', import.meta.url), 'utf8');
for (const token of ['fpsTimeline', 'baselineFps', 'recentFps', 'sustainedDegradationPct', 'sustainedStability', 'this.totalSeconds >= 600']) {
  assert.ok(telemetrySource.includes(token), `missing endurance telemetry ${token}`);
}

const sceneSource = await readFile(new URL('../src/scenes/DeviceCertificationScene.ts', import.meta.url), 'utf8');
for (const token of ['confirmTenMinuteHeat', '10 MIN ENDURANCE AUDIT', 'HP = CONFIRM DEVICE HEAT OK', 'MANUAL HEAT OK + AUTO 10m', 'HEAT CONFIRM BLOCKED']) {
  assert.ok(sceneSource.includes(token), `missing endurance certification UI ${token}`);
}

const appSource = await readFile(new URL('../src/core/GameApp.ts', import.meta.url), 'utf8');
for (const token of ['getTelemetry: () => this.telemetry.snapshot()', 'sustainedStability: telemetry.sustainedStability', 'sustainedDegradationPct: telemetry.sustainedDegradationPct']) {
  assert.ok(appSource.includes(token), `missing endurance runtime integration ${token}`);
}

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes(`const CACHE_VERSION = '${GAME_CACHE_NAME}'`));
const title = await readFile(new URL('../src/scenes/TitleScene.ts', import.meta.url), 'utf8');
assert.match(title, /V0\.0\.\d+-RC\d+/);

const result = {
  candidate: RELEASE_CANDIDATE,
  cache: GAME_CACHE_NAME,
  enduranceTelemetry: 'BASELINE_60_TO_180S_VS_RECENT_120S',
  sustainedPerformance: stable.sustainedStability,
  stableBaselineFps: stable.baselineFps,
  stableRecentFps: stable.recentFps,
  stableDegradationPct: stable.sustainedDegradationPct,
  degradedScenario: degraded.sustainedStability,
  heatPolicy: 'CODE_PROVES_RUNTIME_TREND_USER_CONFIRMS_PHYSICAL_HEAT_ONCE',
  verdict: 'TEN_MINUTE_ENDURANCE_AUDIT_PASS',
};
await writeFile(new URL('../RC13_AUTOMATED_ACCEPTANCE.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('V038_RC13_PASS', result);
