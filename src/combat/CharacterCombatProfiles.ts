import type { MoveButton } from './CombatTypes.js';

export interface CharacterCombatProfile {
  walkScale: number;
  depthScale: number;
  jumpVelocity: number;
  gravity: number;
  healthScale: number;
  normalDamage: number;
  normalReach: number;
  startupDelta: number;
  recoveryScale: number;
  throwDamage: number;
  throwReach: number;
  mobilitySpeed: number;
  antiAirDrift: number;
  chainRoutes: Partial<Record<MoveButton, readonly MoveButton[]>>;
  identity: string;
}

const BALANCED: CharacterCombatProfile = {
  walkScale: 1,
  depthScale: 1,
  jumpVelocity: 12.4,
  gravity: .72,
  healthScale: 1,
  normalDamage: 1,
  normalReach: 1,
  startupDelta: 0,
  recoveryScale: 1,
  throwDamage: 1,
  throwReach: 1,
  mobilitySpeed: 5.1,
  antiAirDrift: 1.7,
  chainRoutes: {},
  identity: 'BALANCED',
};

const PROFILES: Readonly<Record<string, CharacterCombatProfile>> = {
  RYU: { ...BALANCED, identity: 'BALANCED / MID-RANGE' },
  KEN: {
    ...BALANCED,
    walkScale: 1.06,
    jumpVelocity: 12.9,
    normalDamage: .97,
    startupDelta: -1,
    recoveryScale: .9,
    mobilitySpeed: 6.25,
    antiAirDrift: 2.25,
    chainRoutes: { lp: ['mp'], mp: ['hp'], lk: ['mk'], mk: ['hk'] },
    identity: 'RUSH / FAST CANCELS',
  },
  CHUNLI: {
    ...BALANCED,
    walkScale: 1.1,
    depthScale: 1.08,
    jumpVelocity: 12.7,
    normalDamage: .9,
    normalReach: 1.16,
    startupDelta: -1,
    recoveryScale: .91,
    throwDamage: .92,
    mobilitySpeed: 6.4,
    chainRoutes: { lp: ['mp'], lk: ['mk'], mk: ['hk'] },
    identity: 'FOOTSIE / LONG NORMALS',
  },
  ALEX: {
    ...BALANCED,
    walkScale: .9,
    depthScale: .93,
    jumpVelocity: 11.7,
    gravity: .75,
    healthScale: 1.12,
    normalDamage: 1.13,
    normalReach: 1.03,
    startupDelta: 1,
    recoveryScale: 1.08,
    throwDamage: 1.34,
    throwReach: 1.16,
    mobilitySpeed: 5.7,
    antiAirDrift: 1.9,
    chainRoutes: { mp: ['hp'] },
    identity: 'POWER / GRAB',
  },
  DUDLEY: {
    ...BALANCED,
    walkScale: 1.03,
    jumpVelocity: 12.3,
    normalDamage: 1.03,
    normalReach: 1.07,
    startupDelta: -1,
    recoveryScale: .88,
    throwDamage: .96,
    mobilitySpeed: 6.8,
    antiAirDrift: 2.05,
    chainRoutes: { lp: ['mp'], mp: ['hp'], lk: ['mk'] },
    identity: 'BOXING / TARGET COMBOS',
  },
  MAKOTO: {
    ...BALANCED,
    walkScale: .97,
    depthScale: .98,
    jumpVelocity: 12.2,
    healthScale: 1.02,
    normalDamage: 1.18,
    normalReach: .95,
    startupDelta: 0,
    recoveryScale: 1.02,
    throwDamage: 1.08,
    throwReach: 1.05,
    mobilitySpeed: 7.25,
    antiAirDrift: 2.1,
    chainRoutes: { lp: ['mp'], mp: ['hp'] },
    identity: 'BURST / HIGH DAMAGE',
  },
  IBUKI: {
    ...BALANCED,
    walkScale: 1.12,
    depthScale: 1.12,
    jumpVelocity: 13.65,
    gravity: .66,
    healthScale: .92,
    normalDamage: .88,
    normalReach: .97,
    startupDelta: -1,
    recoveryScale: .86,
    throwDamage: .9,
    mobilitySpeed: 7.1,
    antiAirDrift: 2.45,
    chainRoutes: { lp: ['mp', 'lk'], mp: ['hp', 'mk'], lk: ['mk'], mk: ['hk'] },
    identity: 'AIR MOBILITY / FAST CHAINS',
  },
  YUN: {
    ...BALANCED,
    walkScale: 1.14,
    depthScale: 1.1,
    jumpVelocity: 13.05,
    gravity: .69,
    healthScale: .95,
    normalDamage: .91,
    normalReach: .96,
    startupDelta: -1,
    recoveryScale: .82,
    throwDamage: .9,
    mobilitySpeed: 7.45,
    antiAirDrift: 2.35,
    chainRoutes: { lp: ['mp', 'lk'], mp: ['hp', 'mk'], lk: ['mp', 'mk'], mk: ['hp', 'hk'] },
    identity: 'RUSHDOWN / CHAIN LINKS',
  },
  URIEN: {
    ...BALANCED,
    walkScale: .98,
    healthScale: 1.2,
    normalDamage: 1.18,
    normalReach: 1.09,
    startupDelta: 0,
    recoveryScale: .96,
    throwDamage: 1.18,
    throwReach: 1.08,
    mobilitySpeed: 6.6,
    antiAirDrift: 2.2,
    chainRoutes: { mp: ['hp'], mk: ['hk'] },
    identity: 'TYRANT / AEGIS PRESSURE',
  },
  GILL: {
    ...BALANCED,
    walkScale: 1.02,
    healthScale: 1.36,
    normalDamage: 1.24,
    normalReach: 1.13,
    startupDelta: 0,
    recoveryScale: .9,
    throwDamage: 1.2,
    throwReach: 1.1,
    mobilitySpeed: 6.85,
    antiAirDrift: 2.4,
    chainRoutes: { lp: ['mp'], mp: ['hp'], lk: ['mk'], mk: ['hk'] },
    identity: 'ELEMENTAL / FINAL BOSS',
  },
};

export function combatProfileFor(characterId: string): CharacterCombatProfile {
  return PROFILES[characterId] ?? BALANCED;
}
