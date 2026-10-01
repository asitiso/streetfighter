import type { MoveButton, MoveData, MoveKind } from './CombatTypes.js';
import { combatProfileFor } from './CharacterCombatProfiles.js';

const normal = (id: string, label: string, button: MoveButton, startup: number, active: number, recovery: number, damage: number, reach: number, level: 'high' | 'mid' | 'low', color: string, cancelIntoSpecial = false): MoveData => ({
  id, label, button, kind: 'melee', startup, active, recovery, damage,
  hitStop: button.startsWith('h') ? 9 : button.startsWith('m') ? 7 : 5,
  hitStun: 11 + Math.round(damage / 7), blockStun: 7 + Math.round(damage / 10), pushback: 8 + damage * .25,
  level, superGain: Math.max(5, Math.round(damage / 4)), hitbox: { forward: reach, back: 8, height: level === 'low' ? 50 : 92, lane: 34 },
  cancelIntoSpecial, color,
});

export const BASE_MOVES: readonly MoveData[] = [
  normal('5LP', 'LIGHT PUNCH', 'lp', 4, 2, 7, 34, 62, 'mid', '#e8f2ff', true),
  normal('5MP', 'MEDIUM PUNCH', 'mp', 6, 3, 12, 58, 78, 'mid', '#ffd86a', true),
  normal('5HP', 'HEAVY PUNCH', 'hp', 9, 4, 20, 92, 92, 'high', '#ff7c62', true),
  normal('5LK', 'LIGHT KICK', 'lk', 5, 2, 8, 38, 72, 'low', '#d7f5ff', true),
  normal('5MK', 'MEDIUM KICK', 'mk', 7, 3, 14, 64, 98, 'mid', '#f8cf63', true),
  { ...normal('5HK', 'HEAVY KICK', 'hk', 11, 4, 24, 104, 116, 'high', '#ff665b'), knockdown: true },
];

export const CROUCH_MOVES: readonly MoveData[] = [
  normal('2LP', 'CROUCH LIGHT PUNCH', 'lp', 4, 2, 7, 30, 58, 'mid', '#e8f2ff', true),
  normal('2MP', 'CROUCH MEDIUM PUNCH', 'mp', 6, 3, 12, 54, 75, 'mid', '#ffd86a', true),
  normal('2HP', 'CROUCH HEAVY PUNCH', 'hp', 8, 4, 20, 88, 78, 'high', '#ff7c62', true),
  normal('2LK', 'CROUCH LIGHT KICK', 'lk', 5, 2, 8, 32, 68, 'low', '#d7f5ff', true),
  normal('2MK', 'CROUCH MEDIUM KICK', 'mk', 7, 3, 15, 62, 104, 'low', '#f8cf63', true),
  { ...normal('2HK', 'CROUCH HEAVY KICK', 'hk', 10, 4, 25, 96, 116, 'low', '#ff665b'), knockdown: true },
];

export const THROW_MOVE: MoveData = {
  id: 'THROW', label: 'THROW', kind: 'throw', startup: 3, active: 2, recovery: 20, damage: 120, hitStop: 9,
  hitStun: 18, blockStun: 0, pushback: 56, level: 'throw', knockdown: true, superGain: 12,
  hitbox: { forward: 64, back: 8, height: 100, lane: 28 }, color: '#f5e8c7',
};

const NORMAL_LABELS: Readonly<Record<string, Partial<Record<MoveButton, string>>>> = {
  KEN: { mp: 'RUSH STRAIGHT', hp: 'DRAGON PUNCHER', mk: 'STEP KICK' },
  CHUNLI: { mp: 'PALM STRIKE', hp: 'LONG PALM', mk: 'SIDE KICK', hk: 'HEEL KICK' },
  ALEX: { mp: 'ELBOW', hp: 'LARIAT', mk: 'KNEE', hk: 'BIG BOOT' },
  DUDLEY: { lp: 'JAB', mp: 'STRAIGHT', hp: 'CROSS', lk: 'BODY STEP', mk: 'SWAY HOOK' },
  MAKOTO: { mp: 'KARATE THRUST', hp: 'FIERCE SEICHU', mk: 'STEP KICK' },
  IBUKI: { lp: 'NINJA JAB', mp: 'PALM', mk: 'KICK CHAIN', hk: 'SPIN KICK' },
  YUN: { lp: 'CHAIN JAB', mp: 'CHAIN PALM', mk: 'CHAIN KICK', hp: 'SHOULDER' },
  URIEN: { hp: 'TYRANT SMASH', hk: 'METALLIC KICK' },
  GILL: { hp: 'ELEMENTAL CHOP', hk: 'DIVINE KICK' },
};

