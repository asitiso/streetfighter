import { heldWeaponOf } from '../dist/assets/combat/BeltSystems.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { Stage2Scene } from '../dist/assets/scenes/Stage2Scene.js';
import { Stage3Scene } from '../dist/assets/scenes/Stage3Scene.js';
import { Stage4Scene } from '../dist/assets/scenes/Stage4Scene.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { advanceThroughBeltLoot, winDuelMatch } from './duel-round-helpers.mjs';

class StubInput {
  constructor() { this.heldActions = new Set(); this.pressedActions = new Set(); this.releasedActions = new Set(); }
  held(action) { return this.heldActions.has(action); }
  pressed(action) { return this.pressedActions.has(action); }
  released(action) { return this.releasedActions.has(action); }
  press(action) { this.pressedActions.add(action); }
  clear() { this.pressedActions.clear(); this.releasedActions.clear(); }
}
class StubAudio {
  constructor() { this.paused = false; this.backgrounded = false; }
  playStagePulse() {}
  playHit() {}
  playParry() {}
  setPaused(value) { this.paused = value; }
  setBackgrounded(value) { this.backgrounded = value; }
}
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
  tick = advanceThroughBeltLoot(scene, tick);
  if (scene.phase !== 'transition') fail(`expected transition, got ${scene.phase}`);
  for (let t = 0; t < 320 && scene.phase === 'transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel' || scene.world.rules.mode !== 'duel') fail('duel not activated');
  if (scene.stageTime < 98.9) fail(`duel timer did not reset: ${scene.stageTime}`);
  const boss = scene.world.enemy.character.name;
  // V081: duels are best-of-3; the first KO only wins round 1.
  scene.world.enemy.hp = 0;
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel' || scene.playerRoundWins !== 1) fail('first duel KO should only win round 1');
  tick = winDuelMatch(scene, tick);
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
  tick = advanceThroughBeltLoot(scene, tick);
  if (scene.phase !== 'transition') fail(`stage5 expected Urien transition, got ${scene.phase}`);
  for (let t = 0; t < 320 && scene.phase === 'transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel' || scene.world.enemy.character.name !== 'URIEN') fail('stage5 Urien duel missing');
  tick = winDuelMatch(scene, tick);
  if (scene.phase !== 'final-transition') fail(`stage5 final transition missing: ${scene.phase}`);
  for (let t = 0; t < 330 && scene.phase === 'final-transition'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'final-duel' || scene.world.enemy.character.name !== 'GILL') fail('stage5 Gill final duel missing');
  if (scene.world.enemy.maxHp < 1400) fail('Gill final boss HP budget too low');
  scene.world.enemy.hp = Math.round(scene.world.enemy.maxHp * .64);
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.gillPhase !== 2 || scene.world.enemy.aiTempoScale < 1.19 || scene.world.enemy.superGauge < 100) fail('Gill phase 2 transition missing');
  for (let t = 0; t < 30 && scene.world.superFreezeFrames > 0; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.world.superFreezeFrames > 0) fail('Gill phase 2 super freeze did not finish');
  scene.world.enemy.hp = Math.round(scene.world.enemy.maxHp * .28);
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.gillPhase !== 3 || scene.world.enemy.aiTempoScale < 1.3 || scene.world.enemy.aiSuperBias < .4) fail('Gill final segment transition missing');
  tick = winDuelMatch(scene, tick);
  if (scene.phase !== 'final-ko') fail(`stage5 final KO sequence missing: ${scene.phase}`);
  for (let t = 0; t < 181; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'clear') fail(`stage5 clear bridge missing: ${scene.phase}`);
  return { waveProfiles, tick };
}

const character = getCharacter('RYU');

