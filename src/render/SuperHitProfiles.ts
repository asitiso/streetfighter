import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import { animationSequenceSample, type AnimationSequenceSample } from './AnimationTimingMapper.js';
import { airFallSample } from './AirFallProfiles.js';
import { wallBounceSample } from './WallBounceProfiles.js';
import { groundBounceSample } from './GroundBounceProfiles.js';

// Reuse the combat-owned 12/30-tick reaction; repeated hits restart that clock.
export function superHitSample(fighter: Fighter): AnimationSequenceSample | null {
  if (fighter.state !== 'hit' && fighter.state !== 'knockdown' && fighter.state !== 'ko') return null;
  if (fighter.superVictimFrames <= 0 || fighter.superVictimTotal <= 0
    || fighter.throwSyncFrames > 0 || fighter.throwEscapeFrames > 0) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'super-hit', true);
  if (!sequence?.poseAuthored) return null;
  const progress = fighter.superVictimProgress;
  return { sequence, frame: Math.min(sequence.frameCount - 1, Math.floor(progress * sequence.frameCount)), progress, contact: false };
}

export interface SuperHitHandoffSample {
  previous: AnimationSequenceSample;
  current: AnimationSequenceSample;
  blend: number;
}

export function superHitHandoffSample(fighter: Fighter): SuperHitHandoffSample | null {
  if (fighter.superVictimFrames <= 0 || fighter.superVictimFrames > 3) return null;
  const previous = superHitSample(fighter);
  if (!previous) return null;
  // Read the imminent body from an inherited view; never advance or edit combat.
  const after = Object.create(fighter) as Fighter;
  after.superVictimFrames = 0;
  const current = animationSequenceSample(after, 0) ?? airFallSample(after) ?? wallBounceSample(after) ?? groundBounceSample(after);
  if (!current) return null;
  return { previous, current, blend: (4 - fighter.superVictimFrames) / 3 };
}
