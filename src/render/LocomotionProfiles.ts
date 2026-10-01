export interface LocomotionProfile {
  idleRate: number;
  idleShift: number;
  walkCadence: number;
  strideLength: number;
  stepLift: number;
  heelPlant: number;
  hipSway: number;
  dashDrive: number;
  dashLean: number;
  airDrift: number;
  riseLean: number;
  fallLean: number;
  apexHang: number;
  landingSquash: number;
  landingSettle: number;
}

const DEFAULT: LocomotionProfile = {
  idleRate: 1,
  idleShift: 1,
  walkCadence: 1,
  strideLength: 1,
  stepLift: 1,
  heelPlant: 1,
  hipSway: 1,
  dashDrive: 1,
  dashLean: 1,
  airDrift: 1,
  riseLean: 1,
  fallLean: 1,
  apexHang: 1,
  landingSquash: 1,
  landingSettle: 1,
};

const PROFILES: Record<string, LocomotionProfile> = {
  RYU:    { idleRate:.88, idleShift:.78, walkCadence:.92, strideLength:.92, stepLift:.84, heelPlant:1.18, hipSway:.76, dashDrive:.94, dashLean:.84, airDrift:.86, riseLean:.86, fallLean:.9,  apexHang:.94, landingSquash:1.1,  landingSettle:1.14 },
  KEN:    { idleRate:1.04, idleShift:.94, walkCadence:1.08, strideLength:1.08, stepLift:1.02, heelPlant:.94, hipSway:1.06, dashDrive:1.18, dashLean:1.16, airDrift:1.04, riseLean:1.08, fallLean:1.02, apexHang:.9, landingSquash:.92, landingSettle:.86 },
  CHUNLI: { idleRate:.96, idleShift:.72, walkCadence:1.14, strideLength:1.18, stepLift:1.08, heelPlant:1.08, hipSway:1.2,  dashDrive:1.08, dashLean:.82, airDrift:1.12, riseLean:.96, fallLean:1.04, apexHang:1.1, landingSquash:.9,  landingSettle:.84 },
  ALEX:   { idleRate:.78, idleShift:.92, walkCadence:.8,  strideLength:.78, stepLift:.72, heelPlant:1.36, hipSway:.7,  dashDrive:.86, dashLean:.9,  airDrift:.68, riseLean:.72, fallLean:.78, apexHang:.82, landingSquash:1.34, landingSettle:1.3 },
  DUDLEY: { idleRate:.9,  idleShift:.62, walkCadence:1.02, strideLength:.9,  stepLift:.82, heelPlant:1.16, hipSway:.82, dashDrive:1.06, dashLean:.96, airDrift:.76, riseLean:.78, fallLean:.82, apexHang:.86, landingSquash:1.02, landingSettle:.82 },
  MAKOTO: { idleRate:.86, idleShift:.7,  walkCadence:.98, strideLength:.98, stepLift:.88, heelPlant:1.24, hipSway:.86, dashDrive:1.28, dashLean:1.2,  airDrift:.84, riseLean:.88, fallLean:.94, apexHang:.84, landingSquash:1.22, landingSettle:1.08 },
  IBUKI:  { idleRate:1.1,  idleShift:1.08, walkCadence:1.24, strideLength:1.2,  stepLift:1.2,  heelPlant:.82, hipSway:1.18, dashDrive:1.36, dashLean:1.26, airDrift:1.3,  riseLean:1.18, fallLean:1.24, apexHang:1.18, landingSquash:.82, landingSettle:.72 },
  YUN:    { idleRate:1.08, idleShift:.98, walkCadence:1.2,  strideLength:1.18, stepLift:1.12, heelPlant:.86, hipSway:1.16, dashDrive:1.3,  dashLean:1.2,  airDrift:1.18, riseLean:1.12, fallLean:1.14, apexHang:1.08, landingSquash:.86, landingSettle:.7 },
  URIEN:  { idleRate:.76, idleShift:.86, walkCadence:.84, strideLength:.82, stepLift:.76, heelPlant:1.28, hipSway:.74, dashDrive:.98, dashLean:.94, airDrift:.72, riseLean:.76, fallLean:.82, apexHang:.8, landingSquash:1.24, landingSettle:1.18 },
  GILL:   { idleRate:.7,  idleShift:.58, walkCadence:.82, strideLength:.86, stepLift:.72, heelPlant:1.3,  hipSway:.7,  dashDrive:.96, dashLean:.82, airDrift:.78, riseLean:.8,  fallLean:.84, apexHang:1.02, landingSquash:1.12, landingSettle:1.04 },
};

export function locomotionProfile(characterId: string): LocomotionProfile {
  return PROFILES[characterId] ?? DEFAULT;
}

export function locomotionProfileDigest(characterId: string): string {
  const p = locomotionProfile(characterId);
  return [p.idleRate,p.idleShift,p.walkCadence,p.strideLength,p.stepLift,p.heelPlant,p.hipSway,p.dashDrive,p.dashLean,p.airDrift,p.riseLean,p.fallLean,p.apexHang,p.landingSquash,p.landingSettle]
    .map((v) => v.toFixed(2)).join(':');
}
