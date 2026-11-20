import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import { animationSequenceSample, type AnimationSequenceSample } from './AnimationTimingMapper.js';
import { airFallSample } from './AirFallProfiles.js';
import { superHitSample } from './SuperHitProfiles.js';
import { wallBounceSample } from './WallBounceProfiles.js';
import { groundBounceSample } from './GroundBounceProfiles.js';

export interface ThrowVictimSample extends AnimationSequenceSample { throwVictim: true }

// A successful grab owns its body independently of ordinary stun/flight clocks.
export function throwVictimSample(fighter: Fighter): ThrowVictimSample | null {
  if (fighter.throwSyncRole !== 'victim' || !(fighter.throwSyncFrames > 0)
    || !(fighter.throwSyncTotal > 0) || fighter.throwEscapeFrames > 0) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'throw-victim', true);
  if (!sequence?.poseAuthored) return null;
  const progress = fighter.throwSyncProgress;
  return { sequence, progress, frame: Math.min(sequence.frameCount - 1, Math.floor(progress * sequence.frameCount)), contact:false, throwVictim:true };
}

// Hyper Bomb can release its 16-tick hit stun before the 30-tick visual
// super clock ends. Once the grab expires, that stale clock must not hide jump.
export function releasedThrowSample(fighter: Fighter): AnimationSequenceSample | null {
  if (fighter.throwSyncFrames > 0 || fighter.state !== 'jump' || fighter.superVictimFrames <= 0
    || fighter.superVictimMotif !== 'throw' || fighter.throwEscapeFrames > 0
    || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0
    || !animationSequenceFor(fighter.character.id, 'throw-victim', true)?.poseAuthored) return null;
  const after = Object.create(fighter) as Fighter;
  after.superVictimFrames = 0;
  return animationSequenceSample(after, 0);
}

export function throwVictimHandoffSample(fighter: Fighter): {
  previous: ThrowVictimSample; current: AnimationSequenceSample; blend: number;
} | null {
  if (fighter.throwSyncFrames > 3) return null;
  const previous = throwVictimSample(fighter);
  if (!previous) return null;
  const after = Object.create(fighter) as Fighter;
  after.throwSyncFrames = 0;
  if ((fighter.state === 'hit' || fighter.state === 'knockdown') && fighter.stateFrame < 0
    && fighter.stateFrame + fighter.throwSyncFrames >= 0) {
    after.state = fighter.airborne ? 'jump' : 'idle';
    after.stateFrame = 0;
  }
  const current = animationSequenceSample(after, 0) ?? airFallSample(after)
    ?? superHitSample(after) ?? wallBounceSample(after) ?? groundBounceSample(after) ?? releasedThrowSample(after);
  return current ? { previous, current, blend: (4 - fighter.throwSyncFrames) / 3 } : null;
}
