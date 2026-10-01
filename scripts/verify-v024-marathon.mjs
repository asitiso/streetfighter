import assert from 'node:assert/strict';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class MarathonInput {
  tick = 0;
  held(action) {
    if (action === 'right') return (this.tick % 300) < 190;
    if (action === 'left') return (this.tick % 900) > 820;
    if (action === 'down') return (this.tick % 420) > 385;
    return false;
  }
  pressed(action) {
    if (action === 'hp') return this.tick % 47 === 0;
    if (action === 'hk') return this.tick % 73 === 0;
    if (action === 'lp') return this.tick % 31 === 0;
    if (action === 'mp') return this.tick % 101 === 0;
    if (action === 'right') return this.tick % 300 === 0;
    if (action === 'down') return this.tick % 420 === 386;
    return false;
  }
  released() { return false; }
}
class StubAudio {
  playStagePulse(){} playHit(){} playParry(){} startStageSoundscape(){} setStageIntensity(){} playStageBeat(){}
  playAirHit(){} playCommandHit(){} playTargetHit(){} playBlock(){} playThrowEscape(){} playSuperStart(){}
  playSuperImpact(){} playBossCue(){} playKo(){} stopSoundscape(){}
}

const player = getCharacter('RYU');
const input = new MarathonInput();
const summary = [];
for (let stageId = 1; stageId <= 5; stageId += 1) {
  let scene = new Stage1Scene(input, new StubAudio(), player, player.superArts[0], stageId);
  scene.introFrames = 0;
  let maxEvents = 0, maxProjectiles = 0, maxEnemies = 0, restarts = 0;
  const ticks = 36_000; // 10 virtual minutes per stage = 50 minutes total.
  for (let tick = 1; tick <= ticks; tick += 1) {
    input.tick = tick;
    scene.fixedUpdate(1/60, tick);
    const world = scene.world;
    if (tick % 180 === 0) {
      world.player.hp = Math.max(world.player.hp, world.player.maxHp * .72);
      for (const enemy of world.enemies) if (enemy.hp > 0) enemy.hp = Math.max(1, enemy.hp - 125);
    }
    maxEvents = Math.max(maxEvents, world.events.length);
    maxProjectiles = Math.max(maxProjectiles, world.projectiles.length);
    maxEnemies = Math.max(maxEnemies, world.enemies.length);
    for (const fighter of [world.player, ...world.enemies]) {
      assert.ok(Number.isFinite(fighter.x) && Number.isFinite(fighter.y) && Number.isFinite(fighter.hp), `stage ${stageId} fighter values must stay finite`);
    }
    assert.ok(world.events.length < 180, `stage ${stageId} event list runaway: ${world.events.length}`);
    assert.ok(world.projectiles.length < 90, `stage ${stageId} projectile list runaway: ${world.projectiles.length}`);
    assert.ok(world.enemies.length < 20, `stage ${stageId} enemy list runaway: ${world.enemies.length}`);
    if (scene.phase === 'clear' && scene.clearDispatched) {
      scene = new Stage1Scene(input, new StubAudio(), player, player.superArts[0], stageId);
      scene.introFrames = 0;
      restarts += 1;
    }
  }
  summary.push({ stageId, virtualMinutes: 10, maxEvents, maxProjectiles, maxEnemies, restarts });
}
console.log('V024_MARATHON_PASS', { totalVirtualMinutes: 50, stages: summary });
