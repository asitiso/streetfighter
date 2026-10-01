import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, SPECIAL_MOVES, THROW_MOVE } from '../dist/assets/combat/MoveLibrary.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';

class StubInput {
  heldSet = new Set();
  pressedSet = new Set();
  held(action) { return this.heldSet.has(action); }
  pressed(action) { return this.pressedSet.has(action); }
  released() { return false; }
  set(held = [], pressed = []) { this.heldSet = new Set(held); this.pressedSet = new Set(pressed); }
}

const fail = (message) => { console.error('COMBAT_VERIFY_FAIL', message); process.exit(1); };
const input = new StubInput();

const hitWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
hitWorld.player.x = 500; hitWorld.player.y = 500; hitWorld.enemy.x = 570; hitWorld.enemy.y = 500; hitWorld.enemy.aiCooldown = 996;
hitWorld.player.startMove(normalFor('hp'));
for (let tick = 1; tick <= 16; tick += 1) hitWorld.update(input, tick);
if (hitWorld.enemy.hp >= 1000) fail('heavy punch did not damage target');

const guardWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
guardWorld.player.x = 500; guardWorld.player.y = 500; guardWorld.enemy.x = 570; guardWorld.enemy.y = 500; guardWorld.enemy.aiCooldown = 999; guardWorld.enemy.aiProfile.guardChance = 1;
guardWorld.player.startMove(normalFor('hp'));
for (let tick = 1; tick <= 12; tick += 1) guardWorld.update(input, tick);
if (!guardWorld.events.some((event) => event.type === 'block')) fail('AI guard path not reached');

const parryWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
parryWorld.player.x = 500; parryWorld.enemy.x = 570; parryWorld.player.y = 500; parryWorld.enemy.y = 500;
parryWorld.player.parryWindow = 20; parryWorld.enemy.aiCooldown = 996; parryWorld.enemy.startMove(normalFor('hp'));
for (let tick = 1; tick <= 12; tick += 1) parryWorld.update(input, tick);
if (!parryWorld.events.some((event) => event.type === 'parry')) fail('parry path not reached');
if (parryWorld.player.hp !== 1000) fail('parry took damage');

const fighter = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
const beltRules = { mode: 'belt', depthMovement: true, laneTolerance: 54, arenaLeft: 100, arenaRight: 1180, arenaTop: 380, arenaBottom: 590 };
input.set(['down'], ['down']); fighter.captureInput(input, 1); fighter.updatePlayer(input, beltRules);
input.set(['down', 'right'], ['right']); fighter.captureInput(input, 2); fighter.updatePlayer(input, beltRules);
input.set(['right', 'lp'], ['lp']); fighter.captureInput(input, 3); fighter.updatePlayer(input, beltRules);
if (fighter.currentMove?.label !== 'HADOKEN') fail(`expected HADOKEN, got ${fighter.currentMove?.label ?? 'none'}`);

const projectileWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
projectileWorld.player.x = 360; projectileWorld.enemy.x = 760; projectileWorld.player.y = 500; projectileWorld.enemy.y = 500; projectileWorld.enemy.aiCooldown = 999;
projectileWorld.player.startMove(SPECIAL_MOVES.find((move) => move.label === 'HADOKEN'));
for (let tick = 1; tick <= 60; tick += 1) projectileWorld.update(input, tick);
if (projectileWorld.enemy.hp >= 1000) fail('projectile did not hit target');

const jumpOverWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
jumpOverWorld.player.x = 500; jumpOverWorld.player.y = 500; jumpOverWorld.player.airborne = true; jumpOverWorld.player.jumpHeight = 105;
jumpOverWorld.enemy.x = 610; jumpOverWorld.enemy.y = 500; jumpOverWorld.enemy.facing = -1;
const jumpOverMove = SPECIAL_MOVES.find((move) => move.label === 'HADOKEN');
jumpOverWorld.spawnScriptedProjectile(jumpOverWorld.enemy, jumpOverMove);
jumpOverWorld.projectiles[0].x = jumpOverWorld.player.x + 8;
const jumpHp = jumpOverWorld.player.hp;
jumpOverWorld.updateProjectiles(input);
if (jumpOverWorld.player.hp !== jumpHp) fail('high jump did not clear ground projectile');

const verticalWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
verticalWorld.player.x = 500; verticalWorld.player.y = 500; verticalWorld.enemy.x = 558; verticalWorld.enemy.y = 500;
verticalWorld.enemy.airborne = true; verticalWorld.enemy.jumpHeight = 105; verticalWorld.enemy.state = 'jump';
verticalWorld.player.startMove(normalFor('hp'));
verticalWorld.player.moveFrame = verticalWorld.player.currentMove.startup;
const verticalHp = verticalWorld.enemy.hp;
verticalWorld.resolveAttack(verticalWorld.player, verticalWorld.enemy, input);
if (verticalWorld.enemy.hp !== verticalHp) fail('ground normal hit opponent at jump apex');
verticalWorld.enemy.jumpHeight = 40;
verticalWorld.resolveAttack(verticalWorld.player, verticalWorld.enemy, input);
if (verticalWorld.enemy.hp >= verticalHp) fail('ground normal missed low airborne opponent');

const wallPairWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
wallPairWorld.player.x = wallPairWorld.rules.arenaLeft;
wallPairWorld.player.y = 500;
wallPairWorld.enemy.x = wallPairWorld.rules.arenaLeft + 8;
wallPairWorld.enemy.y = 500;
wallPairWorld.resolveBodyCollisions();
if (wallPairWorld.player.x < wallPairWorld.rules.arenaLeft || wallPairWorld.enemy.x < wallPairWorld.rules.arenaLeft) fail('body collision pushed fighter outside left arena wall');
if (Math.abs(wallPairWorld.enemy.x - wallPairWorld.player.x) < 57.5) fail('wall body collision failed to transfer blocked separation to free fighter');

const freezeWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
freezeWorld.time = 3;
freezeWorld.playerComboHits = 2;
freezeWorld.playerComboDamage = 120;
freezeWorld.playerComboTimer = 40;
freezeWorld.enemyComboHits = 1;
freezeWorld.enemyComboTimer = 30;
freezeWorld.superFreezeFrames = 2;
const freezeTime = freezeWorld.time;
input.set();
freezeWorld.update(input, 650);
if (freezeWorld.time !== freezeTime) fail('super freeze advanced combat logical time');
if (freezeWorld.playerComboTimer !== 40 || freezeWorld.enemyComboTimer !== 30) fail('super freeze consumed combo timers');
if (freezeWorld.superFreezeFrames !== 1) fail('super freeze did not advance its own countdown');

const tradeWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
tradeWorld.player.x = 500; tradeWorld.enemy.x = 552; tradeWorld.player.y = 500; tradeWorld.enemy.y = 500;
tradeWorld.player.startMove(normalFor('hp')); tradeWorld.enemy.startMove(normalFor('hp'));
tradeWorld.player.moveFrame = tradeWorld.player.currentMove.startup - 1;
tradeWorld.enemy.moveFrame = tradeWorld.enemy.currentMove.startup - 1;
const tradePlayerHp = tradeWorld.player.hp;
const tradeEnemyHp = tradeWorld.enemy.hp;
input.set();
tradeWorld.update(input, 700);
if (tradeWorld.player.hp >= tradePlayerHp || tradeWorld.enemy.hp >= tradeEnemyHp) fail('same-frame duel strikes did not trade damage');

const counterWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
counterWorld.player.x = 500; counterWorld.enemy.x = 558; counterWorld.player.y = 500; counterWorld.enemy.y = 500;
counterWorld.enemy.startMove(normalFor('hp')); counterWorld.player.startMove(normalFor('lp')); counterWorld.enemy.aiCooldown = 997; counterWorld.enemy.aiProfile.guardChance = 0; input.set();
for (let tick = 1; tick <= 7; tick += 1) counterWorld.update(input, tick);
if (!counterWorld.events.some((event) => event.type === 'counter')) fail('counter-hit path not reached');

