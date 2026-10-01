import type { CombatEvent } from '../combat/CombatTypes.js';

export type BossHudPhaseProfile = {
  label: string;
  subtitle: string;
  accent: string;
  core: string;
  pulseSpeed: number;
  scanSpeed: number;
  phaseProgress: number;
};

export function bossHudPhaseProfile(phase: 1 | 2 | 3, hpRatio: number): BossHudPhaseProfile {
  const clamped = Math.max(0, Math.min(1, hpRatio));
  if (phase === 3) return { label: 'PHASE III', subtitle: 'SERAPHIC ASCENSION', accent: '#ffd765', core: '#fff0a8', pulseSpeed: 5.8, scanSpeed: 120, phaseProgress: 1 - clamped / .3 };
  if (phase === 2) return { label: 'PHASE II', subtitle: 'ELEMENTAL AWAKENING', accent: '#d39cff', core: '#edc8ff', pulseSpeed: 4.4, scanSpeed: 88, phaseProgress: 1 - Math.max(0, clamped - .3) / .36 };
  return { label: 'PHASE I', subtitle: 'DIVINE FORM', accent: '#89ddff', core: '#c8f4ff', pulseSpeed: 3.2, scanSpeed: 62, phaseProgress: 1 - Math.max(0, clamped - .66) / .34 };
}

export type StageDepthProfile = {
  farFactor: number;
  nearFactor: number;
  farAlpha: number;
  nearAlpha: number;
  farCount: number;
  nearCount: number;
  color: string;
  accent: string;
};

const DEPTH: Record<number, StageDepthProfile> = {
  1: { farFactor: .34, nearFactor: 1.13, farAlpha: .22, nearAlpha: .32, farCount: 7, nearCount: 5, color: '#253447', accent: '#f2bb66' },
  2: { farFactor: .27, nearFactor: 1.18, farAlpha: .24, nearAlpha: .36, farCount: 10, nearCount: 8, color: '#181634', accent: '#ff4f9e' },
  3: { farFactor: .4, nearFactor: 1.1, farAlpha: .18, nearAlpha: .28, farCount: 6, nearCount: 6, color: '#52645d', accent: '#f0c889' },
  4: { farFactor: .3, nearFactor: 1.2, farAlpha: .23, nearAlpha: .38, farCount: 8, nearCount: 7, color: '#263b49', accent: '#b7deef' },
  5: { farFactor: .22, nearFactor: 1.16, farAlpha: .2, nearAlpha: .34, farCount: 11, nearCount: 9, color: '#17283c', accent: '#9d82ff' },
};

export function stageDepthProfile(stageId: number): StageDepthProfile {
  return DEPTH[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}

export type FxPolishProfile = {
  baseTtl: number;
  size: number;
  fadePower: number;
  afterglow: number;
};

export function fxPolishProfile(event: Pick<CombatEvent, 'type' | 'power'>): FxPolishProfile {
  const powerScale = Math.max(.86, Math.min(1.42, .82 + Math.max(0, event.power) / 360));
  switch (event.type) {
    case 'super-impact': return { baseTtl: 34, size: 1.28 * powerScale, fadePower: .72, afterglow: .34 };
    case 'super-flash': return { baseTtl: 36, size: 1.16, fadePower: .68, afterglow: .28 };
    case 'red-parry': return { baseTtl: 24, size: 1.24, fadePower: .72, afterglow: .32 };
    case 'parry': return { baseTtl: 24, size: 1.08, fadePower: .78, afterglow: .25 };
    case 'counter': return { baseTtl: 18, size: 1.16 * powerScale, fadePower: .78, afterglow: .18 };
    case 'target-hit': return { baseTtl: 22, size: 1.08 * powerScale, fadePower: .82, afterglow: .16 };
    case 'command-hit': return { baseTtl: 18, size: 1.04 * powerScale, fadePower: .84, afterglow: .14 };
    case 'air-hit': return { baseTtl: 16, size: 1.02 * powerScale, fadePower: .86, afterglow: .12 };
    case 'hit': return { baseTtl: 16, size: powerScale, fadePower: .88, afterglow: .1 };
    case 'block': return { baseTtl: 16, size: .92, fadePower: .92, afterglow: .08 };
    case 'throw-escape': return { baseTtl: 20, size: 1.05, fadePower: .82, afterglow: .18 };
    case 'wall-bounce': return { baseTtl: 30, size: 1.16, fadePower: .8, afterglow: .22 };
    case 'ground-bounce': return { baseTtl: 28, size: 1.12, fadePower: .82, afterglow: .2 };
    case 'juggle': return { baseTtl: 20, size: .96, fadePower: .9, afterglow: .1 };
    case 'boss-warning': return { baseTtl: 42, size: 1.08, fadePower: .76, afterglow: .22 };
    case 'boss-burst': return { baseTtl: 54, size: 1.24, fadePower: .7, afterglow: .34 };
    case 'ko': return { baseTtl: 90, size: 1.3, fadePower: .7, afterglow: .4 };
    case 'prop-break': return { baseTtl: 42, size: 1.02, fadePower: .86, afterglow: .1 };
    default: return { baseTtl: 24, size: powerScale, fadePower: .86, afterglow: .1 };
  }
}

export type TransitionPolishProfile = {
  introFrames: number;
  duelFrames: number;
  duelPrepareAt: number;
  clearFrames: number;
  clearDispatchAt: number;
  finalClearFrames: number;
  finalClearDispatchAt: number;
};

const TRANSITIONS: Record<number, TransitionPolishProfile> = {
  1: { introFrames: 108, duelFrames: 258, duelPrepareAt: 144, clearFrames: 222, clearDispatchAt: 72, finalClearFrames: 228, finalClearDispatchAt: 30 },
  2: { introFrames: 112, duelFrames: 264, duelPrepareAt: 148, clearFrames: 226, clearDispatchAt: 74, finalClearFrames: 228, finalClearDispatchAt: 30 },
  3: { introFrames: 114, duelFrames: 266, duelPrepareAt: 150, clearFrames: 230, clearDispatchAt: 76, finalClearFrames: 228, finalClearDispatchAt: 30 },
  4: { introFrames: 116, duelFrames: 270, duelPrepareAt: 152, clearFrames: 234, clearDispatchAt: 78, finalClearFrames: 228, finalClearDispatchAt: 30 },
  5: { introFrames: 122, duelFrames: 282, duelPrepareAt: 158, clearFrames: 240, clearDispatchAt: 82, finalClearFrames: 228, finalClearDispatchAt: 36 },
};

export function transitionPolishProfile(stageId: number): TransitionPolishProfile {
  return TRANSITIONS[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}
