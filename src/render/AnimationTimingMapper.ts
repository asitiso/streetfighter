import { motionClipForFighter } from './AnimationPoseLibrary.js';
import { airFallSample } from './AirFallProfiles.js';
import type { Fighter } from '../combat/Fighter.js';
import type { MoveData } from '../combat/CombatTypes.js';
import { animationSequenceFor, type AnimationSequence, type AnimationSequenceKind } from './AnimationSequenceLibrary.js';
import { animationFrameProfile } from './AnimationFrameProfiles.js';


// Explicit strike semantics: boxing hooks, lariats and palms are not inferred from button names.
const TARGET_COMBO_MOTIONS: Readonly<Record<string, AnimationSequenceKind>> = {
  RYU_TC_SOLAR_FINISH: 'stand-heavy',
  RYU_TC_KICK_FINISH: 'stand-medium-kick',
  KEN_TC_RUSH_2: 'stand-medium',
  KEN_TC_RUSH_3: 'stand-heavy',
  KEN_TC_KICK_2: 'stand-medium-kick',
  KEN_TC_KICK_3: 'stand-heavy-kick',
  CHUNLI_TC_FOOT_2: 'stand-medium-kick',
  CHUNLI_TC_FOOT_3: 'stand-heavy-kick',
  CHUNLI_TC_LOW_HIGH: 'stand-heavy-kick',
  ALEX_TC_ELBOW_LARIAT: 'lariat-press',
  ALEX_TC_KNEE_SMASH: 'stand-heavy',
  DUDLEY_TC_ONE_TWO: 'stand-medium',
  DUDLEY_TC_ONE_TWO_THREE: 'stand-heavy',
  DUDLEY_TC_BODY_HOOK: 'stand-heavy',
  MAKOTO_TC_KARATE_FINISH: 'forward-chop',
  MAKOTO_TC_LOW_BURST: 'stand-heavy',
  IBUKI_TC_NINJA_2: 'stand-light-kick',
  IBUKI_TC_NINJA_3: 'stand-medium-kick',
  IBUKI_TC_PALM_KICK: 'stand-medium-kick',
  IBUKI_TC_PALM_KICK_FINISH: 'stand-heavy-kick',
  YUN_TC_CHAIN_2: 'stand-medium',
  YUN_TC_CHAIN_3: 'shoulder-palm',
  YUN_TC_KICK_2: 'stand-medium-kick',
  YUN_TC_KICK_PALM: 'shoulder-palm',
};

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
  if (fighter.state === 'victory') return 'victory';
  if (fighter.state === 'hit') return 'hit';
  if (fighter.state === 'block') return 'guard';
  if (fighter.state === 'parry') return 'parry';
  if (motionClipForFighter(fighter, 0).clip === 'throwEscape') return 'throw-escape';
  // Moving feet own locomotion immediately; only neutral touchdown holds landing art.
  if (!fighter.airborne && fighter.landingFrames > 0 && fighter.dashFrames <= 0 && fighter.state === 'idle') return 'landing';
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
    // Tracked gait follows input/AI intent; collision resolution may push the body sideways.
    // Untouched pose previews retain their velocity-based direction.
    const direction = fighter.walkAnimationFrame === null
      ? velocity || fighter.walkDirection || fighter.facing : fighter.walkDirection || fighter.facing;
    return Math.sign(direction) === fighter.facing ? 'walk' : 'walk-back';
  }
  if (fighter.state === 'idle') return 'idle';
  return null;
}

