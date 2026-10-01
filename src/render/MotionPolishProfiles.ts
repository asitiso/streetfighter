export interface MotionPolishProfile {
  stride: number;
  bob: number;
  lean: number;
  footPlant: number;
  torsoTwist: number;
  dashStretch: number;
  jumpTuck: number;
  hitRecoil: number;
  recoverySettle: number;
  afterimage: number;
}

const DEFAULT: MotionPolishProfile = {
  stride: 1,
  bob: 1,
  lean: 1,
  footPlant: 1,
  torsoTwist: 1,
  dashStretch: 1,
  jumpTuck: 1,
  hitRecoil: 1,
  recoverySettle: 1,
  afterimage: 1,
};

const PROFILES: Record<string, MotionPolishProfile> = {
  RYU:    { stride: .92, bob: .72, lean: .78, footPlant: 1.18, torsoTwist: .88, dashStretch: .9,  jumpTuck: .82, hitRecoil: .92, recoverySettle: 1.18, afterimage: .72 },
  KEN:    { stride: 1.08, bob: .84, lean: 1.08, footPlant: .92, torsoTwist: 1.15, dashStretch: 1.16, jumpTuck: .94, hitRecoil: .9,  recoverySettle: .88, afterimage: 1.12 },
  CHUNLI: { stride: 1.16, bob: .6,  lean: .72, footPlant: 1.08, torsoTwist: 1.18, dashStretch: 1.08, jumpTuck: 1.14, hitRecoil: .82, recoverySettle: .84, afterimage: 1.18 },
  ALEX:   { stride: .76, bob: .94, lean: .86, footPlant: 1.34, torsoTwist: .78, dashStretch: .82, jumpTuck: .66, hitRecoil: 1.1,  recoverySettle: 1.28, afterimage: .62 },
  DUDLEY: { stride: .9,  bob: .56, lean: .9,  footPlant: 1.16, torsoTwist: 1.12, dashStretch: 1.02, jumpTuck: .72, hitRecoil: .82, recoverySettle: .78, afterimage: .92 },
  MAKOTO: { stride: .98, bob: .68, lean: 1.16, footPlant: 1.24, torsoTwist: 1.26, dashStretch: 1.24, jumpTuck: .86, hitRecoil: .96, recoverySettle: 1.08, afterimage: 1.08 },
  IBUKI:  { stride: 1.2,  bob: .92, lean: 1.22, footPlant: .82, torsoTwist: 1.24, dashStretch: 1.34, jumpTuck: 1.28, hitRecoil: .76, recoverySettle: .72, afterimage: 1.36 },
  YUN:    { stride: 1.18, bob: .82, lean: 1.14, footPlant: .86, torsoTwist: 1.3,  dashStretch: 1.28, jumpTuck: 1.1,  hitRecoil: .78, recoverySettle: .7,  afterimage: 1.3 },
  URIEN:  { stride: .82, bob: .78, lean: .9,  footPlant: 1.26, torsoTwist: .92, dashStretch: .94, jumpTuck: .72, hitRecoil: .82, recoverySettle: 1.14, afterimage: .86 },
  GILL:   { stride: .86, bob: .54, lean: .72, footPlant: 1.3,  torsoTwist: .9,  dashStretch: .94, jumpTuck: .72, hitRecoil: .72, recoverySettle: 1.04, afterimage: 1.04 },
};

export function motionPolishProfile(characterId: string): MotionPolishProfile {
  return PROFILES[characterId] ?? DEFAULT;
}

export function softTriangle(phase: number): number {
  const wrapped = ((phase % 1) + 1) % 1;
  const triangle = 1 - Math.abs(wrapped * 2 - 1);
  return triangle * triangle * (3 - 2 * triangle);
}

export function plantedStep(phase: number): number {
  const wrapped = ((phase % 1) + 1) % 1;
  if (wrapped < .18) return 0;
  if (wrapped < .5) return (wrapped - .18) / .32;
  if (wrapped < .68) return 1;
  return Math.max(0, 1 - (wrapped - .68) / .32);
}