// Rewards stay available after the final KO, without a countdown or an accidental exit.
{
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0], 1);
  scene.introFrames = 0;
  scene.beltWave = 2;
  scene.spawnBeltWave(2);
  const { world } = scene;
  const player = world.player;
  player.x = world.rules.arenaRight;
  player.y = 490;
  player.hp = 400;
  world.belt.giveWeapon(player, 'pipe', 3);
  const food = world.belt.spawnPickup('chicken', player.x - 10, player.y);
  const knife = world.belt.spawnPickup('knife', player.x - 25, player.y, 4);
  food.z = food.vz = knife.z = knife.vz = 0;
  knife.age = knife.life - 3;
  for (const enemy of world.enemies) enemy.hp = 0;
  controls.heldActions.add('right');
  let tick = 18001;
  scene.fixedUpdate(1/60, tick++);
  if (scene.phase !== 'belt' || scene.beltState !== 'loot') fail('usable final-wave loot must stop the boss handoff');
  const clock = scene.stageTime;
  for (let i = 0; i < 80; i++) scene.fixedUpdate(1/60, tick++);
  if (scene.phase !== 'belt' || scene.stageTime !== clock || !world.belt.pickups.includes(knife)) fail('loot wait must preserve time and floor weapon even if right was held at the kill');
  controls.heldActions.clear();
  controls.press('lp');
  scene.fixedUpdate(1/60, tick++);
  controls.clear();
  if (player.hp !== 900 || player.currentMove || world.belt.pickups.includes(food)) fail('food can be collected in loot mode without attacking');
  controls.press('lp');
  scene.fixedUpdate(1/60, tick++);
  controls.clear();
  if (heldWeaponOf(player)?.kind !== 'knife' || heldWeaponOf(player)?.durability !== 4
    || !world.belt.pickups.some(item => item.kind === 'pipe' && item.durability === 3)) fail('loot can exchange weapons with durability intact');
  controls.heldActions.add('right');
  scene.fixedUpdate(1/60, tick++);
  if (scene.phase !== 'transition') fail('fresh right after looting starts the boss transition');
  controls.heldActions.clear();
  for (let i = 0; i < 150 && scene.phase === 'transition'; i++) scene.fixedUpdate(1/60, tick++);
  if (scene.phase !== 'duel' || scene.world.player.hp !== 900 || scene.bossEntry.hp !== 900) fail('heal carries into boss battle and retry checkpoint');
}

// A walk held at the final KO must not exit automatically, even outside the near-edge band.
{
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0], 1);
  scene.introFrames = 0;
  scene.beltWave = 2;
  scene.spawnBeltWave(2);
  const { world } = scene;
  const player = world.player;
  player.hp = 500;
  player.x = world.rules.arenaRight - 90;
  player.y = 490;
  const food = world.belt.spawnPickup('apple', player.x - 25, player.y);
  food.z = food.vz = 0;
  for (const enemy of world.enemies) enemy.hp = 0;
  controls.heldActions.add('right');
  let tick = 18090;
  scene.fixedUpdate(1 / 60, tick++);
  for (let i = 0; i < 40; i++) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'belt' || scene.beltState !== 'loot') fail('Right held through the final KO must not skip the reward window');
  if (player.x < world.rules.arenaRight - 8 || !world.belt.pickups.includes(food)) fail('Player can reach the edge while the reward remains');
  controls.heldActions.clear();
  scene.fixedUpdate(1 / 60, tick++);
  controls.heldActions.add('right');
  scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'transition') fail('Releasing and holding right again must still start the boss');
}

// Intermediate loot uses the existing walk to the next wave, while floor weapon life is paused.
{
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0], 1);
  scene.introFrames = 0;
  const { world } = scene;
  const player = world.player;
  player.hp = 600;
  world.belt.giveWeapon(player, 'pipe', 2);
  for (const enemy of world.enemies) enemy.hp = 0;
  const knife = world.belt.spawnPickup('knife', player.x, player.y, 4);
  knife.z = knife.vz = 0;
  knife.age = knife.life - 2;
  scene.fixedUpdate(1/60, 18101);
  if (scene.beltState !== 'travel') fail('first wave uses normal travel with optional rewards');
  const clock = scene.stageTime;
  for (let i = 0; i < 15; i++) scene.fixedUpdate(1/60, 18102 + i);
  controls.press('lp');
  scene.fixedUpdate(1/60, 18120);
  controls.clear();
  if (scene.stageTime !== clock || heldWeaponOf(player)?.kind !== 'knife') fail('travel pauses expiration and permits a swap');
  player.x = scene.areaStarts[1] + 160;
  scene.fixedUpdate(1/60, 18121);
  if (!scene.waveBreakFrames || heldWeaponOf(player)?.kind !== 'knife') fail('weapon swap carries into the next wave');
}