export function animationSequenceKindForAttack(characterId: string, move: MoveData): AnimationSequenceKind | null {
  if (move.technique === 'target') {
    return move.id.startsWith(characterId + '_TC_') ? TARGET_COMBO_MOTIONS[move.id] ?? null : null;
  }
  if (characterId === 'YUN' && move.id === 'YUN_CMD_HP') return 'shoulder-palm';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_CMD_MK') return 'spin-heel';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_CMD_HP') return 'forward-chop';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_CMD_HK') return 'dart-shot';
  if (characterId === 'ALEX' && move.id === 'ALEX_CMD_HP') return 'lariat-press';
  if (characterId === 'KEN' && move.id === 'KEN_CMD_MK') return 'step-kick';
  if (characterId === 'RYU' && move.id === 'RYU_CMD_MP') return 'collarbone-breaker';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_CMD_HP') return 'forward-backfist';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_MK') return 'air-medium-kick';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_MP') return 'air-medium-punch';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_LK') return 'air-light-kick';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_LP') return 'air-light-punch';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'CHUNLI' && move.id === 'CHUNLI_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_MK') return 'air-medium-kick';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_MP') return 'air-medium-punch';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_LK') return 'air-light-kick';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_LP') return 'air-light-punch';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'RYU' && move.id === 'RYU_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_MK') return 'air-medium-kick';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_MP') return 'air-medium-punch';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_LK') return 'air-light-kick';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_LP') return 'air-light-punch';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'KEN' && move.id === 'KEN_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_MK') return 'air-medium-kick';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_MP') return 'air-medium-punch';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_LK') return 'air-light-kick';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_LP') return 'air-light-punch';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'GILL' && move.id === 'GILL_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'GILL' && move.id === 'GILL_MOBILITY') return 'lariat-rush';
  if (characterId === 'GILL' && move.id === 'GILL_ANTI_AIR') return 'shoryuken';
  if (characterId === 'GILL' && (move.id === 'GILL_PRIMARY' || move.id === 'GILL_EX_PRIMARY')) return 'hadoken';
  if (characterId === 'GILL' && move.id === 'GILL_SUPER') return 'seraphic-storm';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_MK') return 'air-medium-kick';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_MP') return 'air-medium-punch';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_LK') return 'air-light-kick';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_LP') return 'air-light-punch';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'URIEN' && move.id === 'URIEN_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'URIEN' && move.id === 'URIEN_SUPER') return 'aegis-reflector';
  if (characterId === 'URIEN' && move.id === 'URIEN_MOBILITY') return 'shoulder-tackle';
  if (characterId === 'URIEN' && move.id === 'URIEN_ANTI_AIR') return 'shoryuken';
  if (characterId === 'URIEN' && (move.id === 'URIEN_PRIMARY' || move.id === 'URIEN_EX_PRIMARY')) return 'hadoken';
  if (characterId === 'YUN' && move.id === 'YUN_SA3') return 'genei-jin-install';
  if (characterId === 'YUN' && move.id === 'YUN_SA1') return 'you-hou';
  if (characterId === 'YUN' && move.id === 'YUN_SA2') return 'sourai-rengeki';
  if (characterId === 'YUN' && move.id === 'YUN_SUPER') return 'genei-jin';
  if (characterId === 'YUN' && move.id === 'YUN_MOBILITY') return 'shoulder-tackle';
  if (characterId === 'YUN' && move.id === 'YUN_ANTI_AIR') return 'shoryuken';
  if (characterId === 'YUN' && (move.id === 'YUN_PRIMARY' || move.id === 'YUN_EX_PRIMARY')) return 'palm-rush';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_MK') return 'air-medium-kick';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_MP') return 'air-medium-punch';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_LK') return 'air-light-kick';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_LP') return 'air-light-punch';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'YUN' && move.id === 'YUN_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_MK') return 'air-medium-kick';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_MP') return 'air-medium-punch';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_LK') return 'air-light-kick';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_LP') return 'air-light-punch';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_SA3') return 'tanden-renki';
  if (characterId === 'MAKOTO' && (move.id === 'MAKOTO_SUPER' || move.id === 'MAKOTO_SA1')) return 'seichusen-godanzuki';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_MOBILITY') return 'tsurugi';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_ANTI_AIR') return 'shoryuken';
  if (characterId === 'MAKOTO' && (move.id === 'MAKOTO_PRIMARY' || move.id === 'MAKOTO_EX_PRIMARY')) return 'hayate';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_MK') return 'air-medium-kick';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_MP') return 'air-medium-punch';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_LK') return 'air-light-kick';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_LP') return 'air-light-punch';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_SA1') return 'rocket-uppercut';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_SA2') return 'rolling-thunder';
  if (characterId === 'DUDLEY' && (move.id === 'DUDLEY_SUPER' || move.id === 'DUDLEY_SA3')) return 'corkscrew-blow';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_ANTI_AIR') return 'shoryuken';
  if (characterId === 'DUDLEY' && (move.id === 'DUDLEY_PRIMARY' || move.id === 'DUDLEY_EX_PRIMARY')) return 'machine-gun-blow';
  if (characterId === 'DUDLEY' && move.id === 'DUDLEY_MOBILITY') return 'ducking-straight';
  if (characterId === 'MAKOTO' && move.id === 'MAKOTO_SA2') return 'abare-tosanami';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_MK') return 'air-medium-kick';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_MP') return 'air-medium-punch';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_LK') return 'air-light-kick';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_LP') return 'air-light-punch';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'ALEX' && move.id === 'ALEX_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'ALEX' && move.id === 'ALEX_SA3') return 'stun-gun-headbutt';
  if (characterId === 'ALEX' && move.id === 'ALEX_SA2') return 'boomerang-raid';
  if (characterId === 'ALEX' && (move.id === 'ALEX_SUPER' || move.id === 'ALEX_SA1')) return 'hyper-bomb';
  if (characterId === 'ALEX' && move.id === 'ALEX_ANTI_AIR') return 'shoryuken';
  if (characterId === 'ALEX' && move.id === 'ALEX_MOBILITY') return 'slash-elbow';
  if (characterId === 'ALEX' && (move.id === 'ALEX_PRIMARY' || move.id === 'ALEX_EX_PRIMARY')) return 'flash-chop';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_MK') return 'air-medium-kick';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_MP') return 'air-medium-punch';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_LK') return 'air-light-kick';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_LP') return 'air-light-punch';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_HK') return 'air-heavy-kick';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_AIR_HP') return 'air-heavy-punch';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_SA3') return 'super-rush';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_SA2') return 'yoroi-doroshi';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_MOBILITY') return 'tatsumaki';
  if (characterId === 'IBUKI' && move.id === 'IBUKI_ANTI_AIR') return 'shoryuken';
  if (characterId === 'IBUKI' && ['IBUKI_PRIMARY','IBUKI_EX_PRIMARY','IBUKI_SUPER','IBUKI_SA1'].includes(move.id)) return 'hadoken';
  if (characterId === 'IBUKI' && move.id === '2HK') return 'crouch-heavy-kick';
  if (characterId === 'IBUKI' && move.id === '2MK') return 'crouch-medium-kick';
  if (characterId === 'IBUKI' && move.id === '2LK') return 'crouch-light-kick';
  if (characterId === 'IBUKI' && move.id === '2HP') return 'crouch-heavy';
  if (characterId === 'IBUKI' && move.id === '2MP') return 'crouch-medium';
  if (characterId === 'IBUKI' && move.id === '2LP') return 'crouch-light';
  if (characterId === 'IBUKI') return move.id === '5LP' ? 'stand-light' : move.id === '5MP' ? 'stand-medium' : move.id === '5HP' ? 'stand-heavy' : move.id === '5LK' ? 'stand-light-kick' : move.id === '5MK' ? 'stand-medium-kick' : move.id === '5HK' ? 'stand-heavy-kick' : null;
  if (characterId === 'CHUNLI') {
    if (move.id === '2HK') return 'crouch-heavy-kick';
    if (move.id === '2MK') return 'crouch-medium-kick';
    if (move.id === '2LK') return 'crouch-light-kick';
    if (move.id === '2HP') return 'crouch-heavy';
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
    if (move.id === 'RYU_MOBILITY') return 'tatsumaki';
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

  return { sequence, frame: Math.max(0, Math.min(last, frame)), progress, contact: contact && !move.install };
}

