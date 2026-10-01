export interface ThrowMotionSample {
  x: number;
  y: number;
  rotation: number;
  crouch: number;
  armSpread: number;
  lift: number;
}

interface ThrowStyle {
  lift: number;
  travel: number;
  rotation: number;
  crouch: number;
  attackerDrive: number;
  armSpread: number;
  releaseAt: number;
}

const STYLES: Readonly<Record<string, ThrowStyle>> = {
  RYU:    { lift: 42, travel: 42, rotation: .82, crouch: 8,  attackerDrive: 8,  armSpread: .88, releaseAt: .58 },
  KEN:    { lift: 48, travel: 54, rotation: 1.08, crouch: 7,  attackerDrive: 12, armSpread: .94, releaseAt: .54 },
  CHUNLI: { lift: 54, travel: 60, rotation: 1.22, crouch: 5,  attackerDrive: 10, armSpread: .78, releaseAt: .50 },
  ALEX:   { lift: 66, travel: 38, rotation: .68, crouch: 18, attackerDrive: 5,  armSpread: 1.28, releaseAt: .66 },
  DUDLEY: { lift: 34, travel: 48, rotation: .56, crouch: 6,  attackerDrive: 14, armSpread: .72, releaseAt: .48 },
  MAKOTO: { lift: 46, travel: 50, rotation: .92, crouch: 10, attackerDrive: 15, armSpread: .86, releaseAt: .56 },
  IBUKI:  { lift: 58, travel: 72, rotation: 1.48, crouch: 4,  attackerDrive: 18, armSpread: .68, releaseAt: .46 },
  YUN:    { lift: 50, travel: 68, rotation: 1.34, crouch: 5,  attackerDrive: 19, armSpread: .74, releaseAt: .44 },
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);

export function throwStyleFor(characterId: string): string {
  return STYLES[characterId] ? characterId : 'RYU';
}

export function throwMotionFor(styleId: string, role: 'attacker' | 'victim', progress: number, direction: 1 | -1): ThrowMotionSample {
  const s = STYLES[styleId] ?? STYLES.RYU!;
  const p = clamp(progress);
  const gather = ease(Math.min(1, p / Math.max(.001, s.releaseAt)));
  const released = p <= s.releaseAt ? 0 : ease((p - s.releaseAt) / Math.max(.001, 1 - s.releaseAt));
  const arc = Math.sin(Math.min(1, p) * Math.PI);
  if (role === 'attacker') {
    return {
      x: direction * (gather * s.attackerDrive - released * s.attackerDrive * .35),
      y: -arc * (4 + s.crouch * .15),
      rotation: direction * (gather * .07 - released * .045),
      crouch: Math.sin(Math.min(1, p / .7) * Math.PI) * s.crouch,
      armSpread: s.armSpread * (p < s.releaseAt ? .65 + gather * .35 : 1 - released * .38),
      lift: gather * s.lift * .2,
    };
  }
  const preReleaseX = -direction * gather * (18 + s.travel * .18);
  const postReleaseX = direction * released * s.travel;
  const rotation = -direction * (gather * s.rotation * .42 + released * s.rotation);
  return {
    x: preReleaseX + postReleaseX,
    y: -(gather * s.lift + Math.sin(released * Math.PI) * s.lift * .34),
    rotation,
    crouch: 0,
    armSpread: .54 + (1 - gather) * .22,
    lift: gather * s.lift,
  };
}

export function throwProfileSignature(characterId: string): string {
  const s = STYLES[characterId] ?? STYLES.RYU!;
  return `${s.lift}:${s.travel}:${s.rotation.toFixed(2)}:${s.crouch}:${s.attackerDrive}:${s.armSpread.toFixed(2)}:${s.releaseAt.toFixed(2)}`;
}

export function throwProfileCount(): number { return Object.keys(STYLES).length; }
