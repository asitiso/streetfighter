import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import { animationSequenceSample, type AnimationSequenceSample } from './AnimationTimingMapper.js';
import { airFallSample } from './AirFallProfiles.js';

export interface GroundBounceSample extends AnimationSequenceSample {
  groundBounce: true;
}

// Use the existing combat-owned 16-tick recoil, including hitstop/pause freezes.
export function groundBounceSample(fighter: Fighter): GroundBounceSample | null {
  if (fighter.state !== 'hit' && fighter.state !== 'knockdown' && fighter.state !== 'ko') return null;
  if (!(fighter.groundBounceFrames > 0) || (!fighter.airborne && fighter.jumpHeight <= 0)
    || fighter.wallBounceFrames > 0 || fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0 || fighter.throwEscapeFrames > 0) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'super-hit', true);
  if (!sequence?.poseAuthored) return null;
  const progress = Math.max(0, Math.min(1, (16 - fighter.groundBounceFrames) / 15));
  return { sequence, frame: Math.min(sequence.frameCount - 1, Math.floor(progress * sequence.frameCount)),
    progress, contact: false, groundBounce: true };
}

export function groundBounceHandoffSample(fighter: Fighter): {
  previous: GroundBounceSample; current: AnimationSequenceSample; blend: number;
} | null {
  if (fighter.groundBounceFrames > 3 || fighter.stateFrame >= 0) return null;
  const previous = groundBounceSample(fighter);
  if (!previous) return null;
  // Preview expiry without changing or advancing any live combat state.
  const after = Object.create(fighter) as Fighter;
  after.groundBounceFrames = 0;
  if ((fighter.state === 'hit' || fighter.state === 'knockdown')
    && fighter.stateFrame + fighter.groundBounceFrames >= 0) {
    after.state = fighter.airborne ? 'jump' : 'idle';
    after.stateFrame = 0;
  }
  const current = animationSequenceSample(after, 0) ?? airFallSample(after);
  return current ? { previous, current, blend: (4 - fighter.groundBounceFrames) / 3 } : null;
}
