import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { Stage2Scene } from '../dist/assets/scenes/Stage2Scene.js';
import { Stage3Scene } from '../dist/assets/scenes/Stage3Scene.js';
import { Stage4Scene } from '../dist/assets/scenes/Stage4Scene.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class StubInput {
  constructor() { this.heldActions = new Set(); this.pressedActions = new Set(); }
  held(action) { return this.heldActions.has(action); }
  pressed(action) { return this.pressedActions.has(action); }
  released() { return false; }
  press(action) { this.pressedActions.add(action); }
  clear() { this.pressedActions.clear(); }
}
class StubAudio { playStagePulse() {} playHit() {} playParry() {} }
const fail = (message) => { console.error('STAGE_FLOW_FAIL', message); process.exit(1); };

function clearBeltAreas(scene, tickBase = 1) {
  let tick = tickBase;
  const waveProfiles = [];
  for (let wave = 0; wave < 3; wave += 1) {
    waveProfiles.push(scene.world.enemies.map((enemy) => enemy.aiProfile.id));
    const count = scene.world.enemies.length;
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) {
      if (scene.phase !== 'belt' || scene.beltState !== 'travel') fail(`expected travel after wave ${wave + 1}`);
      scene.world.player.x = scene.areaStarts[wave + 1] + 160;
      scene.fixedUpdate(1 / 60, tick++);
      if (scene.world.livingEnemies.length === 0) fail(`next area ${wave + 2} did not spawn`);
      for (let t = 0; t < 54; t += 1) scene.fixedUpdate(1 / 60, tick++);
      if (scene.beltState !== 'fight') fail(`area ${wave + 2} fight did not arm`);
    }
    if (count <= 0) fail(`wave ${wave + 1} had no enemies`);
  }
  if (scene.phase !== 'transition') fail(`expected transition, got ${scene.phase}`);
  for (let t = 0; t < 320 && scene.phase === 'transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel' || scene.world.rules.mode !== 'duel') fail('duel not activated');
  if (scene.stageTime < 98.9) fail(`duel timer did not reset: ${scene.stageTime}`);
  const boss = scene.world.enemy.character.name;
  scene.world.enemy.hp = 0;
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'clear') fail('clear not activated');
  return { waveProfiles, boss, tick };
}

function testStage(scene, name, tickBase, expectations = () => {}) {
  scene.introFrames = 0;
  const result = clearBeltAreas(scene, tickBase);
  expectations(result, scene);
  for (let i = 0; i < 280 && scene.phase === 'clear'; i += 1) scene.fixedUpdate(1 / 60, result.tick + i);
  return result;
}


function clearStage5(scene, tickBase = 4000) {
  let tick = tickBase;
  const waveProfiles = [];
  for (let wave = 0; wave < 3; wave += 1) {
    waveProfiles.push(scene.world.enemies.map((enemy) => enemy.aiProfile.id));
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) {
      scene.world.player.x = scene.areaStarts[wave + 1] + 160;
      scene.fixedUpdate(1 / 60, tick++);
      for (let t = 0; t < 54; t += 1) scene.fixedUpdate(1 / 60, tick++);
    }
  }
  if (scene.phase !== 'transition') fail(`stage5 expected Urien transition, got ${scene.phase}`);
  for (let t = 0; t < 320 && scene.phase === 'transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel' || scene.world.enemy.character.name !== 'URIEN') fail('stage5 Urien duel missing');
  scene.world.enemy.hp = 0;
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'final-transition') fail(`stage5 final transition missing: ${scene.phase}`);
  for (let t = 0; t < 330 && scene.phase === 'final-transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'final-duel' || scene.world.enemy.character.name !== 'GILL') fail('stage5 Gill final duel missing');
  if (scene.world.enemy.maxHp < 1400) fail('Gill final boss HP budget too low');
  scene.world.enemy.hp = Math.round(scene.world.enemy.maxHp * .64);
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.gillPhase !== 2 || scene.world.enemy.aiTempoScale < 1.19 || scene.world.enemy.superGauge < 100) fail('Gill phase 2 transition missing');
  scene.world.enemy.hp = Math.round(scene.world.enemy.maxHp * .28);
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.gillPhase !== 3 || scene.world.enemy.aiTempoScale < 1.3 || scene.world.enemy.aiSuperBias < .4) fail('Gill final segment transition missing');
  scene.world.enemy.hp = 0;
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'final-ko') fail(`stage5 final KO sequence missing: ${scene.phase}`);
  for (let t = 0; t < 181; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'clear') fail(`stage5 clear bridge missing: ${scene.phase}`);
  return { waveProfiles, tick };
}

const character = getCharacter('RYU');

let defeatCallback = false;
const defeatInput = new StubInput();
const defeatScene = new Stage1Scene(defeatInput, new StubAudio(), character, character.superArts[0], 1, undefined, () => { defeatCallback = true; });
defeatScene.introFrames = 0;
defeatScene.world.player.hp = 0;
defeatScene.fixedUpdate(1 / 60, 9000);
if (defeatScene.phase !== 'defeat') fail(`player KO did not enter defeat phase: ${defeatScene.phase}`);
for (let i = 0; i < 121; i += 1) defeatScene.fixedUpdate(1 / 60, 9001 + i);
if (defeatCallback) fail('player KO retried without user input');
defeatInput.press('start');
defeatScene.fixedUpdate(1 / 60, 9200);
defeatInput.clear();
if (!defeatCallback) fail('player KO retry input did not dispatch callback');

