import type { Fighter } from '../combat/Fighter.js';
import type { MoveData } from '../combat/CombatTypes.js';
import { animationSequenceFor, type AnimationSequence, type AnimationSequenceKind } from './AnimationSequenceLibrary.js';
import { animationFrameProfile } from './AnimationFrameProfiles.js';

export interface AnimationSequenceSample {
  sequence: AnimationSequence;
  frame: number;
  progress: number;
  contact: boolean;
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }

function curveProgress(progress: number, curve: AnimationSequence['timing']): number {
  const p = clamp01(progress);
  if (curve === 'ease-in') return p * p * (3 - 2 * p);
  if (curve === 'ease-out') return 1 - Math.pow(1 - p, 2.2);
  return p;
}

function frameAt(sequence: AnimationSequence, progress: number): number {
  const curved = curveProgress(progress, sequence.timing);
  const profile = animationFrameProfile(sequence.characterId, sequence.kind);
  const weights = profile.weights.length === sequence.frameCount ? profile.weights : null;
  if (!weights) return Math.max(0, Math.min(sequence.frameCount - 1, Math.floor(curved * sequence.frameCount)));
  const total = weights.reduce((sum, value) => sum + Math.max(.05, value), 0);
  if (curved >= 1) return sequence.frameCount - 1;
  let cursor = curved * total;
  for (let frame = 0; frame < weights.length; frame += 1) {
    cursor -= Math.max(.05, weights[frame]);
    if (cursor < 0) return frame;
  }
  return sequence.frameCount - 1;
}

function loopFrame(sequence: AnimationSequence, seconds: number): { frame:number; progress:number } {
  const profile = animationFrameProfile(sequence.characterId, sequence.kind);
  const weights = profile.weights.length === sequence.frameCount ? profile.weights : Array.from({length:sequence.frameCount}, () => 1);
  const totalWeight = weights.reduce((sum, value) => sum + Math.max(.05, value), 0);
  const cycleSeconds = totalWeight / Math.max(1, sequence.fps);
  const cycleProgress = cycleSeconds > 0 ? ((seconds % cycleSeconds) + cycleSeconds) % cycleSeconds / cycleSeconds : 0;
  let cursor = cycleProgress * totalWeight;
  for (let frame = 0; frame < weights.length; frame += 1) {
    cursor -= Math.max(.05, weights[frame]);
    if (cursor < 0) return { frame, progress: cycleProgress };
  }
  return { frame: sequence.frameCount - 1, progress: cycleProgress };
}

function movementKind(fighter: Fighter): AnimationSequenceKind | null {
  if (fighter.state === 'hit') return 'hit';
  if (fighter.state === 'block') return 'guard';
  if (fighter.state === 'parry') return 'parry';
  if (!fighter.airborne && fighter.landingFrames > 0 && (fighter.state === 'idle' || fighter.state === 'walk')) return 'landing';
  if (fighter.state === 'jump') return 'jump';
  if (fighter.dashFrames > 0 && !fighter.airborne && (fighter.state === 'walk' || fighter.state === 'idle')) return 'dash';
  if (fighter.state === 'walk') {
    const velocity = fighter.x - fighter.previousX;
    return Math.sign(velocity || fighter.facing) === fighter.facing ? 'walk' : 'walk-back';
  }
  if (fighter.state === 'idle') return 'idle';
  return null;
}

export function animationSequenceKindForAttack(characterId: string, move: MoveData): AnimationSequenceKind | null {
  if (characterId === 'CHUNLI') {
    if (move.id === 'CHUNLI_PRIMARY' || move.id === 'CHUNLI_EX_PRIMARY') return 'hadoken';
    if (move.id === '5LP') return 'stand-light';
    if (move.id === '5HP') return 'stand-heavy';
    return null;
  }
  if (characterId === 'RYU') {
    if (move.id === 'RYU_PRIMARY' || move.id === 'RYU_EX_PRIMARY' || move.id === 'RYU_SUPER' || move.id === 'RYU_SA1' || move.id === 'RYU_SA3') return 'hadoken';
    if (move.id === 'RYU_ANTI_AIR' || move.id === 'RYU_SA2') return 'shoryuken';
  }
  if (characterId === 'KEN') {
    if (move.id === 'KEN_PRIMARY' || move.id === 'KEN_EX_PRIMARY') return 'hadoken';
    if (move.id === 'KEN_ANTI_AIR' || move.id === 'KEN_SA1' || move.id === 'KEN_SA2') return 'shoryuken';
    if (move.id === 'KEN_MOBILITY') return 'tatsumaki';
    if (move.id === 'KEN_SUPER' || move.id === 'KEN_SA3') return 'super-rush';
  }
  if (!move.button) return null;
  if (move.button === 'hp' || move.button === 'hk') return 'stand-heavy';
  return 'stand-light';
}

