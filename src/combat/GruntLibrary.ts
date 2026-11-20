import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { AttackLevel, MoveButton, MoveData, ProjectileDef } from './CombatTypes.js';
import type { EnemyArchetypeId } from './EnemyArchetypes.js';

/**
 * Rank-and-file belt enemies (Final Fight / Streets of Rage style street thugs).
 * They are never selectable, carry their own move sets and their own sprite atlases
 * (public/art/grunts-v1), and never borrow a playable fighter's specials or supers.
 */
export type GruntKind = 'punk' | 'knife' | 'bruiser' | 'kicker' | 'soldier' | 'thrower';
export type GruntWeapon = 'pipe' | 'knife' | 'sword';

export interface GruntSpecialSet {
  primary: MoveData;
  antiAir: MoveData;
  mobility: MoveData;
  exPrimary: MoveData;
  super: MoveData;
}

export interface GruntDef {
  kind: GruntKind;
  id: string;
  name: string;
  archetype: EnemyArchetypeId;
  hp: number;
  speed: number;
  /** Grabs and knees the player (Final Fight Andore / Streets of Rage Big Ben role). */
  grabsPlayer: boolean;
  /** Light hits do not flinch it while it is attacking; damage taken is scaled. */
  armor: number;
  /** Weapon dropped when knocked out. */
  carries: GruntWeapon | null;
  score: number;
  light: MoveData;
  heavy: MoveData;
  specials: GruntSpecialSet;
  character: CharacterDef;
}

interface MoveOptions {
  button?: MoveButton;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  level?: AttackLevel;
  knockdown?: boolean;
  launch?: number;
  guardBreak?: boolean;
  multiHit?: MoveData['multiHit'];
  projectile?: ProjectileDef;
  pushback?: number;
  lane?: number;
  color: string;
}

function gm(id: string, label: string, o: MoveOptions): MoveData {
  const level = o.level ?? 'mid';
  return {
    id, label, button: o.button, kind: o.projectile ? 'projectile' : 'melee',
    startup: o.startup, active: o.active, recovery: o.recovery, damage: o.damage,
    hitStop: o.damage >= 60 ? 9 : o.damage >= 38 ? 7 : 5,
    hitStun: 12 + Math.round(o.damage / 7), blockStun: 8 + Math.round(o.damage / 10),
    pushback: o.pushback ?? 10 + o.damage * .3, level,
    knockdown: o.knockdown, launch: o.launch, guardBreak: o.guardBreak, multiHit: o.multiHit,
    superGain: Math.max(4, Math.round(o.damage / 5)),
    hitbox: { forward: o.reach, back: 10, height: level === 'low' ? 52 : o.launch ? 130 : 96, lane: o.lane ?? 36 },
    projectile: o.projectile, color: o.color, identityTag: 'GRUNT',
  };
}

// Grunts never build or spend meter; these placeholders keep the CharacterDef shape intact.
const NO_ARTS: [SuperArtDef, SuperArtDef, SuperArtDef] = [
  { id: 1, name: 'NONE', subtitle: 'GRUNT', stocks: 1, gauge: 9999 },
  { id: 2, name: 'NONE', subtitle: 'GRUNT', stocks: 1, gauge: 9999 },
  { id: 3, name: 'NONE', subtitle: 'GRUNT', stocks: 1, gauge: 9999 },
];

function locked(move: MoveData, id: string): MoveData { return { ...move, id, exCost: 9999 }; }