export function animationSequenceSample(fighter: Fighter, _time: number): AnimationSequenceSample | null {
  const characterId = fighter.character.id;
  if (fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0 || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0) return null;

  if (fighter.state === 'knockdown') {
    if (fighter.airborne || fighter.jumpHeight > 0) return null;
    const sequence = animationSequenceFor(characterId, 'knockdown', true);
    if (!sequence?.poseAuthored) return null;
    const duration = Math.max(1, fighter.knockdownAnimationDuration || 34);
    const progress = clamp01((duration + fighter.stateFrame) / Math.max(1, duration - 1));
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }

  if (fighter.state === 'ko') {
    if (fighter.airborne || fighter.jumpHeight > 0) return null;
    const sequence = animationSequenceFor(characterId, 'ko', true);
    if (!sequence?.poseAuthored) return null;
    // KO stateFrame freezes with hit stop and pause. Settle quickly, then hold.
    const progress = clamp01((90 + fighter.stateFrame) / 24);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }

  if (fighter.state === 'attack' && fighter.currentMove) {
    if (fighter.airborne && fighter.currentMove.technique === 'target') return null;
    if (characterId === 'IBUKI' && fighter.airborne && fighter.currentMove.id !== 'IBUKI_ANTI_AIR' && fighter.currentMove.id !== 'IBUKI_AIR_HP' && fighter.currentMove.id !== 'IBUKI_AIR_HK' && fighter.currentMove.id !== 'IBUKI_AIR_LP' && fighter.currentMove.id !== 'IBUKI_AIR_LK' && fighter.currentMove.id !== 'IBUKI_AIR_MP' && fighter.currentMove.id !== 'IBUKI_AIR_MK') return null;
    // The authored air normals and ground-initiated rising attacks keep their
    // strips during flight. Other Chun-Li attacks still use their air visuals.
    if (characterId === 'CHUNLI' && fighter.airborne && fighter.currentMove.id !== 'CHUNLI_ANTI_AIR' && fighter.currentMove.id !== 'CHUNLI_SA3' && fighter.currentMove.id !== 'CHUNLI_AIR_HP' && fighter.currentMove.id !== 'CHUNLI_AIR_HK' && fighter.currentMove.id !== 'CHUNLI_AIR_LP' && fighter.currentMove.id !== 'CHUNLI_AIR_LK' && fighter.currentMove.id !== 'CHUNLI_AIR_MP' && fighter.currentMove.id !== 'CHUNLI_AIR_MK') return null;
    const kind = animationSequenceKindForAttack(characterId, fighter.currentMove);
    if (!kind) return null;
    if (characterId === 'GILL' && fighter.airborne && (kind === 'hadoken' || kind === 'lariat-rush' || kind === 'seraphic-storm')) return null;
    if (characterId === 'URIEN' && fighter.airborne && (kind === 'hadoken' || kind === 'shoulder-tackle' || kind === 'aegis-reflector')) return null;
    if (characterId === 'YUN' && fighter.airborne && (kind === 'palm-rush' || kind === 'shoulder-tackle' || kind === 'genei-jin' || kind === 'genei-jin-install' || kind === 'sourai-rengeki')) return null;
    if (characterId === 'MAKOTO' && fighter.airborne && (kind === 'hayate' || kind === 'tsurugi' || kind === 'seichusen-godanzuki' || kind === 'tanden-renki')) return null;
    if (characterId === 'DUDLEY' && fighter.airborne && (kind === 'ducking-straight' || kind === 'machine-gun-blow' || kind === 'corkscrew-blow' || kind === 'rolling-thunder')) return null;
    if (characterId === 'ALEX' && fighter.airborne && (kind === 'flash-chop' || kind === 'slash-elbow' || kind === 'hyper-bomb' || kind === 'boomerang-raid')) return null;
    if (characterId === 'RYU' && fighter.airborne && (kind === 'hadoken' || kind === 'tatsumaki')) return null;
    if (fighter.airborne && (kind === 'crouch-light' || kind === 'crouch-medium' || kind === 'crouch-heavy' || kind === 'crouch-light-kick' || kind === 'crouch-medium-kick' || kind === 'crouch-heavy-kick' || kind === 'stand-light' || kind === 'stand-medium' || kind === 'stand-heavy' || kind === 'stand-light-kick' || kind === 'stand-medium-kick' || kind === 'stand-heavy-kick')) return null;
    if (kind.startsWith('air-') && !fighter.airborne) return null;
    const sequence = animationSequenceFor(characterId, kind, true);
    if (!sequence || !sequence.poseAuthored) return null;
    let sample = attackFrame(sequence, fighter, fighter.currentMove);
    if (characterId === 'DUDLEY' && kind === 'machine-gun-blow' && sample.contact) {
      const move = fighter.currentMove;
      const interval = Math.max(1, move.multiHit?.interval ?? 1);
      const hits = Math.max(1, move.multiHit?.hits ?? 1);
      let elapsed = Math.max(0, fighter.moveFrame - move.startup);
      let completed = 0, latest = -1;
      // Highest hit count caps the ordinal; the newest impact on ANY victim
      // anchors the phase so a newly hit enemy cannot freeze a withdrawal pose.
      for (const [target, count] of fighter.attackVictimHits) {
        const hitFrame = fighter.attackVictimFrames.get(target) ?? -1;
        if (hitFrame >= move.startup && hitFrame <= fighter.moveFrame) {
          completed = Math.max(completed, count);
          latest = Math.max(latest, hitFrame);
        }
      }
      if (latest >= 0) elapsed = fighter.moveFrame - latest;
      const beat = Math.max(0, completed - 1) + Math.floor(elapsed / interval);
      const frame = beat >= hits ? 4 : 3 + (beat % 2) * 3 + Math.min(2, Math.floor((elapsed % interval) * 3 / interval));
      sample = { ...sample, frame };
    }
    if ((characterId === 'KEN' || characterId === 'CHUNLI' || characterId === 'IBUKI' || characterId === 'RYU' || characterId === 'DUDLEY' || characterId === 'MAKOTO' || characterId === 'GILL' || characterId === 'YUN' || characterId === 'URIEN' || characterId === 'ALEX') && (kind === 'shoryuken' || (characterId === 'CHUNLI' && kind === 'tensei-ranka') || (characterId === 'DUDLEY' && kind === 'rocket-uppercut') || (characterId === 'ALEX' && kind === 'stun-gun-headbutt') || (characterId === 'MAKOTO' && kind === 'abare-tosanami')) && !sample.contact
      && fighter.moveFrame >= fighter.currentMove.startup + fighter.currentMove.active) {
      // Flight can outlast the active hit. Keep the fist/legs airborne until
      // actual touchdown instead of playing grounded recovery at jump apex.
      const last = sequence.frameCount - 1;
      // Ibuki's legacy strip has two tucked recovery poses before its two
      // grounded poses; the other strips have three grounded landing poses.
      const riseFrame = characterId === 'IBUKI' ? last - 3 : last - 4;
      const fallFrame = characterId === 'IBUKI' ? last - 2 : last - 3;
      const landingStart = characterId === 'IBUKI' ? last - 1 : last - 2;
      const frame = fighter.airborne ? (fighter.jumpVelocity > 0 ? riseFrame : fallFrame)
        : fighter.landingFrames > 0 ? (fighter.landingFrames >= 6 ? landingStart : fighter.landingFrames >= 3 ? last - 1 : last)
          : fighter.attackHasLanded ? last : sample.frame;
      sample = { ...sample, frame };
    }
    if (characterId === 'YUN' && kind === 'you-hou' && !sample.contact
      && fighter.moveFrame >= fighter.currentMove.startup + fighter.currentMove.active) {
      // You Hou uses the existing launch arc. Keep the finisher through ascent,
      // then recoil in flight and let actual touchdown start the landing poses.
      const frame = fighter.airborne ? (fighter.jumpVelocity > 0 ? 7 : 8)
        : fighter.landingFrames > 0 ? (fighter.landingFrames >= 6 ? 9 : fighter.landingFrames >= 3 ? 10 : 11) : sample.frame;
      sample = { ...sample, frame };
    }
    if (sequence.renderMode === 'bridge' && sample.contact) return null;
    return sample;
  }

  if ((characterId === 'RYU' || characterId === 'KEN' || characterId === 'CHUNLI' || characterId === 'IBUKI' || characterId === 'DUDLEY' || characterId === 'MAKOTO' || characterId === 'GILL' || characterId === 'YUN' || characterId === 'URIEN' || characterId === 'ALEX') && (fighter.visualRecoveryMoveId === `${characterId}_ANTI_AIR` || (characterId === 'CHUNLI' && fighter.visualRecoveryMoveId === 'CHUNLI_SA3') || (characterId === 'DUDLEY' && fighter.visualRecoveryMoveId === 'DUDLEY_SA1') || (characterId === 'ALEX' && fighter.visualRecoveryMoveId === 'ALEX_SA3') || (characterId === 'MAKOTO' && fighter.visualRecoveryMoveId === 'MAKOTO_SA2'))
    && (fighter.state === 'jump' || (!fighter.airborne && fighter.landingFrames > 0 && (fighter.state === 'idle' || fighter.state === 'walk')))) {
    const sequence = animationSequenceFor(characterId, fighter.visualRecoveryMoveId === 'CHUNLI_SA3' ? 'tensei-ranka' : fighter.visualRecoveryMoveId === 'DUDLEY_SA1' ? 'rocket-uppercut' : fighter.visualRecoveryMoveId === 'ALEX_SA3' ? 'stun-gun-headbutt' : fighter.visualRecoveryMoveId === 'MAKOTO_SA2' ? 'abare-tosanami' : 'shoryuken', true);
    if (sequence?.poseAuthored) {
      const last = sequence.frameCount - 1;
      const airFrame = characterId === 'IBUKI' ? last - 2 : last - 3;
      const landingStart = characterId === 'IBUKI' ? last - 1 : last - 2;
      const frame = fighter.airborne ? airFrame : fighter.landingFrames >= 6 ? landingStart : fighter.landingFrames >= 3 ? last - 1 : last;
      return { sequence, frame, progress: frame / (sequence.frameCount - 1), contact: false };
    }
  }

  if (characterId === 'YUN' && fighter.visualRecoveryMoveId === 'YUN_SA1'
    && (fighter.state === 'jump' || (!fighter.airborne && fighter.landingFrames > 0 && (fighter.state === 'idle' || fighter.state === 'walk')))) {
    const sequence = animationSequenceFor(characterId, 'you-hou', true);
    if (sequence?.poseAuthored) {
      const frame = fighter.airborne ? 8 : fighter.landingFrames >= 6 ? 9 : fighter.landingFrames >= 3 ? 10 : 11;
      return { sequence, frame, progress: frame / (sequence.frameCount - 1), contact: false };
    }
  }

  const kind = movementKind(fighter);
  if (!kind) return null;
  const sequence = animationSequenceFor(characterId, kind, true);
  if (!sequence || !sequence.poseAuthored) return null;

  if (kind === 'throw-escape') {
    const elapsed = Math.max(0, 12 - fighter.throwEscapeFrames);
    return { sequence, frame: Math.min(5, Math.floor(elapsed / 2)), progress: clamp01(elapsed / 12), contact: false };
  }
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
    // Keep direct sampler callers and rendering on the same live aerial recoil.
    if (fighter.airborne || fighter.jumpHeight > 0) return airFallSample(fighter);
    // Gameplay counts hit stun upward from a negative value. Keep the visual
    // clock on that same counter so hit stop and repeated hits remain in sync.
    const duration = fighter.hitAnimationDuration;
    const progress = fighter.stateFrame < 0 && duration > 0
      ? clamp01((duration + fighter.stateFrame) / Math.max(1, duration - 1))
      : clamp01(fighter.stateFrame / Math.max(1, sequence.frameCount + 2));
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'guard') {
    // Short blocks start at the brace pose too. Long blocks retain the original
    // hold until the final 16 ticks; gameplay still owns the full countdown.
    const duration = Math.min(16, Math.max(1, fighter.guardAnimationDuration || 16));
    const progress = clamp01(1 - Math.abs(fighter.stateFrame) / duration);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }
  if (kind === 'parry') {
    // Use this parry's original duration so the shorter normal parry also
    // starts at the first authored pose. Combat still owns the countdown.
    const duration = Math.max(1, fighter.parryAnimationDuration || 10);
    const progress = clamp01(1 - Math.abs(fighter.stateFrame) / duration);
    return { sequence, frame: frameAt(sequence, progress), progress, contact: false };
  }

  const elapsed = kind === 'walk' || kind === 'walk-back' ? fighter.walkAnimationFrame ?? fighter.stateFrame : fighter.stateFrame;
  const seconds = Math.max(0, elapsed / 60);
  if (sequence.loop) {
    const loop = loopFrame(sequence, seconds);
    return { sequence, frame:loop.frame, progress:loop.progress, contact:false };
  }
  if (kind === 'victory') {
    // Sample celebration frames at their declared rate, then hold the last pose.
    const frame = Math.min(sequence.frameCount - 1, Math.floor(Math.max(0, fighter.stateFrame) * sequence.fps / 60));
    return { sequence, frame, progress:frame / Math.max(1, sequence.frameCount - 1), contact:false };
  }
  const frameFloat = seconds * sequence.fps;
  const progress = clamp01(frameFloat / Math.max(1, sequence.frameCount - 1));
  return { sequence, frame:frameAt(sequence, progress), progress, contact:false };
}

