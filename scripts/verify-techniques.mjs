import { CHARACTERS, getCharacter } from '../dist/assets/game/characters.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { normalFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { techniqueCatalogFor } from '../dist/assets/combat/TechniqueLibrary.js';

const fail = (message) => { console.error('TECHNIQUE_VERIFY_FAIL', message); process.exit(1); };
class StubInput {
  heldSet = new Set(); pressedSet = new Set();
  held(action) { return this.heldSet.has(action); }
  pressed(action) { return this.pressedSet.has(action); }
  released() { return false; }
  set(held = [], pressed = []) { this.heldSet = new Set(held); this.pressedSet = new Set(pressed); }
}
const duelRules = { mode: 'duel', depthMovement: false, laneTolerance: 22, arenaLeft: 100, arenaRight: 1180, arenaTop: 500, arenaBottom: 500 };
const input = new StubInput();

const commandIds = new Set();
for (const character of CHARACTERS) {
  const catalog = techniqueCatalogFor(character.id);
  if (!catalog.command) fail(`${character.id} command normal missing`);
  if (catalog.air.length !== 6 || new Set(catalog.air.map((m) => m.id)).size !== 6) fail(`${character.id} six air normals missing`);
  if (catalog.targetRoutes < 2) fail(`${character.id} target combo routes too small`);
  if (catalog.command.technique !== 'command') fail(`${character.id} command tag missing`);
  if (catalog.air.some((move) => move.technique !== 'air')) fail(`${character.id} air tag missing`);
  commandIds.add(catalog.command.id);
}
if (commandIds.size !== 8) fail('command normals are not character-unique');

const ryuAir = new Fighter(getCharacter('RYU'), 'player', 400, 500, 1);
input.set(['up'], ['up']); ryuAir.captureInput(input, 1); ryuAir.updatePlayer(input, duelRules);
input.set(['hp'], ['hp']); ryuAir.captureInput(input, 2); ryuAir.updatePlayer(input, duelRules);
if (ryuAir.currentMove?.technique !== 'air' || ryuAir.currentMove.id !== 'RYU_AIR_HP') fail(`air input path failed: ${ryuAir.currentMove?.id ?? 'none'}`);

const chunCommand = new Fighter(getCharacter('CHUNLI'), 'player', 400, 500, 1);
input.set(['right', 'hp'], ['right', 'hp']); chunCommand.captureInput(input, 1); chunCommand.updatePlayer(input, duelRules);
if (chunCommand.currentMove?.technique !== 'command') fail(`command input path failed: ${chunCommand.currentMove?.id ?? 'none'}`);

const kenTarget = new Fighter(getCharacter('KEN'), 'player', 400, 500, 1);
kenTarget.startMove(normalFor('lp', false, 'KEN'));
kenTarget.attackConnected = true;
kenTarget.moveFrame = kenTarget.currentMove.startup;
input.set(['mp'], ['mp']); kenTarget.captureInput(input, 1); kenTarget.updatePlayer(input, duelRules);
if (kenTarget.currentMove?.id !== 'KEN_TC_RUSH_2' || kenTarget.currentMove.technique !== 'target') fail(`target combo path failed: ${kenTarget.currentMove?.id ?? 'none'}`);

const presentations = new Set();
for (const character of CHARACTERS) {
  for (const art of character.superArts) {
    const move = superArtMoveFor(character.id, art.id, art.gauge);
    if (!move.superPresentation) fail(`${character.id} SA${art.id} presentation missing`);
    if (move.superPresentation.freezeFrames < 8) fail(`${character.id} SA${art.id} freeze too short`);
    presentations.add(`${move.superPresentation.motif}:${move.superPresentation.accent}`);
  }
}
if (presentations.size < 16) fail(`super presentations insufficiently distinct: ${presentations.size}`);

const art = getCharacter('RYU').superArts[1];
const world = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel', art);
world.player.x = 500; world.enemy.x = 568; world.player.y = 500; world.enemy.y = 500;
world.enemy.aiProfile.guardChance = 0; world.enemy.aiProfile.parryChance = 0; world.enemy.aiCooldown = 999;
world.player.superGauge = art.gauge;
world.player.startMove(superArtMoveFor('RYU', 2, art.gauge));
input.set();
world.update(input, 1);
if (!world.events.some((event) => event.type === 'super-flash' && event.style === 'uppercut')) fail('super flash presentation event missing');
if (world.superFreezeFrames < 8) fail('super freeze was not activated');
for (let tick = 2; tick <= 28; tick += 1) world.update(input, tick);
if (!world.events.some((event) => event.type === 'super-impact')) fail('super impact event missing');

console.log('TECHNIQUE_VERIFY_PASS', {
  characters: CHARACTERS.length,
  commandNormals: commandIds.size,
  airNormals: CHARACTERS.length * 6,
  presentationVariants: presentations.size,
  superFreeze: true,
  targetCombo: kenTarget.currentMove.id,
});
