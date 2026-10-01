export type FighterState = 'idle' | 'walk' | 'crouch' | 'jump' | 'attack' | 'block' | 'parry' | 'hit' | 'knockdown' | 'victory' | 'ko';
export type AttackLevel = 'high' | 'mid' | 'low' | 'throw';
export type HitZone = 'head' | 'torso' | 'leg' | 'launch' | 'throw';
export type MoveButton = 'lp' | 'mp' | 'hp' | 'lk' | 'mk' | 'hk';
export type MoveKind = 'melee' | 'projectile' | 'throw';
export type EnemyRole = 'attack' | 'wait' | 'flank' | 'ranged' | 'recovery';

export interface HitboxDef {
  forward: number;
  back: number;
  height: number;
  lane: number;
}

export interface ProjectileDef {
  speed: number;
  life: number;
  radius: number;
  piercing?: boolean;
  count?: number;
  verticalSpread?: number;
}

export interface MoveData {
  id: string;
  label: string;
  button?: MoveButton;
  command?: string;
  kind?: MoveKind;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitStop: number;
  hitStun: number;
  blockStun: number;
  pushback: number;
  level: AttackLevel;
  knockdown?: boolean;
  launch?: number;
  exCost?: number;
  superCost?: number;
  superGain: number;
  hitbox: HitboxDef;
  projectile?: ProjectileDef;
  cancelIntoSpecial?: boolean;
  color: string;
  identityTag?: string;
  guardBreak?: boolean;
  technique?: 'command' | 'air' | 'target';
  superPresentation?: { motif: string; accent: string; freezeFrames: number };
  multiHit?: { hits: number; interval: number; perHitScale: number };
  wallBounce?: boolean;
  groundBounce?: boolean;
  juggleLimit?: number;
  install?: {
    duration: number;
    powerScale: number;
    frameScale: number;
    moveScale: number;
    label: string;
  };
}

export interface CombatEvent {
  type: 'hit' | 'air-hit' | 'command-hit' | 'target-hit' | 'super-flash' | 'super-impact' | 'counter' | 'block' | 'parry' | 'red-parry' | 'throw-escape' | 'enemy-collision' | 'wall-impact' | 'prop-hit' | 'prop-break' | 'boss-warning' | 'boss-burst' | 'juggle' | 'wall-bounce' | 'ground-bounce' | 'ko';
  x: number;
  y: number;
  power: number;
  ttl: number;
  label?: string;
  color?: string;
  style?: string;
  accent?: string;
  hitIndex?: number;
  hitTotal?: number;
  attackerSide?: 'player' | 'enemy';
  moveId?: string;
  audioPlayed?: boolean;
}

export interface ModeRules {
  mode: 'belt' | 'duel';
  depthMovement: boolean;
  laneTolerance: number;
  arenaLeft: number;
  arenaRight: number;
  arenaTop: number;
  arenaBottom: number;
}

export interface EnemyDirective {
  role: EnemyRole;
  desiredX: number;
  desiredY: number;
  attackAllowed: boolean;
  rangedAllowed: boolean;
}

export interface EnvironmentProp {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  hp: number;
  maxHp: number;
  broken: boolean;
  solid: boolean;
}
