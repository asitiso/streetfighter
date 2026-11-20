import { motionClipForFighter, neutralCrouchBlend } from './AnimationPoseLibrary.js';
import type { Fighter } from '../combat/Fighter.js';
import type { FighterState } from '../combat/CombatTypes.js';
import { locomotionProfile } from './LocomotionProfiles.js';

export type AnimationTransitionKind =
  | 'dash-attack'
  | 'landing-attack'
  | 'parry-punish'
  | 'crouch-attack'
  | 'attack-neutral'
  | 'landing-neutral';

export interface AnimationTransitionSample {
  active: boolean;
  kind: AnimationTransitionKind | null;
  progress: number;
  strength: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  echo: number;
}

interface TransitionMemory {
  state: FighterState;
  animationFrame: number;
  dashFrames: number;
  landingFrames: number;
  airborne: boolean;
  airMove: boolean;
  speed: number;
  kind: AnimationTransitionKind | null;
  remaining: number;
  duration: number;
}

const MEMO = new WeakMap<Fighter, TransitionMemory>();

const EMPTY: AnimationTransitionSample = {
  active: false,
  kind: null,
  progress: 1,
  strength: 0,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  echo: 0,
};

const DURATIONS: Record<AnimationTransitionKind, number> = {
  'dash-attack': 9,
  'landing-attack': 8,
  'parry-punish': 10,
  'crouch-attack': 7,
  'attack-neutral': 10,
  'landing-neutral': 8,
};

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function detectTransition(fighter: Fighter, memory: TransitionMemory): AnimationTransitionKind | null {
  // A new ground attack can follow an air normal or a completed rising special
  // without an intervening rendered neutral frame. Its start clock distinguishes
  // it from the same rising attack continuing through touchdown.
  const recordedEntry = fighter.attackAnimationStartFrame >= 0;
  const landingEntry = recordedEntry && fighter.attackLandingFrames > 0;
  const landedAttack = !fighter.airborne && fighter.currentMove !== null
    && fighter.currentMove.technique !== 'air'
    && ((landingEntry && fighter.attackAnimationStartFrame > memory.animationFrame)
      || (!recordedEntry && memory.airMove && memory.airborne && fighter.landingFrames > 0));
  // A real parry has one neutral tick before input is accepted. Match the
  // first attack's clock instead of relying on whether that tick was rendered.
  const parryFollowup = fighter.parryFollowupAnimationFrame >= 0
    && fighter.attackAnimationStartFrame === fighter.parryFollowupAnimationFrame;
  const movementEntry = recordedEntry ? fighter.attackMovementEntry
    : !memory.airborne && (memory.dashFrames > 0 || memory.speed > 4.6);
  const crouchEntry = recordedEntry ? fighter.attackCrouchEntry : memory.state === 'crouch';
  const newCrouchAttack = recordedEntry && crouchEntry && fighter.attackAnimationStartFrame > memory.animationFrame;
  const newMovementAttack = recordedEntry && movementEntry && fighter.attackAnimationStartFrame > memory.animationFrame;
  const newParryAttack = parryFollowup && fighter.attackAnimationStartFrame > memory.animationFrame;
  if (fighter.state === 'attack' && (memory.state !== 'attack' || landedAttack || newParryAttack || newMovementAttack || newCrouchAttack)) {
    if (parryFollowup || (memory.state === 'parry' && fighter.attackAnimationStartFrame < 0)) return 'parry-punish';
    if (movementEntry) return 'dash-attack';
    // Accepted entry owns eligibility even if its first render arrives after touchdown settles.
    if (recordedEntry ? landingEntry : (memory.landingFrames > 0 || (memory.airborne && !fighter.airborne))) return 'landing-attack';
    if (crouchEntry) return 'crouch-attack';
  }
  // Actual touchdown owns the neutral settle even when it interrupts an air move.
  if ((fighter.state === 'idle' || fighter.state === 'walk') && !fighter.airborne
    && fighter.landingFrames > 0
    && (fighter.landingNeutralAnimationFrame === null ? memory.airborne
      : fighter.landingNeutralAnimationFrame > memory.animationFrame)) return 'landing-neutral';
  if ((fighter.state === 'idle' || fighter.state === 'walk')
    && (recordedEntry ? fighter.attackRecoveryAnimationFrame > memory.animationFrame
        && fighter.attackRecoveryAnimationFrame !== fighter.landingNeutralAnimationFrame
      : memory.state === 'attack')) return 'attack-neutral';
  return null;
}

