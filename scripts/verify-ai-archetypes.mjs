import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class StubInput {
  held() { return false; }
  pressed() { return false; }
  released() { return false; }
}
const fail = (message) => { console.error('AI_ARCHETYPE_VERIFY_FAIL', message); process.exit(1); };

const world = new CombatWorld(getCharacter('RYU'), getCharacter('KEN'), 'belt');
world.player.x = 400; world.player.y = 500;
world.replaceEnemies([
  { character: getCharacter('ALEX'), archetype: 'grappler', x: 510, y: 500 },
  { character: getCharacter('IBUKI'), archetype: 'agile', x: 710, y: 440 },
  { character: getCharacter('RYU'), archetype: 'ranged', x: 1010, y: 545 },
  { character: getCharacter('KEN'), archetype: 'heavy', x: 830, y: 420 },
  { character: getCharacter('MAKOTO'), archetype: 'technical', x: 620, y: 560 },
  { character: getCharacter('DUDLEY'), archetype: 'mma', x: 740, y: 535 },
]);
const [grappler, agile, ranged, heavy, technical, mma] = world.enemies;
if (!grappler || !agile || !ranged || !heavy || !technical || !mma) fail('missing archetype enemies');
if (!(grappler.aiProfile.preferredDistance < ranged.aiProfile.preferredDistance)) fail('distance profiles not distinct');
if (!(agile.aiProfile.moveSpeed > heavy.aiProfile.moveSpeed)) fail('movement profiles not distinct');
if (!(grappler.aiProfile.throwBias > agile.aiProfile.throwBias)) fail('throw profile not distinct');
if (!(technical.aiProfile.parryChance > karateFallback())) fail('technical parry profile not distinct');
if (!(mma.aiProfile.throwBias > technical.aiProfile.throwBias)) fail('mma hybrid throw profile not distinct');
world.update(new StubInput(), 1);
const rangedRole = world.director.roleFor(ranged);
if (rangedRole !== 'ranged' && rangedRole !== 'wait') fail(`unexpected ranged role ${rangedRole}`);
const attackers = world.director.activeAttackers(world.enemies);
if (attackers < 1 || attackers > 2) fail(`attack slot count ${attackers}`);

function karateFallback() { return 0.12; }

console.log('AI_ARCHETYPE_VERIFY_PASS', {
  grapplerDistance: grappler.aiProfile.preferredDistance,
  rangedDistance: ranged.aiProfile.preferredDistance,
  agileSpeed: agile.aiProfile.moveSpeed,
  heavySpeed: heavy.aiProfile.moveSpeed,
  grapplerThrowBias: grappler.aiProfile.throwBias,
  technicalParryChance: technical.aiProfile.parryChance,
  mmaThrowBias: mma.aiProfile.throwBias,
  rangedRole,
  attackers,
});
