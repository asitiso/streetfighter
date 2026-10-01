import type { MoveButton, MoveData } from '../combat/CombatTypes.js';

export interface StrikeKinematicsProfile {
  shoulderLead: number;
  elbowLead: number;
  wristWhip: number;
  punchArc: number;
  hipDrive: number;
  kneeLift: number;
  ankleWhip: number;
  kickArc: number;
  recoveryCurl: number;
}

export type HitReactionKind = 'high' | 'mid' | 'low' | 'launch' | 'throw';

const DEFAULT: StrikeKinematicsProfile = {
  shoulderLead: 1, elbowLead: 1, wristWhip: 1, punchArc: 1,
  hipDrive: 1, kneeLift: 1, ankleWhip: 1, kickArc: 1, recoveryCurl: 1,
};

const PROFILES: Readonly<Record<string, StrikeKinematicsProfile>> = {
  RYU:    { shoulderLead: 1.00, elbowLead: 1.00, wristWhip: .92, punchArc: .96, hipDrive: 1.02, kneeLift: .96, ankleWhip: .88, kickArc: 1.00, recoveryCurl: 1.00 },
  KEN:    { shoulderLead: 1.08, elbowLead: 1.04, wristWhip: 1.12, punchArc: 1.08, hipDrive: 1.12, kneeLift: 1.12, ankleWhip: 1.18, kickArc: 1.15, recoveryCurl: .90 },
  CHUNLI: { shoulderLead: .88, elbowLead: .94, wristWhip: 1.18, punchArc: 1.02, hipDrive: 1.18, kneeLift: 1.24, ankleWhip: 1.28, kickArc: 1.28, recoveryCurl: .88 },
  ALEX:   { shoulderLead: 1.25, elbowLead: 1.18, wristWhip: .72, punchArc: .84, hipDrive: 1.30, kneeLift: .82, ankleWhip: .70, kickArc: .84, recoveryCurl: 1.18 },
  DUDLEY: { shoulderLead: .92, elbowLead: 1.20, wristWhip: 1.28, punchArc: 1.24, hipDrive: .92, kneeLift: .86, ankleWhip: .72, kickArc: .82, recoveryCurl: .82 },
  MAKOTO: { shoulderLead: 1.28, elbowLead: 1.16, wristWhip: 1.34, punchArc: .90, hipDrive: 1.30, kneeLift: 1.04, ankleWhip: .96, kickArc: .94, recoveryCurl: 1.08 },
  IBUKI:  { shoulderLead: .96, elbowLead: 1.12, wristWhip: 1.30, punchArc: 1.18, hipDrive: 1.08, kneeLift: 1.20, ankleWhip: 1.32, kickArc: 1.22, recoveryCurl: .80 },
  YUN:    { shoulderLead: 1.04, elbowLead: 1.16, wristWhip: 1.24, punchArc: 1.18, hipDrive: 1.16, kneeLift: 1.16, ankleWhip: 1.22, kickArc: 1.20, recoveryCurl: .78 },
  URIEN:  { shoulderLead: 1.20, elbowLead: 1.12, wristWhip: .84, punchArc: .90, hipDrive: 1.24, kneeLift: .90, ankleWhip: .82, kickArc: .90, recoveryCurl: 1.12 },
  GILL:   { shoulderLead: 1.16, elbowLead: 1.10, wristWhip: .92, punchArc: .98, hipDrive: 1.20, kneeLift: .96, ankleWhip: .90, kickArc: .98, recoveryCurl: 1.06 },
};

export function strikeKinematicsProfile(characterId: string): StrikeKinematicsProfile {
  return PROFILES[characterId] ?? DEFAULT;
}

export interface StrikePoseSample {
  shoulderAngle: number;
  elbowAngle: number;
  wristAngle: number;
  reach: number;
  hipAngle: number;
  kneeAngle: number;
  ankleAngle: number;
  legReach: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Rendering-only strike trajectory. It never feeds hitboxes or combat timing. */
export function sampleStrikePose(characterId: string, button: MoveButton | undefined, progress: number, active: boolean, move?: MoveData | null): StrikePoseSample {
  const p = strikeKinematicsProfile(characterId);
  const t = clamp01(progress);
  const kick = button?.endsWith('k') ?? false;
  const heavy = button === 'hp' || button === 'hk' || (move?.damage ?? 0) >= 90;
  const snap = active ? 1 : Math.sin(Math.min(1, t * 1.6) * Math.PI);
  const recovery = t > .68 ? clamp01((t - .68) / .32) : 0;
  const contact = Math.sin(clamp01((t - .16) / .68) * Math.PI);
  const heavyScale = heavy ? 1.14 : 1;

  if (!kick) {
    return {
      shoulderAngle: (-.12 + .18 * contact) * p.shoulderLead * heavyScale + recovery * .16 * p.recoveryCurl,
      elbowAngle: (-.34 + .42 * contact) * p.elbowLead * heavyScale + recovery * .34 * p.recoveryCurl,
      wristAngle: (-.12 + .36 * snap) * p.wristWhip,
      reach: (0.72 + contact * .46 * p.punchArc) * heavyScale,
      hipAngle: -.06 * p.hipDrive * contact,
      kneeAngle: 12 - 10 * contact,
      ankleAngle: .04 * p.ankleWhip,
      legReach: 1,
    };
  }

  return {
    shoulderAngle: .72 - .18 * contact * p.shoulderLead,
    elbowAngle: 1.36 - .24 * contact * p.elbowLead,
    wristAngle: .12 * p.wristWhip,
    reach: .9,
    hipAngle: (-34 + contact * 42 * p.kickArc) * p.hipDrive,
    kneeAngle: (-18 + contact * 64 * p.kneeLift),
    ankleAngle: (-.12 + contact * .34) * p.ankleWhip,
    legReach: (1 + contact * .22 * p.kickArc) * heavyScale,
  };
}

export function reactionSignature(characterId: string): string {
  const p = strikeKinematicsProfile(characterId);
  return [p.shoulderLead,p.elbowLead,p.wristWhip,p.punchArc,p.hipDrive,p.kneeLift,p.ankleWhip,p.kickArc,p.recoveryCurl].map(v => v.toFixed(2)).join(':');
}