// A held walk cannot skip reachable manual rewards between waves.
for (const reward of ['knife', 'apple', 'full-health-apple', 'coins', 'none']) {
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0], 1);
  scene.introFrames = 0;
  const { world } = scene;
  const player = world.player;
  player.x = world.rules.arenaRight - 6;
  player.y = 490;
  if (reward !== 'full-health-apple') player.hp = 500;
  if (reward !== 'none') {
    const item = world.belt.spawnPickup(reward === 'full-health-apple' ? 'apple' : reward, player.x - 90, player.y);
    item.z = item.vz = 0;
  }
  for (const enemy of world.enemies) enemy.hp = 0;
  controls.heldActions.add('right');
  let tick = 18150;
  scene.fixedUpdate(1 / 60, tick++);
  for (let i = 0; i < 80 && !scene.waveBreakFrames; i++) scene.fixedUpdate(1 / 60, tick++);
  if (reward !== 'knife' && reward !== 'apple') {
    if (!scene.waveBreakFrames) fail('No manual reward must preserve walking directly to the next wave: ' + reward);
    continue;
  }
  if (scene.waveBreakFrames || scene.beltState !== 'travel' || player.x < scene.areaStarts[1] + 150) {
    fail('Right held through the KO must not skip intermediate manual rewards: ' + reward);
  }
  controls.heldActions.clear();
  for (let i = 0; i < 5; i++) scene.fixedUpdate(1 / 60, tick++);
  if (scene.waveBreakFrames) fail('Releasing right alone must not start the next wave');
  controls.heldActions.add('right');
  scene.fixedUpdate(1 / 60, tick++);
  if (!scene.waveBreakFrames || scene.beltWave !== 1) fail('Fresh right must start the next wave once');
}

// Releasing and pressing again can both happen before the next fixed update.
for (const wave of [0, 2]) {
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0]);
  scene.introFrames = 0;
  scene.beltWave = wave;
  scene.spawnBeltWave(wave);
  const { world } = scene;
  const player = world.player;
  player.hp = 500;
  player.y = 490;
  const food = world.belt.spawnPickup('apple', player.x, player.y);
  food.z = food.vz = 0;
  for (const enemy of world.enemies) enemy.hp = 0;
  controls.heldActions.add('right');
  scene.fixedUpdate(1 / 60, 18240);
  player.x = player.previousX = wave === 2 ? world.rules.arenaRight : scene.areaStarts[1] + 160;
  scene.fixedUpdate(1 / 60, 18241);
  if (scene.phase !== 'belt' || scene.waveBreakFrames) fail('A continuous hold must keep the reward window open');
  controls.releasedActions.add('right');
  controls.press('right');
  scene.fixedUpdate(1 / 60, 18242);
  if (wave === 2 ? scene.phase !== 'transition' : !scene.waveBreakFrames) {
    fail('Release and re-press in one tick must advance from the reward window: ' + wave);
  }
}

