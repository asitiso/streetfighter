import type { CombatEvent } from '../combat/CombatTypes.js';

export type StagePresentationProfile = {
  stageId: 1 | 2 | 3 | 4 | 5;
  hudAccent: string;
  hudEnemy: string;
  gradeTop: string;
  gradeBottom: string;
  gradeAlpha: number;
  introEyebrow: string;
  introSubtitle: string;
  objective: string;
  locationCode: string;
};

const STAGES: Record<number, StagePresentationProfile> = {
  1: { stageId: 1, hudAccent: '#e8b656', hudEnemy: '#d85b5f', gradeTop: '#f0a162', gradeBottom: '#314866', gradeAlpha: .11, introEyebrow: 'STREET INCIDENT // 01', introSubtitle: 'DOWNTOWN PRESSURE', objective: 'BREAK THROUGH THE STREET FIGHTERS', locationCode: 'NYC-DT' },
  2: { stageId: 2, hudAccent: '#54d9ff', hudEnemy: '#ff5aab', gradeTop: '#ec3b9b', gradeBottom: '#1c6ba1', gradeAlpha: .13, introEyebrow: 'NIGHT MARKET // 02', introSubtitle: 'NEON CROSSROADS', objective: 'SURVIVE THE MARKET RUSH', locationCode: 'HKG-NM' },
  3: { stageId: 3, hudAccent: '#f2c47e', hudEnemy: '#d65a52', gradeTop: '#e0a36a', gradeBottom: '#546b63', gradeAlpha: .095, introEyebrow: 'KARATE DISTRICT // 03', introSubtitle: 'SPACING & COUNTER', objective: 'READ THE FIGHT — PARRY, THEN PUNISH', locationCode: 'JPN-KD' },
  4: { stageId: 4, hudAccent: '#a9d9ef', hudEnemy: '#e76f75', gradeTop: '#7898aa', gradeBottom: '#182b37', gradeAlpha: .12, introEyebrow: 'UNDERGROUND // 04', introSubtitle: 'FIGHT CLUB DESCENT', objective: 'WIN THE ELITE RUSH', locationCode: 'LDN-FC' },
  5: { stageId: 5, hudAccent: '#d7bd68', hudEnemy: '#a277ff', gradeTop: '#7254b9', gradeBottom: '#173c55', gradeAlpha: .14, introEyebrow: 'SECRET SOCIETY // 05', introSubtitle: 'RESTRICTED FACILITY', objective: 'REACH URIEN — THEN GILL', locationCode: 'SS-05' },
};

export function stagePresentationProfile(stageId: number): StagePresentationProfile {
  return STAGES[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}

export type HitSparkShape = 'slash' | 'cross' | 'burst' | 'ring' | 'shards' | 'guard';
export type HitSparkProfile = { shape: HitSparkShape; rays: number; length: number; width: number; rotation: number; core: number };

export function hitSparkProfile(event: Pick<CombatEvent, 'type' | 'power'>): HitSparkProfile {
  if (event.type === 'block') return { shape: 'guard', rays: 6, length: 42, width: 4, rotation: .18, core: 18 };
  if (event.type === 'air-hit') return { shape: 'slash', rays: 6, length: 62, width: 5, rotation: -.55, core: 14 };
  if (event.type === 'command-hit') return { shape: 'cross', rays: 8, length: 70, width: 6, rotation: .22, core: 18 };
  if (event.type === 'target-hit') return { shape: 'shards', rays: 11, length: 76, width: 6, rotation: .08, core: 20 };
  if (event.type === 'counter') return { shape: 'cross', rays: 10, length: 86, width: 7, rotation: -.15, core: 22 };
  if (event.type === 'throw-escape') return { shape: 'ring', rays: 8, length: 55, width: 4, rotation: 0, core: 24 };
  const heavy = event.power >= 85;
  return { shape: heavy ? 'burst' : 'slash', rays: heavy ? 10 : 7, length: heavy ? 82 : 54, width: heavy ? 7 : 5, rotation: heavy ? .06 : -.32, core: heavy ? 21 : 15 };
}
