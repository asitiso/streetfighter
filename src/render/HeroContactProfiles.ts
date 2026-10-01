import type { Fighter } from '../combat/Fighter.js';

export type HeroContactStyle = 'wave' | 'uppercut' | 'spin' | 'rush' | 'kickstorm' | 'crush' | 'barrage' | 'palm';

export interface HeroContactProfile {
  style: HeroContactStyle;
  leadFrames: number;
  releaseFrames: number;
  bodyDrive: number;
  bodyLift: number;
  bodyRotate: number;
  stretchX: number;
  stretchY: number;
  ringScale: number;
  streaks: number;
  echo: number;
  chroma: number;
}

export interface HeroContactSample {
  active: boolean;
  phase: 'lead' | 'impact' | 'release' | 'none';
  intensity: number;
  phaseProgress: number;
  profile: HeroContactProfile | null;
}

const HERO_MOVES: Readonly<Record<string, HeroContactProfile>> = {
  RYU_PRIMARY:   { style:'wave',     leadFrames:4, releaseFrames:5, bodyDrive:5, bodyLift:0,  bodyRotate:.010, stretchX:1.018, stretchY:.994, ringScale:1.0, streaks:5, echo:.75, chroma:.92 },
  RYU_ANTI_AIR:  { style:'uppercut', leadFrames:3, releaseFrames:6, bodyDrive:4, bodyLift:8,  bodyRotate:.050, stretchX:1.015, stretchY:1.035, ringScale:1.0, streaks:6, echo:.82, chroma:.96 },
  RYU_SA2:       { style:'uppercut', leadFrames:2, releaseFrames:8, bodyDrive:8, bodyLift:12, bodyRotate:.075, stretchX:1.030, stretchY:1.055, ringScale:1.35,streaks:9, echo:1.12,chroma:1.18 },

  KEN_ANTI_AIR:  { style:'uppercut', leadFrames:3, releaseFrames:6, bodyDrive:7, bodyLift:10, bodyRotate:.065, stretchX:1.025, stretchY:1.050, ringScale:1.08,streaks:7, echo:1.00,chroma:1.10 },
  KEN_MOBILITY:  { style:'spin',     leadFrames:3, releaseFrames:7, bodyDrive:8, bodyLift:1,  bodyRotate:.085, stretchX:1.040, stretchY:.985, ringScale:1.05,streaks:8, echo:1.18,chroma:1.04 },
  KEN_SA3:       { style:'kickstorm',leadFrames:2, releaseFrames:8, bodyDrive:12,bodyLift:2,  bodyRotate:.070, stretchX:1.055, stretchY:.978, ringScale:1.25,streaks:11,echo:1.24,chroma:1.16 },

  CHUNLI_MOBILITY:{style:'spin',     leadFrames:3, releaseFrames:6, bodyDrive:6, bodyLift:3,  bodyRotate:.075, stretchX:1.025, stretchY:.986, ringScale:1.08,streaks:8, echo:1.16,chroma:1.02 },
  CHUNLI_SA2:    { style:'kickstorm',leadFrames:2, releaseFrames:8, bodyDrive:10,bodyLift:4,  bodyRotate:.060, stretchX:1.040, stretchY:.980, ringScale:1.24,streaks:12,echo:1.28,chroma:1.14 },

  ALEX_PRIMARY:  { style:'crush',    leadFrames:4, releaseFrames:8, bodyDrive:12,bodyLift:-1, bodyRotate:.055, stretchX:1.060, stretchY:.965, ringScale:1.15,streaks:5, echo:.62, chroma:.96 },
  ALEX_SUPER:    { style:'crush',    leadFrames:2, releaseFrames:10,bodyDrive:14,bodyLift:1,  bodyRotate:.070, stretchX:1.075, stretchY:.950, ringScale:1.42,streaks:8, echo:.76, chroma:1.12 },

  DUDLEY_PRIMARY:{ style:'barrage',  leadFrames:3, releaseFrames:7, bodyDrive:9, bodyLift:0,  bodyRotate:.040, stretchX:1.045, stretchY:.982, ringScale:1.0, streaks:9, echo:.94, chroma:.98 },
  DUDLEY_SA3:    { style:'barrage',  leadFrames:2, releaseFrames:8, bodyDrive:13,bodyLift:-1, bodyRotate:.055, stretchX:1.060, stretchY:.975, ringScale:1.28,streaks:12,echo:1.08,chroma:1.12 },

  MAKOTO_PRIMARY:{ style:'rush',     leadFrames:4, releaseFrames:7, bodyDrive:14,bodyLift:0,  bodyRotate:.045, stretchX:1.065, stretchY:.968, ringScale:1.04,streaks:7, echo:.92, chroma:1.00 },
  MAKOTO_SA1:    { style:'rush',     leadFrames:2, releaseFrames:9, bodyDrive:17,bodyLift:1,  bodyRotate:.060, stretchX:1.080, stretchY:.958, ringScale:1.32,streaks:10,echo:1.02,chroma:1.18 },

  IBUKI_MOBILITY:{style:'spin',     leadFrames:2, releaseFrames:5, bodyDrive:10,bodyLift:3,  bodyRotate:.095, stretchX:1.050, stretchY:.978, ringScale:1.02,streaks:9, echo:1.30,chroma:.96 },
  IBUKI_SA3:     { style:'rush',     leadFrames:1, releaseFrames:7, bodyDrive:14,bodyLift:2,  bodyRotate:.070, stretchX:1.070, stretchY:.968, ringScale:1.20,streaks:12,echo:1.36,chroma:1.08 },

  YUN_PRIMARY:   { style:'palm',     leadFrames:3, releaseFrames:5, bodyDrive:11,bodyLift:0,  bodyRotate:.045, stretchX:1.050, stretchY:.978, ringScale:1.04,streaks:6, echo:1.06,chroma:.98 },
  YUN_SA2:       { style:'rush',     leadFrames:1, releaseFrames:7, bodyDrive:15,bodyLift:1,  bodyRotate:.065, stretchX:1.072, stretchY:.965, ringScale:1.22,streaks:12,echo:1.30,chroma:1.10 },
};

