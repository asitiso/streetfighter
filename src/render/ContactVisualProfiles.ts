import type { Fighter } from '../combat/Fighter.js';

export type ContactVisualFamily = 'normal' | 'primary' | 'antiAir' | 'mobility' | 'super' | 'throw';

export interface ContactVisualProfile {
  family: ContactVisualFamily;
  drive: number;
  lift: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  limbReach: number;
  recoil: number;
  echo: number;
  bloom: number;
  arcBias: number;
}

const BASE: ContactVisualProfile = {
  family: 'normal', drive: 4, lift: 0, rotate: .018, scaleX: 1.018, scaleY: .992,
  limbReach: 1, recoil: 1, echo: .5, bloom: .7, arcBias: 1,
};

const CHARACTER: Record<string, Partial<ContactVisualProfile>> = {
  RYU:    { drive: 5, rotate: .014, scaleX: 1.014, scaleY: .995, limbReach: 1.02, recoil: .92, echo: .42, bloom: .88, arcBias: .96 },
  KEN:    { drive: 7, lift: -2, rotate: .03, scaleX: 1.03, scaleY: .985, limbReach: 1.06, recoil: .9, echo: .72, bloom: 1.02, arcBias: 1.08 },
  CHUNLI: { drive: 6, lift: -2, rotate: .02, scaleX: 1.024, scaleY: .986, limbReach: 1.09, recoil: .82, echo: .68, bloom: .94, arcBias: 1.14 },
  ALEX:   { drive: 9, lift: 1, rotate: .038, scaleX: 1.04, scaleY: .974, limbReach: 1.08, recoil: 1.18, echo: .34, bloom: 1.12, arcBias: 1.04 },
  DUDLEY: { drive: 6, lift: 0, rotate: .024, scaleX: 1.022, scaleY: .99, limbReach: 1.05, recoil: .86, echo: .55, bloom: .96, arcBias: .92 },
  MAKOTO: { drive: 10, lift: 1, rotate: .04, scaleX: 1.045, scaleY: .972, limbReach: 1.12, recoil: 1.08, echo: .62, bloom: 1.1, arcBias: 1.02 },
  IBUKI:  { drive: 7, lift: -3, rotate: .034, scaleX: 1.034, scaleY: .982, limbReach: 1.08, recoil: .74, echo: .84, bloom: .9, arcBias: 1.16 },
  YUN:    { drive: 8, lift: -1, rotate: .036, scaleX: 1.038, scaleY: .98, limbReach: 1.08, recoil: .76, echo: .82, bloom: .94, arcBias: 1.12 },
  URIEN:  { drive: 9, lift: 0, rotate: .034, scaleX: 1.04, scaleY: .976, limbReach: 1.08, recoil: 1.1, echo: .48, bloom: 1.16, arcBias: 1.08 },
  GILL:   { drive: 8, lift: -2, rotate: .026, scaleX: 1.03, scaleY: .984, limbReach: 1.1, recoil: .92, echo: .68, bloom: 1.24, arcBias: 1.12 },
};

function familyFor(fighter: Fighter): ContactVisualFamily {
  const move = fighter.currentMove;
  if (!move) return 'normal';
  if (move.superCost) return 'super';
  if (move.kind === 'throw' || move.level === 'throw') return 'throw';
  if (move.id.endsWith('_PRIMARY') || move.id.includes('_EX_PRIMARY')) return 'primary';
  if (move.id.endsWith('_ANTI_AIR')) return 'antiAir';
  if (move.id.endsWith('_MOBILITY')) return 'mobility';
  return 'normal';
}

const FAMILY: Record<ContactVisualFamily, Partial<ContactVisualProfile>> = {
  normal:   { drive: 1, lift: 0, rotate: 1, scaleX: 1, scaleY: 1, limbReach: 1, recoil: 1, echo: 1, bloom: 1, arcBias: 1 },
  primary:  { drive: 1.05, lift: .5, rotate: .9, scaleX: 1.002, scaleY: .999, limbReach: 1.04, recoil: .96, echo: 1.05, bloom: 1.04, arcBias: 1.03 },
  antiAir:  { drive: .78, lift: 4.5, rotate: 1.36, scaleX: .996, scaleY: 1.018, limbReach: 1.09, recoil: .9, echo: 1.12, bloom: 1.1, arcBias: 1.18 },
  mobility: { drive: 1.26, lift: 1, rotate: 1.25, scaleX: 1.012, scaleY: .994, limbReach: 1.08, recoil: .86, echo: 1.24, bloom: 1.03, arcBias: 1.2 },
  super:    { drive: 1.34, lift: 2, rotate: 1.18, scaleX: 1.018, scaleY: .99, limbReach: 1.14, recoil: .9, echo: 1.34, bloom: 1.3, arcBias: 1.24 },
  throw:    { drive: .92, lift: 0, rotate: .82, scaleX: 1.006, scaleY: .998, limbReach: 1.06, recoil: 1.14, echo: .72, bloom: .86, arcBias: .82 },
};

export function contactVisualProfile(fighter: Fighter): ContactVisualProfile {
  const family = familyFor(fighter);
  const char = { ...BASE, ...(CHARACTER[fighter.character.id] ?? {}) };
  const f = FAMILY[family];
  return {
    family,
    drive: char.drive * (f.drive ?? 1),
    lift: char.lift + (f.lift ?? 0),
    rotate: char.rotate * (f.rotate ?? 1),
    scaleX: char.scaleX * (f.scaleX ?? 1),
    scaleY: char.scaleY * (f.scaleY ?? 1),
    limbReach: char.limbReach * (f.limbReach ?? 1),
    recoil: char.recoil * (f.recoil ?? 1),
    echo: char.echo * (f.echo ?? 1),
    bloom: char.bloom * (f.bloom ?? 1),
    arcBias: char.arcBias * (f.arcBias ?? 1),
  };
}

export function contactVisualEnvelope(fighter: Fighter): number {
  const move = fighter.currentMove;
  if (!move || fighter.state !== 'attack') return 0;
  const activeStart = move.startup;
  const activeEnd = activeStart + Math.max(1, move.active) - 1;
  if (fighter.moveFrame < activeStart || fighter.moveFrame > activeEnd) return 0;
  const t = (fighter.moveFrame - activeStart + .5) / Math.max(1, move.active);
  return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
}

export function contactVisualDigest(characterId: string): string {
  const c = { ...BASE, ...(CHARACTER[characterId] ?? {}) };
  return [c.drive,c.lift,c.rotate,c.scaleX,c.scaleY,c.limbReach,c.recoil,c.echo,c.bloom,c.arcBias]
    .map((v) => v.toFixed(3)).join(':');
}
