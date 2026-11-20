// V080: Street Fighter core rules — combo damage scaling, chip damage, time-over decision.
import { Fighter, comboDamageScale, chipDamageFor } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, SPECIAL_MOVES } from '../dist/assets/combat/MoveLibrary.js';

const fail = (message) => { console.error('V080_FIGHT_RULES_FAIL', message); process.exit(1); };

// 1) Scaling curve: hits 1-2 full, then -10% per hit, floored at 30% (supers 50%).
const curve = [1, 2, 3, 4, 5, 8, 12].map((n) => comboDamageScale(n, {}));
if (curve[0] !== 1 || curve[1] !== 1) fail(`first two hits must be unscaled: ${curve}`);
if (Math.abs(curve[2] - .9) > 1e-9 || Math.abs(curve[3] - .8) > 1e-9) fail(`scaling slope wrong: ${curve}`);
if (Math.abs(curve[6] - .3) > 1e-9) fail(`normal floor wrong: ${curve}`);
if (Math.abs(comboDamageScale(20, { superCost: 1 }) - .5) > 1e-9) fail('super floor wrong');

// 2) Consecutive hits while reeling are scaled; a fresh hit after recovery is not.
const attacker = new Fighter(getCharacter('RYU'), 'player', 500, 500, 1);
const victim = new Fighter(getCharacter('KEN'), 'enemy', 560, 500, -1);
const jab = normalFor('lp');
const damages = [];
for (let i = 0; i < 6; i += 1) {
  const before = victim.hp;
  victim.receiveHit(jab, attacker, false);
  damages.push(before - victim.hp);
}
if (damages[0] !== jab.damage || damages[1] !== jab.damage) fail(`opening hits scaled: ${damages}`);
if (!(damages[5] < damages[0])) fail(`long combo not scaled: ${damages}`);
if (victim.comboHitsTaken !== 6) fail(`combo counter ${victim.comboHitsTaken}`);
victim.state = 'idle'; victim.airborne = false; victim.juggleHits = 0;
const fresh = victim.hp; victim.receiveHit(jab, attacker, false);
if (fresh - victim.hp !== jab.damage || victim.comboHitsTaken !== 1) fail('combo scaling did not reset after recovery');

// 3) Chip damage: normals never chip, specials/supers do.
const special = SPECIAL_MOVES.find((move) => !move.button && move.kind !== 'throw' && !move.superCost);
if (!special) fail('no special move found');
if (chipDamageFor(jab) !== 0) fail('normal chipped');
if (!(chipDamageFor(special) > 0)) fail('special did not chip');
const guard = new Fighter(getCharacter('KEN'), 'enemy', 560, 500, -1);
const hpBefore = guard.hp;
const outcome = guard.receiveHit(special, attacker, true);
if (outcome !== 'block') fail(`special was not blocked: ${outcome}`);
if (hpBefore - guard.hp !== chipDamageFor(special)) fail('blocked special chip mismatch');
const guard2 = new Fighter(getCharacter('KEN'), 'enemy', 560, 500, -1);
guard2.receiveHit(jab, attacker, true);
if (guard2.hp !== guard2.maxHp) fail('blocked normal took damage');

// 4) Time-over decision: duel won on life lead, lost when behind; belt time-over stays a loss.
const { Stage1Scene } = await import('../dist/assets/scenes/Stage1Scene.js');
const stubInput = { held: () => false, pressed: () => false, released: () => false };
const stubAudio = new Proxy({}, { get: () => () => {} });
const reachDuel = (scene) => {
  let tick = 1;
  scene.introFrames = 0;
  for (let wave = 0; wave < 3; wave += 1) {
    for (const enemy of scene.world.enemies) enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (wave < 2) { scene.world.player.x = scene.areaStarts[wave + 1] + 160; scene.fixedUpdate(1 / 60, tick++); for (let t = 0; t < 60; t += 1) scene.fixedUpdate(1 / 60, tick++); }
  }
  for (let t = 0; t < 400 && scene.phase !== 'duel'; t += 1) scene.fixedUpdate(1 / 60, tick++);
  if (scene.phase !== 'duel') fail(`duel not reached: ${scene.phase}`);
  return tick;
};
const timeOver = (playerRatio, enemyRatio) => {
  const scene = new Stage1Scene(stubInput, stubAudio, getCharacter('RYU'), getCharacter('RYU').superArts[0], 1);
  let tick = reachDuel(scene);
  scene.world.enemy.aiCooldown = 9999;
  scene.world.player.hp = Math.round(scene.world.player.maxHp * playerRatio);
  scene.world.enemy.hp = Math.round(scene.world.enemy.maxHp * enemyRatio);
  scene.stageTime = .001;
  scene.fixedUpdate(1 / 60, tick++);
  return scene;
};
const won = timeOver(.6, .4);
if (won.phase !== 'clear') fail(`time-over with life lead should win, got ${won.phase}`);
const lost = timeOver(.3, .7);
if (lost.phase !== 'defeat' || lost.defeatReason !== 'time-over') fail(`time-over while behind should lose, got ${lost.phase}`);
const belt = new Stage1Scene(stubInput, stubAudio, getCharacter('RYU'), getCharacter('RYU').superArts[0], 1);
belt.introFrames = 0; belt.stageTime = .001; belt.fixedUpdate(1 / 60, 1);
if (belt.phase !== 'defeat') fail(`belt time-over should stay a loss, got ${belt.phase}`);

console.log('V080_FIGHT_RULES_PASS', { scaling: curve.map((v) => +v.toFixed(2)), comboDamages: damages, chip: chipDamageFor(special), special: special.id });