export interface AirAttackRecoverySample {
  previous: AnimationSequenceSample;
  current: AnimationSequenceSample;
  blend: number;
}

const AIR_RECOVERY_TICKS = 3;

// A naturally finished air normal may end before touchdown. Bridge its last
// pose into the live jump pose using the frozen simulation clock, not render time.
export function airAttackRecoverySample(fighter: Fighter, time: number): AirAttackRecoverySample | null {
  if (!fighter.airborne || fighter.state !== 'jump' || fighter.currentMove
    || fighter.stateFrame < 0 || fighter.stateFrame >= AIR_RECOVERY_TICKS - 1) return null;
  const prefix = fighter.character.id + '_AIR_';
  const id = fighter.visualRecoveryMoveId;
  if (!id?.startsWith(prefix)) return null;
  const kinds = { LP:'air-light-punch', MP:'air-medium-punch', HP:'air-heavy-punch',
    LK:'air-light-kick', MK:'air-medium-kick', HK:'air-heavy-kick' } as const;
  const kind = kinds[id.slice(prefix.length) as keyof typeof kinds];
  if (!kind) return null;
  const previous = animationSequenceFor(fighter.character.id, kind, true);
  const current = animationSequenceSample(fighter, time);
  if (!previous?.poseAuthored || !current || current.sequence.kind !== 'jump') return null;
  // Keep the dissolve short so very different silhouettes do not linger together.
  const progress = (fighter.stateFrame + 1) / AIR_RECOVERY_TICKS;
  const blend = progress * progress * (3 - 2 * progress);
  return { previous: { sequence:previous, frame:previous.frameCount - 1, progress:1, contact:false },
    current, blend };
}

// Blend only the last three live hit-stun ticks; control release stays in Fighter.
export function airHitHandoffSample(fighter: Fighter): {
  previous: AnimationSequenceSample; current: AnimationSequenceSample; blend: number;
} | null {
  if (fighter.state !== 'hit' || fighter.stateFrame < -3 || fighter.stateFrame >= 0
    || fighter.hitAnimationDuration <= 3 || fighter.hp <= 0) return null;
  const previous = airFallSample(fighter);
  if (!previous) return null;
  // Preview at most three native physics ticks; a grounded release must not
  // anticipate a jump pose. Hitstop freezes both this preview and the live clock.
  let height = fighter.jumpHeight;
  let velocity = fighter.jumpVelocity;
  for (let tick = fighter.stateFrame; tick < 0; tick += 1) {
    height += velocity;
    velocity -= fighter.combatProfile.gravity;
    if (height <= 0 && velocity < 0) return null;
  }
  const after = Object.create(fighter) as Fighter;
  after.state = 'jump';
  after.stateFrame = 0;
  const current = animationSequenceSample(after, 0);
  if (current?.sequence.kind !== 'jump') return null;
  return { previous, current, blend: (4 + fighter.stateFrame) / 3 };
}
