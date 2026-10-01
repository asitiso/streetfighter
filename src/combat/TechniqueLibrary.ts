import type { MoveButton, MoveData } from './CombatTypes.js';
import { combatProfileFor } from './CharacterCombatProfiles.js';

interface CommandDef {
  button: MoveButton;
  label: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  level: 'high' | 'mid' | 'low';
  color: string;
  knockdown?: boolean;
}

interface TargetStepDef {
  from: string;
  button: MoveButton;
  id: string;
  label: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  color: string;
  knockdown?: boolean;
}

const COMMANDS: Readonly<Record<string, CommandDef>> = {
  RYU: { button: 'mp', label: 'COLLARBONE BREAKER', startup: 14, active: 4, recovery: 17, damage: 76, reach: 108, level: 'high', color: '#f4e7ce' },
  KEN: { button: 'mk', label: 'STEP KICK', startup: 9, active: 4, recovery: 13, damage: 78, reach: 126, level: 'mid', color: '#ffb36b' },
  CHUNLI: { button: 'hp', label: 'FORWARD BACKFIST', startup: 10, active: 4, recovery: 15, damage: 82, reach: 148, level: 'mid', color: '#9ed8ff' },
  ALEX: { button: 'hp', label: 'LARIAT PRESS', startup: 13, active: 5, recovery: 21, damage: 114, reach: 132, level: 'high', color: '#e6c078' },
  DUDLEY: { button: 'hk', label: 'DART SHOT', startup: 12, active: 4, recovery: 16, damage: 92, reach: 132, level: 'high', color: '#f0d8aa' },
  MAKOTO: { button: 'hp', label: 'FORWARD KARATE CHOP', startup: 11, active: 4, recovery: 18, damage: 118, reach: 116, level: 'mid', color: '#f2cf70' },
  IBUKI: { button: 'mk', label: 'SPIN HEEL', startup: 8, active: 5, recovery: 13, damage: 70, reach: 120, level: 'high', color: '#d5b58c' },
  YUN: { button: 'hp', label: 'SHOULDER PALM', startup: 8, active: 4, recovery: 13, damage: 84, reach: 130, level: 'mid', color: '#7ed9ff' },
};

const AIR_LABELS: Readonly<Record<string, Partial<Record<MoveButton, string>>>> = {
  RYU: { hp: 'JUMP FIERCE', hk: 'JUMP ROUNDHOUSE', mk: 'JUMP SIDE KICK' },
  KEN: { hp: 'AIR STRAIGHT', hk: 'FLYING ROUNDHOUSE', mk: 'JUMP KNEE' },
  CHUNLI: { hp: 'AIR PALM', hk: 'AIR HEEL', mk: 'FLYING SIDE KICK' },
  ALEX: { hp: 'AIR HAMMER', hk: 'FLYING BIG BOOT', mk: 'JUMP KNEE' },
  DUDLEY: { hp: 'JUMP CROSS', hk: 'AIR SWAY KICK', mk: 'JUMP BODY BLOW' },
  MAKOTO: { hp: 'AIR KARATE FIST', hk: 'FLYING KICK', mk: 'JUMP KNEE' },
  IBUKI: { hp: 'AIR PALM', hk: 'NINJA AXE KICK', mk: 'AIR CROSS KICK' },
  YUN: { hp: 'AIR PALM', hk: 'DIVE ROUNDHOUSE', mk: 'FLYING KICK' },
};

