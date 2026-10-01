import { CHARACTERS } from '../dist/assets/game/characters.js';
import { superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';

const seen = new Set();
for (const character of CHARACTERS) {
  const ids = [];
  for (const art of character.superArts) {
    const move = superArtMoveFor(character.id, art.id, art.gauge);
    if (move.label !== art.name) throw new Error(`${character.id} SA${art.id} label mismatch: ${move.label} !== ${art.name}`);
    if (move.superCost !== art.gauge) throw new Error(`${character.id} SA${art.id} gauge cost mismatch`);
    if (seen.has(move.id)) throw new Error(`duplicate super id ${move.id}`);
    seen.add(move.id); ids.push(move.id);
    const fighter = new Fighter(character, 'player', 300, 500, 1, art);
    if (fighter.superGaugeMax !== art.gauge * art.stocks) throw new Error(`${character.id} SA${art.id} max gauge mismatch`);
    fighter.superGauge = art.gauge;
    fighter.startMove(move);
    if (fighter.superGauge !== 0) throw new Error(`${character.id} SA${art.id} did not consume one stock`);
  }
  if (new Set(ids).size !== 3) throw new Error(`${character.id} super arts are not distinct`);
}
const makoto = CHARACTERS.find((x) => x.id === 'MAKOTO');
const yun = CHARACTERS.find((x) => x.id === 'YUN');
if (!makoto || !yun) throw new Error('install characters missing');
if (!superArtMoveFor('MAKOTO', 3, makoto.superArts[2].gauge).install) throw new Error('Tanden Renki install missing');
if (!superArtMoveFor('YUN', 3, yun.superArts[2].gauge).install) throw new Error('Genei Jin install missing');
console.log('SUPER_ART_VERIFY_PASS', { distinctMoves: seen.size, makotoInstall: true, yunInstall: true });
