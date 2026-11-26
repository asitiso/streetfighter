import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';
import { normalFor, specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class StubInput { held(action) { return action === this.heldAction; } pressed() { return false; } released() { return false; } }
class StubAudio { playStagePulse() {} playHit() {} playParry() {} }
const fail = (message) => { console.error('BOSS_PATTERN_FAIL', message); process.exit(1); };
function gillGuide(scene, compact = false) {
  const labels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? text => labels.push(text) : () => {} });
  scene.drawGillPatternGuide?.(ctx, compact);
  return labels.filter(label => !compact || !label.startsWith('PHASE ')).join(' ');
}
function urienGuide(scene, compact = true) {
  const labels = [];
  const panels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? text => labels.push(text)
    : key === 'roundRect' ? (x, y, w, h) => panels.push(y + h) : () => {} });
  scene.drawUrienPatternGuide?.(ctx, compact);
  if (compact && labels.length && (panels.length !== 1 || panels[0] > 136)) fail('Urien touch cue overlaps START');
  return labels.join(' ');
}
let tick = 1;
function waitForBurst(scene, expected) {
  const { world } = scene;
  const openingTick = tick - 1;
  const move = world.enemy.currentMove;
  if (world.projectiles.length || world.events.some(e => e.type === 'boss-burst')) fail('Warning cannot launch a burst');
  if (!move || move.startup < 16) fail('Boss projectile needs at least 16 active startup ticks');
  for (; tick - openingTick <= 65 && !world.enemy.moveEffectTriggered; tick++) {
    if (world.projectiles.length) fail('Projectile appeared before its active frame');
    scene.fixedUpdate(1 / 60, tick);
  }
  if (tick - 1 - openingTick < 16 || world.projectiles.length !== expected) fail(`Expected ${expected} projectiles after the warning interval, got ${world.projectiles.length}`);
  if (world.events.filter(e => e.type === 'boss-burst').length !== 1) fail('Release produces one burst cue');
  scene.fixedUpdate(1 / 60, tick++);
  if (world.projectiles.length !== expected) fail('Active move cannot launch twice');
}

const ryu = getCharacter('RYU');
const input = new StubInput();
const scene = new Stage5Scene(input, new StubAudio(), ryu, ryu.superArts[0]);
scene.introFrames = 0;
scene.prepareDuel();
scene.phase = 'duel';
scene.bossPatternCooldown = 1;
scene.world.player.hp = 9999;
scene.fixedUpdate(1 / 60, tick++);
if (urienGuide(scene) !== 'AEGIS REFLECTOR HOLD ← TO GUARD') fail('Urien touch needs a directional Aegis cue at startup');
waitForBurst(scene, 1);
const aegis = scene.world.projectiles.find((p) => p.owner.character.id === 'URIEN' && p.piercing);
if (!aegis || Math.abs(aegis.vx) >= 1) fail('Urien Aegis persistent wall did not spawn');
if (!scene.world.events.some((e) => e.type === 'boss-warning' && e.label?.includes('AEGIS'))) fail('Urien telegraph event missing');

const { player, enemy } = scene.world;
enemy.updateAi = () => {};
enemy.updateAiDirected = () => {};
aegis.x = player.x + 145;
input.heldAction = 'left';
const retreatStartX = player.x;
scene.world.update(input, tick++);
if (player.x >= retreatStartX || player.proximityGuarding || aegis.hitVictims.has(player.uid)) {
  fail('Aegis too far to reach before expiring must leave retreat available');
}
while (scene.world.superFreezeFrames > 0) scene.world.update(input, tick++);

const reachableX = player.x;
aegis.x = reachableX + 95;
scene.world.update(input, tick++);
if (player.x !== reachableX || !player.proximityGuarding || aegis.hitVictims.has(player.uid)) {
  fail('Aegis that can still reach must prepare guard before contact');
}

aegis.x = player.x + 70;
scene.world.update(input, tick++);
if (player.state !== 'block' || !aegis.hitVictims.has(player.uid)) fail('fresh Aegis must still guard and make contact');
const blockDeadline = tick + 70;
if (urienGuide(scene)) fail('Aegis should stop asking for guard after contact');
while (player.state === 'block' && tick < blockDeadline) scene.world.update(input, tick++);
const recoveryX = player.x;
scene.world.update(input, tick++);
if (!scene.world.projectiles.includes(aegis) || aegis.x <= recoveryX) fail('Aegis must still be approaching at recovery');
if (player.state !== 'walk' || player.x >= recoveryX || player.proximityGuarding) fail('after blocking Aegis, held back must walk on the first free tick');
input.heldAction = undefined;