function grunt(kind: GruntKind, name: string, archetype: EnemyArchetypeId, stats: { hp: number; speed: number; power: number; reach: number; heightScale?: number; widthScale?: number; colors: [string, string, string] },
  flags: { grabsPlayer?: boolean; armor?: number; carries?: GruntWeapon | null; score: number },
  light: MoveData, heavy: MoveData, primary: MoveData, mobility: MoveData, antiAir: MoveData): GruntDef {
  const id = `GRUNT_${kind.toUpperCase()}`;
  return {
    kind, id, name, archetype, hp: stats.hp, speed: stats.speed,
    grabsPlayer: !!flags.grabsPlayer, armor: flags.armor ?? 0, carries: flags.carries ?? null, score: flags.score,
    light, heavy,
    specials: { primary, mobility, antiAir, exPrimary: locked(primary, `${id}_EX_LOCKED`), super: { ...locked(heavy, `${id}_SUPER_LOCKED`), superCost: 9999 } },
    character: {
      id, name, style: 'STREET GANG', country: 'METRO CITY', primary: stats.colors[0], secondary: stats.colors[1], accent: stats.colors[2],
      heightScale: stats.heightScale ?? 1, widthScale: stats.widthScale ?? 1, speed: stats.speed, power: stats.power, reach: stats.reach, superArts: NO_ARTS,
    },
  };
}

const P = 'GRUNT_PUNK', K = 'GRUNT_KNIFE', B = 'GRUNT_BRUISER', KI = 'GRUNT_KICKER', S = 'GRUNT_SOLDIER', T = 'GRUNT_THROWER';