function characterNormal(base: MoveData, characterId: string): MoveData {
  const profile = combatProfileFor(characterId);
  const heavy = base.button === 'hp' || base.button === 'hk';
  const light = base.button === 'lp' || base.button === 'lk';
  const startup = Math.max(2, base.startup + profile.startupDelta + (heavy && characterId === 'ALEX' ? 1 : 0));
  const recovery = Math.max(5, Math.round(base.recovery * profile.recoveryScale));
  const damage = Math.max(18, Math.round(base.damage * profile.normalDamage));
  const reach = base.hitbox.forward * profile.normalReach;
  const label = NORMAL_LABELS[characterId]?.[base.button!] ?? base.label;
  return {
    ...base,
    label,
    startup,
    recovery,
    damage,
    hitStop: Math.max(4, Math.round(base.hitStop * (profile.normalDamage > 1.08 ? 1.12 : light ? .94 : 1))),
    hitStun: Math.max(8, Math.round(base.hitStun * (profile.normalDamage > 1.08 ? 1.08 : 1))),
    blockStun: Math.max(5, Math.round(base.blockStun * (profile.recoveryScale < .9 ? .95 : 1))),
    pushback: base.pushback * (profile.normalDamage > 1.08 ? 1.08 : 1),
    superGain: Math.max(4, Math.round(base.superGain * (characterId === 'YUN' ? .9 : 1))),
    hitbox: { ...base.hitbox, forward: reach },
    identityTag: profile.identity,
  };
}

export function throwMoveFor(characterId: string): MoveData {
  const profile = combatProfileFor(characterId);
  return {
    ...THROW_MOVE,
    label: characterId === 'ALEX' ? 'POWER THROW' : characterId === 'DUDLEY' ? 'CLINCH THROW' : characterId === 'MAKOTO' ? 'KARAKUSA THROW' : THROW_MOVE.label,
    damage: Math.round(THROW_MOVE.damage * profile.throwDamage),
    hitbox: { ...THROW_MOVE.hitbox, forward: THROW_MOVE.hitbox.forward * profile.throwReach },
    pushback: THROW_MOVE.pushback * Math.max(1, profile.throwDamage * .92),
    identityTag: profile.identity,
  };
}

interface SpecialOptions {
  id: string;
  label: string;
  kind?: MoveKind;
  startup: number;
  active?: number;
  recovery: number;
  damage: number;
  reach?: number;
  color: string;
  knockdown?: boolean;
  launch?: number;
  projectileSpeed?: number;
  projectileRadius?: number;
  projectileLife?: number;
  projectilePiercing?: boolean;
  projectileCount?: number;
  verticalSpread?: number;
  exCost?: number;
  superCost?: number;
  identityTag?: string;
  guardBreak?: boolean;
  multiHit?: MoveData['multiHit'];
  wallBounce?: boolean;
  groundBounce?: boolean;
  juggleLimit?: number;
  install?: MoveData['install'];
}

function special(options: SpecialOptions): MoveData {
  const kind = options.kind ?? 'melee';
  return {
    id: options.id,
    label: options.label,
    kind,
    startup: options.startup,
    active: options.active ?? (kind === 'projectile' ? 2 : 6),
    recovery: options.recovery,
    damage: options.damage,
    hitStop: options.superCost ? 14 : options.exCost ? 10 : 9,
    hitStun: options.superCost ? 34 : 21,
    blockStun: options.superCost ? 21 : 14,
    pushback: options.superCost ? 72 : options.exCost ? 40 : 32,
    level: kind === 'throw' ? 'throw' : 'mid',
    knockdown: options.knockdown,
    launch: options.launch,
    exCost: options.exCost,
    superCost: options.superCost,
    superGain: options.exCost || options.superCost ? 0 : 16,
    hitbox: { forward: options.reach ?? 105, back: 10, height: options.launch ? 140 : 100, lane: 42 },
    projectile: kind === 'projectile' ? {
      speed: options.projectileSpeed ?? 8.5,
      life: options.projectileLife ?? 120,
      radius: options.projectileRadius ?? 24,
      piercing: options.projectilePiercing,
      count: options.projectileCount,
      verticalSpread: options.verticalSpread,
    } : undefined,
    color: options.color,
    identityTag: options.identityTag,
    guardBreak: options.guardBreak,
    multiHit: options.multiHit,
    wallBounce: options.wallBounce,
    groundBounce: options.groundBounce,
    juggleLimit: options.juggleLimit,
    install: options.install,
  };
}

