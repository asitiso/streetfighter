export interface SignatureMoveProfile {
  startupBias: number;
  followThrough: number;
  recoverySnap: number;
  contactPad: number;
  arcLift: number;
  arcSpan: number;
  trailDensity: number;
  groundBurst: number;
  echo: number;
}

const DEFAULT: SignatureMoveProfile = {
  startupBias: 1,
  followThrough: 1,
  recoverySnap: 1,
  contactPad: 1,
  arcLift: 1,
  arcSpan: 1,
  trailDensity: 1,
  groundBurst: 1,
  echo: 1,
};

const PROFILES: Record<string, SignatureMoveProfile> = {
  RYU:    { startupBias: .94, followThrough: .94, recoverySnap: 1.08, contactPad: 1.02, arcLift: .94, arcSpan: .96, trailDensity: .92, groundBurst: .96, echo: .86 },
  KEN:    { startupBias: 1.08, followThrough: 1.16, recoverySnap: .92, contactPad: 1.06, arcLift: 1.08, arcSpan: 1.04, trailDensity: 1.08, groundBurst: .98, echo: 1.14 },
  CHUNLI: { startupBias: 1.18, followThrough: 1.08, recoverySnap: .9,  contactPad: 1.04, arcLift: 1.18, arcSpan: 1.14, trailDensity: 1.18, groundBurst: .92, echo: 1.18 },
  ALEX:   { startupBias: .86, followThrough: 1.28, recoverySnap: 1.18, contactPad: 1.08, arcLift: .84, arcSpan: 1.14, trailDensity: .94, groundBurst: 1.28, echo: .82 },
  DUDLEY: { startupBias: 1.04, followThrough: .98, recoverySnap: .9,  contactPad: 1.02, arcLift: 1.02, arcSpan: .96, trailDensity: .98, groundBurst: .94, echo: .96 },
  MAKOTO: { startupBias: .92, followThrough: 1.2,  recoverySnap: 1.06, contactPad: 1.1,  arcLift: .9,  arcSpan: 1.06, trailDensity: 1.02, groundBurst: 1.24, echo: 1.02 },
  IBUKI:  { startupBias: 1.22, followThrough: 1.06, recoverySnap: .8,  contactPad: .96, arcLift: 1.16, arcSpan: 1.12, trailDensity: 1.22, groundBurst: .82, echo: 1.26 },
  YUN:    { startupBias: 1.18, followThrough: 1.1,  recoverySnap: .82, contactPad: .98, arcLift: 1.12, arcSpan: 1.08, trailDensity: 1.18, groundBurst: .86, echo: 1.24 },
  URIEN:  { startupBias: .88, followThrough: 1.18, recoverySnap: 1.12, contactPad: 1.08, arcLift: .92, arcSpan: 1.12, trailDensity: 1.04, groundBurst: 1.22, echo: .92 },
  GILL:   { startupBias: .9,  followThrough: 1.1,  recoverySnap: 1.02, contactPad: 1.12, arcLift: 1.04, arcSpan: 1.1,  trailDensity: 1.18, groundBurst: 1.08, echo: 1.08 },
};

export function signatureMoveProfile(characterId: string): SignatureMoveProfile {
  return PROFILES[characterId] ?? DEFAULT;
}

export function signatureMoveProfileDigest(characterId: string): string {
  const p = signatureMoveProfile(characterId);
  return [p.startupBias, p.followThrough, p.recoverySnap, p.contactPad, p.arcLift, p.arcSpan, p.trailDensity, p.groundBurst, p.echo]
    .map((v) => v.toFixed(2)).join(':');
}
