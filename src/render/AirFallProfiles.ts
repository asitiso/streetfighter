import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import type { AnimationSequenceSample } from './AnimationTimingMapper.js';

// Live velocity freezes with combat hitstop/pause; no new animation clock.
export function airFallSample(fighter: Fighter): AnimationSequenceSample | null {
  if (fighter.state !== 'hit' && fighter.state !== 'knockdown' && fighter.state !== 'ko') return null;
  if (!fighter.airborne && fighter.jumpHeight <= 0) return null;
  if (fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0
    || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0
    || fighter.throwEscapeFrames > 0) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'fall', true);
  if (!sequence?.poseAuthored) return null;
  const speed = Math.max(1, fighter.combatProfile.jumpVelocity);
  const progress = Math.max(0, Math.min(1, (1 - fighter.jumpVelocity / speed) / 2));
  return { sequence, frame: Math.min(sequence.frameCount - 1, Math.floor(progress * sequence.frameCount)), progress, contact: false };
}