const throwWorld = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
throwWorld.player.x = 500; throwWorld.enemy.x = 550; throwWorld.player.y = 500; throwWorld.enemy.y = 500; throwWorld.enemy.aiCooldown = 999;
input.set(['lp', 'lk'], ['lp', 'lk']); throwWorld.player.captureInput(input, 0);
input.set(); throwWorld.enemy.startMove(THROW_MOVE);
for (let tick = 1; tick <= 6; tick += 1) throwWorld.update(input, tick);
if (!throwWorld.events.some((event) => event.type === 'throw-escape')) fail('throw escape path not reached');

const duelFighter = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
const duelRules = { mode: 'duel', depthMovement: false, laneTolerance: 22, arenaLeft: 100, arenaRight: 1180, arenaTop: 500, arenaBottom: 500 };
input.set(['up'], ['up']); duelFighter.captureInput(input, 1); duelFighter.updatePlayer(input, duelRules);
input.set(); duelFighter.captureInput(input, 2); duelFighter.updatePlayer(input, duelRules);
if (!duelFighter.airborne || duelFighter.jumpHeight <= 0) fail('duel jump did not become airborne');

const crouchFighter = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
input.set(['down', 'mk'], ['down', 'mk']); crouchFighter.captureInput(input, 1); crouchFighter.updatePlayer(input, duelRules);
if (crouchFighter.currentMove?.id !== '2MK') fail(`expected 2MK, got ${crouchFighter.currentMove?.id ?? 'none'}`);

const interrupted = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
const interrupter = new Fighter(getCharacter('KEN'), 'enemy', 460, 500, -1);
interrupted.startMove(normalFor('hp'));
interrupted.moveFrame = interrupted.currentMove.startup;
if (!interrupted.isMoveActive()) fail('interruption fixture never entered active frames');
interrupted.receiveHit(normalFor('lp'), interrupter, false, true);
if (interrupted.currentMove !== null || interrupted.isMoveActive() || interrupted.state !== 'hit') fail('hit did not cancel stale active move');

const blocked = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
blocked.currentMove = normalFor('hp');
blocked.moveFrame = blocked.currentMove.startup;
blocked.state = 'idle';
blocked.receiveHit(normalFor('lp'), interrupter, true, false);
if (blocked.currentMove !== null || blocked.state !== 'block') fail('valid guard did not clear stale move state');

const parried = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
parried.currentMove = normalFor('hp');
parried.moveFrame = parried.currentMove.startup;
parried.state = 'idle';
parried.parryWindow = 10;
parried.receiveHit(normalFor('lp'), interrupter, false, false);
if (parried.currentMove !== null || parried.state !== 'parry') fail('valid parry did not clear stale move state');

const attackingGuard = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
attackingGuard.parryWindow = 6;
attackingGuard.lowParryWindow = 6;
attackingGuard.startMove(normalFor('hp'));
if (attackingGuard.canDefend()) fail('attacking fighter remained guard eligible');
if (attackingGuard.parryWindow !== 0 || attackingGuard.lowParryWindow !== 0) fail('attack start did not close parry windows');
const attackHp = attackingGuard.hp;
attackingGuard.receiveHit(normalFor('lp'), interrupter, true, true);
if (attackingGuard.hp >= attackHp || attackingGuard.state !== 'hit') fail('attacking fighter incorrectly blocked incoming hit');

const airGuard = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
airGuard.airborne = true;
airGuard.jumpHeight = 50;
if (airGuard.canDefend()) fail('airborne fighter incorrectly guard eligible');
if (airGuard.canBeThrown()) fail('airborne fighter incorrectly throwable');

const downedThrow = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
downedThrow.state = 'knockdown';
if (downedThrow.canBeThrown()) fail('knocked-down fighter incorrectly throwable');
const hitThrow = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
hitThrow.state = 'hit';
if (hitThrow.canBeThrown()) fail('hit-stun fighter incorrectly throwable');