const doubleKoInput = new StubInput();
const doubleKoScene = new Stage1Scene(doubleKoInput, new StubAudio(), character, character.superArts[0], 1);
doubleKoScene.introFrames = 0;
doubleKoScene.world.player.hp = 0;
for (const enemy of doubleKoScene.world.enemies) enemy.hp = 0;
doubleKoScene.fixedUpdate(1 / 60, 9250);
if (doubleKoScene.phase !== 'defeat' || doubleKoScene.defeatReason !== 'double-ko') fail('double KO did not enter explicit retry state');

const timeoutInput = new StubInput();
const timeoutScene = new Stage1Scene(timeoutInput, new StubAudio(), character, character.superArts[0], 1);
timeoutScene.introFrames = 0;
timeoutScene.stageTime = .001;
timeoutScene.fixedUpdate(1 / 60, 9260);
if (timeoutScene.phase !== 'defeat' || timeoutScene.defeatReason !== 'time-over') fail('time over did not enter retry state');

const travelTimerInput = new StubInput();
const travelTimerScene = new Stage1Scene(travelTimerInput, new StubAudio(), character, character.superArts[0], 1);
travelTimerScene.introFrames = 0;
travelTimerScene.beltState = 'travel';
travelTimerScene.world.enemies.length = 0;
travelTimerScene.world.player.x = 100;
travelTimerScene.stageTime = 50;
travelTimerScene.fixedUpdate(1 / 60, 9270);
if (travelTimerScene.stageTime !== 50) fail('belt travel incorrectly consumed combat timer');

const jumpInput = new StubInput();
const jumpScene = new Stage1Scene(jumpInput, new StubAudio(), character, character.superArts[0], 1);
jumpScene.introFrames = 0;
jumpInput.press('jump');
jumpInput.press('lp');
jumpScene.fixedUpdate(1 / 60, 9300);
jumpInput.clear();
if (!jumpScene.world.player.airborne) fail('belt-mode dedicated jump input failed');
if (!jumpScene.world.player.currentMove || jumpScene.world.player.currentMove.technique !== 'air') fail('jump + attack did not start an air normal');

const pauseInput = new StubInput();
const pauseScene = new Stage1Scene(pauseInput, new StubAudio(), character, character.superArts[0], 1);
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9399);
pauseInput.clear();
if (pauseScene.paused) fail('START paused during stage intro');
pauseScene.introFrames = 0;
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9400);
pauseInput.clear();
if (!pauseScene.paused) fail('START did not pause stage');
const pausedTime = pauseScene.stageTime;
for (let i = 0; i < 10; i += 1) pauseScene.fixedUpdate(1 / 60, 9401 + i);
if (pauseScene.stageTime !== pausedTime) fail('stage timer advanced while paused');
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9412);
pauseInput.clear();
if (pauseScene.paused) fail('START did not resume stage');

let clear1 = false, clear2 = false, clear3 = false, clear4 = false, clear5 = false;
const stage1 = new Stage1Scene(new StubInput(), new StubAudio(), character, character.superArts[0], 1, () => { clear1 = true; });
const r1 = testStage(stage1, 'stage1', 1);
if (!clear1) fail('stage 1 callback');

const stage2 = new Stage2Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear2 = true; });
const r2 = testStage(stage2, 'stage2', 1000, (r) => { if (!r.waveProfiles.flat().includes('agile')) fail('stage2 agile missing'); });
if (!clear2) fail('stage 2 callback');

const stage3 = new Stage3Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear3 = true; });
const r3 = testStage(stage3, 'stage3', 2000, (r) => {
  if (!r.waveProfiles.flat().includes('technical')) fail('stage3 technical AI missing');
  if (r.boss !== 'MAKOTO') fail(`stage3 boss expected MAKOTO, got ${r.boss}`);
});
if (!clear3) fail('stage 3 callback');

const stage4 = new Stage4Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear4 = true; });
const r4 = testStage(stage4, 'stage4', 3000, (r) => {
  if (!r.waveProfiles.flat().includes('mma')) fail('stage4 MMA AI missing');
  if (r.boss !== 'DUDLEY') fail(`stage4 boss expected DUDLEY, got ${r.boss}`);
});
if (!clear4) fail('stage 4 callback');



const stage5 = new Stage5Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear5 = true; });
stage5.introFrames = 0;
const r5 = clearStage5(stage5, 4000);
if (!r5.waveProfiles.flat().includes('technical') || !r5.waveProfiles.flat().includes('mma')) fail('stage5 advanced AI mix missing');
for (let i = 0; i < 300 && stage5.phase === 'clear'; i += 1) stage5.fixedUpdate(1 / 60, r5.tick + i);
if (!clear5) fail('stage 5 callback');

console.log('STAGE_FLOW_VERIFY_PASS', {
  stagesPlayable: 5,
  callbacks: [clear1, clear2, clear3, clear4, clear5],
  bosses: [r1.boss, r2.boss, r3.boss, r4.boss],
  stage3Technical: r3.waveProfiles.flat().filter((x) => x === 'technical').length,
  stage4Mma: r4.waveProfiles.flat().filter((x) => x === 'mma').length,
  stage5FinalBoss: 'GILL',
  gillPhases: 3,
  playerKoRetry: defeatCallback,
  doubleKo: doubleKoScene.defeatReason,
  timeOver: timeoutScene.defeatReason,
  travelTimerPaused: travelTimerScene.stageTime === 50,
  beltJump: jumpScene.world.player.airborne,
  jumpAttack: jumpScene.world.player.currentMove?.technique === 'air',
  pauseResume: !pauseScene.paused,
});