function sampleFor(kind: AnimationTransitionKind, fighter: Fighter, strength: number): AnimationTransitionSample {
  const facing = fighter.facing;
  const locomotion = locomotionProfile(fighter.character.id);
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;
  let echo = 0;

  switch (kind) {
    case 'dash-attack':
      offsetX = facing * 10 * strength * locomotion.dashDrive;
      offsetY = -1.5 * strength * locomotion.dashLean;
      rotation = -facing * .032 * strength * locomotion.dashLean;
      scaleX = 1 + .045 * strength * locomotion.dashDrive;
      scaleY = 1 - .018 * strength * locomotion.dashLean;
      echo = .42 * strength * Math.min(1.35, locomotion.dashDrive);
      break;
    case 'landing-attack':
      offsetX = facing * 3.5 * strength * locomotion.airDrift;
      offsetY = 10 * strength * locomotion.landingSquash;
      rotation = facing * .014 * strength * locomotion.landingSettle;
      scaleX = 1 + .045 * strength * locomotion.landingSquash;
      scaleY = 1 - .065 * strength * locomotion.landingSquash;
      echo = .12 * strength * Math.min(1.3, locomotion.airDrift);
      break;
    case 'parry-punish':
      offsetX = -facing * 5 * strength * locomotion.dashLean;
      offsetY = -1.5 * strength * locomotion.idleShift;
      rotation = -facing * .05 * strength * locomotion.dashLean;
      scaleX = 1 - .018 * strength;
      scaleY = 1 + .016 * strength;
      echo = .24 * strength * Math.min(1.3, locomotion.dashDrive);
      break;
    case 'crouch-attack':
      offsetX = -facing * 2.4 * strength * locomotion.strideLength;
      offsetY = 15 * strength * locomotion.landingSquash;
      rotation = facing * .018 * strength * locomotion.hipSway;
      scaleX = 1 + .052 * strength * locomotion.strideLength;
      scaleY = 1 - .105 * strength * locomotion.landingSquash;
      echo = .08 * strength * locomotion.walkCadence;
      break;
    case 'attack-neutral':
      offsetX = facing * 5.5 * strength * locomotion.strideLength;
      offsetY = -1.4 * strength * locomotion.idleShift;
      rotation = facing * .028 * strength * locomotion.hipSway;
      scaleX = 1 + .02 * strength * locomotion.strideLength;
      scaleY = 1 - .012 * strength;
      echo = .16 * strength * Math.min(1.3, locomotion.walkCadence);
      break;
    case 'landing-neutral':
      offsetX = 0;
      offsetY = 8 * strength * locomotion.landingSquash;
      rotation = -facing * .008 * strength * locomotion.landingSettle;
      scaleX = 1 + .035 * strength * locomotion.landingSquash;
      scaleY = 1 - .055 * strength * locomotion.landingSquash;
      echo = .05 * strength * locomotion.airDrift;
      break;
  }

  return {
    active: strength > .001,
    kind,
    progress: 1 - strength,
    strength,
    offsetX,
    offsetY,
    rotation,
    scaleX,
    scaleY,
    echo,
  };
}

