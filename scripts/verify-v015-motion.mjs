import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { animationKeyframeCount, motionClipForFighter } from '../dist/assets/render/AnimationPoseLibrary.js';
import { secondaryMotionKindFor } from '../dist/assets/render/Visuals.js';

const rules = { mode: 'duel', depthMovement: false, laneTolerance: 28, arenaLeft: 0, arenaRight: 1200, arenaTop: 320, arenaBottom: 560 };
const ryuDef = getCharacter('RYU');
const ryu = new Fighter(ryuDef, 'player', 300, 460, 1, ryuDef.superArts[0]);

const expectClip = (fighter, expected, label) => {
  const actual = motionClipForFighter(fighter, 1.25).clip;
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  console.log(`[v015 motion] ${label}: ${actual}`);
};

ryu.startMove(specialMovesFor('RYU').primary); expectClip(ryu, 'projectile', 'Hadoken family');
ryu.startMove(specialMovesFor('RYU').antiAir); expectClip(ryu, 'antiAir', 'Shoryuken family');
ryu.startMove(specialMovesFor('RYU').mobility); expectClip(ryu, 'spin', 'Tatsumaki family');
const alexDef = getCharacter('ALEX');
const alex = new Fighter(alexDef, 'player', 300, 460, 1, alexDef.superArts[0]);
alex.startMove(specialMovesFor('ALEX').mobility); expectClip(alex, 'rush', 'Rush mobility family');
ryu.startMove(throwMoveFor('RYU')); expectClip(ryu, 'throw', 'Throw family');
ryu.currentMove = null;
ryu.throwEscaped(1); expectClip(ryu, 'throwEscape', 'Throw escape');
ryu.throwEscapeFrames = 0; ryu.landingFrames = 5; expectClip(ryu, 'landing', 'Landing recovery');
ryu.landingFrames = 0; ryu.dashFrames = 5; expectClip(ryu, 'dash', 'Dash clip');

const clipMinimums = { projectile: 8, antiAir: 8, spin: 9, rush: 8, throw: 7, throwEscape: 7, landing: 6, dash: 7 };
for (const [clip, minimum] of Object.entries(clipMinimums)) {
  const count = animationKeyframeCount(clip);
  assert.ok(count >= minimum, `${clip} expected >= ${minimum} poses, got ${count}`);
  console.log(`[v015 motion] ${clip}: ${count} key poses`);
}

const secondary = ['RYU','ALEX','IBUKI','CHUNLI','MAKOTO','DUDLEY','YUN','KEN'].map((id) => [id, secondaryMotionKindFor(id)]);
for (const [id, kind] of secondary) assert.notEqual(kind, 'minimal', `${id} should have secondary motion`);
assert.ok(new Set(secondary.map(([, kind]) => kind)).size >= 7, 'secondary motion should be visibly diverse');
console.log(`[v015 motion] secondary motion families: ${new Set(secondary.map(([, kind]) => kind)).size}`);

// Real double-tap dash: preserve combat input flow while adding a short cancellable burst.
class FakeInput {
  heldSet = new Set(); pressedSet = new Set();
  held(a) { return this.heldSet.has(a); }
  pressed(a) { return this.pressedSet.has(a); }
  released() { return false; }
  set(held = [], pressed = []) { this.heldSet = new Set(held); this.pressedSet = new Set(pressed); }
}
const input = new FakeInput();
const dashRyu = new Fighter(ryuDef, 'player', 300, 460, 1, ryuDef.superArts[0]);
input.set(['right'], ['right']); dashRyu.captureInput(input, 1); dashRyu.updatePlayer(input, rules);
input.set([], []); dashRyu.captureInput(input, 2); dashRyu.updatePlayer(input, rules);
input.set(['right'], ['right']); dashRyu.captureInput(input, 6); dashRyu.updatePlayer(input, rules);
assert.equal(dashRyu.dashFrames, 8, 'second tap should start 8-frame dash');
assert.equal(motionClipForFighter(dashRyu, 1).clip, 'dash');
const dashStartX = dashRyu.x;
input.set(['right'], []); dashRyu.captureInput(input, 7); dashRyu.updatePlayer(input, rules);
assert.ok(dashRyu.x > dashStartX, 'dash should advance fighter');
assert.equal(dashRyu.dashFrames, 7);
console.log(`[v015 motion] double-tap dash: ${Math.round((dashRyu.x - dashStartX) * 100) / 100}px first burst step`);