scene.prepareFinalDuel();
scene.phase = 'final-duel';
scene.gillPhase = 2;
scene.bossPatternCooldown = 1;
scene.world.player.hp = 9999;
scene.fixedUpdate(1 / 60, tick++);
if (!gillGuide(scene).includes('HOLD ← • GUARD ALL SHOTS')) fail('Gill cross fire needs a directional multi-shot cue');
waitForBurst(scene, 2);
const phase2VolleyMove = scene.world.projectiles[0].move;
if (!gillGuide(scene).includes('HOLD ← • GUARD ALL SHOTS')) fail('Gill volley guidance must persist after launch while shots approach');
if (gillGuide(scene).includes('HIT BACK')) fail('A launched volley cannot advertise a safe melee punish');
const phase2Count = scene.world.projectiles.filter((p) => p.owner.character.id === 'GILL').length;
if (phase2Count < 2) fail(`Gill phase 2 volley expected >=2, got ${phase2Count}`);
for (const shot of scene.world.projectiles) shot.hitVictims.add(scene.world.player.uid);
if (gillGuide(scene)) fail('A volley that already contacted the player must stop asking for guard');
for (const shot of scene.world.projectiles) {
  shot.hitVictims.clear();
  shot.x = scene.world.player.x - 140;
}
if (gillGuide(scene)) fail('Shots that passed the player must not show a stale guard cue');
const overlapShot = scene.world.projectiles[0];
const { player: overlapPlayer } = scene.world;
const originalHeight = overlapShot.y;
const originalRise = overlapShot.vy;
overlapShot.x = overlapPlayer.x + Math.sign(overlapShot.vx) * 10;
overlapShot.y = overlapPlayer.y - 88;
overlapShot.vy = 0;
if (!scene.world.projectileCanReach(overlapPlayer, overlapShot, 1)) fail('The past-center shot must still reach on the next tick');
if (!gillGuide(scene).includes('GUARD ALL SHOTS') || !gillGuide(scene, true).includes('GUARD ALL SHOTS')) {
  fail('A past-center volley that still overlaps the player must keep its guard cue');
}
const chip = Math.round(overlapShot.move.damage * .15);
overlapPlayer.hp = chip + 1;
if (!gillGuide(scene, true).includes('GUARD ALL SHOTS')) fail('A survivable hit keeps the guard instruction');
overlapPlayer.hp = chip;
if (gillGuide(scene, true) !== 'GUARD CHIP CAN KO' || !gillGuide(scene).endsWith('GUARD CHIP CAN KO')) {
  fail('Show a lethal chip warning in place of guard instructions');
}
const secondShot = scene.world.projectiles[1];
const secondState = { x: secondShot.x, y: secondShot.y, vy: secondShot.vy };
secondShot.x = overlapShot.x;
secondShot.y = overlapShot.y;
secondShot.vy = 0;
overlapPlayer.hp = 2 * chip + 1;
if (!gillGuide(scene, true).includes('GUARD ALL SHOTS')) fail('A survivable two-shot volley keeps its guard instruction');
overlapPlayer.hp = 2 * chip;
if (gillGuide(scene, true) !== 'GUARD CHIP CAN KO' || !gillGuide(scene).endsWith('GUARD CHIP CAN KO')) {
  fail('Two reachable shots can KO even if one hit is survivable');
}
secondShot.hitVictims.add(overlapPlayer.uid);
if (!gillGuide(scene, true).includes('GUARD ALL SHOTS')) fail('Do not count a shot that already contacted this player');
secondShot.hitVictims.clear();
secondShot.y -= 250;
if (!gillGuide(scene, true).includes('GUARD ALL SHOTS')) fail('Do not count a shot that misses the contact lane');
Object.assign(secondShot, secondState);
overlapPlayer.hp = 9999;
overlapShot.y = originalHeight;
overlapShot.vy = originalRise;
for (const shot of scene.world.projectiles) shot.x = scene.world.player.x + 140;
scene.world.enemy.startMove(normalFor('mp', false, 'GILL'));
if (!gillGuide(scene).includes('GUARD ALL SHOTS')) fail('A live volley stays readable when Gill starts a regular move');
// A high shot can remain after the grounded shots have already been blocked.
for (const shot of scene.world.projectiles) {
  shot.y = scene.world.player.y - 250;
  shot.vy = -.2;
}
if (gillGuide(scene)) fail('A volley that passes above the grounded player must stop asking for guard');
const lastShot = scene.world.projectiles[0];
lastShot.vx = -8;
lastShot.vy = 10;
if (!gillGuide(scene).includes('GUARD ALL SHOTS')) fail('A descending shot that can enter the contact lane must still ask for guard');
lastShot.y = scene.world.player.y - 88;
lastShot.life = 1;
if (gillGuide(scene)) fail('A volley that will expire before contact must stop asking for guard');

scene.prepareFinalDuel();
scene.gillPhase = 3;
scene.bossPatternCooldown = 1;
scene.fixedUpdate(1 / 60, tick++);
waitForBurst(scene, 3);
const phase3 = scene.world.projectiles.filter((p) => p.owner.character.id === 'GILL');
if (phase3.length < 3 || !phase3.every((p) => p.piercing)) fail('Gill phase 3 Seraphic volley missing');
if (!scene.world.events.some((e) => e.type === 'boss-warning' && e.label?.includes('SERAPHIC'))) fail('Gill final telegraph missing');

scene.prepareFinalDuel();
scene.gillPhase = 3;
scene.bossPatternIndex = 1; // Seraphic Rain
scene.bossPatternCooldown = 1;
scene.fixedUpdate(1 / 60, tick++);
waitForBurst(scene, 5);

