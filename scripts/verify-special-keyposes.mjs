import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { specialKeyPoseAsset, specialKeyPoseOpacity } from '../dist/assets/render/SpecialKeyPoseLibrary.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';

const ken = specialMovesFor('KEN');
const chunli = specialMovesFor('CHUNLI');
const cases = [
  ['KEN', ken.primary, 'hadoken'],
  ['KEN', ken.exPrimary, 'hadoken'],
  ['KEN', ken.antiAir, 'shoryuken'],
  ['KEN', ken.mobility, 'tatsumaki'],
  ['KEN', ken.super, 'super-rush'],
  ['KEN', superArtMoveFor('KEN', 1), 'shoryuken'],
  ['KEN', superArtMoveFor('KEN', 2), 'shoryuken'],
  ['KEN', superArtMoveFor('KEN', 3), 'super-rush'],
  ['CHUNLI', chunli.primary, 'kikoken'],
  ['CHUNLI', chunli.exPrimary, 'kikoken'],
  ['CHUNLI', chunli.mobility, 'spinning-bird-kick'],
  ['CHUNLI', superArtMoveFor('CHUNLI', 1), 'kikoken'],
  ['CHUNLI', superArtMoveFor('CHUNLI', 2), 'spinning-bird-kick'],
];
for (const [character, move, kind] of cases) {
  const asset = specialKeyPoseAsset(character, move);
  assert.equal(asset, `/art/special-keyposes/${character.toLowerCase()}/${kind}.webp`, `${move.id} pose`);
  const data = readFileSync(new URL(`../public${asset}`, import.meta.url));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${kind} webp`);
  assert.equal(specialKeyPoseOpacity(move, -1), 0, `${move.id} before startup`);
  assert.ok(specialKeyPoseOpacity(move, Math.max(0, move.startup - 1)) > 0, `${move.id} charge`);
  assert.equal(specialKeyPoseOpacity(move, move.startup), 1, `${move.id} contact`);
  assert.equal(specialKeyPoseOpacity(move, move.startup + move.active - 1), 1, `${move.id} last active`);
  assert.ok(specialKeyPoseOpacity(move, move.startup + move.active) > 0, `${move.id} recovery blend`);
  assert.equal(specialKeyPoseOpacity(move, move.startup + move.active + 5), 0, `${move.id} recovery end`);
}
assert.equal(specialKeyPoseAsset('RYU', ken.primary), null);
console.log('SPECIAL_KEYPOSES_PASS', { moves: cases.length });