export const GRUNTS: Readonly<Record<GruntKind, GruntDef>> = {
  punk: grunt('punk', 'MOHAWK PUNK', 'brawler', { hp: 240, speed: 1.02, power: 1, reach: 1, colors: ['#2b2f3a', '#3c5b8c', '#e0402e'] }, { score: 300 },
    gm(`${P}_JAB`, 'PUNK JAB', { button: 'lp', startup: 5, active: 2, recovery: 10, damage: 24, reach: 80, level: 'high', color: '#ffd2a0' }),
    gm(`${P}_HAYMAKER`, 'HAYMAKER', { button: 'hp', startup: 11, active: 4, recovery: 18, damage: 50, reach: 96, color: '#ffb36b' }),
    gm(`${P}_RUSH`, 'RUSH COMBO', { startup: 8, active: 7, recovery: 18, damage: 54, reach: 90, multiHit: { hits: 2, interval: 3, perHitScale: .6 }, color: '#ff9a55' }),
    gm(`${P}_MOBILITY`, 'SHOULDER RUSH', { startup: 10, active: 10, recovery: 20, damage: 40, reach: 70, knockdown: true, color: '#ff8a4a' }),
    gm(`${P}_ANTI_AIR`, 'UPPERCUT', { startup: 6, active: 4, recovery: 20, damage: 44, reach: 62, launch: 60, knockdown: true, color: '#ffd56c' })),
  knife: grunt('knife', 'KNIFE THUG', 'agile', { hp: 220, speed: 1.12, power: 1.05, reach: 1, colors: ['#e3b52d', '#7a7f86', '#3d9a52'] }, { carries: 'knife', score: 400 },
    gm(`${K}_POKE`, 'KNIFE POKE', { button: 'lp', startup: 6, active: 3, recovery: 10, damage: 30, reach: 92, color: '#e8f1ff' }),
    gm(`${K}_SLASH`, 'KNIFE SLASH', { button: 'hp', startup: 9, active: 4, recovery: 15, damage: 48, reach: 106, level: 'high', color: '#dfe9ff' }),
    gm(`${K}_FLURRY`, 'SLASH FLURRY', { startup: 7, active: 9, recovery: 18, damage: 60, reach: 90, multiHit: { hits: 3, interval: 3, perHitScale: .42 }, color: '#f3f7ff' }),
    gm(`${K}_MOBILITY`, 'LUNGE STAB', { startup: 12, active: 9, recovery: 22, damage: 56, reach: 88, knockdown: true, color: '#ffffff' }),
    gm(`${K}_ANTI_AIR`, 'RISING SLASH', { startup: 6, active: 4, recovery: 20, damage: 42, reach: 70, launch: 56, knockdown: true, color: '#e8f1ff' })),
  bruiser: grunt('bruiser', 'BIG BRUISER', 'grappler', { hp: 430, speed: .82, power: 1.12, reach: 1.05, widthScale: 1.04, colors: ['#e8dcc2', '#4b4a2a', '#8b5a2b'] }, { grabsPlayer: true, armor: .25, score: 600 },
    gm(`${B}_SLAP`, 'BELLY SLAP', { button: 'lp', startup: 8, active: 3, recovery: 14, damage: 34, reach: 82, color: '#ffd0a0' }),
    gm(`${B}_BUMP`, 'BELLY BUMP', { button: 'hp', startup: 13, active: 6, recovery: 22, damage: 62, reach: 98, knockdown: true, pushback: 44, color: '#ffbf80' }),
    gm(`${B}_PRESS`, 'BODY PRESS', { startup: 15, active: 6, recovery: 26, damage: 76, reach: 102, knockdown: true, guardBreak: true, color: '#ffa860' }),
    gm(`${B}_MOBILITY`, 'BULL CHARGE', { startup: 14, active: 14, recovery: 24, damage: 60, reach: 80, knockdown: true, pushback: 50, color: '#ff9a4a' }),
    gm(`${B}_ANTI_AIR`, 'HEADBUTT', { startup: 7, active: 4, recovery: 22, damage: 50, reach: 64, launch: 50, knockdown: true, color: '#ffd56c' })),
  kicker: grunt('kicker', 'STREET KICKER', 'kick', { hp: 230, speed: 1.1, power: .98, reach: 1.04, colors: ['#1b1b22', '#f1f1f1', '#8a3fc4'] }, { score: 400 },
    gm(`${KI}_SNAP`, 'SNAP KICK', { button: 'lk', startup: 5, active: 2, recovery: 9, damage: 26, reach: 94, color: '#e7c7ff' }),
    gm(`${KI}_ROUNDHOUSE`, 'ROUNDHOUSE', { button: 'hk', startup: 9, active: 3, recovery: 17, damage: 52, reach: 114, level: 'high', color: '#d6a8ff' }),
    gm(`${KI}_SPIN`, 'SPIN KICK', { startup: 10, active: 6, recovery: 20, damage: 62, reach: 104, knockdown: true, color: '#c58bff' }),
    gm(`${KI}_MOBILITY`, 'FLYING KNEE', { startup: 9, active: 10, recovery: 20, damage: 54, reach: 78, knockdown: true, color: '#e0b3ff' }),
    gm(`${KI}_ANTI_AIR`, 'HIGH KICK', { startup: 5, active: 4, recovery: 18, damage: 44, reach: 76, launch: 64, knockdown: true, color: '#f0d2ff' })),
  soldier: grunt('soldier', 'RIOT SOLDIER', 'heavy', { hp: 380, speed: .92, power: 1.08, reach: 1.02, colors: ['#26324a', '#141a26', '#9fb3c8'] }, { armor: .3, carries: 'pipe', score: 500 },
    gm(`${S}_JAB`, 'BATON JAB', { button: 'lp', startup: 7, active: 3, recovery: 12, damage: 36, reach: 98, color: '#c9d6e6' }),
    gm(`${S}_SMASH`, 'BATON SMASH', { button: 'hp', startup: 13, active: 4, recovery: 22, damage: 70, reach: 114, level: 'high', color: '#e3edf7' }),
    gm(`${S}_COMBO`, 'BATON COMBO', { startup: 9, active: 9, recovery: 22, damage: 66, reach: 100, multiHit: { hits: 2, interval: 4, perHitScale: .58 }, color: '#d2deeb' }),
    gm(`${S}_MOBILITY`, 'SHIELD CHARGE', { startup: 14, active: 12, recovery: 24, damage: 58, reach: 78, knockdown: true, guardBreak: true, color: '#9fb3c8' }),
    gm(`${S}_ANTI_AIR`, 'BATON RISE', { startup: 7, active: 4, recovery: 22, damage: 50, reach: 74, launch: 58, knockdown: true, color: '#e3edf7' })),
  thrower: grunt('thrower', 'BOTTLE THROWER', 'ranged', { hp: 210, speed: 1, power: .95, reach: 1, colors: ['#e0651f', '#1b1b22', '#e8e8e8'] }, { score: 350 },
    gm(`${T}_SHOVE`, 'SHOVE', { button: 'lp', startup: 6, active: 2, recovery: 10, damage: 24, reach: 78, color: '#ffd0a0' }),
    gm(`${T}_SWING`, 'BOTTLE SWING', { button: 'hp', startup: 9, active: 3, recovery: 16, damage: 46, reach: 92, color: '#7fd26a' }),
    gm(`${T}_BOTTLE`, 'BOTTLE TOSS', { startup: 14, active: 2, recovery: 22, damage: 44, reach: 44, projectile: { speed: 6.8, life: 92, radius: 16 }, color: '#7fd26a' }),
    gm(`${T}_MOBILITY`, 'DUCK RUSH', { startup: 10, active: 8, recovery: 20, damage: 36, reach: 66, knockdown: true, color: '#ffb36b' }),
    gm(`${T}_ANTI_AIR`, 'BOTTLE UP', { startup: 6, active: 4, recovery: 20, damage: 40, reach: 62, launch: 50, knockdown: true, color: '#7fd26a' })),
};