scene.prepareFinalDuel();
scene.gillPhase = 1;
scene.bossPatternIndex = 0;
scene.bossPatternCooldown = 1;
scene.fixedUpdate(1 / 60, tick++);
scene.world.enemy.receiveHit(normalFor('hp', false, 'RYU'), scene.world.player, false);
scene.bossPatternCooldown = 1000;
for (let i = 0; i < 50; i++) scene.fixedUpdate(1 / 60, tick++);
if (scene.world.events.some(e => e.type === 'boss-burst') || scene.world.projectiles.length) fail('Interrupted windup must not leak a scripted burst');

// A ready Gill pattern must wait for the previous projectile's authored recovery.
{
  const bout = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const boss = bout.world.enemy;
  boss.aiCooldown = 999;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  waitForBurst(bout, 1);
  const sphere = boss.currentMove;
  const recoveryStart = sphere.startup + sphere.active;
  while (boss.moveFrame < recoveryStart) bout.fixedUpdate(1 / 60, tick++);
  const nextPatternIndex = bout.bossPatternIndex;
  bout.bossPatternCooldown = 1;
  while (boss.moveFrame < recoveryStart + sphere.recovery - 1) {
    bout.fixedUpdate(1 / 60, tick++);
    if (boss.currentMove !== sphere || bout.bossPatternIndex !== nextPatternIndex) {
      fail('Gill canceled a projectile recovery into the next pattern');
    }
  }
  bout.fixedUpdate(1 / 60, tick++);
  if (boss.currentMove?.id !== 'GILL_MOBILITY' || bout.bossPatternIndex !== nextPatternIndex + 1) {
    fail('An overdue Gill pattern should start as soon as recovery ends');
  }
}

for (const [phase, index, bossId, name, label] of [
  ['duel', 1, 'URIEN', 'mobility', 'CHARGING TACKLE'],
  ['final-duel', 1, 'GILL', 'mobility', 'ELEMENTAL LARIAT'],
]) {
  const bout = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  if (phase === 'duel') bout.prepareDuel(); else bout.prepareFinalDuel();
  bout.phase = phase;
  bout.bossPatternIndex = index;
  bout.bossPatternCooldown = 1;
  const { player, enemy } = bout.world;
  player.x = 500; enemy.x = 590;
  enemy.aiCooldown = 999; // Isolate the stage-scripted attack from ordinary AI choices.
  bout.fixedUpdate(1 / 60, tick++);
  const attack = enemy.currentMove;
  const ordinary = specialMovesFor(bossId)[name];
  if (attack?.id !== ordinary.id || attack.startup < 16 || attack.recovery !== ordinary.recovery + 8) {
    fail(`${bossId} scripted rush needs a readable warning and a recovery opening`);
  }
  if (attack.damage !== ordinary.damage || attack.active !== ordinary.active
    || !bout.world.events.some(e => e.type === 'boss-warning' && e.label === label)) {
    fail(`${bossId} rush must retain its impact and display its warning before contact`);
  }
  for (let frame = 1; frame < attack.startup; frame++) {
    bout.fixedUpdate(1 / 60, tick++);
    if (player.hp !== player.maxHp) fail(`${bossId} rush hit during its warning`);
  }
  const guardGuide = (compact) => bossId === 'GILL' ? gillGuide(bout, compact) : urienGuide(bout, compact);
  const rushChip = Math.round(attack.damage * .15);
  player.hp = rushChip + 1;
  if (!guardGuide(true).includes('HOLD ← TO GUARD')) fail(`${bossId} rush should allow a survivable guard`);
  player.hp = rushChip;
  enemy.moveFrame = attack.startup - 7;
  for (const compact of [false, true]) {
    const hint = guardGuide(compact);
    if (!hint.endsWith('GUARD CHIP CAN KO') || hint.includes('HOLD')) fail(`${bossId} lethal rush chip must replace the guard instruction`);
  }
  enemy.moveFrame = attack.startup - 6;
  for (const compact of [false, true]) {
    if (!guardGuide(compact).endsWith('TAP → TO PARRY')) fail(`${bossId} should teach a parry when an immediate press can connect`);
  }
  bout.input.heldAction = 'left';
  if (!guardGuide(true).endsWith('GUARD CHIP CAN KO')) fail('Holding back prevents a normal parry');
  bout.input.heldAction = undefined;
  enemy.moveFrame = attack.startup + attack.active - 1;
  if (!guardGuide(true).endsWith('GUARD CHIP CAN KO')) fail('Do not advertise parry after the last possible new contact');
  enemy.moveFrame = attack.startup - 1;
  player.hp = player.maxHp;
  player.airborne = true;
  for (const compact of [false, true]) {
    const hint = guardGuide(compact);
    if (!hint.includes('GUARD ON LANDING') || hint.includes('HOLD')) fail(`${bossId} must distinguish airborne and grounded guard cues`);
  }
  player.airborne = false;
  if (bossId === 'GILL') {
    if (!gillGuide(bout).includes('HOLD ← TO GUARD')) fail('Gill rush needs a directional guard cue');
    enemy.moveFrame = attack.startup + attack.active;
    enemy.x = player.x + 65;
    if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('The mobile cue should name MP when LP is out of range');
    enemy.x = player.x + 58;
    if (!gillGuide(bout, true).includes('HIT BACK • LP')) fail('The mobile cue should prefer LP when both punches reach');
    player.state = 'block';
    if (gillGuide(bout).includes('HIT BACK')) fail('Gill guide must wait for blockstun to finish');
    player.state = 'idle';
    enemy.moveFrame = attack.startup + attack.active + attack.recovery - 1;
    if (gillGuide(bout).includes('HIT BACK')) fail('Gill guide cannot recommend an attack that starts after recovery');
    enemy.moveFrame = attack.startup + attack.active;
    enemy.x = player.x + 200;
    if (gillGuide(bout).includes('HIT BACK')) fail('Gill guide cannot suggest a punish out of range');
    enemy.x = player.x - 65;
    player.facing = -1;
    enemy.moveFrame = 0;
    if (!gillGuide(bout).includes('HOLD → TO GUARD')) fail('Gill guard cue should reverse after a side switch');
    enemy.moveFrame = attack.startup;
    enemy.markHitTarget(player);
    if (gillGuide(bout) || gillGuide(bout, true)) fail('Gill must clear the melee guard cue after contact');
    bout.world.spawnScriptedProjectile(enemy, { ...phase2VolleyMove, projectile: { ...phase2VolleyMove.projectile, count: 1 } });
    const [shot] = bout.world.projectiles;
    shot.x = player.x - 60;
    shot.vx = Math.abs(shot.vx);
    shot.y = player.y - 88;
    shot.vy = 0;
    if (!gillGuide(bout, true).includes('HOLD → TO GUARD')) fail('An incoming shot still needs a guard cue after melee contact');
    player.airborne = true;
    if (gillGuide(bout, true) !== 'GUARD ON LANDING') fail('A lingering projectile must also distinguish airborne guard');
    player.airborne = false;
    bout.world.projectiles.length = 0;
    enemy.receiveHit(normalFor('hp', false, 'RYU'), player, false);
    if (gillGuide(bout)) fail('Interrupted Gill patterns cannot leave stale guidance');
    bout.prepareFinalDuel();
    if (gillGuide(bout)) fail('A fresh Gill bout cannot inherit the previous pattern cue');
  } else {
    if (urienGuide(bout) !== 'CHARGING TACKLE HOLD ← TO GUARD') fail('Urien rush needs a directional guard cue');
    enemy.moveFrame = attack.startup + attack.active;
    enemy.x = player.x + 65;
    if (urienGuide(bout) !== 'CHARGING TACKLE HIT BACK • MP') fail('Urien recovery should show the reachable MP');
    bout.input.bindings = [['KeyN', 'mp']];
    if (!urienGuide(bout, false).includes('HIT BACK • N / MP')) fail('Urien keyboard cue should show the rebound MP key');
    player.state = 'block';
    if (urienGuide(bout) !== 'CHARGING TACKLE RECOVERING') fail('Urien guide must wait for blockstun to finish');
    player.state = 'idle';
    enemy.x = player.x - 200;
    player.facing = -1;
    if (urienGuide(bout) !== 'CHARGING TACKLE RECOVERING') fail('Urien guide cannot suggest a punish out of range');
    enemy.moveFrame = 0;
    if (urienGuide(bout) !== 'CHARGING TACKLE HOLD → TO GUARD') fail('Urien guard cue must follow the side switch');
    enemy.moveFrame = attack.startup;
    enemy.markHitTarget(player);
    if (urienGuide(bout) || urienGuide(bout, false)) fail('Urien must clear the melee guard cue after contact');
    bout.prepareDuel();
    if (urienGuide(bout)) fail('A new Urien bout cannot inherit the previous cue');
  }
}

