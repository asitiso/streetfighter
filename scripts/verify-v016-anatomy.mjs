import assert from 'node:assert/strict';
import { CHARACTERS } from '../dist/assets/game/characters.js';
import { visualProfileSignature, superPoseProfile, superPoseSignature } from '../dist/assets/render/FighterVisualProfiles.js';
import { superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';

const visualSignatures = CHARACTERS.map((character) => visualProfileSignature(character.id));
assert.equal(new Set(visualSignatures).size, CHARACTERS.length, '8 playable fighters should have distinct visual anatomy profiles');

const expectedFoot = new Map([
  ['CHUNLI', 'slipper'], ['ALEX', 'boot'], ['DUDLEY', 'shoe'], ['IBUKI', 'ninja'], ['YUN', 'sneaker'],
]);
for (const [id, foot] of expectedFoot) assert.match(visualProfileSignature(id), new RegExp(`:${foot}:`));

const superSignatures = [];
for (const character of CHARACTERS) {
  for (const artId of [1, 2, 3]) {
    const move = superArtMoveFor(character.id, artId);
    const profile = superPoseProfile(move.id);
    assert.ok(profile, `${move.id} should have a dedicated super pose profile`);
    superSignatures.push(superPoseSignature(move.id));
  }
}
assert.equal(superSignatures.length, 24);
assert.ok(new Set(superSignatures).size >= 18, 'super pose silhouettes should be highly differentiated');
assert.equal(superPoseProfile('ALEX_SA1')?.hand, 'grab');
assert.equal(superPoseProfile('DUDLEY_SA2')?.hand, 'glove');
assert.equal(superPoseProfile('RYU_SA1')?.hand, 'palm');
assert.equal(superPoseProfile('KEN_SA2')?.family, 'uppercut');
assert.equal(superPoseProfile('CHUNLI_SA2')?.family, 'kickRush');
assert.equal(superPoseProfile('MAKOTO_SA3')?.family, 'install');

console.log(`v0.0.16 anatomy PASS: ${visualSignatures.length} fighter anatomy profiles / ${superSignatures.length} super poses / ${new Set(superSignatures).size} distinct super silhouette signatures`);
