/**
 * Duel AI difficulty: a level 1..6 picked per stage (stage 1 easiest, Gill hardest), shifted by the
 * player's Easy / Normal / Hard option. Level 0 keeps the legacy (pre-v083) AI untouched.
 */
export type AiDifficultySetting = 'easy' | 'normal' | 'hard';
export const AI_DIFFICULTY_SETTINGS: readonly AiDifficultySetting[] = ['easy', 'normal', 'hard'];
export const MAX_AI_LEVEL = 6;

let currentSetting: AiDifficultySetting = 'normal';
export function getAiDifficultySetting(): AiDifficultySetting { return currentSetting; }
export function setAiDifficultySetting(setting: unknown): AiDifficultySetting {
  currentSetting = AI_DIFFICULTY_SETTINGS.includes(setting as AiDifficultySetting) ? setting as AiDifficultySetting : 'normal';
  return currentSetting;
}

/** Stage 1..5 duel bosses map to levels 1..5, the Gill final to 6; Easy -1 / Hard +1. */
export function stageAiLevel(stageId: number, finalBoss = false, setting: AiDifficultySetting = currentSetting): number {
  const base = finalBoss ? MAX_AI_LEVEL : Math.max(1, Math.min(5, Math.round(stageId)));
  const offset = setting === 'easy' ? -1 : setting === 'hard' ? 1 : 0;
  return Math.max(1, Math.min(MAX_AI_LEVEL, base + offset));
}

export interface AiLevelTuning {
  level: number;
  /** Frames between a threat appearing and the AI committing to an answer. */
  reactionDelay: number;
  /** Chance to answer an incoming projectile at all. */
  fireballChance: number;
  antiAirChance: number;
  whiffPunishChance: number;
  /** Added to the archetype guard chance. */
  guardBonus: number;
  canParry: boolean;
  footsies: boolean;
}

const DELAY = [0, 24, 19, 15, 12, 9, 7];
const FIREBALL = [0, .35, .5, .62, .74, .85, .93];
const ANTI_AIR = [0, .3, .45, .6, .72, .84, .92];
const WHIFF = [0, .15, .3, .45, .6, .75, .88];
const GUARD = [0, 0, .03, .06, .09, .12, .15];

export function aiTuning(level: number): AiLevelTuning {
  const l = Math.max(0, Math.min(MAX_AI_LEVEL, Math.round(level)));
  return {
    level: l,
    reactionDelay: DELAY[l]!,
    fireballChance: FIREBALL[l]!,
    antiAirChance: ANTI_AIR[l]!,
    whiffPunishChance: WHIFF[l]!,
    guardBonus: GUARD[l]!,
    canParry: l >= 4,
    footsies: l >= 2,
  };
}
