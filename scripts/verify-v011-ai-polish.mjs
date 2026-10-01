import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';

const fail = (message) => { console.error('V011_AI_POLISH_FAIL', message); process.exit(1); };
class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio { playStagePulse() {} playHit() {} playParry() {} startStageSoundscape() {} setStageIntensity() {} playStageBeat() {} }
const input = new StubInput();

// Duel AI should recognize a cornered target and shift into pressure behavior.
const corner = new CombatWorld(getCharacter('RYU'), getCharacter('ALEX'), 'duel');
corner.player.x = corner.rules.arenaRight - 34;
corner.enemy.x = corner.player.x - 62;
corner.player.y = corner.enemy.y = 500;
corner.enemy.aiCooldown = 0;
corner.update(input, 1);
if (corner.enemy.aiCornerPressureCount < 1) fail('corner pressure branch did not trigger');
if (corner.enemy.aiCornerPressureFrames <= 0) fail('corner pressure feedback window missing');

// Fast duel AI should anti-air or jump-chase a sufficiently high airborne target.
const chase = new CombatWorld(getCharacter('RYU'), getCharacter('YUN'), 'duel');
chase.player.x = 650; chase.enemy.x = 760; chase.player.y = chase.enemy.y = 500;
chase.player.airborne = true; chase.player.jumpHeight = 105; chase.player.jumpVelocity = 2.5; chase.player.state = 'jump';
chase.enemy.aiCooldown = 0;
chase.update(input, 2);
if (chase.enemy.aiAirChaseCount < 1) fail('air chase / anti-air branch did not trigger');
if (!chase.enemy.currentMove) fail('air chase did not choose a move');

// Stage 5 boss pattern controller should cycle through more than one Urien and Gill pattern.
const ryu = getCharacter('RYU');
const scene = new Stage5Scene(input, new StubAudio(), ryu, ryu.superArts[0]);
scene.introFrames = 0;
scene.prepareDuel(); scene.phase = 'duel';
const urienLabels = new Set();
for (let i = 0; i < 3; i += 1) {
  scene.world.enemy.state = 'idle'; scene.world.enemy.currentMove = null; scene.world.enemy.hitStop = 0;
  scene.bossPatternCooldown = 0;
  scene.updateUrienPattern();
  for (const e of scene.world.events) if (e.type === 'boss-warning' && e.label) urienLabels.add(e.label);
}
if (urienLabels.size < 3) fail(`Urien pattern variety too low: ${[...urienLabels].join(', ')}`);

scene.prepareFinalDuel(); scene.phase = 'final-duel'; scene.gillPhase = 3;
const gillLabels = new Set();
for (let i = 0; i < 4; i += 1) {
  scene.world.enemy.state = 'idle'; scene.world.enemy.currentMove = null; scene.world.enemy.hitStop = 0;
  scene.world.player.airborne = false;
  scene.bossPatternCooldown = 0;
  scene.updateGillPattern();
  for (const e of scene.world.events) if (e.type === 'boss-warning' && e.label?.includes('SERAPHIC')) gillLabels.add(e.label);
}
if (gillLabels.size < 3 || !gillLabels.has('SERAPHIC RAIN')) fail(`Gill final pattern variety too low: ${[...gillLabels].join(', ')}`);

console.log('V011_AI_POLISH_VERIFY_PASS', {
  cornerPressure: corner.enemy.aiCornerPressureCount,
  airChase: chase.enemy.currentMove.label,
  urienPatterns: [...urienLabels],
  gillPatterns: [...gillLabels],
});