export function animationTransitionSample(fighter: Fighter): AnimationTransitionSample {
  const speed = Math.abs(fighter.x - fighter.previousX);
  let memory = MEMO.get(fighter);
  if (!memory) {
    memory = {
      state: fighter.state,
      animationFrame: fighter.animationFrame,
      dashFrames: fighter.dashFrames,
      landingFrames: fighter.landingFrames,
      airborne: fighter.airborne,
      airMove: fighter.currentMove?.technique === 'air',
      speed,
      kind: null,
      remaining: 0,
      duration: 1,
    };
    MEMO.set(fighter, memory);
    return EMPTY;
  }

  // Reaction and paired poses own their geometry; an interrupted attack's
  // locomotion lean must not distort them, even while hit stop pauses time.
  // Air normals own their poses even when rendering skipped their entry.
  // Ground-initiated rising attacks retain their existing ground transition.
  const airAttackPose = fighter.airborne && fighter.state === 'attack'
    && (fighter.currentMove?.technique === 'air' || memory.state !== 'attack');
  // A plain jump must also release any previous grounded settle immediately.
  const jumpPose = fighter.airborne && fighter.state === 'jump';
  // Crouched normals already lower their own bodies; a standing-entry settle
  // would push both the attack pose and its ground shadow below the floor.
  const crouchAttackPose = !fighter.airborne && fighter.state === 'attack'
    && !!fighter.currentMove?.id.startsWith('2');
  // An active ground dash has its own authored movement, not an old settle.
  const dashPose = !fighter.airborne && fighter.dashFrames > 0
    && (fighter.state === 'walk' || fighter.state === 'idle');
  // Tracked crouch/rise owns its geometry, including the first released attack frame.
  const crouchSettlePose = neutralCrouchBlend(fighter) > 0;
  const interrupted = crouchSettlePose || crouchAttackPose || dashPose || jumpPose || airAttackPose || fighter.state === 'hit' || fighter.state === 'block' || fighter.state === 'parry'
    || fighter.state === 'knockdown' || fighter.state === 'ko' || fighter.state === 'victory'
    || fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0
    || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0
    || motionClipForFighter(fighter, 0).clip === 'throwEscape';
  const detected = interrupted ? null : detectTransition(fighter, memory);
  if (interrupted) {
    memory.kind = null;
    memory.remaining = 0;
  } else if (detected) {
    memory.kind = detected;
    memory.duration = DURATIONS[detected];
    // The first render may arrive after several fixed updates. Age the entry
    // from its simulation counter instead of replaying an old pose at full strength.
    const elapsed = detected === 'landing-neutral' ? Math.max(0, 8 - fighter.landingFrames)
      : detected === 'attack-neutral' && fighter.attackRecoveryAnimationFrame >= 0
        ? Math.max(0, fighter.animationFrame - fighter.attackRecoveryAnimationFrame)
      : fighter.state === 'attack' ? Math.max(0, fighter.attackAnimationStartFrame >= 0
        ? fighter.animationFrame - fighter.attackAnimationStartFrame : fighter.moveFrame) : Math.max(0, fighter.stateFrame);
    memory.remaining = Math.max(0, memory.duration - elapsed);
  } else if (fighter.state === 'attack' && memory.kind === 'attack-neutral') {
    // A fresh attack owns startup; only an explicitly detected new entry may
    // replace it. Do not carry the previous attack's neutral settle into it.
    memory.kind = null;
    memory.remaining = 0;
  } else {
    // Render rate may differ from the fixed simulation; hit stop and super
    // freeze pause this clock; moves and state changes never reset it.
    memory.remaining = Math.max(0, memory.remaining - Math.max(0, fighter.animationFrame - memory.animationFrame));
  }

  let result = EMPTY;
  if (memory.kind && memory.remaining > 0) {
    const progress = 1 - memory.remaining / Math.max(1, memory.duration);
    const strength = 1 - smooth01(progress);
    result = sampleFor(memory.kind, fighter, strength);

  }

  if (memory.remaining <= 0) memory.kind = null;
  memory.state = fighter.state;
  memory.animationFrame = fighter.animationFrame;
  memory.dashFrames = fighter.dashFrames;
  memory.landingFrames = fighter.landingFrames;
  memory.airborne = fighter.airborne;
  memory.airMove = fighter.currentMove?.technique === 'air';
  memory.speed = speed;
  return result;
}

export function animationTransitionDuration(kind: AnimationTransitionKind): number {
  return DURATIONS[kind];
}