function attackFrame(sequence: AnimationSequence, fighter: Fighter, move: MoveData): AnimationSequenceSample {
  const phase = sequence.phase;
  const last = sequence.frameCount - 1;
  if (!phase) {
    const total = Math.max(1, move.startup + move.active + move.recovery);
    const progress = clamp01(fighter.moveFrame / Math.max(1, total - 1));
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }

  const activeStartGame = move.startup;
  const activeEndGame = move.startup + Math.max(1, move.active) - 1;
  const recoveryGameStart = activeEndGame + 1;
  let frame = 0;
  let progress = 0;
  let contact = false;

  if (fighter.moveFrame < activeStartGame) {
    progress = clamp01(fighter.moveFrame / Math.max(1, move.startup - 1));
    const end = Math.max(0, phase.startupEnd ?? Math.max(0, (phase.activeStart ?? 1) - 1));
    frame = Math.min(end, Math.floor(curveProgress(progress, sequence.timing) * (end + 1)));
  } else if (fighter.moveFrame <= activeEndGame) {
    progress = clamp01((fighter.moveFrame - activeStartGame) / Math.max(1, move.active - 1));
    const start = phase.activeStart ?? Math.min(last, (phase.startupEnd ?? 0) + 1);
    const end = Math.max(start, phase.activeEnd ?? start);
    frame = Math.min(end, start + Math.floor(progress * (end - start + 1)));
    contact = true;
  } else {
    progress = clamp01((fighter.moveFrame - recoveryGameStart) / Math.max(1, move.recovery - 1));
    const start = phase.recoveryStart ?? Math.min(last, (phase.activeEnd ?? 0) + 1);
    frame = Math.min(last, start + Math.floor(curveProgress(progress, sequence.timing) * Math.max(1, last - start + 1)));
  }

  return { sequence, frame: Math.max(0, Math.min(last, frame)), progress, contact };
}

export function animationSequenceSample(fighter: Fighter, _time: number): AnimationSequenceSample | null {
  const characterId = fighter.character.id;
  if (fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0 || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0 || fighter.state === 'knockdown' || fighter.state === 'ko' || fighter.state === 'victory') return null;

  if (fighter.state === 'attack' && fighter.currentMove) {
    if (characterId === 'CHUNLI' && fighter.airborne) return null;
    const kind = animationSequenceKindForAttack(characterId, fighter.currentMove);
    if (!kind) return null;
    const sequence = animationSequenceFor(characterId, kind, true);
    if (!sequence || !sequence.poseAuthored) return null;
    const sample = attackFrame(sequence, fighter, fighter.currentMove);
    if (sequence.renderMode === 'bridge' && sample.contact) return null;
    return sample;
  }

  const kind = movementKind(fighter);
  if (!kind) return null;
  const sequence = animationSequenceFor(characterId, kind, true);
  if (!sequence || !sequence.poseAuthored) return null;

  if (kind === 'jump') {
    const rise = Math.max(-1, Math.min(1, fighter.jumpVelocity / Math.max(1, fighter.combatProfile.jumpVelocity)));
    const apex = clamp01(1 - Math.abs(rise));
    const airborneProgress = rise >= 0 ? (1 - rise) * .48 : .52 + clamp01(-rise) * .48;
    const progress = clamp01(airborneProgress + apex * .02);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'landing') {
    const progress = clamp01(1 - fighter.landingFrames / 8);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'dash') {
    const progress = clamp01(1 - fighter.dashFrames / 8);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'hit') {
    const progress = clamp01(fighter.stateFrame / Math.max(1, sequence.frameCount + 2));
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'guard') {
    // Block stun is gameplay-owned and can be longer than the visual strip. Hold the
    // first authored brace pose until the last ~16 frames, then play through recovery.
    const progress = clamp01(1 - Math.abs(fighter.stateFrame) / 16);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'parry') {
    // Normal parry is 8f and red parry is 10f. Sampling against 10 keeps both
    // deterministic without changing the combat window itself.
    const progress = clamp01(1 - Math.abs(fighter.stateFrame) / 10);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }

  const seconds = Math.max(0, fighter.stateFrame / 60);
  if (sequence.loop) {
    const loop = loopFrame(sequence, seconds);
    return { sequence, frame:loop.frame, progress:loop.progress, contact:false };
  }
  const frameFloat = seconds * sequence.fps;
  const progress = clamp01(frameFloat / Math.max(1, sequence.frameCount - 1));
  return { sequence, frame:frameAt(sequence, progress), progress, contact:false };
}
