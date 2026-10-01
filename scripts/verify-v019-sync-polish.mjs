import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter, CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, superArtMoveFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationKeyframeCount, motionClipForFighter } from '../dist/assets/render/AnimationPoseLibrary.js';
import { bossAnimationKeyframeCount, bossMotionFor } from '../dist/assets/render/BossAnimationProfiles.js';
import { superCameraProfileForMotif, superCameraProfileSignature } from '../dist/assets/render/SuperCameraProfiles.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';

const ryu = getCharacter('RYU');
const ken = getCharacter('KEN');
const defender = new Fighter(ryu, 'player', 520, 500, -1, ryu.superArts[0]);
const attacker = new Fighter(ken, 'enemy', 420, 500, 1, ken.superArts[0]);

function reset() { defender.hp = defender.maxHp; defender.state = 'idle'; defender.airborne = false; defender.jumpHeight = 0; defender.jumpVelocity = 0; }
defender.receiveHit(normalFor('hp', false, 'KEN'), attacker, false, false);
assert.equal(defender.lastHitZone, 'head');
reset(); defender.receiveHit(normalFor('mp', false, 'KEN'), attacker, false, false);
assert.equal(defender.lastHitZone, 'torso');
reset(); defender.receiveHit(normalFor('mk', true, 'KEN'), attacker, false, false);
assert.equal(defender.lastHitZone, 'leg');
reset(); defender.receiveHit(specialMovesFor('KEN').antiAir, attacker, false, false);
assert.equal(defender.lastHitZone, 'launch');
reset(); defender.receiveHit(throwMoveFor('KEN'), attacker, false, false);
assert.equal(defender.lastHitZone, 'throw');

attacker.beginThrowSync('attacker', defender.uid, 1, 24);
defender.beginThrowSync('victim', attacker.uid, 1, 24);
assert.equal(motionClipForFighter(defender, 0).clip, 'throwVictim');
assert.equal(motionClipForFighter(attacker, 0).clip, 'throw');
assert.ok(animationKeyframeCount('throwVictim') >= 8, 'paired throw victim animation should be multi-stage');
assert.equal(defender.throwSyncPartnerUid, attacker.uid);
assert.equal(attacker.throwSyncPartnerUid, defender.uid);

const cameraSignatures = new Set();
const motifs = [];
for (const c of CHARACTERS) {
  for (const art of c.superArts) {
    const move = superArtMoveFor(c.id, art.id, art.gauge);
    assert.ok(move.superPresentation?.motif, `${move.id} should have a presentation motif`);
    const profile = superCameraProfileForMotif(move.superPresentation.motif);
    assert.ok(profile.duration >= 28 && profile.zoom > 1.09, `${move.id} should receive cinematic camera timing`);
    cameraSignatures.add(superCameraProfileSignature(move.superPresentation.motif));
    motifs.push(move.superPresentation.motif);
  }
}
assert.ok(cameraSignatures.size >= 10, `expected rich super camera variety, got ${cameraSignatures.size}`);

assert.ok(bossAnimationKeyframeCount('URIEN', 'URIEN_SUPER') >= 12);
assert.ok(bossAnimationKeyframeCount('URIEN', 'URIEN_MOBILITY') >= 12);
assert.ok(bossAnimationKeyframeCount('GILL', 'GILL_SUPER') >= 14);
assert.ok(bossAnimationKeyframeCount('GILL', 'GILL_PRIMARY') >= 13);
const urienAccent = bossMotionFor('URIEN', 'URIEN_SUPER', .45);
const gillAccent = bossMotionFor('GILL', 'GILL_SUPER', .45);
assert.ok(urienAccent && urienAccent.aura > .7 && urienAccent.armReach > 1.1);
assert.ok(gillAccent && gillAccent.aura > .8 && gillAccent.bodyY < -20);

class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio { playStagePulse(){} playHit(){} playParry(){} startStageSoundscape(){} setStageIntensity(){} playStageBeat(){} stopSoundscape(){} }
const scene = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0]);
scene.introFrames = 0;
scene.prepareDuel(); scene.phase = 'duel'; scene.bossPatternCooldown = 0; scene.bossPatternIndex = 0;
scene.updateUrienPattern();
assert.equal(scene.world.enemy.currentMove?.id, 'URIEN_SUPER', 'scripted Aegis should drive Urien animation state');
assert.equal(scene.world.enemy.moveEffectTriggered, true, 'scripted Aegis must not double-spawn through normal projectile emitter');
scene.prepareFinalDuel(); scene.phase = 'final-duel'; scene.gillPhase = 3; scene.bossPatternCooldown = 0; scene.bossPatternIndex = 0;
scene.updateGillPattern();
assert.equal(scene.world.enemy.currentMove?.id, 'GILL_SUPER', 'scripted Gill volley should drive boss animation state');
assert.equal(scene.world.enemy.moveEffectTriggered, true, 'scripted Gill volley must not double-spawn');

console.log('V019_SYNC_POLISH_VERIFY_PASS', {
  hitZones: ['head','torso','leg','launch','throw'],
  throwVictimPoses: animationKeyframeCount('throwVictim'),
  superCameraVariants: cameraSignatures.size,
  motifs: [...new Set(motifs)].length,
  urienSuperPoses: bossAnimationKeyframeCount('URIEN', 'URIEN_SUPER'),
  gillSuperPoses: bossAnimationKeyframeCount('GILL', 'GILL_SUPER'),
});
