import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import { animationSequenceSample, type AnimationSequenceSample } from './AnimationTimingMapper.js';
import { airFallSample } from './AirFallProfiles.js';

export interface WallBounceSample extends AnimationSequenceSample {
  wallBounce: true;
}

// Use the existing combat-owned 18-tick recoil, including hitstop/pause freezes.
export function wallBounceSample(fighter: Fighter): WallBounceSample | null {
  if (fighter.state !== 'hit' && fighter.state !== 'knockdown' && fighter.state !== 'ko') return null;
  if (!(fighter.wallBounceFrames > 0) || (!fighter.airborne && fighter.jumpHeight <= 0)
    || fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0 || fighter.throwEscapeFrames > 0) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'super-hit', true);
  if (!sequence?.poseAuthored) return null;
  const progress = Math.max(0, Math.min(1, (18 - fighter.wallBounceFrames) / 17));
  return { sequence, frame: Math.min(sequence.frameCount - 1, Math.floor(progress * sequence.frameCount)),
    progress, contact: false, wallBounce: true };
}

export function wallBounceHandoffSample(fighter: Fighter): {
  previous: WallBounceSample; current: AnimationSequenceSample; blend: number;
} | null {
  if (fighter.wallBounceFrames > 3 || fighter.stateFrame >= 0) return null;
  const previous = wallBounceSample(fighter);
  if (!previous) return null;
  // Preview expiry without changing or advancing any live combat state.
  const after = Object.create(fighter) as Fighter;
  after.wallBounceFrames = 0;
  if ((fighter.state === 'hit' || fighter.state === 'knockdown')
    && fighter.stateFrame + fighter.wallBounceFrames >= 0) {
    after.state = fighter.airborne ? 'jump' : 'idle';
    after.stateFrame = 0;
  }
  const current = animationSequenceSample(after, 0) ?? airFallSample(after);
  return current ? { previous, current, blend: (4 - fighter.wallBounceFrames) / 3 } : null;
}
