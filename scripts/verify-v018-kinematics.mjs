import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter, CHARACTERS } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationKeyframeCount, motionClipForFighter } from '../dist/assets/render/AnimationPoseLibrary.js';
import { reactionSignature, sampleStrikePose, strikeKinematicsProfile } from '../dist/assets/render/FighterKinematicsProfiles.js';

const signatures = CHARACTERS.map(({ id }) => reactionSignature(id));
assert.equal(new Set(signatures).size, CHARACTERS.length, 'all playable fighters should have distinct strike kinematics');

const chunKick = sampleStrikePose('CHUNLI', 'hk', .52, true, normalFor('hk', false, 'CHUNLI'));
const alexKick = sampleStrikePose('ALEX', 'hk', .52, true, normalFor('hk', false, 'ALEX'));
assert.ok(Math.abs(chunKick.ankleAngle) > Math.abs(alexKick.ankleAngle), 'Chun-Li should have more ankle whip than Alex');
assert.ok(chunKick.legReach > alexKick.legReach, 'Chun-Li kick chain should extend farther than Alex');

const dudley = strikeKinematicsProfile('DUDLEY');
const makoto = strikeKinematicsProfile('MAKOTO');
assert.ok(dudley.elbowLead > dudley.shoulderLead, 'Dudley should lead compact punches through the elbow');
assert.ok(makoto.shoulderLead > 1.2 && makoto.wristWhip > 1.3, 'Makoto should have explosive shoulder-to-wrist snap');

const ryuDef = getCharacter('RYU');
const kenDef = getCharacter('KEN');
const defender = new Fighter(ryuDef, 'player', 500, 460, -1, ryuDef.superArts[0]);
const attacker = new Fighter(kenDef, 'enemy', 390, 460, 1, kenDef.superArts[0]);

defender.receiveHit(normalFor('hp', false, 'KEN'), attacker, false, false);
assert.equal(defender.lastHitDirection, 1);
assert.equal(defender.lastHitReaction, 'high');

defender.hp = defender.maxHp;
defender.state = 'idle';
defender.receiveHit(normalFor('mk', true, 'KEN'), attacker, false, false);
assert.equal(defender.lastHitReaction, 'low');

defender.hp = defender.maxHp;
defender.state = 'idle';
defender.receiveHit(specialMovesFor('KEN').antiAir, attacker, false, false);
assert.equal(defender.lastHitReaction, 'launch');

defender.hp = defender.maxHp;
defender.state = 'idle';
defender.receiveHit(throwMoveFor('KEN'), attacker, false, false);
assert.equal(defender.lastHitReaction, 'throw');

class EmptyInput {
  held() { return false; }
  pressed() { return false; }
  released() { return false; }
}
const input = new EmptyInput();
const rules = { mode: 'duel', depthMovement: false, laneTolerance: 28, arenaLeft: 0, arenaRight: 1200, arenaTop: 320, arenaBottom: 560 };
const winner = new Fighter(ryuDef, 'player', 400, 460, 1, ryuDef.superArts[0]);
winner.enterVictoryPose();
for (let i = 0; i < 90; i += 1) winner.updatePlayer(input, rules);
assert.equal(winner.state, 'victory', 'victory pose should persist instead of dropping to idle after one frame');
assert.equal(motionClipForFighter(winner, 1).clip, 'victory');
assert.ok(winner.stateFrame >= 90, 'victory animation should accumulate frame time');

assert.ok(animationKeyframeCount('ko') >= 8, 'KO should have a multi-stage key-pose clip');
assert.ok(animationKeyframeCount('victory') >= 8, 'Victory should have a multi-stage key-pose clip');

const ko = new Fighter(ryuDef, 'player', 500, 460, -1, ryuDef.superArts[0]);
ko.hp = 20;
ko.receiveHit(normalFor('hp', false, 'KEN'), attacker, false, false);
assert.equal(ko.state, 'ko');
assert.equal(motionClipForFighter(ko, 1).clip, 'ko');

console.log(`v0.0.18 kinematics PASS: ${signatures.length} unique strike chains / directional reactions / persistent victory / ${animationKeyframeCount('ko')} KO poses / ${animationKeyframeCount('victory')} victory poses`);
