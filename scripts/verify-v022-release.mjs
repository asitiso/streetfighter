import assert from 'node:assert/strict';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { campaignTotals, formatClearTime } from '../dist/assets/game/StageResult.js';
import { DEFAULT_SAVE, createPortableSave, decodePortableSave, decodeSaveRecord, encodeSaveRecord } from '../dist/assets/save/SaveManager.js';
import { ResultsScene } from '../dist/assets/scenes/ResultsScene.js';
import { endingProfileCount, endingProfileFor } from '../dist/assets/game/EndingProfiles.js';

class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio {
  playStagePulse(){} playHit(){} playParry(){} startStageSoundscape(){} setStageIntensity(){} playStageBeat(){}
  playAirHit(){} playCommandHit(){} playTargetHit(){} playBlock(){} playThrowEscape(){} playSuperStart(){}
  playSuperImpact(){} playBossCue(){} playKo(){} stopSoundscape(){}
}

const ids = ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'];
assert.equal(endingProfileCount(), 8, 'all eight playable characters need an ending');
const endings = ids.map(endingProfileFor);
assert.equal(new Set(endings.map((ending) => ending.title)).size, 8, 'ending titles should be character-specific');
assert.equal(new Set(endings.map((ending) => ending.closing)).size, 8, 'ending closing lines should be character-specific');
assert.ok(endings.every((ending) => ending.epilogue.length === 3), 'each ending needs a three-beat epilogue');

const sample = [
  { stageId: 1, clearSeconds: 120, defeatedEnemies: 11, damageDealt: 1200, damageTaken: 300, maxComboHits: 4, maxComboDamage: 260, parries: 5, redParries: 1, supersUsed: 2, throwsLanded: 1 },
  { stageId: 2, clearSeconds: 140, defeatedEnemies: 11, damageDealt: 1400, damageTaken: 420, maxComboHits: 7, maxComboDamage: 410, parries: 7, redParries: 0, supersUsed: 3, throwsLanded: 2 },
];
const totals = campaignTotals(sample);
assert.equal(totals.clearSeconds, 260);
assert.equal(totals.defeatedEnemies, 22);
assert.equal(totals.damageDealt, 2600);
assert.equal(totals.damageTaken, 720);
assert.equal(totals.maxComboHits, 7);
assert.equal(totals.maxComboDamage, 410);
assert.equal(totals.parries, 12);
assert.equal(formatClearTime(260), '04:20');

const ryu = getCharacter('RYU');
let result = null;
const scene = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], 1, (record) => { result = record; });
scene.introFrames = 0;
scene.elapsedCombatFrames = 3600;
scene.defeatedEnemies = 10;
scene.world.belt.score = 3400;
scene.prepareDuel();
scene.world.totalPlayerDamage = 1550;
scene.world.totalEnemyDamage = 380;
scene.world.maxPlayerComboHits = 6;
scene.world.maxPlayerComboDamage = 340;
scene.world.playerParries = 9;
scene.world.playerRedParries = 2;
scene.world.playerSupersUsed = 3;
scene.world.playerThrowsLanded = 4;
scene.phase = 'clear';
scene.phaseFrames = 1;
scene.fixedUpdate(1/60, 999);
assert.ok(result, 'stage clear should dispatch a battle record');
assert.equal(result.stageId, 1);
assert.equal(result.clearSeconds, 60);
assert.equal(result.defeatedEnemies, 11);
assert.equal(result.damageDealt, 1550);
assert.equal(result.damageTaken, 380);
assert.equal(result.maxComboHits, 6);
assert.equal(result.parries, 9);
assert.equal(result.redParries, 2);
assert.equal(result.supersUsed, 3);
assert.equal(result.throwsLanded, 4);

assert.equal(result.beltScore, 3400, 'Belt score survives the boss world handoff');
const legacy = { ...DEFAULT_SAVE, stageResults: [sample[0]] };
assert.deepEqual(decodeSaveRecord(encodeSaveRecord(legacy)).save, legacy, 'Old stage records retain the checksum shape');
const scored = { ...legacy, stageResults: [sample[0], { ...result, stageId: 2 }] };
assert.deepEqual(decodePortableSave(JSON.stringify(createPortableSave(scored))).save, scored, 'A new score survives portable export and import');
const labels = [];
const records = new ResultsScene(new StubInput(), new StubAudio(), scored.stageResults, () => {});
const tableContext = {
  fillText(value, x, y) { labels.push([value, x, y, Number(this.font.match(/(\d+)px/)[1])]); },
  fillRect() {}, beginPath() {}, roundRect() {}, fill() {},
};
records.drawStageTable(tableContext, true);
const [, scoreColumn, , scoreHeadingSize] = labels.find(([label]) => label === 'LAST SCORE');
assert(scoreHeadingSize >= 17, 'Compact touch score heading remains legible');
assert(labels.some(([label, x, y]) => label === '—' && x === scoreColumn && y === 280));
assert(labels.some(([label, x, y, size]) => label === '3400' && x === scoreColumn && y === 338 && size >= 19));
const [, bestScoreColumn] = labels.find(([label]) => label === 'BEST SCORE');
assert(labels.some(([label, x, y]) => label === '3400' && x === bestScoreColumn && y === 338), 'Legacy scores serve as both latest and best');
labels.length = 0;
const scoreHistory = new ResultsScene(new StubInput(), new StubAudio(), scored.stageResults, () => {},
  undefined, 0, false, undefined, {2: {latest: 0, best: 4100}});
scoreHistory.drawStageTable(tableContext, true);
assert(labels.some(([label, x, y]) => label === '0' && x === scoreColumn && y === 338), 'A saved zero is a valid latest score');
assert(labels.some(([label, x, y]) => label === '4100' && x === bestScoreColumn && y === 338), 'Personal best remains distinct from the latest score');

for (const [score, previous, isNew] of [[0, undefined, true], [2900, {latest:4100,best:5000}, false],
  [5000, {latest:2900,best:5000}, false], [5001, {latest:2900,best:5000}, true]]) {
  const outcome = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], 1,
    undefined, undefined, undefined, undefined, previous);
  const paints = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (text, x, y) => paints.push({text,x,y}) : () => {} });
  outcome.drawStageScoreComparison(ctx, score, 1);
  assert(paints.some(p => p.text === String(score) && p.x === 435));
  assert(paints.some(p => p.text === (previous ? String(previous.latest) : '—') && p.x === 640));
  assert(paints.some(p => p.text === (previous ? String(previous.best) : '—') && p.x === 845));
  assert.equal(paints.some(p => p.text === 'NEW RECORD'), isNew);
}

console.log('V022_RELEASE_VERIFY_PASS', {
  endings: endingProfileCount(),
  uniqueEndingTitles: new Set(endings.map((ending) => ending.title)).size,
  sampleCampaignTime: formatClearTime(totals.clearSeconds),
  stageRecord: result,
});