// A lethal single shot should teach parry only when it can reach during the input window.
{
  const inputs = new StubInput();
  const bout = new Stage5Scene(inputs, new StubAudio(), ryu, ryu.superArts[0]);
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { world } = bout;
  const { player, enemy } = world;
  player.x = 500;
  enemy.x = 900;
  player.facing = 1;
  const sphere = specialMovesFor('GILL').primary;
  world.spawnScriptedProjectile(enemy, {
    ...sphere, projectile: { ...sphere.projectile, bossBurst: { label: 'ELEMENTAL SPHERE', speedScale: 1 } },
  });
  const [shot] = world.projectiles;
  player.hp = 19;
  shot.x = player.x + 185;
  shot.y = player.y - 88;
  shot.vx = -10;
  if (gillGuide(bout, true) !== 'GUARD CHIP CAN KO') fail('A distant lethal shot should warn before the parry window');
  shot.x = player.x + 75;
  if (world.projectileContactTick(player, shot, 6) === undefined) fail('The fixture must reach within the parry window');
  if (gillGuide(bout, true) !== 'TAP → TO PARRY') fail('A reachable lethal single shot must teach the parry direction');
  inputs.bindings = [['KeyD', 'right']];
  if (!gillGuide(bout).endsWith('TAP D TO PARRY')) fail('The desktop projectile cue must show the bound key');
  inputs.heldAction = 'right';
  if (gillGuide(bout, true) !== 'GUARD CHIP CAN KO') fail('A held direction cannot trigger a new parry');
  inputs.heldAction = undefined;
  shot.y -= 250;
  if (gillGuide(bout)) fail('A shot outside the player lane must not advertise a parry');
}