const hitStopAir = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
hitStopAir.airborne = true;
hitStopAir.state = 'jump';
hitStopAir.jumpHeight = 80;
hitStopAir.jumpVelocity = 5;
hitStopAir.hitStop = 2;
input.set();
hitStopAir.updatePlayer(input, duelRules);
if (hitStopAir.jumpHeight !== 80 || hitStopAir.jumpVelocity !== 5 || hitStopAir.hitStop !== 1) fail('hit stop advanced airborne physics');

const parryBuffer = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
parryBuffer.startMove(normalFor('lp'));
parryBuffer.moveFrame = parryBuffer.currentMove.startup + parryBuffer.currentMove.active + parryBuffer.currentMove.recovery - 1;
input.set(['right'], ['right']);
parryBuffer.updatePlayer(input, duelRules);
if (parryBuffer.parryWindow !== 0 || parryBuffer.redParryWindow !== 0) fail('attack buffered a parry window into recovery');

const dashInterrupted = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
dashInterrupted.dashFrames = 6;
dashInterrupted.state = 'walk';
dashInterrupted.receiveHit(normalFor('lp'), interrupter, false, false);
if (dashInterrupted.dashFrames !== 0) fail('hit did not cancel residual dash frames');

const throwProtected = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
throwProtected.beginThrowSync('victim', interrupter.uid, -1, 12);
if (throwProtected.canBeThrown()) fail('throw-synced victim remained throwable');
throwProtected.throwSyncFrames = 0;
throwProtected.throwEscapeFrames = 8;
if (throwProtected.canBeThrown()) fail('throw escape recovery remained throwable');

const landingAttack = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
landingAttack.airborne = true;
landingAttack.jumpHeight = .2;
landingAttack.jumpVelocity = -2;
landingAttack.startMove(airNormalFor('RYU', 'hp'));
input.set();
landingAttack.updatePlayer(input, duelRules);
if (landingAttack.airborne || landingAttack.currentMove !== null || landingAttack.state !== 'idle' || landingAttack.landingFrames <= 0) fail('air normal survived landing');

console.log('COMBAT_VERIFY_PASS', {
  hitDamage: 1000 - hitWorld.enemy.hp,
  guard: true,
  parry: true,
  command: fighter.currentMove.id,
  projectileDamage: 1000 - projectileWorld.enemy.hp,
  projectileJumpClear: jumpOverWorld.player.hp === jumpHp,
  verticalMeleeFiltering: verticalWorld.enemy.hp < verticalHp,
  wallSeparationBounded: wallPairWorld.player.x >= wallPairWorld.rules.arenaLeft,
  superFreezePreservesCombatClock: freezeWorld.time === freezeTime && freezeWorld.playerComboTimer === 40,
  duelStrikeTrade: tradeWorld.player.hp < tradePlayerHp && tradeWorld.enemy.hp < tradeEnemyHp,
  counter: true,
  throwEscape: true,
  jump: true,
  crouchNormal: crouchFighter.currentMove.id,
  interruptedMoveCancelled: interrupted.currentMove === null,
  blockedMoveCancelled: blocked.currentMove === null,
  parriedMoveCancelled: parried.currentMove === null,
  airMoveCancelledOnLanding: landingAttack.currentMove === null,
  attackCannotGuard: !attackingGuard.canDefend(),
  airGuardDisabled: !airGuard.canDefend(),
  airborneThrowDisabled: !airGuard.canBeThrown(),
  knockdownThrowDisabled: !downedThrow.canBeThrown(),
  hitStopFreezesAir: hitStopAir.jumpHeight === 80,
  attackParryBufferBlocked: parryBuffer.parryWindow === 0,
  dashCancelledOnHit: dashInterrupted.dashFrames === 0,
  throwSyncProtected: !throwProtected.canBeThrown(),
});
