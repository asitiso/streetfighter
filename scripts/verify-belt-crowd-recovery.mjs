import assert from 'node:assert/strict';

const { CombatWorld } = await import('../dist/assets/combat/CombatWorld.js');
const { normalFor } = await import('../dist/assets/combat/MoveLibrary.js');
const { GRUNTS } = await import('../dist/assets/combat/GruntLibrary.js');
const { getCharacter } = await import('../dist/assets/game/characters.js');

const character = getCharacter('RYU');
const jab = normalFor('lp', false, character.id);
const input = { held: () => false, pressed: () => false, released: () => false };

function setUp(mode) {
  const world = new CombatWorld(character, character, mode);
  const { player, enemy } = world;
  player.x = 500;
  enemy.x = 558;
  player.y = enemy.y = 500;
  return world;
}

function hit(world, guarding = false) {
  const { enemy, player } = world;
  enemy.x = player.x + 58;
  enemy.state = 'idle';
  enemy.facing = -1;
  enemy.startMove(jab);
  enemy.moveFrame = jab.startup;
  const hp = player.hp;
  const controls = guarding ? { ...input, held: action => action === 'left' } : input;
  world.resolveAttack(enemy, player, controls);
  return hp - player.hp;
}

for (const mode of ['belt', 'duel']) {
  const world = setUp(mode);
  const { player } = world;
  for (let i = 0; i < 4; i += 1) assert.ok(hit(world) > 0, mode + ' should allow its first four hits');
  assert.equal(player.comboHitsTaken, 4);
  if (mode === 'belt') {
    assert.equal(hit(world), 0, 'a belt crowd cannot keep refreshing the same hitstun');
    const hp = player.hp;
    const x = player.x;
    world.projectiles.push({ owner: world.enemy, move: jab, x, y: player.y - 88, vx: -1, vy: 0, life: 10,
      radius: 24, piercing: false, burstIndex: 1, burstTotal: 1, hitVictims: new Set() });
    world.updateProjectiles(input);
    assert.equal(player.hp, hp, 'projectiles cannot restart the same protected chain either');
    assert.equal(player.state, 'hit');
    for (let i = 0; i < jab.hitStun; i += 1) player.advanceLockedState();
    assert.equal(player.state, 'idle');
    assert.equal(hit(world), 0, 'recovery is safe on the same tick controls return');
    for (let i = 0; i < 8; i += 1) player.tickStunAndWake(world.rules);
    assert.ok(hit(world) > 0, 'the next independent attack deals damage');
    assert.equal(player.comboHitsTaken, 1);
  } else assert.ok(hit(world) > 0, 'duel combo rules still allow a fifth hit');
}
for (const mode of ['belt', 'duel']) {
  const world = setUp(mode);
  const { player, enemy } = world;
  const flurry = GRUNTS.knife.specials.primary;
  enemy.startMove(flurry);
  const damage = [];
  for (let index = 0; index < flurry.multiHit.hits; index++) {
    enemy.x = player.x + 58;
    enemy.moveFrame = flurry.startup + index * flurry.multiHit.interval;
    const hp = player.hp;
    world.resolveAttack(enemy, player, input);
    damage.push(hp - player.hp);
  }
  assert.deepEqual(damage, [25, 25, 25], mode + ' preserves every hit of an opening knife flurry');
  assert.equal(player.comboHitsTaken, 1, 'Damage scaling still counts an authored flurry as one move');
  assert.ok(hit(world) > 0, 'The fourth contact still lands');
  assert.equal(player.comboHitsTaken, 2);
  if (mode === 'belt') {
    assert.equal(hit(world), 0, 'The fifth physical contact cannot keep the belt player locked');
    for (let frame = 0; frame < jab.hitStun; frame++) player.advanceLockedState();
    assert.equal(player.state, 'idle');
    assert.ok(player.wakeInvulnerableFrames > 0, 'Actual contact count gives a safe first tick of control');
  } else assert.ok(hit(world) > 0, 'Duel retains the existing multi-hit chain');
}
// Combat resolves contacts after the player's locked update, even on the tick recovery finishes.
for (const mode of ['belt', 'duel']) for (const lockedState of ['hit', 'block']) {
  const world = setUp(mode);
  const { player, enemy } = world;
  hit(world, lockedState === 'block');
  assert.equal(player.state, lockedState);
  player.hitStop = 0;
  player.stateFrame = -1;
  enemy.x = player.x + 58;
  enemy.hitStop = 0;
  enemy.state = 'idle';
  enemy.startMove(jab);
  enemy.moveFrame = jab.startup - 1;
  const hp = player.hp, y = player.y;
  world.update(input, 1);
  if (mode === 'belt') {
    assert.equal(player.hp, hp, 'A hit cannot restart the lock before the first actionable tick');
    assert.equal(player.state, 'idle');
    assert.equal(player.wakeInvulnerableFrames, 1, 'The protection covers just the remainder of the same tick');
    world.update({ ...input, held: action => action === 'down' }, 2);
    assert.ok(player.y > y, 'The next tick accepts a move away from the crowd');
    assert.equal(player.wakeInvulnerableFrames, 0, 'The next attack is allowed to land');
    assert.ok(player.hp < hp, 'A lingering attack can still hit after input has been processed');
  } else {
    assert.ok(player.hp < hp, 'Duels retain same-tick reset pressure');
    assert.equal(player.state, 'hit');
  }
}
for (const lockedState of ['hit', 'block', 'knockdown']) for (const [mode, framesLeft] of [['belt', 4], ['belt', 5], ['duel', 4]]) {
  const world = setUp(mode);
  const { player, enemy } = world;
  if (lockedState === 'knockdown') player.receiveHit({ ...jab, knockdown: true }, enemy, false);
  else hit(world, lockedState === 'block');
  assert.equal(player.state, lockedState);
  player.hitStop = 0;
  player.stateFrame = -framesLeft;
  enemy.x = 980;
  enemy.aiCooldown = 9999;
  world.update({ ...input, pressed: action => action === 'jump' }, 1);
  assert.equal(player.state, lockedState, 'The jump cannot interrupt recovery');
  assert.equal(player.airborne, false);
  for (let tick = 2; tick <= framesLeft; tick++) world.update(input, tick);
  assert.equal(player.state, 'idle', 'The final recovery tick is still grounded');
  world.update(input, framesLeft + 1);
  assert.equal(player.airborne, mode === 'belt' && framesLeft === 4, 'Only a late belt jump starts on the first free tick');
}
{
  const world = setUp('belt');
  const { player, enemy } = world;
  assert.ok(hit(world) > 0);
  player.hitStop = 0;
  player.stateFrame = -3;
  world.update({ ...input, pressed: action => action === 'jump' }, 1);
  assert.ok(hit(world) > 0, 'A follow-up can still land inside the old hitstun');
  enemy.x = 980;
  enemy.aiCooldown = 9999;
  for (let tick = 2; tick < 40; tick++) world.update(input, tick);
  assert.equal(player.airborne, false, 'The second hit discards the pending jump');
  assert.equal(player.state, 'idle');
}
// A released diagonal can still contribute one step on the first free tick.
for (const lockedState of ['hit', 'block', 'knockdown']) for (const [framesLeft, heldRight] of [[4, false], [4, true], [5, false]]) {
  const world = setUp('belt');
  const { player, enemy } = world;
  if (lockedState === 'knockdown') player.receiveHit({ ...jab, knockdown: true }, enemy, false);
  else hit(world, lockedState === 'block');
  assert.equal(player.state, lockedState);
  player.hitStop = 0;
  player.stateFrame = -framesLeft;
  enemy.x = 980;
  enemy.aiCooldown = 9999;
  const x = player.x, y = player.y;
  const diagonal = new Set(['right', 'down']);
  world.update({ ...input, pressed: action => diagonal.has(action), directionChanges: () => [new Set(), diagonal] }, 1);
  const held = { ...input, held: action => heldRight && action === 'right' };
  for (let tick = 2; tick <= framesLeft; tick++) world.update(held, tick);
  assert.deepEqual([player.x, player.y], [x, y], 'A remembered step cannot skip hitstun');
  world.update(held, framesLeft + 1);
  assert.equal(player.x > x, framesLeft === 4);
  assert.equal(player.y > y, framesLeft === 4, 'Only a late tap contributes a depth step');
  const afterX = player.x, afterY = player.y;
  world.update(held, framesLeft + 2);
  assert.equal(player.x > afterX, heldRight);
  assert.equal(player.y, afterY, 'The released axis does not drift');
}
for (const [mode, framesLeft, outcome] of [
  ['belt', 4, '5MP'], ['belt', 5, undefined], ['duel', 4, undefined],
  ['belt', 4, 'reblock'], ['belt', 4, 'fresh'], ['belt', 4, 'hit'],
]) {
  const world = setUp(mode);
  const { player, enemy } = world;
  hit(world, outcome !== 'hit');
  player.hitStop = 0;
  player.stateFrame = -framesLeft;
  enemy.x = 980;
  enemy.aiCooldown = 9999;
  world.update({ ...input, pressed: action => action === 'mp' }, 1);
  assert.equal(player.currentMove, null, 'A reserved button cannot shorten recovery');
  if (outcome === 'reblock') {
    hit(world, true);
    player.hitStop = 0;
    player.stateFrame = -(framesLeft - 1);
    enemy.x = 980;
    enemy.aiCooldown = 9999;
  }
  for (let tick = 2; tick <= framesLeft; tick++) world.update(input, tick);
  assert.equal(player.currentMove, null);
  world.update(outcome === 'fresh' ? { ...input, pressed: action => action === 'lp' } : input, framesLeft + 1);
  const expected = outcome === 'fresh' ? '5LP' : outcome === '5MP' ? outcome : undefined;
  assert.equal(player.currentMove?.id, expected, 'Only a valid guard-recovery input survives to the first free tick');
  if (expected) {
    assert.equal(player.moveFrame, 0);
    world.update(input, framesLeft + 2);
    assert.equal(player.moveFrame, 1, 'The buffered normal fires once');
  }
}
console.log('BELT_CROWD_RECOVERY_PASS');
