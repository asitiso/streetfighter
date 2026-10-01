export type StageVisualProfile = {
  id: 1 | 2 | 3 | 4 | 5;
  label: string;
  accent: string;
  glow: string;
  floorReflect: string;
  farDetail: number;
  midDetail: number;
  foregroundDetail: number;
  atmosphericDensity: number;
};

const PROFILES: Record<number, StageVisualProfile> = {
  1: { id: 1, label: 'NEW YORK DOWNTOWN', accent: '#f0b35c', glow: '#ffcb7a', floorReflect: 'rgba(255,167,93,.09)', farDetail: 10, midDetail: 12, foregroundDetail: 8, atmosphericDensity: 18 },
  2: { id: 2, label: 'HONG KONG NIGHT MARKET', accent: '#ff4f9e', glow: '#55dfff', floorReflect: 'rgba(74,211,255,.13)', farDetail: 14, midDetail: 18, foregroundDetail: 12, atmosphericDensity: 24 },
  3: { id: 3, label: 'JAPAN KARATE DISTRICT', accent: '#d25d52', glow: '#ffd69d', floorReflect: 'rgba(255,218,169,.075)', farDetail: 9, midDetail: 13, foregroundDetail: 9, atmosphericDensity: 16 },
  4: { id: 4, label: 'LONDON UNDERGROUND', accent: '#7bb0c8', glow: '#e6f1f8', floorReflect: 'rgba(168,214,235,.11)', farDetail: 12, midDetail: 15, foregroundDetail: 11, atmosphericDensity: 30 },
  5: { id: 5, label: 'SECRET SOCIETY', accent: '#8e73e8', glow: '#73dcf4', floorReflect: 'rgba(115,211,244,.10)', farDetail: 16, midDetail: 20, foregroundDetail: 14, atmosphericDensity: 26 },
};

export function stageVisualProfile(stageId: number): StageVisualProfile {
  return PROFILES[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}

export function qualityDetailCount(base: number, scale: number): number {
  return Math.max(1, Math.round(base * Math.max(.25, Math.min(1, scale))));
}

export function combatFxDensity(tier: 'high' | 'balanced' | 'low', power = 60): number {
  const scale = tier === 'high' ? 1 : tier === 'balanced' ? .72 : .46;
  return Math.max(4, Math.round((8 + Math.min(14, Math.max(0, power) / 12)) * scale));
}
