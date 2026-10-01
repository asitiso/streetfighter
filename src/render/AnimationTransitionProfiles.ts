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
  dashFrames: number;
  landingFrames: number;
  airborne: boolean;
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
  if (fighter.state === 'attack' && memory.state !== 'attack') {
    if (memory.state === 'parry') return 'parry-punish';
    if (memory.dashFrames > 0 || memory.speed > 4.6) return 'dash-attack';
    if (memory.landingFrames > 0 || (memory.airborne && !fighter.airborne)) return 'landing-attack';
    if (memory.state === 'crouch') return 'crouch-attack';
  }
  if ((fighter.state === 'idle' || fighter.state === 'walk') && memory.state === 'attack') return 'attack-neutral';
  if ((fighter.state === 'idle' || fighter.state === 'walk') && fighter.landingFrames > 0 && memory.airborne) return 'landing-neutral';
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
      dashFrames: fighter.dashFrames,
      landingFrames: fighter.landingFrames,
      airborne: fighter.airborne,
      speed,
      kind: null,
      remaining: 0,
      duration: 1,
    };
    MEMO.set(fighter, memory);
    return EMPTY;
  }

  const detected = detectTransition(fighter, memory);
  if (detected) {
    memory.kind = detected;
    memory.duration = DURATIONS[detected];
    memory.remaining = memory.duration;
  }

  let result = EMPTY;
  if (memory.kind && memory.remaining > 0) {
    const progress = 1 - memory.remaining / Math.max(1, memory.duration);
    const strength = 1 - smooth01(progress);
    result = sampleFor(memory.kind, fighter, strength);
    memory.remaining -= 1;
    if (memory.remaining <= 0) memory.kind = null;
  }

  memory.state = fighter.state;
  memory.dashFrames = fighter.dashFrames;
  memory.landingFrames = fighter.landingFrames;
  memory.airborne = fighter.airborne;
  memory.speed = speed;
  return result;
}

export function animationTransitionDuration(kind: AnimationTransitionKind): number {
  return DURATIONS[kind];
}
