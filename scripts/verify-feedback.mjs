import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';

const fail = (message) => { console.error('FEEDBACK_VERIFY_FAIL', message); process.exit(1); };
class StubInput {
  held() { return false; }
  pressed() { return false; }
  released() { return false; }
}
const input = new StubInput();
const world = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'duel');
world.player.x = 500; world.enemy.x = 565; world.player.y = 500; world.enemy.y = 500;
world.enemy.aiProfile.guardChance = 0; world.enemy.aiProfile.parryChance = 0; world.enemy.aiCooldown = 9999;

world.player.startMove(normalFor('mp', false, 'RYU'));
for (let tick = 1; tick <= 24; tick += 1) world.update(input, tick);
const firstDamage = world.playerComboDamage;
if (world.playerComboHits !== 1 || firstDamage <= 0) fail(`first hit feedback wrong: ${world.playerComboHits}/${firstDamage}`);

world.enemy.x = 565; world.enemy.y = 500; world.enemy.state = 'idle'; world.enemy.stateFrame = 0;
world.player.startMove(normalFor('hp', false, 'RYU'));
for (let tick = 25; tick <= 52; tick += 1) world.update(input, tick);
if (world.playerComboHits < 2) fail(`combo did not accumulate: ${world.playerComboHits}`);
if (world.playerComboDamage <= firstDamage) fail(`combo damage did not accumulate: ${world.playerComboDamage}`);
if (world.lastPlayerHitDamage <= 0 || world.lastPlayerHitTimer <= 0) fail('last-hit damage feedback missing');

world.player.enterVictoryPose();
if (world.player.state !== 'victory' || world.player.currentMove !== null) fail('victory pose state failed');

for (let tick = 53; tick <= 150; tick += 1) {
  world.enemy.aiCooldown = 9999;
  world.update(input, tick);
}
if (world.playerComboHits !== 0 || world.playerComboDamage !== 0) fail('combo timer did not clear');

console.log('FEEDBACK_VERIFY_PASS', {
  firstDamage,
  comboClears: true,
  damageReadout: true,
  victoryState: true,
});