export const GRUNT_KINDS = Object.keys(GRUNTS) as GruntKind[];
const BY_ID = new Map(GRUNT_KINDS.map(kind => [GRUNTS[kind].id, GRUNTS[kind]] as const));

export function isGruntId(id: string): boolean { return BY_ID.has(id); }
export function gruntById(id: string): GruntDef | null { return BY_ID.get(id) ?? null; }
export function gruntSpecialsFor(id: string): GruntSpecialSet | null { return BY_ID.get(id)?.specials ?? null; }

/** Punches/medium buttons map to the light strike, heavy buttons to the heavy strike. */
export function gruntNormalFor(id: string, button: MoveButton): MoveData | null {
  const def = BY_ID.get(id);
  if (!def) return null;
  return button === 'hp' || button === 'hk' ? def.heavy : def.light;
}

/** Grunt CharacterDef with a per-spawn name/tint; the id (and therefore sprites and moves) stays the grunt's own. */
export function gruntCharacter(kind: GruntKind, name?: string, scale = 1): CharacterDef {
  const base = GRUNTS[kind].character;
  return { ...base, name: name ?? base.name, heightScale: base.heightScale * scale, widthScale: base.widthScale * scale };
}

/** AI attack choice for a grunt: each type leans on its signature pattern. */
export function gruntAiAttack(id: string, roll: number, distance: number): MoveData | null {
  const def = BY_ID.get(id);
  if (!def) return null;
  const { primary, mobility } = def.specials;
  switch (def.kind) {
    case 'thrower': return distance > 110 ? primary : roll < .55 ? def.heavy : def.light;
    case 'knife': return distance > 90 && roll < .45 ? mobility : roll < .3 ? primary : roll < .7 ? def.heavy : def.light;
    case 'bruiser': return distance > 96 && roll < .5 ? mobility : roll < .25 ? primary : roll < .65 ? def.heavy : def.light;
    case 'kicker': return distance > 92 && roll < .4 ? mobility : roll < .3 ? primary : roll < .72 ? def.heavy : def.light;
    case 'soldier': return distance > 96 && roll < .35 ? mobility : roll < .3 ? primary : roll < .62 ? def.heavy : def.light;
    default: return roll < .22 ? primary : roll < .6 ? def.heavy : def.light;
  }
}

/** Melee strike range a grunt must close to before swinging (so it never whiffs from its stand-off spot). */
export function gruntStrikeRange(id: string): number | null {
  const def = BY_ID.get(id);
  if (!def || def.kind === 'thrower') return null;
  return Math.min(def.light.hitbox.forward, def.heavy.hitbox.forward) * def.character.reach - 6;
}
