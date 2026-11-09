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
  if (fighter.dashFrames > 0 && !fighter.airborne && (fighter.state === 'walk' || fighter.state === 'idle')) {
    if (fighter.dashDirection !== fighter.facing && animationSequenceFor(fighter.character.id,'dash-back',true)?.poseAuthored) return 'dash-back';
    return 'dash';
  }
  if (!fighter.airborne && (fighter.state === 'crouch'
    || (fighter.crouchAnimationFrame >= 0 && (fighter.state === 'idle' || fighter.state === 'walk')
      && animationSequenceFor(fighter.character.id, 'crouch', true)?.poseAuthored))) return 'crouch';
  if (fighter.state === 'walk') {
    const velocity = fighter.x - fighter.previousX;
    return Math.sign(velocity || fighter.facing) === fighter.facing ? 'walk' : 'walk-back';
  }
  if (fighter.state === 'idle') return 'idle';
  return null;
}

export function animationSequenceKindForAttack(characterId: string, move: MoveData): AnimationSequenceKind | null {
  if (characterId === 'IBUKI' && move.id === 'IBUKI_SA3') return 'super-rush';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_SA2') return 'yoroi-doroshi';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_MOBILITY') return 'tatsumaki';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_ANTI_AIR') return 'shoryuken';
  if (characterId === 'IBUKI' && ['IBUKI_PRIMARY','IBUKI_EX_PRIMARY','IBUKI_SUPER','IBUKI_SA1'].includes(move.id)) return 'hadoken';
  if (characterId === 'IBUKI') return move.id === '5LP' ? 'stand-light' : move.id === '5MP' ? 'stand-medium' : move.id === '5HP' ? 'stand-heavy' : move.id === '5LK' ? 'stand-light-kick' : move.id === '5MK' ? 'stand-medium-kick' : move.id === '5HK' ? 'stand-heavy-kick' : null;
  if (characterId === 'CHUNLI') {
    if (move.id === '2MP') return 'crouch-medium';
    if (move.id === '2LP') return 'crouch-light';
    if (move.id === 'CHUNLI_SA3') return 'tensei-ranka';
    if (move.id === 'CHUNLI_SA1') return 'kikosho';
    if (move.id === 'CHUNLI_SUPER' || move.id === 'CHUNLI_SA2') return 'super-rush';
    if (move.id === 'CHUNLI_ANTI_AIR') return 'shoryuken';
    if (move.id === 'CHUNLI_MOBILITY') return 'tatsumaki';
    if (move.id === 'CHUNLI_PRIMARY' || move.id === 'CHUNLI_EX_PRIMARY') return 'hadoken';
    if (move.id === '5LP') return 'stand-light';
    if (move.id === '5MP') return 'stand-medium';
    if (move.id === '5LK') return 'stand-light-kick';
    if (move.id === '5MK') return 'stand-medium-kick';
    if (move.id === '5HK') return 'stand-heavy-kick';
    if (move.id === '5HP') return 'stand-heavy';
    return null;
  }
  if (characterId === 'RYU') {
    if (move.id === 'RYU_PRIMARY' || move.id === 'RYU_EX_PRIMARY' || move.id === 'RYU_SUPER' || move.id === 'RYU_SA1' || move.id === 'RYU_SA3') return 'hadoken';
    if (move.id === 'RYU_ANTI_AIR' || move.id === 'RYU_SA2') return 'shoryuken';
    if (move.id === '2LP') return 'crouch-light';
    if (move.id === '2MP') return 'crouch-medium';
    if (move.id === '2HP') return 'crouch-heavy';
    if (move.id === '2LK') return 'crouch-light-kick';
    if (move.id === '2MK') return 'crouch-medium-kick';
    if (move.id === '2HK') return 'crouch-heavy-kick';
    return move.id === '5LP' ? 'stand-light' : move.id === '5MP' ? 'stand-medium' : move.id === '5HP' ? 'stand-heavy' : move.id === '5LK' ? 'stand-light-kick' : move.id === '5MK' ? 'stand-medium-kick' : move.id === '5HK' ? 'stand-heavy-kick' : null;
  }
  if (characterId === 'KEN') {
    if (move.id === '2HK') return 'crouch-heavy-kick';
    if (move.id === '2MK') return 'crouch-medium-kick';
    if (move.id === '2LK') return 'crouch-light-kick';
    if (move.id === '2HP') return 'crouch-heavy';
    if (move.id === '2MP') return 'crouch-medium';
    if (move.id === '2LP') return 'crouch-light';
    if (move.id === 'KEN_PRIMARY' || move.id === 'KEN_EX_PRIMARY') return 'hadoken';
    if (move.id === 'KEN_ANTI_AIR' || move.id === 'KEN_SA1' || move.id === 'KEN_SA2') return 'shoryuken';
    if (move.id === 'KEN_MOBILITY') return 'tatsumaki';
    if (move.id === 'KEN_SUPER' || move.id === 'KEN_SA3') return 'super-rush';
    // These authored strips depict specific standing normals, not every attack that
    // shares their button strength (crouching, kicking, or command normals).
    return move.id === '5LP' ? 'stand-light' : move.id === '5MP' ? 'stand-medium' : move.id === '5HP' ? 'stand-heavy' : move.id === '5LK' ? 'stand-light-kick' : move.id === '5MK' ? 'stand-medium-kick' : move.id === '5HK' ? 'stand-heavy-kick' : null;
  }
  if (['ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'].includes(characterId)) {
    switch (move.id) {
      case '2LP': return 'crouch-light';
      case '2MP': return 'crouch-medium';
      case '2HP': return 'crouch-heavy';
      case '2LK': return 'crouch-light-kick';
      case '2MK': return 'crouch-medium-kick';
      case '2HK': return 'crouch-heavy-kick';
      case '5LP': return 'stand-light';
      case '5MP': return 'stand-medium';
      case '5HP': return 'stand-heavy';
      case '5LK': return 'stand-light-kick';
      case '5MK': return 'stand-medium-kick';
      case '5HK': return 'stand-heavy-kick';
      default: return null;
    }
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
    if (characterId === 'IBUKI' && fighter.airborne && fighter.currentMove.id !== 'IBUKI_ANTI_AIR') return null;
    // These ground-initiated rising attacks own their launch and keep their
    // strips during flight. Other Chun-Li attacks still use their air visuals.
    if (characterId === 'CHUNLI' && fighter.airborne && fighter.currentMove.id !== 'CHUNLI_ANTI_AIR' && fighter.currentMove.id !== 'CHUNLI_SA3') return null;
    const kind = animationSequenceKindForAttack(characterId, fighter.currentMove);
    if (!kind) return null;
    if (fighter.airborne && (kind === 'crouch-light' || kind === 'crouch-medium' || kind === 'crouch-heavy' || kind === 'crouch-light-kick' || kind === 'crouch-medium-kick' || kind === 'crouch-heavy-kick' || kind === 'stand-light' || kind === 'stand-medium' || kind === 'stand-heavy' || kind === 'stand-light-kick' || kind === 'stand-medium-kick' || kind === 'stand-heavy-kick')) return null;
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

  if (kind === 'crouch') {
    const frame = Math.max(0, Math.min(sequence.frameCount - 1, fighter.crouchAnimationFrame));
    return { sequence, frame, progress:frame / Math.max(1, sequence.frameCount - 1), contact:false };
  }
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
  if (kind === 'dash' || kind === 'dash-back') {
    const direction = fighter.dashDirection === fighter.facing ? 'forward' : 'backward';
    if (sequence.facingRelativeDirection && sequence.facingRelativeDirection !== direction) return null;
    const progress = clamp01(1 - fighter.dashFrames / 8);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'hit') {
    // Gameplay counts hit stun upward from a negative value. Keep the visual
    // clock on that same counter so hit stop and repeated hits remain in sync.
    const duration = fighter.hitAnimationDuration;
    const progress = fighter.stateFrame < 0 && duration > 0
      ? clamp01((duration + fighter.stateFrame) / Math.max(1, duration - 1))
      : clamp01(fighter.stateFrame / Math.max(1, sequence.frameCount + 2));
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