// Collecting the last useful reward allows the same held direction to leave.
for (const wave of [0, 2]) {
  const controls = new StubInput();
  const scene = new Stage1Scene(controls, new StubAudio(), character, character.superArts[0]);
  scene.introFrames = 0;
  scene.beltWave = wave;
  scene.spawnBeltWave(wave);
  const { world } = scene;
  const player = world.player;
  player.hp = 400;
  player.x = player.previousX = world.rules.arenaRight - 12;
  world.props.length = 0;
  const rewards = Array.from({ length: 2 }, () => world.belt.spawnPickup('apple', player.x, player.y));
  for (const reward of rewards) reward.z = reward.vz = 0;
  for (const enemy of world.enemies) enemy.hp = 0;
  controls.heldActions.add('right');
  scene.fixedUpdate(1 / 60, 18260);
  const exit = wave === 2 ? world.rules.arenaRight : scene.areaStarts[1] + 160;
  player.x = player.previousX = exit;
  for (const reward of rewards) reward.x = exit;
  controls.press('lp');
  scene.fixedUpdate(1 / 60, 18261);
  controls.clear();
  if (world.belt.stats.foodEaten !== 1 || scene.phase !== 'belt' || scene.waveBreakFrames) fail('A remaining usable reward must hold the exit open');
  controls.press('lp');
  scene.fixedUpdate(1 / 60, 18262);
  if (world.belt.stats.foodEaten !== 2 || (wave === 2 ? scene.phase !== 'transition' : !scene.waveBreakFrames)) {
    fail('Holding right after taking the last reward must advance once: ' + wave);
  }
}

// A remaining final crate can provide recovery even if no reward has dropped yet.
{
  const controls = new StubInput();
  const scene = new Stage5Scene(controls, new StubAudio(), character, character.superArts[0]);
  scene.introFrames = 0;
  scene.beltWave = 2;
  scene.spawnBeltWave(2);
  const w = scene.world, p = w.player;
  p.hp = 500;
  const crate = w.props.find(p => p.id === 'crate-society-b');
  p.x = crate.x - 69;
  p.y = crate.y;
  for (const enemy of w.enemies) enemy.hp = 0;
  scene.fixedUpdate(1/60, 18201);
  if (scene.beltState !== 'loot' || w.belt.pickups.length) fail('intact final food crate opens the safe window');
  crate.hp = 1;
  controls.press('mp');
  scene.fixedUpdate(1/60, 18202);
  controls.clear();
  for (let tick = 18203; tick < 18280; tick++) scene.fixedUpdate(1/60, tick);
  const food = w.belt.pickups.find(item => item.kind === 'chicken');
  if (!crate.broken || !food) fail('props can still be broken in the safe window');
  p.x = food.x;
  p.y = food.y;
  controls.press('lp');
  scene.fixedUpdate(1/60, 18280);
  controls.clear();
  if (p.hp !== p.maxHp) fail('final crate recovery can be collected');
  controls.press('confirm');
  scene.fixedUpdate(1/60, 18281);
  if (scene.phase !== 'transition') fail('keyboard confirm can leave loot without walking to the edge');
}

// Full health and no useful pickups preserve the immediate boss transition.
{
  const scene = new Stage1Scene(new StubInput(), new StubAudio(), character, character.superArts[0], 1);
  scene.introFrames = 0;
  scene.beltWave = 2;
  scene.spawnBeltWave(2);
  for (const enemy of scene.world.enemies) enemy.hp = 0;
  const world = scene.world;
  world.belt.spawnPickup('apple', world.rules.arenaLeft + 150, world.player.y);
  const unreachable = world.belt.spawnPickup('pipe', world.rules.arenaLeft - 80, world.player.y);
  unreachable.z = unreachable.vz = 0;
  scene.fixedUpdate(1/60, 18301);
  if (scene.phase !== 'transition') fail('unusable or out-of-area rewards do not stall the handoff');
}

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
const pauseAudio = new StubAudio();
const pauseScene = new Stage1Scene(pauseInput, pauseAudio, character, character.superArts[0], 1);
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9399);
pauseInput.clear();
if (pauseScene.paused) fail('START paused during stage intro');
pauseScene.introFrames = 0;
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9400);
pauseInput.clear();
if (!pauseScene.paused) fail('START did not pause stage');
if (!pauseAudio.paused || pauseAudio.backgrounded) fail('stage pause did not use dedicated audio pause state');
const pausedTime = pauseScene.stageTime;
for (let i = 0; i < 10; i += 1) pauseScene.fixedUpdate(1 / 60, 9401 + i);
if (pauseScene.stageTime !== pausedTime) fail('stage timer advanced while paused');
pauseInput.press('start');
pauseScene.fixedUpdate(1 / 60, 9412);
pauseInput.clear();
if (pauseScene.paused) fail('START did not resume stage');
if (pauseAudio.paused) fail('stage resume did not release dedicated audio pause state');

