import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';

const fail = (message) => { console.error('V010_COMBAT_VERIFY_FAIL', message); process.exit(1); };
class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
const input = new StubInput();

// Melee multi-hit must generate repeated real hit checks, not one oversized damage event.
const multi = new CombatWorld(getCharacter('KEN'), getCharacter('RYU'), 'duel');
multi.player.x = 890; multi.enemy.x = 1010; multi.player.y = multi.enemy.y = 500;
multi.enemy.aiProfile.guardChance = 0; multi.enemy.aiProfile.parryChance = 0; multi.enemy.aiCooldown = 9999;
multi.player.superGauge = 500;
const shoryuReppa = superArtMoveFor('KEN', 1, 88);
multi.player.startMove(shoryuReppa);
for (let tick = 1; tick <= 90; tick += 1) { multi.enemy.aiCooldown = 9999; multi.update(input, tick); }
if (multi.playerComboHits < 3) fail(`KEN SA1 expected >=3 hits, got ${multi.playerComboHits}`);
if (multi.playerComboDamage <= 200) fail(`KEN SA1 damage too low: ${multi.playerComboDamage}`);

// Launcher -> second anti-air creates a real juggle event and tracks air hits.
const juggle = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
juggle.player.x = 500; juggle.enemy.x = 570; juggle.player.y = juggle.enemy.y = 500;
juggle.enemy.aiProfile.guardChance = 0; juggle.enemy.aiProfile.parryChance = 0; juggle.enemy.aiCooldown = 9999;
const upper = specialMovesFor('RYU').antiAir;
juggle.player.startMove(upper);
for (let tick = 1; tick <= 18; tick += 1) { juggle.enemy.aiCooldown = 9999; juggle.update(input, tick); }
if (!juggle.enemy.airborne || juggle.enemy.juggleHits < 1) fail('first launcher did not create airborne juggle state');
juggle.player.x = juggle.enemy.x - 58;
juggle.player.startMove(upper);
for (let tick = 19; tick <= 45; tick += 1) { juggle.enemy.aiCooldown = 9999; juggle.update(input, tick); }
if (!juggle.events.some((event) => event.type === 'juggle') && juggle.enemy.juggleHits < 2) fail('follow-up air hit did not register as juggle');

// Wall-bounce super must rebound a cornered opponent back into the arena.
const bounce = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
bounce.player.x = 1060; bounce.enemy.x = 1148; bounce.player.y = bounce.enemy.y = 500;
bounce.enemy.aiProfile.guardChance = 0; bounce.enemy.aiProfile.parryChance = 0; bounce.enemy.aiCooldown = 9999;
bounce.player.superGauge = 500;
const shinShoryu = superArtMoveFor('RYU', 2, 120);
bounce.player.startMove(shinShoryu);
let wallBounceSeen = false;
for (let tick = 1; tick <= 90; tick += 1) { bounce.enemy.aiCooldown = 9999; bounce.update(input, tick); wallBounceSeen ||= bounce.events.some((event) => event.type === 'wall-bounce'); }
if (!wallBounceSeen) fail('wall bounce event missing');
if (bounce.enemy.x >= bounce.rules.arenaRight) fail(`wall bounce did not rebound inward: ${bounce.enemy.x}`);

// Ground-bounce throw re-launches the target for a follow-up window.
const ground = new CombatWorld(getCharacter('ALEX'), getCharacter('RYU'), 'duel');
ground.player.x = 500; ground.enemy.x = 555; ground.player.y = ground.enemy.y = 500;
ground.enemy.aiProfile.guardChance = 0; ground.enemy.aiProfile.parryChance = 0; ground.enemy.aiCooldown = 9999;
ground.player.superGauge = 500;
const hyperBomb = superArtMoveFor('ALEX', 1, 88);
ground.player.startMove(hyperBomb);
let groundBounceSeen = false;
for (let tick = 1; tick <= 55; tick += 1) { ground.enemy.aiCooldown = 9999; ground.update(input, tick); groundBounceSeen ||= ground.events.some((event) => event.type === 'ground-bounce'); }
if (!groundBounceSeen) fail('ground bounce event missing');

console.log('V010_COMBAT_VERIFY_PASS', {
  multiHits: multi.playerComboHits,
  multiDamage: multi.playerComboDamage,
  juggleHits: juggle.enemy.juggleHits,
  wallBounce: true,
  groundBounce: true,
});