const TARGETS: Readonly<Record<string, readonly TargetStepDef[]>> = {
  RYU: [
    { from: '5MP', button: 'hp', id: 'RYU_TC_SOLAR_FINISH', label: 'SOLAR STRIKE', startup: 5, active: 3, recovery: 14, damage: 74, reach: 106, color: '#ffd36d' },
    { from: '5LK', button: 'mk', id: 'RYU_TC_KICK_FINISH', label: 'DOUBLE KICK', startup: 5, active: 4, recovery: 13, damage: 68, reach: 110, color: '#f3e5c5' },
  ],
  KEN: [
    { from: '5LP', button: 'mp', id: 'KEN_TC_RUSH_2', label: 'RUSH TWO', startup: 3, active: 3, recovery: 8, damage: 46, reach: 82, color: '#ffb55b' },
    { from: 'KEN_TC_RUSH_2', button: 'hp', id: 'KEN_TC_RUSH_3', label: 'RUSH FINISH', startup: 4, active: 4, recovery: 14, damage: 82, reach: 104, color: '#ff8b4f' },
    { from: '5LK', button: 'mk', id: 'KEN_TC_KICK_2', label: 'KICK LINK', startup: 4, active: 3, recovery: 9, damage: 54, reach: 104, color: '#ffd66a' },
    { from: 'KEN_TC_KICK_2', button: 'hk', id: 'KEN_TC_KICK_3', label: 'KICK FINISH', startup: 5, active: 4, recovery: 15, damage: 86, reach: 128, color: '#ff9a58', knockdown: true },
  ],
  CHUNLI: [
    { from: '5MP', button: 'mk', id: 'CHUNLI_TC_FOOT_2', label: 'FOOTSIE LINK', startup: 4, active: 3, recovery: 9, damage: 48, reach: 118, color: '#94d9ff' },
    { from: 'CHUNLI_TC_FOOT_2', button: 'hk', id: 'CHUNLI_TC_FOOT_3', label: 'HEEL FINISH', startup: 5, active: 4, recovery: 13, damage: 76, reach: 142, color: '#c8eeff', knockdown: true },
    { from: '5LK', button: 'hk', id: 'CHUNLI_TC_LOW_HIGH', label: 'LOW-HIGH KICK', startup: 5, active: 4, recovery: 13, damage: 72, reach: 132, color: '#79caff' },
  ],
  ALEX: [
    { from: '5MP', button: 'hp', id: 'ALEX_TC_ELBOW_LARIAT', label: 'ELBOW → LARIAT', startup: 6, active: 4, recovery: 17, damage: 102, reach: 126, color: '#d8b76f' },
    { from: '5MK', button: 'hp', id: 'ALEX_TC_KNEE_SMASH', label: 'KNEE → SMASH', startup: 6, active: 4, recovery: 18, damage: 108, reach: 120, color: '#cfa15e', knockdown: true },
  ],
  DUDLEY: [
    { from: '5LP', button: 'mp', id: 'DUDLEY_TC_ONE_TWO', label: 'ONE-TWO', startup: 3, active: 3, recovery: 7, damage: 44, reach: 86, color: '#f0dfc5' },
    { from: 'DUDLEY_TC_ONE_TWO', button: 'hp', id: 'DUDLEY_TC_ONE_TWO_THREE', label: 'ONE-TWO-CROSS', startup: 4, active: 4, recovery: 12, damage: 84, reach: 108, color: '#f2c985' },
    { from: '5LK', button: 'mk', id: 'DUDLEY_TC_BODY_HOOK', label: 'BODY → HOOK', startup: 4, active: 4, recovery: 11, damage: 70, reach: 98, color: '#e5c69b' },
  ],
  MAKOTO: [
    { from: '5MP', button: 'hp', id: 'MAKOTO_TC_KARATE_FINISH', label: 'KARATE BURST', startup: 5, active: 4, recovery: 15, damage: 104, reach: 108, color: '#f6cf65' },
    { from: '5LK', button: 'hp', id: 'MAKOTO_TC_LOW_BURST', label: 'LOW STEP → FIST', startup: 6, active: 4, recovery: 16, damage: 110, reach: 112, color: '#efb957', knockdown: true },
  ],
  IBUKI: [
    { from: '5LP', button: 'lk', id: 'IBUKI_TC_NINJA_2', label: 'NINJA LINK', startup: 3, active: 3, recovery: 7, damage: 38, reach: 76, color: '#d2ad82' },
    { from: 'IBUKI_TC_NINJA_2', button: 'mk', id: 'IBUKI_TC_NINJA_3', label: 'NINJA TRIPLE', startup: 3, active: 4, recovery: 10, damage: 62, reach: 108, color: '#e5c194' },
    { from: '5MP', button: 'mk', id: 'IBUKI_TC_PALM_KICK', label: 'PALM → KICK', startup: 4, active: 4, recovery: 10, damage: 66, reach: 112, color: '#cfa779' },
    { from: 'IBUKI_TC_PALM_KICK', button: 'hk', id: 'IBUKI_TC_PALM_KICK_FINISH', label: 'NINJA FINISH', startup: 5, active: 4, recovery: 13, damage: 78, reach: 126, color: '#e8d2b2', knockdown: true },
  ],
  YUN: [
    { from: '5LP', button: 'mp', id: 'YUN_TC_CHAIN_2', label: 'CHAIN TWO', startup: 3, active: 3, recovery: 7, damage: 42, reach: 82, color: '#75cfff' },
    { from: 'YUN_TC_CHAIN_2', button: 'hp', id: 'YUN_TC_CHAIN_3', label: 'CHAIN PALM', startup: 4, active: 4, recovery: 10, damage: 72, reach: 112, color: '#8bdcff' },
    { from: '5LK', button: 'mk', id: 'YUN_TC_KICK_2', label: 'CHAIN KICK', startup: 3, active: 3, recovery: 7, damage: 44, reach: 102, color: '#78d8ff' },
    { from: 'YUN_TC_KICK_2', button: 'hp', id: 'YUN_TC_KICK_PALM', label: 'KICK → PALM', startup: 4, active: 4, recovery: 11, damage: 76, reach: 118, color: '#a3e7ff', knockdown: true },
  ],
};