export interface CharacterSpecialSet {
  primary: MoveData;
  antiAir: MoveData;
  mobility: MoveData;
  exPrimary: MoveData;
  super: MoveData;
}

const SPECIALS: Readonly<Record<string, CharacterSpecialSet>> = {
  RYU: {
    primary: special({ id: 'RYU_PRIMARY', label: 'HADOKEN', kind: 'projectile', startup: 11, recovery: 22, damage: 92, reach: 44, projectileSpeed: 8.5, color: '#65d5ff', identityTag: 'MID-RANGE CONTROL' }),
    antiAir: special({ id: 'RYU_ANTI_AIR', label: 'SHORYUKEN', startup: 5, recovery: 28, damage: 132, reach: 90, knockdown: true, launch: 72, color: '#ffd56c' }),
    mobility: special({ id: 'RYU_MOBILITY', label: 'TATSUMAKI', startup: 8, recovery: 18, damage: 112, reach: 128, knockdown: true, color: '#e9efff' }),
    exPrimary: special({ id: 'RYU_EX_PRIMARY', label: 'EX HADOKEN', kind: 'projectile', startup: 7, recovery: 17, damage: 146, reach: 50, projectileSpeed: 10.5, projectileRadius: 31, knockdown: true, exCost: 25, color: '#ffe25c' }),
    super: special({ id: 'RYU_SUPER', label: 'SHINKU HADOKEN', kind: 'projectile', startup: 3, recovery: 30, damage: 285, reach: 76, projectileSpeed: 13, projectileRadius: 48, knockdown: true, superCost: 100, color: '#fff06b' }),
  },
  KEN: {
    primary: special({ id: 'KEN_PRIMARY', label: 'QUICK HADOKEN', kind: 'projectile', startup: 9, recovery: 20, damage: 82, reach: 42, projectileSpeed: 9.6, color: '#70c9ff' }),
    antiAir: special({ id: 'KEN_ANTI_AIR', label: 'FIERY SHORYUKEN', startup: 4, active: 8, recovery: 25, damage: 142, reach: 94, knockdown: true, launch: 82, color: '#ff9b4a' }),
    mobility: special({ id: 'KEN_MOBILITY', label: 'RUSH TATSUMAKI', startup: 6, active: 10, recovery: 15, damage: 108, reach: 150, knockdown: true, multiHit: { hits: 3, interval: 3, perHitScale: .37 }, color: '#ffd67a' }),
    exPrimary: special({ id: 'KEN_EX_PRIMARY', label: 'EX HADOKEN', kind: 'projectile', startup: 5, recovery: 15, damage: 132, reach: 48, projectileSpeed: 12, projectileRadius: 29, knockdown: true, exCost: 25, color: '#fff06b' }),
    super: special({ id: 'KEN_SUPER', label: 'SHIPPU JINRAI KYAKU', startup: 2, active: 12, recovery: 24, damage: 276, reach: 210, knockdown: true, superCost: 100, color: '#ffb44f' }),
  },
  CHUNLI: {
    primary: special({ id: 'CHUNLI_PRIMARY', label: 'KIKOKEN', kind: 'projectile', startup: 10, recovery: 19, damage: 76, reach: 44, projectileSpeed: 8.2, projectileRadius: 23, color: '#86e3ff' }),
    antiAir: special({ id: 'CHUNLI_ANTI_AIR', label: 'TENSYO KYAKU', startup: 5, active: 9, recovery: 22, damage: 118, reach: 100, knockdown: true, launch: 68, color: '#b8f0ff' }),
    mobility: special({ id: 'CHUNLI_MOBILITY', label: 'SPINNING BIRD KICK', startup: 7, active: 10, recovery: 17, damage: 112, reach: 160, knockdown: true, color: '#d6e4ff' }),
    exPrimary: special({ id: 'CHUNLI_EX_PRIMARY', label: 'EX KIKOKEN', kind: 'projectile', startup: 6, recovery: 14, damage: 128, reach: 48, projectileSpeed: 11.2, projectileRadius: 28, knockdown: true, exCost: 25, color: '#eaff74' }),
    super: special({ id: 'CHUNLI_SUPER', label: 'HOUYOKUSEN', startup: 2, active: 14, recovery: 22, damage: 265, reach: 220, knockdown: true, superCost: 100, color: '#fff27a' }),
  },
  ALEX: {
    primary: special({ id: 'ALEX_PRIMARY', label: 'FLASH CHOP', startup: 10, active: 6, recovery: 21, damage: 128, reach: 132, knockdown: false, color: '#9df0b8' }),
    antiAir: special({ id: 'ALEX_ANTI_AIR', label: 'AIR KNEE SMASH', startup: 6, active: 7, recovery: 30, damage: 164, reach: 96, knockdown: true, launch: 78, color: '#d5f2a2' }),
    mobility: special({ id: 'ALEX_MOBILITY', label: 'SLASH ELBOW', startup: 10, active: 7, recovery: 22, damage: 152, reach: 160, knockdown: true, color: '#d7e1bf' }),
    exPrimary: special({ id: 'ALEX_EX_PRIMARY', label: 'EX FLASH CHOP', startup: 7, active: 7, recovery: 17, damage: 192, reach: 154, knockdown: true, exCost: 25, color: '#f3e35d' }),
    super: special({ id: 'ALEX_SUPER', label: 'HYPER BOMB', startup: 3, active: 5, recovery: 34, damage: 336, reach: 92, knockdown: true, superCost: 100, color: '#ffd96a' }),
  },
  DUDLEY: {
    primary: special({ id: 'DUDLEY_PRIMARY', label: 'MACHINE GUN BLOW', startup: 6, active: 11, recovery: 15, damage: 104, reach: 138, multiHit: { hits: 3, interval: 3, perHitScale: .38 }, color: '#f3d8a0' }),
    antiAir: special({ id: 'DUDLEY_ANTI_AIR', label: 'JET UPPER', startup: 4, active: 6, recovery: 23, damage: 138, reach: 88, knockdown: true, launch: 72, color: '#ffe0a4' }),
    mobility: special({ id: 'DUDLEY_MOBILITY', label: 'DUCKING STRAIGHT', startup: 5, active: 7, recovery: 14, damage: 116, reach: 158, color: '#f8e6c3' }),
    exPrimary: special({ id: 'DUDLEY_EX_PRIMARY', label: 'EX MACHINE GUN BLOW', startup: 4, active: 14, recovery: 12, damage: 164, reach: 164, knockdown: true, multiHit: { hits: 5, interval: 2, perHitScale: .23 }, exCost: 25, color: '#ffe35e' }),
    super: special({ id: 'DUDLEY_SUPER', label: 'CORKSCREW BLOW', startup: 2, active: 11, recovery: 22, damage: 292, reach: 202, knockdown: true, superCost: 100, color: '#ffd96f' }),
  },
  MAKOTO: {
    primary: special({ id: 'MAKOTO_PRIMARY', label: 'HAYATE', startup: 9, active: 5, recovery: 18, damage: 146, reach: 150, knockdown: false, color: '#f1d067' }),
    antiAir: special({ id: 'MAKOTO_ANTI_AIR', label: 'FUKIAGE', startup: 5, active: 5, recovery: 27, damage: 174, reach: 84, knockdown: true, launch: 88, color: '#ffe185' }),
    mobility: special({ id: 'MAKOTO_MOBILITY', label: 'TSURUGI', startup: 8, active: 6, recovery: 19, damage: 148, reach: 148, knockdown: true, color: '#f1eee1' }),
    exPrimary: special({ id: 'MAKOTO_EX_PRIMARY', label: 'EX HAYATE', startup: 5, active: 6, recovery: 13, damage: 214, reach: 178, knockdown: true, exCost: 25, color: '#ffe45f' }),
    super: special({ id: 'MAKOTO_SUPER', label: 'SEICHUSEN GODANZUKI', startup: 3, active: 9, recovery: 30, damage: 342, reach: 188, knockdown: true, superCost: 100, color: '#fff078' }),
  },
  IBUKI: {
    primary: special({ id: 'IBUKI_PRIMARY', label: 'KUNAI', kind: 'projectile', startup: 7, recovery: 15, damage: 72, reach: 40, projectileSpeed: 11.5, projectileRadius: 17, color: '#d8c5a7' }),
    antiAir: special({ id: 'IBUKI_ANTI_AIR', label: 'KAZEKIRI', startup: 4, active: 7, recovery: 20, damage: 116, reach: 96, knockdown: true, launch: 76, color: '#efddb9' }),
    mobility: special({ id: 'IBUKI_MOBILITY', label: 'TSUMUJI', startup: 5, active: 11, recovery: 13, damage: 98, reach: 170, knockdown: true, multiHit: { hits: 3, interval: 3, perHitScale: .37 }, color: '#ede5d9' }),
    exPrimary: special({ id: 'IBUKI_EX_PRIMARY', label: 'EX KUNAI', kind: 'projectile', startup: 4, recovery: 11, damage: 128, reach: 42, projectileSpeed: 14, projectileRadius: 22, projectileCount: 2, verticalSpread: 24, knockdown: true, exCost: 25, color: '#fff06a' }),
    super: special({ id: 'IBUKI_SUPER', label: 'KASUMI SUZAKU', kind: 'projectile', startup: 2, recovery: 22, damage: 218, reach: 60, projectileSpeed: 14.5, projectileRadius: 20, projectileCount: 4, verticalSpread: 28, knockdown: true, superCost: 100, color: '#fff282' }),
  },
  YUN: {
    primary: special({ id: 'YUN_PRIMARY', label: 'PALM RUSH', startup: 6, active: 5, recovery: 13, damage: 86, reach: 126, color: '#6bc7f5' }),
    antiAir: special({ id: 'YUN_ANTI_AIR', label: 'NISHOKYAKU', startup: 4, active: 8, recovery: 19, damage: 118, reach: 102, knockdown: true, launch: 74, color: '#a4e6ff' }),
    mobility: special({ id: 'YUN_MOBILITY', label: 'TETSUZANKO', startup: 5, active: 7, recovery: 12, damage: 108, reach: 174, knockdown: true, color: '#e6ecf2' }),
    exPrimary: special({ id: 'YUN_EX_PRIMARY', label: 'EX PALM RUSH', startup: 3, active: 8, recovery: 10, damage: 148, reach: 158, knockdown: true, exCost: 25, color: '#ffe85e' }),
    super: special({ id: 'YUN_SUPER', label: 'GENEI JIN', startup: 1, active: 16, recovery: 16, damage: 248, reach: 230, knockdown: true, superCost: 100, color: '#fff173' }),
  },
  URIEN: {
    primary: special({ id: 'URIEN_PRIMARY', label: 'METALLIC SPHERE', kind: 'projectile', startup: 10, recovery: 20, damage: 112, reach: 46, projectileSpeed: 8.8, projectileRadius: 29, color: '#b8c8ff' }),
    antiAir: special({ id: 'URIEN_ANTI_AIR', label: 'DANGER KNEE', startup: 5, active: 8, recovery: 25, damage: 156, reach: 104, knockdown: true, launch: 84, color: '#d2dcff' }),
    mobility: special({ id: 'URIEN_MOBILITY', label: 'CHARGING TACKLE', startup: 6, active: 8, recovery: 18, damage: 148, reach: 178, knockdown: true, color: '#e3e8f2' }),
    exPrimary: special({ id: 'URIEN_EX_PRIMARY', label: 'EX METALLIC SPHERE', kind: 'projectile', startup: 6, recovery: 15, damage: 174, reach: 50, projectileSpeed: 11.6, projectileRadius: 35, knockdown: true, exCost: 25, color: '#ffe85f' }),
    super: special({ id: 'URIEN_SUPER', label: 'AEGIS REFLECTOR', kind: 'projectile', startup: 4, recovery: 24, damage: 190, reach: 72, projectileSpeed: .08, projectileRadius: 54, projectileLife: 180, projectilePiercing: true, knockdown: true, superCost: 100, color: '#d7a8ff' }),
  },
  GILL: {
    primary: special({ id: 'GILL_PRIMARY', label: 'PYRO SPHERE', kind: 'projectile', startup: 8, recovery: 18, damage: 128, reach: 52, projectileSpeed: 9.4, projectileRadius: 31, color: '#ff8a55' }),
    antiAir: special({ id: 'GILL_ANTI_AIR', label: 'CYRO UPPER', startup: 4, active: 9, recovery: 22, damage: 174, reach: 108, knockdown: true, launch: 92, color: '#83c9ff' }),
    mobility: special({ id: 'GILL_MOBILITY', label: 'LARIAT RUSH', startup: 5, active: 10, recovery: 16, damage: 164, reach: 190, knockdown: true, color: '#f2e4dc' }),
    exPrimary: special({ id: 'GILL_EX_PRIMARY', label: 'EX ELEMENTAL SPHERE', kind: 'projectile', startup: 5, recovery: 13, damage: 196, reach: 56, projectileSpeed: 12.4, projectileRadius: 38, projectileCount: 2, verticalSpread: 36, knockdown: true, exCost: 25, color: '#ffd966' }),
    super: special({ id: 'GILL_SUPER', label: 'SERAPHIC STORM', kind: 'projectile', startup: 2, recovery: 28, damage: 246, reach: 82, projectileSpeed: 10.8, projectileRadius: 46, projectileCount: 3, verticalSpread: 48, projectilePiercing: true, knockdown: true, superCost: 100, color: '#fff08a' }),
  },
};



