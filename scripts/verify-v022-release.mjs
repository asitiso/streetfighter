import assert from 'node:assert/strict';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { campaignTotals, formatClearTime } from '../dist/assets/game/StageResult.js';
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

console.log('V022_RELEASE_VERIFY_PASS', {
  endings: endingProfileCount(),
  uniqueEndingTitles: new Set(endings.map((ending) => ending.title)).size,
  sampleCampaignTime: formatClearTime(totals.clearSeconds),
  stageRecord: result,
});