function smooth01(t: number): number {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

export function heroContactProfile(moveId: string | undefined): HeroContactProfile | null {
  return moveId ? HERO_MOVES[moveId] ?? null : null;
}

export function heroContactSample(fighter: Fighter): HeroContactSample {
  const move = fighter.currentMove;
  const profile = heroContactProfile(move?.id);
  if (!move || !profile || fighter.state !== 'attack') return { active:false, phase:'none', intensity:0, phaseProgress:0, profile };
  const activeStart = move.startup;
  const activeEnd = activeStart + Math.max(1, move.active) - 1;
  const frame = fighter.moveFrame;

  if (frame < activeStart) {
    const firstLead = Math.max(0, activeStart - profile.leadFrames);
    if (frame < firstLead) return { active:false, phase:'none', intensity:0, phaseProgress:0, profile };
    const p = (frame - firstLead + .5) / Math.max(1, profile.leadFrames);
    return { active:true, phase:'lead', intensity:smooth01(p) * .72, phaseProgress:Math.max(0, Math.min(1, p)), profile };
  }
  if (frame <= activeEnd) {
    const p = (frame - activeStart + .5) / Math.max(1, move.active);
    const wave = .82 + Math.sin(Math.max(0, Math.min(1, p)) * Math.PI) * .18;
    return { active:true, phase:'impact', intensity:wave, phaseProgress:Math.max(0, Math.min(1, p)), profile };
  }
  const releaseFrame = frame - activeEnd - 1;
  if (releaseFrame >= profile.releaseFrames) return { active:false, phase:'none', intensity:0, phaseProgress:1, profile };
  const p = releaseFrame / Math.max(1, profile.releaseFrames - 1);
  return { active:true, phase:'release', intensity:(1 - smooth01(p)) * .78, phaseProgress:Math.max(0, Math.min(1, p)), profile };
}

export function heroContactMoveIds(): string[] { return Object.keys(HERO_MOVES); }