function techniqueMove(
  id: string,
  label: string,
  button: MoveButton,
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  reach: number,
  level: 'high' | 'mid' | 'low',
  color: string,
  technique: 'command' | 'air' | 'target',
  knockdown = false,
): MoveData {
  return {
    id, label, button, kind: 'melee', startup, active, recovery, damage,
    hitStop: damage >= 90 ? 9 : damage >= 60 ? 7 : 5,
    hitStun: Math.max(11, 12 + Math.round(damage / 8)), blockStun: Math.max(7, 7 + Math.round(damage / 12)),
    pushback: 10 + damage * .24, level, knockdown, superGain: Math.max(5, Math.round(damage / 4)),
    hitbox: { forward: reach, back: 8, height: technique === 'air' ? 120 : level === 'low' ? 52 : 96, lane: technique === 'air' ? 42 : 34 },
    cancelIntoSpecial: technique === 'target' || technique === 'command', color, technique,
  };
}

export function commandNormalFor(characterId: string, button: MoveButton, forwardHeld: boolean): MoveData | null {
  if (!forwardHeld) return null;
  const def = COMMANDS[characterId];
  if (!def || def.button !== button) return null;
  const profile = combatProfileFor(characterId);
  return {
    ...techniqueMove(`${characterId}_CMD_${button.toUpperCase()}`, def.label, button, def.startup, def.active, def.recovery, def.damage, def.reach, def.level, def.color, 'command', !!def.knockdown),
    damage: Math.round(def.damage * profile.normalDamage),
    hitbox: { forward: def.reach * profile.normalReach, back: 8, height: def.level === 'low' ? 52 : 98, lane: 36 },
    identityTag: profile.identity,
  };
}

export function airNormalFor(characterId: string, button: MoveButton): MoveData {
  const profile = combatProfileFor(characterId);
  const heavy = button === 'hp' || button === 'hk';
  const medium = button === 'mp' || button === 'mk';
  const kick = button === 'lk' || button === 'mk' || button === 'hk';
  const startup = heavy ? 8 : medium ? 6 : 4;
  const active = heavy ? 5 : medium ? 4 : 3;
  const recovery = heavy ? 14 : medium ? 10 : 8;
  const baseDamage = heavy ? 82 : medium ? 52 : 32;
  const baseReach = heavy ? (kick ? 96 : 80) : medium ? (kick ? 84 : 68) : (kick ? 72 : 56);
  const label = AIR_LABELS[characterId]?.[button] ?? `AIR ${button.toUpperCase()}`;
  return {
    ...techniqueMove(`${characterId}_AIR_${button.toUpperCase()}`, label, button, Math.max(3, startup + profile.startupDelta), active, Math.max(6, Math.round(recovery * profile.recoveryScale)), Math.round(baseDamage * profile.normalDamage), baseReach * profile.normalReach, 'high', heavy ? '#f4d06a' : medium ? '#a9dcff' : '#e8f2ff', 'air', heavy && kick),
    identityTag: profile.identity,
  };
}

export function targetComboFollowUp(characterId: string, currentMoveId: string, button: MoveButton): MoveData | null {
  const route = TARGETS[characterId]?.find((step) => step.from === currentMoveId && step.button === button);
  if (!route) return null;
  const profile = combatProfileFor(characterId);
  return {
    ...techniqueMove(route.id, route.label, route.button, Math.max(2, route.startup + Math.min(0, profile.startupDelta)), route.active, Math.max(6, Math.round(route.recovery * profile.recoveryScale)), Math.round(route.damage * profile.normalDamage), route.reach * profile.normalReach, 'mid', route.color, 'target', !!route.knockdown),
    identityTag: profile.identity,
  };
}

export function techniqueCatalogFor(characterId: string): { command: MoveData | null; air: readonly MoveData[]; targetRoutes: number } {
  const commandDef = COMMANDS[characterId];
  const command = commandDef ? commandNormalFor(characterId, commandDef.button, true) : null;
  const buttons: MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
  return { command, air: buttons.map((button) => airNormalFor(characterId, button)), targetRoutes: TARGETS[characterId]?.length ?? 0 };
}
