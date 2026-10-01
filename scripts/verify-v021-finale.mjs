import assert from 'node:assert/strict';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor } from '../dist/assets/combat/MoveLibrary.js';
import { throwJointProfileCount, throwJointProfileSignature, throwJointPoseFor } from '../dist/assets/render/ThrowJointProfiles.js';
import { superVictimPoseFor } from '../dist/assets/render/SuperVictimProfiles.js';
import { bossAnimationKeyframeCount, bossTechniqueSignature } from '../dist/assets/render/BossAnimationProfiles.js';
import { finalKoKeyframeCount, finalKoPose } from '../dist/assets/render/FinalSequenceProfiles.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';

class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio {
  playStagePulse(){} playHit(){} playParry(){} startStageSoundscape(){} setStageIntensity(){} playStageBeat(){}
  playAirHit(){} playCommandHit(){} playTargetHit(){} playBlock(){} playThrowEscape(){} playSuperStart(){}
  playSuperImpact(){} playBossCue(){} playKo(){} stopSoundscape(){}
}

const playable = ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'];
assert.equal(throwJointProfileCount(), 8);
assert.equal(new Set(playable.map(throwJointProfileSignature)).size, 8, 'throw joint signatures must be unique');
for (const id of playable) {
  const attacker = throwJointPoseFor(id, 'attacker', .54);
  const victim = throwJointPoseFor(id, 'victim', .74);
  assert.ok(Math.abs(attacker.frontArmUpper) + Math.abs(attacker.frontKnee) + attacker.handOpen > .5, `${id} attacker joints inactive`);
  assert.ok(Math.abs(victim.torsoTwist) + Math.abs(victim.frontLegUpper) > 8, `${id} victim joints inactive`);
}

const mid1 = superVictimPoseFor('kickRush', .35, 1, 1, 3);
const mid2 = superVictimPoseFor('kickRush', .35, 1, 2, 3);
const finish = superVictimPoseFor('kickRush', .35, 1, 3, 3);
assert.notEqual(mid1.x.toFixed(2), mid2.x.toFixed(2), 'multi-hit victim rhythm should vary per hit');
assert.ok(Math.abs(finish.x) > Math.abs(mid1.x), 'finisher should displace more than opening hit');

const ryu = getCharacter('RYU');
const gill = getCharacter('GILL');
const projectileWorld = new CombatWorld(ryu, gill, 'duel', ryu.superArts[0]);
const gillSpecials = specialMovesFor('GILL');
projectileWorld.spawnProjectileBurst(projectileWorld.enemy, gillSpecials.super, 5, 48, 1);
assert.deepEqual(projectileWorld.projectiles.map((p) => p.burstIndex), [1,2,3,4,5]);
assert.ok(projectileWorld.projectiles.every((p) => p.burstTotal === 5), 'projectile burst total should be carried into hit sync');

const gillMoves = ['GILL_PRIMARY','GILL_EX_PRIMARY','GILL_ANTI_AIR','GILL_MOBILITY','GILL_SUPER'];
const signatures = new Set(gillMoves.map((id) => bossTechniqueSignature('GILL', id)));
assert.equal(signatures.size, 5, 'Gill five technique families should animate differently');
assert.ok(gillMoves.every((id) => bossAnimationKeyframeCount('GILL', id) >= 13), 'Gill techniques need dense body animation');
assert.ok(finalKoKeyframeCount() >= 13, 'final KO needs dense collapse poses');
const collapse = finalKoPose(.9);
assert.ok(collapse.collapse > .85 && collapse.aura < .15, 'final KO late pose should lose divinity aura');

let cleared = false;
const scene = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], () => { cleared = true; });
scene.introFrames = 0;
scene.prepareFinalDuel();
scene.phase = 'final-duel';
scene.gillPhase = 3;
const labels = [];
for (let i = 0; i < 5; i += 1) {
  scene.bossPatternCooldown = 0;
  scene.world.enemy.state = 'idle';
  scene.world.enemy.currentMove = null;
  scene.world.enemy.moveEffectTriggered = false;
  scene.world.enemy.hitStop = 0;
  scene.updateGillPattern();
  const warning = [...scene.world.events].reverse().find((e) => e.type === 'boss-warning');
  if (warning?.label) labels.push(warning.label);
}
assert.equal(new Set(labels).size, 5, `Gill final phase should cycle five readable techniques: ${labels}`);
assert.ok(labels.includes('SERAPHIC RAIN'), 'Gill final phase finisher pattern missing');

scene.world.enemy.hp = 0;
scene.fixedUpdate(1/60, 1000);
assert.equal(scene.phase, 'final-ko');
for (let i = 0; i < 181; i += 1) scene.fixedUpdate(1/60, 1001 + i);
assert.equal(scene.phase, 'clear', 'final KO should bridge into campaign clear');
assert.ok(scene.phaseFrames >= 170, 'campaign clear bridge should retain a readable presentation hold');
for (let i = 0; i < 260 && scene.phase === 'clear'; i += 1) scene.fixedUpdate(1/60, 1200 + i);
assert.equal(cleared, true, 'Stage 5 should hand off to Ending after the bridge');

console.log('V021_FINALE_VERIFY_PASS', {
  throwJointProfiles: throwJointProfileCount(),
  projectileBurstSync: projectileWorld.projectiles.map((p) => `${p.burstIndex}/${p.burstTotal}`),
  gillTechniqueFamilies: signatures.size,
  gillFinalPatternLabels: labels,
  finalKoKeyframes: finalKoKeyframeCount(),
  endingBridgeCallback: cleared,
});