// Only a shot that can reach the fighter during startup should hide the counter.
{
  const keys = new StubInput();
  const bout = new Stage5Scene(keys, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 565;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  enemy.moveFrame = rush.startup + rush.active;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('The clear recovery should recommend MP');

  // An ordinary fireball can remain in flight when the scripted rush has ended.
  bout.world.spawnScriptedProjectile(enemy, specialMovesFor('GILL').primary);
  const sphere = bout.world.projectiles[0];
  sphere.x = player.x + 300;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('A distant fireball should leave a real counter opening visible');
  sphere.x = player.x + 60;
  sphere.y -= 160;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('A shot outside the contact lane must not hide the counter');
  sphere.y += 160;
  player.hp = 19;
  if (gillGuide(bout, true) !== 'TAP → TO PARRY') fail('A lethal ordinary fireball must teach parry when it interrupts the punish');
  if (!gillGuide(bout).endsWith('TAP → TO PARRY')) fail('The desktop cue must teach parry for the same interrupting shot');
  keys.heldAction = 'left';
  if (gillGuide(bout, true) !== 'GUARD CHIP CAN KO') fail('Lethal chip must still warn a player holding back');
  keys.heldAction = undefined;
  player.hp = player.maxHp;
  const hint = gillGuide(bout, true);
  keys.pressed = action => action === 'mp';
  bout.fixedUpdate(1 / 60, tick++);
  if (player.state !== 'hit') fail('Test must reproduce a projectile interrupting the suggested counter');
  if (hint.includes('HIT BACK')) fail('Gill suggested a punch while his ordinary fireball could interrupt it');
  if (hint !== 'HOLD ← TO GUARD') fail('An incoming fireball that interrupts the recovery punish must show the guard direction');
}

// A lingering scripted volley should only beat a counter that it can interrupt.
{
  const controls = new StubInput();
  const bout = new Stage5Scene(controls, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 565;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  enemy.moveFrame = rush.startup + rush.active;
  bout.world.spawnScriptedProjectile(enemy, phase2VolleyMove);
  const [shot] = bout.world.projectiles;
  shot.vy = 0;
  shot.y = player.y - 88;
  shot.x = player.x + 300;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('A distant scripted volley must leave the actual punish visible');
  shot.x = player.x + 60;
  const near = gillGuide(bout, true);
  if (near.includes('HIT BACK') || !near.includes('GUARD ALL SHOTS')) fail('A close scripted volley must still take priority');
}

// Held forward changes Ryu's MP from a quick normal to a longer command attack.
for (const facing of [-1, 1]) {
  const controls = new StubInput();
  const bout = new Stage5Scene(controls, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  player.facing = facing;
  enemy.x = enemy.previousX = player.x + facing * 65;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  const end = rush.startup + rush.active + rush.recovery;
  enemy.moveFrame = end - 9;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('A normal MP should fit in the shorter opening');
  controls.heldAction = facing === 1 ? 'right' : 'left';
  if (gillGuide(bout, true).includes('HIT BACK')) fail('Held forward selects a command MP that is too slow for the opening');
  enemy.moveFrame = rush.startup + rush.active;
  enemy.x = player.x + facing * 95;
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('The longer command MP should be offered when it can reach in time');
  controls.pressed = key => key === 'mp';
  bout.fixedUpdate(1 / 60, tick++);
  if (player.currentMove?.id !== 'RYU_CMD_MP') fail('The hint must match the command produced by MP with forward held');
}

// Do not teach a jab when the same button would complete a recent special motion.
for (const facing of [-1, 1]) {
  const controls = new StubInput();
  controls.historyEpoch = 1;
  const bout = new Stage5Scene(controls, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  player.facing = facing;
  enemy.x = enemy.previousX = player.x + facing * 58;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  enemy.moveFrame = rush.startup + rush.active;
  if (!gillGuide(bout, true).includes('HIT BACK • LP')) fail('A neutral jab is an available punish');
  const forward = facing === 1 ? 'right' : 'left';
  for (const directions of [['down'], ['down', forward], [forward], []]) {
    controls.held = key => directions.includes(key);
    player.captureInput(controls, tick++);
  }
  const motionHint = gillGuide(bout, true);
  controls.pressed = action => action === 'lp';
  bout.fixedUpdate(1 / 60, tick++);
  if (player.currentMove?.id !== 'RYU_PRIMARY') fail('LP must complete the recorded fireball input');
  if (motionHint.includes('HIT BACK')) fail('A special motion must not advertise the normal-punch cue');
}

// The last hitstun frame can end one tick before a full stun bar locks controls.
{
  const controls = new StubInput();
  const bout = new Stage5Scene(controls, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = 500;
  enemy.x = 565;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  player.receiveHit({ ...normalFor('hp', false, 'GILL'), damage: player.stunMax * 5, hitStop: 0, hitStun: 1, pushback: 0 }, enemy, false);
  player.updatePlayer(controls, bout.world.rules);
  if (player.state !== 'idle' || player.dizzy || player.stun !== player.stunMax) fail('Test must reach the tick before dizzy starts');
  enemy.moveFrame = rush.startup + rush.active;
  const hint = gillGuide(bout, true);
  controls.pressed = action => action === 'mp';
  bout.fixedUpdate(1 / 60, tick++);
  if (!player.dizzy || player.currentMove) fail('The indicated punch cannot start on the dizzy entry tick');
  if (hint !== 'RECOVERING') fail('Do not offer a counter when dizzy will lock the next input');
}

// Adding LP while LK is held produces a throw, so the cue must use a different punch.
{
  const controls = new StubInput();
  const bout = new Stage5Scene(controls, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 558;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  const rush = enemy.currentMove;
  const end = rush.startup + rush.active + rush.recovery;
  enemy.moveFrame = end - 9;
  if (!gillGuide(bout, true).includes('HIT BACK • LP')) fail('The faster jab should normally be preferred');
  controls.heldAction = 'lk';
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('Held LK should leave MP as the valid alternative');
  enemy.moveFrame = end - 6;
  if (gillGuide(bout, true).includes('HIT BACK')) fail('Do not recommend a throw in a jab-only opening');
  controls.heldAction = undefined;
  if (!gillGuide(bout, true).includes('HIT BACK • LP')) fail('Releasing LK restores the jab cue');
  enemy.moveFrame = end - 9;
  controls.heldAction = 'lp';
  if (!gillGuide(bout, true).includes('HIT BACK • MP')) fail('A held LP cannot produce a new press; the cue should offer MP');
  controls.heldAction = 'mp';
  if (!gillGuide(bout, true).includes('HIT BACK • LP')) fail('A free LP can still be used while MP is held');
  controls.held = action => action === 'lp' || action === 'mp';
  if (gillGuide(bout, true).includes('HIT BACK')) fail('The cue cannot offer a punch when both buttons are already held');
}

// The input tick starts a new move at frame zero, before its startup advances.
for (const arrivalOffset of [1, 2]) {
  const keys = new StubInput();
  const bout = new Stage5Scene(keys, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 565;
  enemy.aiCooldown = 999;
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  bout.fixedUpdate(1 / 60, tick++);
  enemy.moveFrame = enemy.currentMove.startup + enemy.currentMove.active;

  const startup = normalFor('mp', false, 'RYU').startup;
  const contactTick = startup + 1;
  bout.world.spawnScriptedProjectile(enemy, specialMovesFor('GILL').primary);
  const [shot] = bout.world.projectiles;
  shot.vx = -8;
  shot.x = player.x + shot.radius + 34 + (startup + arrivalOffset) * 8 - 4;
  shot.y = player.y - 88;
  const cue = gillGuide(bout, true);
  const playerHp = player.hp;
  const bossHp = enemy.hp;
  for (let frame = 1; frame <= contactTick; frame += 1) {
    keys.pressed = action => frame === 1 && action === 'mp';
    bout.fixedUpdate(1 / 60, tick++);
    if (frame < contactTick && (player.hp !== playerHp || enemy.hp !== bossHp)) fail('Fixture hit before the first active tick');
  }
  if (enemy.hp >= bossHp) fail('The prompted punch must connect on its first active tick');
  if (arrivalOffset === 1) {
    if (player.hp >= playerHp) fail('Fixture must trade with a fireball on the first active tick');
    if (cue !== 'HOLD ← TO GUARD') fail('A same-tick fireball trade must show guard instead of a punish');
  } else {
    if (player.hp !== playerHp || cue !== 'HIT BACK • MP') fail('A shot arriving after first contact must leave the punish available');
  }
}

// A standing fighter can still be moving away during the last two ticks of a tech roll.
for (const distance of [72.3, 65]) {
  const keys = new StubInput();
  const bout = new Stage5Scene(keys, new StubAudio(), ryu, ryu.superArts[0]);
  bout.introFrames = 0;
  bout.prepareFinalDuel();
  bout.phase = 'final-duel';
  bout.bossPatternIndex = 1;
  bout.bossPatternCooldown = 1;
  const { player, enemy } = bout.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 650;
  enemy.aiCooldown = 999;
  bout.fixedUpdate(1 / 60, tick++);

  player.receiveHit(normalFor('hk', true, 'GILL'), enemy, false);
  for (let frame = 0; frame < 60 && (player.hitStop || player.airborne); frame++) {
    player.updatePlayer(keys, bout.world.rules);
  }
  if (!player.quickRise(true)) fail('Gill test needs a real tech roll');
  for (let frame = 0; frame < 20 && player.state === 'knockdown'; frame++) {
    player.updatePlayer(keys, bout.world.rules);
  }
  if (!player.techRolling || player.state !== 'idle') fail('Gill test needs the standing tail of a tech roll');
  enemy.x = enemy.previousX = player.x + distance;
  enemy.moveFrame = enemy.currentMove.startup + enemy.currentMove.active + 2;

  const hint = gillGuide(bout, true);
  if (distance === 65) {
    for (let frame = 0; frame < 3 && player.techRolling; frame++) bout.fixedUpdate(1 / 60, tick++);
    if (player.techRolling || !gillGuide(bout, true).includes('HIT BACK • MP')) {
      fail('Gill should recommend MP after the roll if the punch still reaches');
    }
  }
  const hp = enemy.hp;
  keys.pressed = action => action === 'mp';
  bout.fixedUpdate(1 / 60, tick++);
  keys.pressed = () => false;
  for (let frame = 0; frame < 8; frame++) bout.fixedUpdate(1 / 60, tick++);
  if ((enemy.hp < hp) !== (distance === 65)) fail('The roll must move MP out of range only in the wider case');
  if (hint.includes('HIT BACK')) fail('Gill suggested a punch before the tech roll finished');
}

// London rematch: pressure changes with range and remains readable before contact.
for (const [fighter, distance, expected, defense] of [
  ['RYU', 170, 'DUDLEY_MOBILITY', 'HOLD ← TO GUARD'],
  ['RYU', 80, 'DUDLEY_PRIMARY', 'HOLD ← • GUARD ALL HITS'],
  ['DUDLEY', 170, 'ALEX_MOBILITY', 'HOLD ← TO GUARD'],
  ['DUDLEY', 100, 'ALEX_PRIMARY', 'HOLD ← TO GUARD'],
  ['DUDLEY', 60, 'THROW', 'JUMP NOW (SPACE)'],
]) {
  const c = getCharacter(fighter);
  const controls = new StubInput();
  controls.bindings = [['Space', 'jump'], ['ArrowLeft', 'left'], ['ArrowRight', 'right']];
  const london = new Stage1Scene(controls, new StubAudio(), c, c.superArts[0], 4);
  london.introFrames = 0;
  london.prepareDuel();
  london.enterBossMatch('duel');
  const { player, enemy } = london.world;
  player.x = player.previousX = 500;
  enemy.x = enemy.previousX = 500 + distance;
  london.bossPatternCooldown = 1;
  london.fixedUpdate(1 / 60, tick++);
  if (enemy.currentMove?.id !== expected) fail(`London ${fighter} at distance ${distance} expected ${expected}, got ${enemy.currentMove?.id}`);
  const move = enemy.currentMove;
  if (move.startup < 14 || london.world.player.hp !== player.maxHp) fail('London pattern needs a visible warning before impact');
  const labels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? text => labels.push(text) : () => {} });
  london.drawLondonPatternGuide(ctx);
  if (!labels.some(text => text.includes(defense))) fail('London defense hint must match its pattern');
  if (expected === 'THROW') {
    controls.bindings = [['KeyN', 'jump']];
    labels.length = 0;
    london.drawLondonPatternGuide(ctx);
    if (!labels.some(text => text.includes('JUMP NOW (N)'))) fail('London throw defense must show the bound jump key');
    const startX = player.x;
    player.x = enemy.x - 180;
    for (const touch of [false, true]) {
      labels.length = 0;
      london.drawLondonPatternGuide(ctx, touch);
      if (labels.length) fail('Do not prompt a jump after the player has retreated outside the power throw range');
    }
    player.x = startX;
    player.state = 'attack';
    for (const touch of [false, true]) {
      labels.length = 0;
      london.drawLondonPatternGuide(ctx, touch);
      if (labels.some(text => text.includes('JUMP'))) fail('A committed attack cannot use the jump instruction');
    }
    player.state = 'idle';
  }
  const compactLabels = [];
  const panels = [];
  const compact = new Proxy({}, {
    get: (_, key) => key === 'fillText' ? text => compactLabels.push(text)
      : key === 'roundRect' ? (x, y, w, h) => panels.push(y + h) : () => {},
  });
  london.drawLondonPatternGuide(compact, true);
  const touchDefense = expected === 'THROW' ? 'TAP JUMP NOW' : defense;
  if (!compactLabels.includes(move.label) || !compactLabels.includes(touchDefense) || Math.max(...panels) > 136)
    fail('London touch cue needs the move name and a visible defense instruction above START');
  if (expected !== 'THROW') {
    player.facing = -1;
    compactLabels.length = 0;
    london.drawLondonPatternGuide(compact, true);
    if (!compactLabels.includes(touchDefense.replace('←', '→'))) fail('London touch guard cue must follow a side switch');
    labels.length = 0;
    london.drawLondonPatternGuide(ctx);
    if (!labels.some(text => text.includes(defense.replace('←', '→')))) fail('London keyboard guard cue must follow a side switch');
    player.facing = 1;
  }
  player.airborne = true;
  labels.length = compactLabels.length = 0;
  london.drawLondonPatternGuide(ctx);
  london.drawLondonPatternGuide(compact, true);
  if (expected === 'THROW') {
    if (labels.length || compactLabels.length) fail('An airborne player cannot jump again to avoid the throw');
  } else if (![labels, compactLabels].every(hint => hint.some(text => text.includes('GUARD ON LANDING'))
    && !hint.some(text => text.includes('HOLD')))) {
    fail('London melee guide must wait for landing to show the guard input');
  }
  player.airborne = false;
  labels.length = compactLabels.length = 0;
  london.drawLondonPatternGuide(ctx);
  london.drawLondonPatternGuide(compact, true);
  if (!labels.some(text => text.includes(expected === 'THROW' ? 'JUMP NOW (N)' : defense)) || !compactLabels.includes(touchDefense)) {
    fail('London must restore the ground defense if the attack can still hit on landing');
  }
  for (let hit = 1; hit <= (move.multiHit?.hits ?? 1); hit++) {
    enemy.moveFrame = move.startup + (hit - 1) * (move.multiHit?.interval ?? 0);
    enemy.markHitTarget(player);
    const hasFollowup = hit < (move.multiHit?.hits ?? 1);
    labels.length = compactLabels.length = 0;
    london.drawLondonPatternGuide(ctx);
    london.drawLondonPatternGuide(compact, true);
    if (Boolean(labels.length) !== hasFollowup || Boolean(compactLabels.length) !== hasFollowup) {
      fail(`London ${expected} must only display its defense while a hit remains`);
    }
  }
  enemy.moveFrame = move.startup + move.active;
  labels.length = 0;
  london.drawLondonPatternGuide(ctx);
  if (!labels.some(text => text.includes('RECOVERING') || text.includes('HIT BACK'))) fail('London recovery needs a distinct cue');
  if (expected === 'DUDLEY_PRIMARY') {
    const touchRecovery = () => {
      compactLabels.length = 0;
      london.drawLondonPatternGuide(compact, true);
      return compactLabels[1];
    };
    enemy.x = player.x + 70;
    if (touchRecovery() !== 'HIT BACK • MP') fail('London should name MP when LP cannot reach');
    london.input.bindings = [['KeyN', 'mp']];
    labels.length = 0;
    london.drawLondonPatternGuide(ctx);
    if (!labels.some(text => text.includes('HIT BACK • N / MP'))) fail('London keyboard cue should show the rebound MP key');
    enemy.x = player.x + 58;
    if (touchRecovery() !== 'HIT BACK • LP') fail('London should prefer an available faster LP');
    player.state = 'block';
    if (touchRecovery() !== 'RECOVERING') fail('London cannot prompt an attack during blockstun');
    labels.length = 0;
    london.drawLondonPatternGuide(ctx);
    if (!labels.some(text => text.includes('RECOVERING'))) fail('London keyboard cue must also wait for blockstun');
    player.state = 'idle';
    player.hitStop = 1;
    if (touchRecovery() !== 'RECOVERING') fail('London cannot prompt an attack during hit stop');
    player.hitStop = 0;
    enemy.x = player.x + 220;
    if (touchRecovery() !== 'RECOVERING') fail('London cannot prompt an attack outside range');
    enemy.x = player.x + 58;
    enemy.moveFrame += move.recovery - 1;
    if (touchRecovery() !== 'RECOVERING') fail('London cannot prompt an attack after the last usable tick');
  }
  if (move.multiHit) {
    const activeEnd = move.startup + move.active;
    for (const [contactFrame, expectFollowup] of [[activeEnd - move.multiHit.interval - 1, true], [activeEnd - move.multiHit.interval, false]]) {
      enemy.startMove(move);
      london.rematchPattern = enemy.currentMove;
      enemy.moveFrame = contactFrame;
      enemy.markHitTarget(player);
      labels.length = compactLabels.length = 0;
      london.drawLondonPatternGuide(ctx);
      london.drawLondonPatternGuide(compact, true);
      if (Boolean(labels.length) !== expectFollowup || Boolean(compactLabels.length) !== expectFollowup) {
        fail('London guard cue must respect whether the next contact fits in the remaining active frames');
      }
    }
  }
  enemy.receiveHit(normalFor('mp', false, fighter), player, false);
  labels.length = 0;
  london.drawLondonPatternGuide(ctx);
  if (labels.length) fail('Interrupted London move leaves no stale cue');
  london.retryBoss(london.bossEntry);
  if (london.rematchPattern || london.bossPatternCooldown < 60 || london.world.enemy.maxHp !== 1000) fail('Retry resets London patterns and preserves boss health');
}
const ny = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], 1);
ny.introFrames = 0;
ny.prepareDuel();
ny.enterBossMatch('duel');
ny.world.player.x = 500;
ny.world.enemy.x = 580;
ny.bossPatternCooldown = 1;
ny.fixedUpdate(1 / 60, tick++);
if (ny.rematchPattern) fail('The first boss encounter cannot use London patterns');

for (const side of [-1, 1]) {
  const dudley = getCharacter('DUDLEY');
  const controls = new StubInput();
  const london = new Stage1Scene(controls, new StubAudio(), dudley, dudley.superArts[0], 4);
  london.introFrames = 0;
  london.prepareDuel();
  london.enterBossMatch('duel');
  const {player, enemy} = london.world;
  player.x = player.previousX = 640;
  enemy.x = enemy.previousX = 640 + 60 * side;
  london.bossPatternCooldown = 1;
  london.fixedUpdate(1 / 60, tick++);
  if (enemy.currentMove?.id !== 'THROW') fail('London back-walk fixture must start the power throw');
  controls.heldAction = side === 1 ? 'left' : 'right';
  for (let frame = 0; frame < enemy.currentMove.startup - 2; frame++) london.fixedUpdate(1 / 60, tick++);
  if ((640 - player.x) * side < 35) fail('Proximity guard must allow back-walking during a throw');
  for (let frame = 0; frame < 6; frame++) london.fixedUpdate(1 / 60, tick++);
  if (player.hp !== player.maxHp) fail('Back-walking out of range must evade the throw');
}

console.log('BOSS_PATTERN_VERIFY_PASS', {
  urienAegisLife: aegis.life,
  urienAegisSpeed: aegis.vx,
  gillPhase2Volley: phase2Count,
  gillPhase3Volley: phase3.length,
  piercing: phase3.every((p) => p.piercing),
});
