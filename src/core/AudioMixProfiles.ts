export type CombatAudioCue = 'light-hit' | 'heavy-hit' | 'parry' | 'red-parry' | 'super' | 'boss' | 'ko';
export type StageAudioMixProfile = {
  stageId: 1 | 2 | 3 | 4 | 5;
  music: number;
  ambience: number;
  sfx: number;
  brightness: number;
  lowEnd: number;
};

const STAGE_MIXES: Record<number, StageAudioMixProfile> = {
  1: { stageId: 1, music: .82, ambience: .72, sfx: 1, brightness: .78, lowEnd: .82 },
  2: { stageId: 2, music: .86, ambience: .78, sfx: 1, brightness: 1.08, lowEnd: .76 },
  3: { stageId: 3, music: .77, ambience: .7, sfx: 1, brightness: .72, lowEnd: .74 },
  4: { stageId: 4, music: .8, ambience: .84, sfx: 1.02, brightness: .62, lowEnd: .92 },
  5: { stageId: 5, music: .88, ambience: .68, sfx: 1.06, brightness: .9, lowEnd: 1.08 },
};

export function stageAudioMixProfile(stageId: number): StageAudioMixProfile {
  return STAGE_MIXES[Math.max(1, Math.min(5, Math.round(stageId)))]!;
}

export function combatDuckAmount(cue: CombatAudioCue): number {
  if (cue === 'ko') return .26;
  if (cue === 'super') return .32;
  if (cue === 'red-parry') return .36;
  if (cue === 'boss') return .42;
  if (cue === 'parry') return .48;
  if (cue === 'heavy-hit') return .56;
  return .72;
}

export function combatDuckDuration(cue: CombatAudioCue): number {
  if (cue === 'ko') return .34;
  if (cue === 'super') return .24;
  if (cue === 'red-parry') return .18;
  if (cue === 'boss') return .22;
  if (cue === 'parry') return .12;
  if (cue === 'heavy-hit') return .09;
  return .045;
}
