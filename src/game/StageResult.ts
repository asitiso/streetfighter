export interface StageResult {
  stageId: 1 | 2 | 3 | 4 | 5;
  clearSeconds: number;
  defeatedEnemies: number;
  damageDealt: number;
  damageTaken: number;
  maxComboHits: number;
  maxComboDamage: number;
  parries: number;
  redParries: number;
  supersUsed: number;
  throwsLanded: number;
}

export interface CampaignTotals {
  clearSeconds: number;
  defeatedEnemies: number;
  damageDealt: number;
  damageTaken: number;
  maxComboHits: number;
  maxComboDamage: number;
  parries: number;
  redParries: number;
  supersUsed: number;
  throwsLanded: number;
}

export function campaignTotals(results: readonly StageResult[]): CampaignTotals {
  return results.reduce<CampaignTotals>((total, result) => ({
    clearSeconds: total.clearSeconds + result.clearSeconds,
    defeatedEnemies: total.defeatedEnemies + result.defeatedEnemies,
    damageDealt: total.damageDealt + result.damageDealt,
    damageTaken: total.damageTaken + result.damageTaken,
    maxComboHits: Math.max(total.maxComboHits, result.maxComboHits),
    maxComboDamage: Math.max(total.maxComboDamage, result.maxComboDamage),
    parries: total.parries + result.parries,
    redParries: total.redParries + result.redParries,
    supersUsed: total.supersUsed + result.supersUsed,
    throwsLanded: total.throwsLanded + result.throwsLanded,
  }), {
    clearSeconds: 0,
    defeatedEnemies: 0,
    damageDealt: 0,
    damageTaken: 0,
    maxComboHits: 0,
    maxComboDamage: 0,
    parries: 0,
    redParries: 0,
    supersUsed: 0,
    throwsLanded: 0,
  });
}

export function formatClearTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}
