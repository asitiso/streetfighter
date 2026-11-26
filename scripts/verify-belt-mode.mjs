import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, THROW_MOVE } from '../dist/assets/combat/MoveLibrary.js';

class StubInput {
  heldSet = new Set();
  pressedSet = new Set();
  held(action) { return this.heldSet.has(action); }
  pressed(action) { return this.pressedSet.has(action); }
  released() { return false; }
  set(held = [], pressed = []) { this.heldSet = new Set(held); this.pressedSet = new Set(pressed); }
}

const fail = (message) => { console.error('BELT_VERIFY_FAIL', message); process.exit(1); };
const input = new StubInput();

const directorWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
directorWorld.replaceEnemies([
  { character: getCharacter('KEN'), x: 720, y: 490 },
  { character: getCharacter('ALEX'), x: 790, y: 450 },
  { character: getCharacter('DUDLEY'), x: 850, y: 530 },
  { character: getCharacter('YUN'), x: 920, y: 420 },
  { character: getCharacter('CHUNLI'), x: 980, y: 560 },
]);
directorWorld.update(input, 1);
const activeAttackers = directorWorld.director.activeAttackers(directorWorld.enemies);
if (activeAttackers < 1 || activeAttackers > 2) fail(`director attack slots invalid: ${activeAttackers}`);

const pressureWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
pressureWorld.player.x = 600;
pressureWorld.player.y = 500;
pressureWorld.replaceEnemies([
  { character: getCharacter('KEN'), x: 680, y: 500 },
  { character: getCharacter('ALEX'), x: 750, y: 500 },
  { character: getCharacter('DUDLEY'), x: 800, y: 500 },
]);
const [nearby, committed, other] = pressureWorld.enemies;
const windup = normalFor('hp', false, committed.character.id);
committed.startMove(windup);
committed.aiCooldown = 60;
for (const frame of [0, windup.startup, windup.startup + windup.active - 1]) {
  committed.moveFrame = frame;
  committed.hitStop = frame === 0 ? 3 : 0;
  const directives = pressureWorld.director.update(pressureWorld.player, pressureWorld.enemies, pressureWorld.rules);
  if (directives.get(nearby.uid).attackAllowed || directives.get(other.uid).attackAllowed) fail('new melee start while the small wave slot is committed');
}
committed.moveFrame = windup.startup + windup.active;
const recoveryDirectives = pressureWorld.director.update(pressureWorld.player, pressureWorld.enemies, pressureWorld.rules);
if (!recoveryDirectives.get(nearby.uid).attackAllowed) fail('first recovery frame must release the attack slot');

const mixedWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
mixedWorld.player.x = 600;
mixedWorld.player.y = 500;
mixedWorld.replaceEnemies([
  { character: getCharacter('RYU'), archetype: 'ranged', x: 960, y: 500 },
  { character: getCharacter('ALEX'), x: 680, y: 500 },
  { character: getCharacter('DUDLEY'), x: 725, y: 500 },
  { character: getCharacter('KEN'), archetype: 'ranged', x: 1100, y: 500 },
]);
const [thrower, brawler] = mixedWorld.enemies;
const projectile = specialMovesFor(thrower.character.id).primary;
if (!projectile.projectile) fail('test requires a ranged special');
thrower.startMove(projectile);
brawler.startMove(normalFor('hp', false, brawler.character.id));
let mixed = mixedWorld.director.update(mixedWorld.player, mixedWorld.enemies, mixedWorld.rules);
if ([...mixed.values()].some(d => d.attackAllowed || d.rangedAllowed)) fail('already committed melee and projectile fill the total attack budget');
thrower.hp = 0;
mixed = mixedWorld.director.update(mixedWorld.player, mixedWorld.enemies, mixedWorld.rules);
if (mixed.has(thrower.uid) || ![...mixed.values()].some(d => d.rangedAllowed)) fail('KO releases the ranged opening without releasing the melee slot');

const multiWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
multiWorld.player.x = 500; multiWorld.player.y = 500;
multiWorld.replaceEnemies([
  { character: getCharacter('KEN'), x: 570, y: 500, hp: 300 },
  { character: getCharacter('DUDLEY'), x: 590, y: 514, hp: 300 },
  { character: getCharacter('ALEX'), x: 610, y: 486, hp: 300 },
]);
for (const enemy of multiWorld.enemies) enemy.aiCooldown = 997;
multiWorld.player.startMove(normalFor('hk'));
for (let tick = 1; tick <= 18; tick += 1) multiWorld.update(input, tick);
const damagedCount = multiWorld.enemies.filter((enemy) => enemy.hp < enemy.maxHp).length;
if (damagedCount < 2) fail(`multi-hit expected >=2 damaged enemies, got ${damagedCount}`);

const laneWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
laneWorld.player.x = 500; laneWorld.player.y = 500;
laneWorld.enemy.x = 570; laneWorld.enemy.y = 555; laneWorld.enemy.aiCooldown = 997;
laneWorld.player.startMove(normalFor('mp'));
const laneStart = laneWorld.player.y;
for (let tick = 1; tick <= 5; tick += 1) laneWorld.update(input, tick);
if (laneWorld.player.y <= laneStart) fail('soft lane alignment did not nudge player toward target lane');
if (laneWorld.player.y - laneStart > 12) fail('soft lane alignment snapped too far');

const jumpPassWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
jumpPassWorld.player.x = 500; jumpPassWorld.player.y = 500; jumpPassWorld.enemy.x = 520; jumpPassWorld.enemy.y = 500;
jumpPassWorld.player.airborne = true; jumpPassWorld.player.jumpHeight = 80; jumpPassWorld.player.state = 'jump';
const playerBeforePush = jumpPassWorld.player.x;
const enemyBeforePush = jumpPassWorld.enemy.x;
jumpPassWorld.resolveBodyCollisions();
if (jumpPassWorld.player.x !== playerBeforePush || jumpPassWorld.enemy.x !== enemyBeforePush) fail('high jump was blocked by fighter pushbox');

jumpPassWorld.addProp({ id: 'jump-crate', label: 'JUMP CRATE', x: 500, y: 500, width: 60, depth: 40, hp: 100, solid: true });
jumpPassWorld.resolveBodyCollisions();
if (jumpPassWorld.player.x !== playerBeforePush || jumpPassWorld.player.y !== 500) fail('high jump was blocked by low environment prop');

const propWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
propWorld.player.x = 500; propWorld.player.y = 500; propWorld.enemy.x = 1100; propWorld.enemy.y = 420; propWorld.enemy.aiCooldown = 997;
propWorld.addProp({ id: 'crate-test', label: 'TEST CRATE', x: 575, y: 500, width: 60, depth: 40, hp: 45, solid: true });
propWorld.player.startMove(normalFor('hk'));
for (let tick = 1; tick <= 16; tick += 1) propWorld.update(input, tick);
if (!propWorld.props[0]?.broken || !propWorld.events.some((event) => event.type === 'prop-break')) fail('environment prop did not break');

const throwWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
throwWorld.player.x = 500; throwWorld.player.y = 500;
throwWorld.replaceEnemies([
  { character: getCharacter('KEN'), x: 550, y: 500, hp: 300 },
  { character: getCharacter('ALEX'), x: 635, y: 500, hp: 300 },
]);
for (const enemy of throwWorld.enemies) enemy.aiCooldown = 997;
throwWorld.player.startMove(THROW_MOVE);
for (let tick = 1; tick <= 8; tick += 1) throwWorld.update(input, tick);
if (!throwWorld.events.some((event) => event.type === 'enemy-collision')) fail('throw-into-enemy collision path not reached');

console.log('BELT_VERIFY_PASS', {
  activeAttackers,
  damagedCount,
  laneNudge: Number((laneWorld.player.y - laneStart).toFixed(2)),
  propBreak: true,
  highJumpPassesPushbox: true,
  highJumpClearsLowProp: true,
  throwCollision: true,
});
