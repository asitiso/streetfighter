import type { Fighter } from '../combat/Fighter.js';
import { animationSequenceFor } from './AnimationSequenceLibrary.js';
import { animationSequenceSample, type AnimationSequenceSample } from './AnimationTimingMapper.js';
export interface ThrowAttackerSample extends AnimationSequenceSample { throwAttacker: boolean }
// Normal throws use the move clock until contact; a successful grab owns its
// independent combat clock. Misses recover without showing lift/release poses.
export function throwAttackerSample(fighter: Fighter): ThrowAttackerSample | null {
  // These successful grounded pairs reuse their owner's authored grab poses.
  // Pre-contact, misses and other supers retain their existing presentation;
  // gameplay still owns the 24-tick clock.
  const superGrab = ((fighter.character.id === 'ALEX' && fighter.currentMove?.id === 'ALEX_SA1')
    || (fighter.character.id === 'IBUKI' && fighter.currentMove?.id === 'IBUKI_SA2'))
    && fighter.throwSyncFrames > 0 && fighter.throwSyncRole === 'attacker'
    && fighter.throwSyncStyle === fighter.character.id;
  if (fighter.superVictimFrames > 0 || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0
    || fighter.throwEscapeFrames > 0 || fighter.hp <= 0
    || (fighter.state !== 'attack' && fighter.state !== 'idle' && fighter.state !== 'walk')) return null;
  // SA3 remains airborne while holding its partner. Keep the same active, rise,
  // fall and landing poses used immediately before/after the synchronized grab.
  if (fighter.character.id === 'ALEX' && fighter.currentMove?.id === 'ALEX_SA3'
    && fighter.state === 'attack' && fighter.moveFrame >= fighter.currentMove.startup
    && fighter.throwSyncFrames > 0 && fighter.throwSyncTotal > 0
    && fighter.throwSyncRole === 'attacker' && fighter.throwSyncStyle === 'ALEX') {
    const view = Object.assign(Object.create(fighter) as Fighter, { throwSyncFrames:0 });
    const sample = animationSequenceSample(view, 0);
    if (sample?.sequence.kind !== 'stun-gun-headbutt') return null;
    return { ...sample, progress:fighter.throwSyncProgress, contact:false, throwAttacker:true };
  }
  if (fighter.airborne || (fighter.currentMove && fighter.currentMove.id !== 'THROW' && !superGrab)) return null;
  const sequence = animationSequenceFor(fighter.character.id, 'throw-attacker', true);
  if (!sequence?.poseAuthored) return null;
  if (fighter.throwSyncFrames > 0) {
    if (fighter.throwSyncRole !== 'attacker' || !(fighter.throwSyncTotal > 0)) return null;
    const progress = fighter.throwSyncProgress;
    return { sequence, frame:Math.min(7,2+Math.floor(Math.max(0,fighter.throwSyncTotal-fighter.throwSyncFrames)*6/fighter.throwSyncTotal)), progress, contact:false, throwAttacker:true };
  }
  const move = fighter.currentMove;
  if (fighter.state !== 'attack' || move?.id !== 'THROW') return null;
  const tick = Math.max(0,fighter.moveFrame);
  const frame = tick < move.startup ? Math.min(1,Math.floor(tick*2/Math.max(1,move.startup)))
    : tick < move.startup+move.active ? 2
    : 5+Math.min(2,Math.floor((tick-move.startup-move.active)*3/Math.max(1,move.recovery)));
  return { sequence, frame, progress:tick/Math.max(1,move.startup+move.active+move.recovery-1), contact:false, throwAttacker:false };
}