const freezeStageInput = new StubInput();
const freezeStage = new Stage1Scene(freezeStageInput, new StubAudio(), character, character.superArts[0], 1);
freezeStage.introFrames = 0;
freezeStage.stageTime = 50;
freezeStage.elapsedCombatFrames = 12;
freezeStage.world.superFreezeFrames = 2;
const freezeStageTime = freezeStage.stageTime;
const freezeElapsed = freezeStage.elapsedCombatFrames;
freezeStage.fixedUpdate(1 / 60, 9420);
if (freezeStage.stageTime !== freezeStageTime) fail('stage timer advanced during super freeze');
if (freezeStage.elapsedCombatFrames !== freezeElapsed) fail('combat clear-time counter advanced during super freeze');
if (freezeStage.world.superFreezeFrames !== 1) fail('stage did not tick super freeze countdown');

const frozenBossStage = new Stage1Scene(new StubInput(), new StubAudio(), character, character.superArts[0], 5);
frozenBossStage.introFrames = 0;
frozenBossStage.phase = 'duel';
frozenBossStage.world.superFreezeFrames = 2;
let frozenBossPatternCalls = 0;
frozenBossStage.updateUrienPattern = () => { frozenBossPatternCalls += 1; };
frozenBossStage.fixedUpdate(1 / 60, 9421);
if (frozenBossPatternCalls !== 0) fail('boss pattern script advanced during super freeze');

let clear1 = false, clear2 = false, clear3 = false, clear4 = false, clear5 = false;
const stage1 = new Stage1Scene(new StubInput(), new StubAudio(), character, character.superArts[0], 1, () => { clear1 = true; });
const r1 = testStage(stage1, 'stage1', 1);
if (!clear1) fail('stage 1 callback');

const stage2 = new Stage2Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear2 = true; });
const r2 = testStage(stage2, 'stage2', 1000, (r) => { if (!r.waveProfiles.flat().includes('agile')) fail('stage2 agile missing'); });
if (!clear2) fail('stage 2 callback');

const stage3 = new Stage3Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear3 = true; });
const r3 = testStage(stage3, 'stage3', 2000, (r) => {
  if (!r.waveProfiles.flat().includes('kick') || !r.waveProfiles.flat().includes('grappler')) fail('stage3 kicker/bruiser grunt AI missing');
  if (r.boss !== 'MAKOTO') fail(`stage3 boss expected MAKOTO, got ${r.boss}`);
});
if (!clear3) fail('stage 3 callback');

const stage4 = new Stage4Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear4 = true; });
const r4 = testStage(stage4, 'stage4', 3000, (r) => {
  if (!r.waveProfiles.flat().includes('heavy') || !r.waveProfiles.flat().includes('grappler')) fail('stage4 riot soldier/bruiser grunt AI missing');
  if (r.boss !== 'DUDLEY') fail(`stage4 boss expected DUDLEY, got ${r.boss}`);
});
if (!clear4) fail('stage 4 callback');



const stage5 = new Stage5Scene(new StubInput(), new StubAudio(), character, character.superArts[0], () => { clear5 = true; });
stage5.introFrames = 0;
const r5 = clearStage5(stage5, 4000);
if (!['heavy', 'grappler', 'agile', 'kick', 'ranged'].every((id) => r5.waveProfiles.flat().includes(id))) fail('stage5 mixed grunt AI missing');
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
  pauseAudioSeparated: !pauseAudio.paused && !pauseAudio.backgrounded,
  superFreezePreservesStageClock: freezeStage.stageTime === freezeStageTime && freezeStage.elapsedCombatFrames === freezeElapsed,
  superFreezeBlocksBossScripts: frozenBossPatternCalls === 0,
});