const SUPER_ARTS: Readonly<Record<string, readonly [MoveData, MoveData, MoveData]>> = {
  RYU: [
    special({ id: 'RYU_SA1', label: 'SHINKU HADOKEN', kind: 'projectile', startup: 3, recovery: 28, damage: 285, reach: 78, projectileSpeed: 13.5, projectileRadius: 48, projectilePiercing: true, knockdown: true, superCost: 88, color: '#fff06b' }),
    special({ id: 'RYU_SA2', label: 'SHIN SHORYUKEN', startup: 2, active: 9, recovery: 38, damage: 390, reach: 92, knockdown: true, launch: 105, wallBounce: true, superCost: 120, color: '#ffcf5b' }),
    special({ id: 'RYU_SA3', label: 'DENJIN HADOKEN', kind: 'projectile', startup: 7, recovery: 30, damage: 252, reach: 80, projectileSpeed: 9.2, projectileRadius: 56, projectilePiercing: true, knockdown: true, superCost: 104, color: '#f7f1ff', guardBreak: true }),
  ],
  KEN: [
    special({ id: 'KEN_SA1', label: 'SHORYU REPPA', startup: 2, active: 13, recovery: 28, damage: 302, reach: 138, knockdown: true, launch: 76, multiHit: { hits: 3, interval: 3, perHitScale: .36 }, superCost: 88, color: '#ffb04c' }),
    special({ id: 'KEN_SA2', label: 'SHINRYUKEN', startup: 2, active: 17, recovery: 36, damage: 368, reach: 112, knockdown: true, launch: 118, multiHit: { hits: 5, interval: 3, perHitScale: .23 }, wallBounce: true, superCost: 120, color: '#ff7a3f' }),
    special({ id: 'KEN_SA3', label: 'SHIPPU JINRAI KYAKU', startup: 1, active: 16, recovery: 21, damage: 278, reach: 226, knockdown: true, multiHit: { hits: 6, interval: 2, perHitScale: .19 }, superCost: 104, color: '#ffe06d' }),
  ],
  CHUNLI: [
    special({ id: 'CHUNLI_SA1', label: 'KIKOSHO', kind: 'projectile', startup: 3, recovery: 25, damage: 248, reach: 58, projectileSpeed: 1.1, projectileRadius: 70, projectileLife: 42, projectilePiercing: true, knockdown: true, superCost: 88, color: '#9ff4ff' }),
    special({ id: 'CHUNLI_SA2', label: 'HOUYOKUSEN', startup: 1, active: 18, recovery: 20, damage: 270, reach: 238, knockdown: true, multiHit: { hits: 7, interval: 2, perHitScale: .17 }, superCost: 120, color: '#fff27a' }),
    special({ id: 'CHUNLI_SA3', label: 'TENSEI RANKA', startup: 2, active: 13, recovery: 27, damage: 308, reach: 122, knockdown: true, launch: 112, superCost: 104, color: '#c8f0ff' }),
  ],
  ALEX: [
    special({ id: 'ALEX_SA1', label: 'HYPER BOMB', kind: 'throw', startup: 2, active: 4, recovery: 36, damage: 356, reach: 86, knockdown: true, groundBounce: true, superCost: 88, color: '#ffd96a' }),
    special({ id: 'ALEX_SA2', label: 'BOOMERANG RAID', startup: 4, active: 16, recovery: 29, damage: 330, reach: 224, knockdown: true, multiHit: { hits: 4, interval: 3, perHitScale: .29 }, wallBounce: true, superCost: 120, color: '#e8e39b' }),
    special({ id: 'ALEX_SA3', label: 'STUN GUN HEADBUTT', kind: 'throw', startup: 5, active: 6, recovery: 30, damage: 292, reach: 124, knockdown: true, launch: 68, superCost: 104, color: '#fff0a0', guardBreak: true }),
  ],
  DUDLEY: [
    special({ id: 'DUDLEY_SA1', label: 'ROCKET UPPERCUT', startup: 2, active: 12, recovery: 25, damage: 300, reach: 128, knockdown: true, launch: 98, superCost: 88, color: '#ffe0a4' }),
    special({ id: 'DUDLEY_SA2', label: 'ROLLING THUNDER', startup: 3, active: 19, recovery: 26, damage: 348, reach: 248, knockdown: true, multiHit: { hits: 7, interval: 2, perHitScale: .17 }, superCost: 120, color: '#f4d6ab' }),
    special({ id: 'DUDLEY_SA3', label: 'CORKSCREW BLOW', startup: 1, active: 11, recovery: 20, damage: 294, reach: 208, knockdown: true, superCost: 104, color: '#ffd96f' }),
  ],
  MAKOTO: [
    special({ id: 'MAKOTO_SA1', label: 'SEICHUSEN GODANZUKI', startup: 2, active: 11, recovery: 29, damage: 352, reach: 192, knockdown: true, multiHit: { hits: 5, interval: 2, perHitScale: .23 }, wallBounce: true, superCost: 88, color: '#fff078' }),
    special({ id: 'MAKOTO_SA2', label: 'ABARE TOSANAMI', startup: 3, active: 17, recovery: 31, damage: 382, reach: 220, knockdown: true, launch: 86, multiHit: { hits: 6, interval: 2, perHitScale: .2 }, groundBounce: true, superCost: 120, color: '#ffd45f' }),
    special({ id: 'MAKOTO_SA3', label: 'TANDEN RENKI', startup: 5, active: 1, recovery: 18, damage: 0, reach: 20, superCost: 104, color: '#ff9f6b', install: { duration: 600, powerScale: 1.28, frameScale: .96, moveScale: 1.08, label: 'TANDEN RENKI' } }),
  ],
  IBUKI: [
    special({ id: 'IBUKI_SA1', label: 'KASUMI SUZAKU', kind: 'projectile', startup: 2, recovery: 20, damage: 228, reach: 60, projectileSpeed: 14.8, projectileRadius: 20, projectileCount: 5, verticalSpread: 28, knockdown: true, superCost: 88, color: '#fff282' }),
    special({ id: 'IBUKI_SA2', label: 'YOROI DOROSHI', kind: 'throw', startup: 2, active: 4, recovery: 27, damage: 334, reach: 82, knockdown: true, superCost: 120, color: '#f5d9b2', guardBreak: true }),
    special({ id: 'IBUKI_SA3', label: 'HASHIN SHO', startup: 1, active: 15, recovery: 20, damage: 276, reach: 214, knockdown: true, multiHit: { hits: 5, interval: 2, perHitScale: .23 }, wallBounce: true, superCost: 104, color: '#f0e8cf' }),
  ],
  YUN: [
    special({ id: 'YUN_SA1', label: 'YOU HOU', startup: 2, active: 13, recovery: 22, damage: 286, reach: 188, knockdown: true, launch: 66, multiHit: { hits: 4, interval: 3, perHitScale: .29 }, superCost: 88, color: '#97e6ff' }),
    special({ id: 'YUN_SA2', label: 'SOURAI RENGEKI', startup: 2, active: 18, recovery: 25, damage: 332, reach: 242, knockdown: true, multiHit: { hits: 7, interval: 2, perHitScale: .17 }, wallBounce: true, superCost: 120, color: '#7ed6ff' }),
    special({ id: 'YUN_SA3', label: 'GENEI JIN', startup: 3, active: 1, recovery: 12, damage: 0, reach: 20, superCost: 104, color: '#fff173', install: { duration: 720, powerScale: .94, frameScale: .68, moveScale: 1.18, label: 'GENEI JIN' } }),
  ],
};

