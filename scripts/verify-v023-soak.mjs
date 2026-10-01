import assert from 'node:assert/strict';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class SoakInput {
  tick = 0;
  held(action) {
    if (action === 'right') return (this.tick % 240) < 150;
    if (action === 'down') return (this.tick % 300) > 260;
    return false;
  }
  pressed(action) {
    if (action === 'hp') return this.tick % 43 === 0;
    if (action === 'hk') return this.tick % 71 === 0;
    if (action === 'lp') return this.tick % 29 === 0;
    if (action === 'mp') return this.tick % 97 === 0;
    if (action === 'right') return this.tick % 240 === 0;
    if (action === 'down') return this.tick % 300 === 261;
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
const input = new SoakInput();
const summary = [];
for (let stageId = 1; stageId <= 5; stageId += 1) {
  let scene = new Stage1Scene(input, new StubAudio(), player, player.superArts[0], stageId);
  scene.introFrames = 0;
  let maxEvents = 0, maxProjectiles = 0, restarts = 0;
  const ticks = 18_000; // 5 virtual minutes per stage, 25 minutes total.
  for (let tick = 1; tick <= ticks; tick += 1) {
    input.tick = tick;
    scene.fixedUpdate(1/60, tick);
    const world = scene.world;
    if (tick % 180 === 0) {
      world.player.hp = Math.max(world.player.hp, world.player.maxHp * .7);
      for (const enemy of world.enemies) if (enemy.hp > 0) enemy.hp = Math.max(1, enemy.hp - 130);
    }
    maxEvents = Math.max(maxEvents, world.events.length);
    maxProjectiles = Math.max(maxProjectiles, world.projectiles.length);
    for (const fighter of [world.player, ...world.enemies]) {
      assert.ok(Number.isFinite(fighter.x) && Number.isFinite(fighter.y) && Number.isFinite(fighter.hp), `stage ${stageId} fighter values must stay finite`);
    }
    assert.ok(world.events.length < 160, `stage ${stageId} event list runaway: ${world.events.length}`);
    assert.ok(world.projectiles.length < 80, `stage ${stageId} projectile list runaway: ${world.projectiles.length}`);
    if (scene.phase === 'clear' && scene.clearDispatched) {
      scene = new Stage1Scene(input, new StubAudio(), player, player.superArts[0], stageId);
      scene.introFrames = 0;
      restarts += 1;
    }
  }
  summary.push({ stageId, virtualMinutes: 5, maxEvents, maxProjectiles, restarts });
}
console.log('V023_SOAK_PASS', summary);
