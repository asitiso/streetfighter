import type { Fighter } from '../combat/Fighter.js';
import { motionPolishProfile } from './MotionPolishProfiles.js';
import { signatureMoveProfile } from './SignatureMoveProfiles.js';

export type AttackSpriteFamily = 'normal' | 'special' | 'super' | 'throw';
export type AttackSpritePhase = 'startup' | 'contact' | 'follow-through' | 'recovery';

export const ATTACK_ATLAS_FRAME_WIDTH = 192;
export const ATTACK_ATLAS_FRAME_HEIGHT = 224;
export const ATTACK_ATLAS_FRAMES = 5;

const FAMILY_ROW: Readonly<Record<AttackSpriteFamily, number>> = {
  normal: 0,
  special: 1,
  super: 2,
  throw: 3,
};

const PLAYABLE = new Set(['RYU', 'KEN', 'CHUNLI', 'ALEX', 'DUDLEY', 'MAKOTO', 'IBUKI', 'YUN']);

export interface AttackSpriteSample {
  useAtlas: boolean;
  family: AttackSpriteFamily;
  phase: AttackSpritePhase;
  row: number;
  frame: number;
  progress: number;
  phaseProgress: number;
  alpha: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  smear: number;
  afterimage: number;
}

function familyFor(fighter: Fighter): AttackSpriteFamily {
  const move = fighter.currentMove;
  if (!move) return 'normal';
  if (move.superCost) return 'super';
  if (move.kind === 'throw' || move.level === 'throw') return 'throw';
  if (move.button) return 'normal';
  return 'special';
}

export function attackSpriteEnabledFor(characterId: string): boolean {
  return PLAYABLE.has(characterId);
}

export function attackSpriteSample(fighter: Fighter): AttackSpriteSample {
  const family = familyFor(fighter);
  const polish = motionPolishProfile(fighter.character.id);
  const signature = signatureMoveProfile(fighter.character.id);
  const disabled: AttackSpriteSample = {
    useAtlas: false, family, phase: 'startup', row: FAMILY_ROW[family], frame: 0, progress: 0, phaseProgress: 0,
    alpha: 1, offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, smear: 0, afterimage: 0,
  };
  if (!attackSpriteEnabledFor(fighter.character.id) || fighter.state !== 'attack' || !fighter.currentMove) return disabled;
  if (fighter.airborne || fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0) return disabled;

  const move = fighter.currentMove;
  const total = Math.max(1, move.startup + move.active + move.recovery);
  const progress = Math.max(0, Math.min(1, fighter.moveFrame / Math.max(1, total - 1)));
  const activeStart = move.startup;
  const activeEnd = move.startup + Math.max(1, move.active) - 1;
  const followFrames = Math.max(2, Math.round(move.recovery * (.32 + signature.followThrough * .08)));
  const contactPadding = Math.max(0, Math.round((move.superCost ? 2 : family === 'special' ? 1 : 0) * signature.contactPad));

  let phase: AttackSpritePhase;
  let phaseProgress = 0;
  if (fighter.moveFrame < activeStart) {
    phase = 'startup';
    phaseProgress = activeStart <= 1 ? 1 : fighter.moveFrame / Math.max(1, activeStart - 1);
  } else if (fighter.moveFrame <= activeEnd) {
    phase = 'contact';
    phaseProgress = (fighter.moveFrame - activeStart) / Math.max(1, activeEnd - activeStart + 1);
  } else if (fighter.moveFrame <= activeEnd + followFrames) {
    phase = 'follow-through';
    phaseProgress = (fighter.moveFrame - activeEnd - 1) / Math.max(1, followFrames - 1);
  } else {
    phase = 'recovery';
    phaseProgress = (fighter.moveFrame - activeEnd - followFrames - 1) / Math.max(1, move.recovery - followFrames - 1);
  }
  phaseProgress = Math.max(0, Math.min(1, phaseProgress));

  // Active/contact remains articulated so the exact move silhouette, multi-hit timing and hitbox readability stay intact.
  if (fighter.moveFrame >= activeStart - contactPadding && fighter.moveFrame <= activeEnd + contactPadding) {
    return { ...disabled, phase: 'contact', progress, phaseProgress };
  }

  let frame = 0;
  const startupA = Math.max(.2, Math.min(.48, .34 / signature.startupBias));
  const startupB = Math.max(startupA + .12, Math.min(.88, .72 / signature.startupBias));
  const followSplit = Math.max(.32, Math.min(.68, .5 / signature.followThrough));
  const recoveryA = Math.max(.38, Math.min(.72, .55 * signature.recoverySnap));
  const recoveryB = Math.max(recoveryA + .12, Math.min(.94, .86 * signature.recoverySnap));
  if (phase === 'startup') frame = phaseProgress < startupA ? 0 : phaseProgress < startupB ? 1 : 2;
  else if (phase === 'follow-through') frame = phaseProgress < followSplit ? 3 : 4;
  else frame = phaseProgress < recoveryA ? 4 : phaseProgress < recoveryB ? 3 : 1;

  const anticip = phase === 'startup' ? Math.sin(phaseProgress * Math.PI) : 0;
  const settle = phase === 'recovery' ? 1 - phaseProgress : 0;
  const follow = phase === 'follow-through' ? Math.sin(phaseProgress * Math.PI) : 0;
  const familyDrive = family === 'super' ? 1.42 : family === 'special' ? 1.18 : family === 'throw' ? .92 : 1;
  const drive = familyDrive * polish.torsoTwist * signature.arcSpan;
  const offsetX = fighter.facing * ((anticip * (-7 * signature.startupBias) + follow * (9 * signature.followThrough) + settle * (3 * signature.recoverySnap)) * polish.lean);
  const offsetY = anticip * (2.5 * signature.arcLift) - follow * (1.6 * signature.followThrough);
  const rotation = fighter.facing * ((anticip * (-.035 * signature.startupBias) + follow * (.045 * signature.followThrough) - settle * (.018 * signature.recoverySnap)) * polish.torsoTwist);
  const scaleX = 1 + anticip * .025 * polish.dashStretch * signature.startupBias + follow * .018 * signature.followThrough;
  const scaleY = 1 - anticip * .016 + settle * .01 * signature.recoverySnap;
  const smear = Math.max(0, (anticip * .45 + follow * .72) * drive * signature.trailDensity);
  const afterimage = Math.max(0, (family === 'super' ? .6 : family === 'special' ? .38 : .22) * polish.afterimage * signature.echo * (phase === 'follow-through' ? 1 : anticip * .65));
  const alpha = phase === 'recovery' ? .9 + phaseProgress * .1 : .96;

  return {
    useAtlas: true,
    family,
    phase,
    row: FAMILY_ROW[family],
    frame: Math.max(0, Math.min(ATTACK_ATLAS_FRAMES - 1, frame)),
    progress,
    phaseProgress,
    alpha,
    offsetX,
    offsetY,
    rotation,
    scaleX,
    scaleY,
    smear,
    afterimage,
  };
}
