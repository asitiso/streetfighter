export interface SuperVictimPose {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  armOpen: number;
  legKick: number;
  flash: number;
}

interface VictimProfile {
  recoil: number;
  lift: number;
  twist: number;
  compress: number;
  armOpen: number;
  legKick: number;
}

const DEFAULT: VictimProfile = { recoil: 16, lift: 10, twist: .24, compress: .06, armOpen: .8, legKick: .35 };
const PROFILES: Readonly<Record<string, VictimProfile>> = {
  wave:      { recoil: 24, lift: 8,  twist: .18, compress: .04, armOpen: .72, legKick: .28 },
  electric:  { recoil: 10, lift: 18, twist: .42, compress: .09, armOpen: 1.1, legKick: .5 },
  flame:     { recoil: 18, lift: 20, twist: .34, compress: .05, armOpen: .96, legKick: .55 },
  rush:      { recoil: 28, lift: 6,  twist: .28, compress: .08, armOpen: .62, legKick: .22 },
  burst:     { recoil: 20, lift: 14, twist: .32, compress: .1,  armOpen: 1.02, legKick: .42 },
  leap:      { recoil: 12, lift: 30, twist: .5,  compress: .03, armOpen: .9, legKick: .72 },
  punch:     { recoil: 26, lift: 12, twist: .36, compress: .06, armOpen: .72, legKick: .36 },
  kunai:     { recoil: 16, lift: 12, twist: .46, compress: .04, armOpen: .78, legKick: .5 },
  launch:    { recoil: 8,  lift: 36, twist: .52, compress: .02, armOpen: 1.05, legKick: .78 },
  uppercut:  { recoil: 10, lift: 40, twist: .48, compress: .02, armOpen: 1.0, legKick: .74 },
  barrage:   { recoil: 18, lift: 10, twist: .44, compress: .11, armOpen: .86, legKick: .45 },
  kickRush:  { recoil: 30, lift: 8,  twist: .38, compress: .08, armOpen: .7, legKick: .62 },
  throw:     { recoil: 14, lift: 42, twist: .72, compress: .03, armOpen: 1.2, legKick: .82 },
  spiral:    { recoil: 22, lift: 22, twist: .84, compress: .04, armOpen: 1.12, legKick: .75 },
  aerial:    { recoil: 12, lift: 34, twist: .62, compress: .02, armOpen: 1.0, legKick: .86 },
  powerRush: { recoil: 34, lift: 14, twist: .4,  compress: .09, armOpen: .8, legKick: .5 },
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function superVictimPoseFor(motif: string | undefined, progress: number, direction: 1 | -1, hitIndex = 1, hitTotal = 1): SuperVictimPose {
  const p = clamp(progress);
  const profile = (motif && PROFILES[motif]) || DEFAULT;
  const total = Math.max(1, hitTotal);
  const index = Math.max(1, Math.min(total, hitIndex));
  const hitRatio = total <= 1 ? 1 : (index - 1) / (total - 1);
  const midHit = total > 1 && index < total;
  const rhythmicPulse = total > 1 ? .86 + Math.sin((index / total) * Math.PI) * .18 : 1;
  const impact = (p < .35 ? smooth(p / .35) : 1 - smooth((p - .35) / .65) * .45) * rhythmicPulse;
  const settle = p > .7 ? smooth((p - .7) / .3) : 0;
  const liftArc = Math.sin(Math.min(1, p) * Math.PI);
  const finisher = index === total ? 1 : .58 + hitRatio * .18;
  const lateralShake = midHit ? Math.sin((index * 2.17 + p * 7.5) * Math.PI) * profile.recoil * .13 : 0;
  return {
    x: direction * profile.recoil * impact * finisher + lateralShake,
    y: -profile.lift * liftArc * (.62 + finisher * .38),
    rotation: direction * profile.twist * impact * (1 - settle * .55) * (.72 + finisher * .28),
    scaleX: 1 - profile.compress * impact * (midHit ? .72 : 1),
    scaleY: 1 + profile.compress * .55 * impact,
    armOpen: profile.armOpen * impact * (.75 + finisher * .25),
    legKick: profile.legKick * impact * (.7 + finisher * .3),
    flash: Math.max(0, 1 - p * 1.2) * (midHit ? .72 : 1),
  };
}

export function superVictimProfileCount(): number { return Object.keys(PROFILES).length; }
export function superVictimProfileSignature(motif: string): string {
  const p = PROFILES[motif] ?? DEFAULT;
  return `${p.recoil}:${p.lift}:${p.twist.toFixed(2)}:${p.compress.toFixed(2)}:${p.armOpen.toFixed(2)}:${p.legKick.toFixed(2)}`;
}