const SUPER_PRESENTATIONS: Readonly<Record<string, readonly [MoveData['superPresentation'], MoveData['superPresentation'], MoveData['superPresentation']]>> = {
  RYU: [
    { motif: 'wave', accent: '#70ddff', freezeFrames: 9 }, { motif: 'uppercut', accent: '#ff7a4e', freezeFrames: 11 }, { motif: 'electric', accent: '#d8c7ff', freezeFrames: 12 },
  ],
  KEN: [
    { motif: 'uppercut', accent: '#ff9b48', freezeFrames: 9 }, { motif: 'flame', accent: '#ff5b37', freezeFrames: 12 }, { motif: 'rush', accent: '#ffd85d', freezeFrames: 8 },
  ],
  CHUNLI: [
    { motif: 'burst', accent: '#91f1ff', freezeFrames: 9 }, { motif: 'rush', accent: '#f8ec72', freezeFrames: 8 }, { motif: 'aerial', accent: '#b9eaff', freezeFrames: 10 },
  ],
  ALEX: [
    { motif: 'throw', accent: '#ffcf63', freezeFrames: 11 }, { motif: 'rush', accent: '#e2dc86', freezeFrames: 10 }, { motif: 'leap', accent: '#ffe492', freezeFrames: 10 },
  ],
  DUDLEY: [
    { motif: 'uppercut', accent: '#ffe0a4', freezeFrames: 9 }, { motif: 'barrage', accent: '#f2c68d', freezeFrames: 10 }, { motif: 'spiral', accent: '#ffd25f', freezeFrames: 9 },
  ],
  MAKOTO: [
    { motif: 'punch', accent: '#fff078', freezeFrames: 10 }, { motif: 'rush', accent: '#ffc956', freezeFrames: 11 }, { motif: 'install', accent: '#ff8c5c', freezeFrames: 12 },
  ],
  IBUKI: [
    { motif: 'kunai', accent: '#fff282', freezeFrames: 8 }, { motif: 'throw', accent: '#efcfaa', freezeFrames: 11 }, { motif: 'rush', accent: '#eadfc2', freezeFrames: 9 },
  ],
  YUN: [
    { motif: 'launch', accent: '#8ee6ff', freezeFrames: 9 }, { motif: 'rush', accent: '#72d3ff', freezeFrames: 10 }, { motif: 'install', accent: '#fff06e', freezeFrames: 11 },
  ],
};

export function superArtMoveFor(characterId: string, artId: 1 | 2 | 3, gaugeCost?: number): MoveData {
  const list = SUPER_ARTS[characterId] ?? SUPER_ARTS.RYU!;
  const move = list[artId - 1] ?? list[0]!;
  const presentation = (SUPER_PRESENTATIONS[characterId] ?? SUPER_PRESENTATIONS.RYU!)[artId - 1];
  const withPresentation = presentation ? { ...move, superPresentation: presentation } : move;
  return gaugeCost && withPresentation.superCost !== gaugeCost ? { ...withPresentation, superCost: gaugeCost } : withPresentation;
}

export function specialMovesFor(characterId: string): CharacterSpecialSet {
  return SPECIALS[characterId] ?? SPECIALS.RYU!;
}

export const SPECIAL_MOVES: readonly MoveData[] = Object.values(SPECIALS.RYU!);

export function normalFor(button: MoveButton, crouching = false, characterId?: string): MoveData {
  const list = crouching ? CROUCH_MOVES : BASE_MOVES;
  const base = list.find((move) => move.button === button) ?? list[0]!;
  return characterId ? characterNormal(base, characterId) : base;
}
