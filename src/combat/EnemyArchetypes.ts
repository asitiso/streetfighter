export type EnemyArchetypeId = 'brawler' | 'boxer' | 'karate' | 'kick' | 'grappler' | 'agile' | 'heavy' | 'ranged' | 'technical' | 'mma';

export interface EnemyAiProfile {
  id: EnemyArchetypeId;
  label: string;
  preferredDistance: number;
  moveSpeed: number;
  attackCooldown: number;
  guardChance: number;
  parryChance: number;
  counterBias: number;
  throwBias: number;
  rangedBias: number;
  flankBias: number;
  pressure: number;
}

const PROFILES: Record<EnemyArchetypeId, EnemyAiProfile> = {
  brawler: { id: 'brawler', label: 'BRAWLER', preferredDistance: 92, moveSpeed: 1, attackCooldown: 42, guardChance: .14, parryChance: .02, counterBias: .08, throwBias: .08, rangedBias: 0, flankBias: .25, pressure: 1 },
  boxer: { id: 'boxer', label: 'BOXER', preferredDistance: 76, moveSpeed: 1.1, attackCooldown: 31, guardChance: .26, parryChance: .04, counterBias: .2, throwBias: .02, rangedBias: 0, flankBias: .72, pressure: 1.18 },
  karate: { id: 'karate', label: 'KARATE', preferredDistance: 112, moveSpeed: .98, attackCooldown: 39, guardChance: .29, parryChance: .12, counterBias: .34, throwBias: .05, rangedBias: .18, flankBias: .34, pressure: .98 },
  kick: { id: 'kick', label: 'KICK FIGHTER', preferredDistance: 126, moveSpeed: 1.12, attackCooldown: 34, guardChance: .18, parryChance: .03, counterBias: .17, throwBias: .03, rangedBias: .05, flankBias: .55, pressure: 1.08 },
  grappler: { id: 'grappler', label: 'GRAPPLER', preferredDistance: 58, moveSpeed: .88, attackCooldown: 48, guardChance: .2, parryChance: .01, counterBias: .08, throwBias: .42, rangedBias: 0, flankBias: .18, pressure: .92 },
  agile: { id: 'agile', label: 'AGILE', preferredDistance: 108, moveSpeed: 1.28, attackCooldown: 27, guardChance: .12, parryChance: .05, counterBias: .24, throwBias: .04, rangedBias: .12, flankBias: 1.2, pressure: 1.12 },
  heavy: { id: 'heavy', label: 'HEAVY', preferredDistance: 82, moveSpeed: .78, attackCooldown: 56, guardChance: .17, parryChance: .01, counterBias: .04, throwBias: .15, rangedBias: 0, flankBias: .08, pressure: .78 },
  ranged: { id: 'ranged', label: 'RANGED', preferredDistance: 284, moveSpeed: .94, attackCooldown: 51, guardChance: .2, parryChance: .04, counterBias: .12, throwBias: 0, rangedBias: 1.4, flankBias: .12, pressure: .72 },
  technical: { id: 'technical', label: 'TECHNICAL', preferredDistance: 118, moveSpeed: 1.02, attackCooldown: 34, guardChance: .36, parryChance: .24, counterBias: .72, throwBias: .08, rangedBias: .2, flankBias: .42, pressure: 1.02 },
  mma: { id: 'mma', label: 'MMA', preferredDistance: 86, moveSpeed: 1.03, attackCooldown: 36, guardChance: .3, parryChance: .08, counterBias: .4, throwBias: .27, rangedBias: 0, flankBias: .5, pressure: 1.08 },
};

export function enemyAiProfile(id: EnemyArchetypeId = 'brawler'): EnemyAiProfile {
  return PROFILES[id];
}
