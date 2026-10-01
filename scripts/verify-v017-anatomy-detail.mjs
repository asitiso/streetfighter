import assert from 'node:assert/strict';
import { CHARACTERS } from '../dist/assets/game/characters.js';
import { anatomyProfileSignature, fighterAnatomyProfile } from '../dist/assets/render/FighterVisualProfiles.js';

const signatures = CHARACTERS.map((character) => anatomyProfileSignature(character.id));
assert.equal(new Set(signatures).size, CHARACTERS.length, 'all 8 fighters should have distinct detailed anatomy profiles');

const alex = fighterAnatomyProfile('ALEX');
const chun = fighterAnatomyProfile('CHUNLI');
const ibuki = fighterAnatomyProfile('IBUKI');
const dudley = fighterAnatomyProfile('DUDLEY');
const makoto = fighterAnatomyProfile('MAKOTO');
const ken = fighterAnatomyProfile('KEN');

assert.ok(alex.shoulderScale > 1.15 && alex.armScale > 1.1, 'Alex should read as the broadest power fighter');
assert.ok(chun.waistScale < .85 && chun.legScale > chun.armScale, 'Chun-Li should have a compact torso and emphasized legs');
assert.ok(ibuki.wristSnap > .25 && ibuki.ankleSnap > .15, 'Ibuki should have high wrist/ankle articulation');
assert.ok(dudley.hitTwist < 1, 'Dudley boxing posture should stay compact under hit reaction');
assert.ok(makoto.hitTwist > 1.1, 'Makoto should show explosive recoil');
assert.ok(ken.victoryLift > 1.05 && ken.koSpin > 1, 'Ken should have energetic victory and KO motion');

const reactionSignatures = CHARACTERS.map(({ id }) => {
  const p = fighterAnatomyProfile(id);
  return `${p.hitTwist.toFixed(2)}:${p.koSpin.toFixed(2)}:${p.koSlide.toFixed(2)}:${p.victoryLift.toFixed(2)}:${p.victoryLean.toFixed(2)}`;
});
assert.ok(new Set(reactionSignatures).size >= 7, 'hit/KO/victory reaction signatures should be highly differentiated');

console.log(`v0.0.17 anatomy detail PASS: ${signatures.length} unique body/face profiles / ${new Set(reactionSignatures).size} reaction signatures`);
