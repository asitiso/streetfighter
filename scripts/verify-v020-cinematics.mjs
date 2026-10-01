import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { CHARACTERS, getCharacter } from '../dist/assets/game/characters.js';
import { superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { throwMotionFor, throwProfileCount, throwProfileSignature } from '../dist/assets/render/ThrowAnimationProfiles.js';
import { superVictimPoseFor, superVictimProfileCount, superVictimProfileSignature } from '../dist/assets/render/SuperVictimProfiles.js';
import { bossCinematicKeyframeCount, bossCinematicPose } from '../dist/assets/render/BossCinematicProfiles.js';

const playable = CHARACTERS.filter((c) => !['URIEN', 'GILL'].includes(c.id));
const throwSignatures = new Set(playable.map((c) => throwProfileSignature(c.id)));
assert.equal(throwProfileCount(), 8, 'expected 8 bespoke playable throw profiles');
assert.equal(throwSignatures.size, 8, 'each playable character should have a unique throw motion profile');
for (const c of playable) {
  const a = throwMotionFor(c.id, 'attacker', .5, 1);
  const v = throwMotionFor(c.id, 'victim', .72, 1);
  assert.ok(Math.abs(a.x) + Math.abs(a.rotation) + a.crouch > 0, `${c.id} attacker throw should animate`);
  assert.ok(Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.rotation) > 25, `${c.id} victim throw should travel`);
}

const victimSignatures = new Set();
const motifs = new Set();
for (const c of playable) {
  for (const art of c.superArts) {
    const move = superArtMoveFor(c.id, art.id, art.gauge);
    const motif = move.superPresentation?.motif;
    assert.ok(motif, `${move.id} should define a super motif`);
    motifs.add(motif);
    victimSignatures.add(superVictimProfileSignature(motif));
    const reaction = superVictimPoseFor(motif, .42, 1);
    assert.ok(Math.abs(reaction.x) + Math.abs(reaction.y) + Math.abs(reaction.rotation) > 10, `${motif} should have a visible victim reaction`);
  }
}
assert.ok(superVictimProfileCount() >= 16, 'expected broad super victim reaction coverage');
assert.ok(victimSignatures.size >= 12, 'super victim reactions should be visually varied');

const ryu = getCharacter('RYU');
const ken = getCharacter('KEN');
const defender = new Fighter(ryu, 'player', 520, 500, -1, ryu.superArts[0]);
const attacker = new Fighter(ken, 'enemy', 420, 500, 1, ken.superArts[0]);
const superMove = superArtMoveFor('KEN', 1, ken.superArts[0].gauge);
defender.receiveHit(superMove, attacker, false, false);
assert.equal(defender.superVictimFrames, 28);
assert.equal(defender.superVictimMotif, superMove.superPresentation?.motif);
assert.equal(defender.superVictimDirection, 1);

const cinematicKinds = ['urien-intro','gill-intro','gill-phase2','gill-phase3'];
const counts = cinematicKinds.map((k) => bossCinematicKeyframeCount(k));
assert.ok(counts[0] >= 12 && counts[1] >= 14 && counts[2] >= 14 && counts[3] >= 15, `boss cinematics need dense key poses: ${counts}`);
const gillFinal = bossCinematicPose('gill-phase3', .52);
assert.ok(gillFinal.aura >= .9 && gillFinal.wing >= .9 && gillFinal.y < -25, 'Gill final cinematic should peak dramatically');
const urien = bossCinematicPose('urien-intro', .62);
assert.ok(urien.aura >= .8 && urien.armReach >= 1.2, 'Urien intro should reach Aegis-ready pose');

console.log('V020_CINEMATICS_VERIFY_PASS', {
  throwProfiles: throwSignatures.size,
  superVictimFamilies: superVictimProfileCount(),
  superVictimSignatures: victimSignatures.size,
  motifs: motifs.size,
  bossCinematicKeyframes: counts,
});
