import type { MoveData } from '../combat/CombatTypes.js';

export type HudModeProfile = {
  mode: 'belt' | 'duel' | 'boss';
  playerPanelWidth: number;
  enemyPanelWidth: number;
  timerRadius: number;
  borderAlpha: number;
  bossLabel?: string;
};

export function hudModeProfile(mode: 'belt' | 'duel', finalBoss = false): HudModeProfile {
  if (finalBoss) return { mode: 'boss', playerPanelWidth: 390, enemyPanelWidth: 620, timerRadius: 34, borderAlpha: .38, bossLabel: 'FINAL BOSS' };
  if (mode === 'duel') return { mode: 'duel', playerPanelWidth: 475, enemyPanelWidth: 475, timerRadius: 31, borderAlpha: .26 };
  return { mode: 'belt', playerPanelWidth: 430, enemyPanelWidth: 245, timerRadius: 26, borderAlpha: .18 };
}

export type StageLightingProfile = {
  key: string;
  rim: string;
  ambient: string;
  shadow: string;
  shadowOffsetX: number;
  shadowStretch: number;
  beamCount: number;
  pulse: number;
};

const LIGHTING: Record<number, StageLightingProfile> = {
  1: { key: '#ffc26d', rim: '#ff8c55', ambient: 'rgba(255,174,98,.075)', shadow: 'rgba(20,13,18,.36)', shadowOffsetX: 12, shadowStretch: 1.05, beamCount: 3, pulse: .45 },
  2: { key: '#57dcff', rim: '#ff4aa6', ambient: 'rgba(71,211,255,.08)', shadow: 'rgba(15,5,26,.46)', shadowOffsetX: -8, shadowStretch: 1.18, beamCount: 5, pulse: 1.4 },
  3: { key: '#ffd59a', rim: '#d95a50', ambient: 'rgba(255,221,170,.055)', shadow: 'rgba(35,27,22,.34)', shadowOffsetX: 9, shadowStretch: .98, beamCount: 2, pulse: .36 },
  4: { key: '#c6e6f5', rim: '#738fa8', ambient: 'rgba(174,222,245,.055)', shadow: 'rgba(6,15,22,.5)', shadowOffsetX: -14, shadowStretch: 1.25, beamCount: 4, pulse: .62 },
  5: { key: '#8fe6ff', rim: '#b27cff', ambient: 'rgba(109,217,247,.075)', shadow: 'rgba(9,10,26,.5)', shadowOffsetX: 0, shadowStretch: 1.08, beamCount: 6, pulse: 1.05 },
};

export function stageLightingProfile(stageId: number): StageLightingProfile {
  return LIGHTING[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}

export type TrailStyle = 'wave' | 'flame' | 'cold' | 'electric' | 'kunai' | 'spiral' | 'rush' | 'heavy' | 'neutral';
export type TrailProfile = { style: TrailStyle; length: number; width: number; alpha: number; segments: number; color?: string };

export function projectileTrailProfile(move: MoveData, ownerId: string): TrailProfile {
  const motif = move.superPresentation?.motif ?? '';
  if (ownerId === 'IBUKI') return { style: 'kunai', length: 62, width: 3, alpha: .58, segments: 4 };
  if (ownerId === 'GILL') {
    if (motif.includes('flame') || move.id.includes('FLAME')) return { style: 'flame', length: 118, width: 10, alpha: .52, segments: 7, color: '#ff8759' };
    if (motif.includes('electric')) return { style: 'electric', length: 102, width: 5, alpha: .62, segments: 6, color: '#fff2a5' };
    return { style: 'cold', length: 112, width: 9, alpha: .52, segments: 7, color: '#75c9ff' };
  }
  if (ownerId === 'URIEN') return { style: 'electric', length: 78, width: 5, alpha: .48, segments: 5, color: '#b86fff' };
  if (motif.includes('spiral')) return { style: 'spiral', length: 92, width: 6, alpha: .5, segments: 6 };
  if (motif.includes('flame')) return { style: 'flame', length: 92, width: 8, alpha: .48, segments: 6 };
  if (motif.includes('electric')) return { style: 'electric', length: 86, width: 4, alpha: .55, segments: 5 };
  return { style: 'wave', length: move.superCost ? 106 : 72, width: move.superCost ? 8 : 5, alpha: move.superCost ? .52 : .36, segments: move.superCost ? 7 : 5 };
}

export function attackTrailProfile(move: MoveData | null): TrailProfile {
  if (!move) return { style: 'neutral', length: 0, width: 0, alpha: 0, segments: 0 };
  const motif = move.superPresentation?.motif ?? '';
  if (move.kind === 'projectile') return { style: 'wave', length: 72, width: 4, alpha: .3, segments: 4 };
  if (motif.includes('spiral') || move.id.includes('TATSU')) return { style: 'spiral', length: 86, width: 7, alpha: .42, segments: 5 };
  if (motif.includes('rush') || move.technique === 'target') return { style: 'rush', length: 74, width: 6, alpha: .36, segments: 4 };
  if (move.damage >= 95 || move.button === 'hp' || move.button === 'hk') return { style: 'heavy', length: 66, width: 7, alpha: .34, segments: 4 };
  return { style: 'neutral', length: 46, width: 4, alpha: .22, segments: 3 };
}
