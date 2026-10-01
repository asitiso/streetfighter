import type { Fighter } from '../combat/Fighter.js';
import { bossMotionFor } from './BossAnimationProfiles.js';

export type MotionClip = 'idle' | 'walk' | 'jump' | 'hit' | 'ko' | 'victory' | 'parry' | 'special' | 'projectile' | 'antiAir' | 'spin' | 'rush' | 'throw' | 'throwVictim' | 'throwEscape' | 'landing' | 'dash' | 'super';

export interface MotionPose {
  bodyX: number;
  bodyY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  frontLegAngle: number;
  rearLegAngle: number;
  frontArmAngle: number;
  rearArmAngle: number;
  frontForearmAngle: number;
  rearForearmAngle: number;
  armReach: number;
  crouch: number;
}

interface PoseKeyframe extends MotionPose { at: number }

const pose = (
  at: number,
  bodyX: number,
  bodyY: number,
  rotation: number,
  frontLegAngle: number,
  rearLegAngle: number,
  frontArmAngle: number,
  rearArmAngle: number,
  frontForearmAngle: number,
  rearForearmAngle: number,
  armReach = 1,
  crouch = 0,
  scaleX = 1,
  scaleY = 1,
): PoseKeyframe => ({ at, bodyX, bodyY, rotation, scaleX, scaleY, frontLegAngle, rearLegAngle, frontArmAngle, rearArmAngle, frontForearmAngle, rearForearmAngle, armReach, crouch });

/**
 * Rendering-only key poses. Combat timing never reads this table.
 * The extra poses increase visual cadence without changing fixed 60 Hz simulation.
 */
const CLIPS: Record<MotionClip, readonly PoseKeyframe[]> = {
  ko: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
    pose(.12, -5, -2, -.09, -10, 13, -.25, 2.08, .35, 2.38, 1.03, 0, .97, 1.02),
    pose(.28, -12, 2, -.2, -20, 22, -.62, 2.45, -.02, 2.62, 1.08, 4, .94, 1.05),
    pose(.46, -18, 8, -.34, -34, 31, -1.02, 2.74, -.42, 2.88, 1.12, 10, .92, 1.06),
    pose(.64, -21, 15, -.47, -48, 39, -1.28, 2.92, -.68, 3.02, 1.14, 18, .9, 1.08),
    pose(.78, -18, 21, -.56, -58, 48, -1.42, 3.02, -.82, 3.08, 1.12, 24, .9, 1.07),
    pose(.9, -12, 25, -.62, -64, 54, -1.5, 3.08, -.9, 3.12, 1.08, 28, .92, 1.05),
    pose(1, -8, 27, -.64, -68, 58, -1.54, 3.1, -.94, 3.14, 1.05, 30, .94, 1.04),
  ],
  victory: [
    pose(0, 0, 2, 0, -8, 8, .9, 1.3, 1.55, 1.7, 1, 4, 1.01, .99),
    pose(.12, -2, 5, -.02, -14, 14, .72, 1.48, 1.38, 1.86, 1.02, 8, 1.02, .98),
    pose(.26, 1, 0, .02, -10, 10, .44, 1.7, 1.08, 2.0, 1.06, 2),
    pose(.42, 3, -5, .04, -6, 6, .14, 1.9, .76, 2.15, 1.1, 0, .99, 1.03),
    pose(.58, 2, -7, .035, -4, 4, -.08, 2.03, .5, 2.24, 1.12, 0, .985, 1.04),
    pose(.72, 1, -6, .025, -3, 3, -.16, 2.08, .42, 2.28, 1.12, 0, .99, 1.035),
    pose(.86, 0, -5, .015, -3, 3, -.12, 2.02, .48, 2.22, 1.1, 0, .995, 1.025),
    pose(1, 0, -5, .012, -3, 3, -.1, 2.0, .5, 2.2, 1.08, 0, 1, 1.02),
  ],
  idle: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0, 1, 1),
    pose(.17, .4, -1.3, -.006, -5, 5, .99, 1.21, 1.68, 1.59, 1.01, 0, 1.006, .995),
    pose(.34, .8, -2.2, -.01, -4, 4, .96, 1.24, 1.65, 1.62, 1.01, 0, 1.01, .99),
    pose(.52, .2, -1.1, 0, -3, 3, 1.01, 1.18, 1.7, 1.56, 1, 0, 1.004, .997),
    pose(.7, -.7, .6, .008, -3, 3, 1.07, 1.14, 1.76, 1.5, .99, 0, .996, 1.005),
    pose(.86, -.4, .5, .004, -4, 4, 1.06, 1.16, 1.74, 1.52, 1, 0, .998, 1.003),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0, 1, 1),
  ],
  walk: [
    pose(0, 0, 0, -.012, -21, 19, .72, 1.5, 1.45, 1.82, 1.02, 0),
    pose(.125, 1.6, -2.2, -.018, -12, 12, .82, 1.4, 1.5, 1.76, 1.03, 0),
    pose(.25, 2.6, -3.6, -.01, 2, -3, 1.02, 1.18, 1.63, 1.6, 1, 0, 1.01, .99),
    pose(.375, 1.2, -1.5, .004, 15, -16, 1.34, .84, 1.76, 1.48, 1.02, 0),
    pose(.5, 0, 0, .012, 21, -19, 1.5, .72, 1.82, 1.45, 1.02, 0),
    pose(.625, -1.6, -2.2, .018, 12, -12, 1.4, .82, 1.76, 1.5, 1.03, 0),
    pose(.75, -2.6, -3.6, .01, -2, 3, 1.18, 1.02, 1.6, 1.63, 1, 0, 1.01, .99),
    pose(.875, -1.2, -1.5, -.004, -15, 16, .84, 1.34, 1.48, 1.76, 1.02, 0),
    pose(1, 0, 0, -.012, -21, 19, .72, 1.5, 1.45, 1.82, 1.02, 0),
  ],
  jump: [
    pose(0, -2, 8, -.04, -18, 18, .9, 1.28, 1.52, 1.68, 1, 12, 1.035, .96),
    pose(.14, 1, -5, -.08, -32, 27, .26, .62, .92, 1.08, 1.06, 0, .98, 1.025),
    pose(.3, 3, -8, -.05, -38, 33, -.1, .22, .58, .82, 1.08, 0, .975, 1.035),
    pose(.48, 4, -9, 0, -28, 28, -.22, .08, .48, .72, 1.08, 0, .98, 1.03),
    pose(.64, 3, -7, .05, -12, 17, .22, .42, .82, .98, 1.05, 0, .99, 1.018),
    pose(.8, 0, -2, .08, 12, -17, .68, .96, 1.24, 1.4, 1.02, 0, 1.01, .99),
    pose(.92, -2, 4, .04, 22, -21, .9, 1.18, 1.48, 1.62, 1, 7, 1.025, .97),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  hit: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
    pose(.18, -4, -2, -.08, -9, 11, -.18, 2.1, .42, 2.35, 1.03, 0, .96, 1.03),
    pose(.36, -9, 1, -.17, -15, 16, -.34, 2.35, .25, 2.5, 1.08, 3, .94, 1.045),
    pose(.56, -7, 3, -.13, -12, 13, .12, 2.04, .72, 2.24, 1.05, 2, .96, 1.03),
    pose(.73, -4, 2, -.08, -8, 9, .45, 1.75, .92, 2.02, 1.02, 1, .98, 1.018),
    pose(.88, -2, 1, -.035, -6, 6, .72, 1.46, 1.24, 1.82, 1.01, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
  ],
  parry: [
    pose(0, 0, 0, 0, -4, 4, 1.02, 1.18, 1.72, 1.55),
    pose(.2, -3, 1, -.04, -7, 8, .32, 1.58, .82, 1.92, 1.04, 3, .98, 1.02),
    pose(.44, 4, -2, .035, -10, 12, -.18, 1.82, .52, 2.05, 1.1, 4, 1.015, .985),
    pose(.64, 2, -1, .02, -8, 9, .08, 1.62, .68, 1.94, 1.07, 2, 1.008, .993),
    pose(.82, 1, 0, .008, -5, 6, .58, 1.4, 1.12, 1.78, 1.03, 1),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
  ],
  special: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
    pose(.1, -4, 4, -.04, -10, 12, 1.45, .62, 1.86, 1.22, .98, 7, 1.025, .97),
    pose(.22, -7, 2, -.07, -16, 18, 1.78, .28, 2.06, .82, .98, 5, 1.035, .965),
    pose(.36, 6, -3, .045, -10, 11, .18, 1.42, .68, 1.8, 1.08, 0, .98, 1.025),
    pose(.49, 13, -5, .07, -5, 7, -.16, 1.72, .42, 2.02, 1.16, 0, .97, 1.04),
    pose(.62, 10, -2, .045, 2, 4, .12, 1.58, .7, 1.9, 1.12, 0, .98, 1.025),
    pose(.76, 4, 1, .015, 5, -1, .52, 1.38, 1.02, 1.78, 1.06, 0, .995, 1.01),
    pose(.9, 1, 1, -.008, 0, 3, .82, 1.28, 1.38, 1.66, 1.02, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
  ],
  super: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
    pose(.08, -3, 6, -.035, -9, 11, 1.58, .48, 1.94, 1.06, .98, 10, 1.035, .96),
    pose(.16, -7, 4, -.07, -15, 18, 1.86, .16, 2.12, .7, 1, 8, 1.05, .95),
    pose(.27, -10, 1, -.08, -19, 22, 2.04, -.08, 2.28, .48, 1.02, 4, 1.055, .95),
    pose(.39, 8, -5, .055, -12, 13, .12, 1.58, .62, 1.92, 1.1, 0, .97, 1.045),
    pose(.5, 17, -8, .085, -5, 8, -.22, 1.86, .34, 2.12, 1.2, 0, .955, 1.06),
    pose(.61, 13, -5, .065, 2, 2, -.04, 1.7, .52, 2.02, 1.17, 0, .97, 1.04),
    pose(.72, 7, -2, .04, 7, -3, .22, 1.55, .76, 1.92, 1.12, 0, .985, 1.025),
    pose(.82, 3, 0, .018, 5, 0, .5, 1.42, 1.02, 1.82, 1.08, 0, .995, 1.012),
    pose(.91, 1, 1, 0, 0, 3, .76, 1.3, 1.28, 1.7, 1.04, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55),
  ],

  projectile: [
    pose(0, 0, 0, 0, -5, 5, 1.18, 1.36, 1.7, 1.84, 1, 0),
    pose(.12, -4, 3, -.035, -12, 12, 1.55, 1.82, 2.02, 2.18, .94, 5, 1.025, .97),
    pose(.26, -8, 5, -.06, -18, 17, 1.82, 2.02, 2.2, 2.34, .92, 8, 1.04, .96),
    pose(.42, 3, -2, .02, -10, 11, .18, .24, .32, .38, 1.1, 1, .985, 1.02),
    pose(.55, 9, -3, .045, -6, 7, -.04, .02, .12, .16, 1.2, 0, .97, 1.035),
    pose(.7, 7, -1, .03, 0, 2, .12, .18, .26, .3, 1.14, 0, .985, 1.02),
    pose(.84, 3, 0, .012, 2, 0, .44, .54, .92, 1.02, 1.06, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  antiAir: [
    pose(0, 0, 3, -.03, -12, 13, 1.35, .82, 1.82, 1.28, .98, 7, 1.02, .97),
    pose(.12, 2, -4, -.07, -28, 17, 1.62, .46, 1.98, .92, 1.02, 0, 1.01, 1.01),
    pose(.24, 5, -10, -.1, -42, 8, 1.94, .18, 2.18, .62, 1.08, 0, .99, 1.03),
    pose(.4, 8, -16, -.08, -56, -5, 2.18, -.04, 2.38, .38, 1.12, 0, .98, 1.04),
    pose(.57, 10, -12, -.03, -38, 6, 1.72, .24, 2.08, .68, 1.08, 0, .99, 1.03),
    pose(.72, 7, -6, .02, -18, 10, 1.28, .58, 1.76, 1.08, 1.04, 0),
    pose(.86, 3, -1, .015, -8, 7, 1.02, .9, 1.62, 1.38, 1.01, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  spin: [
    pose(0, -3, 2, -.08, -18, 18, .7, 1.7, 1.34, 2.02, 1.02, 3),
    pose(.12, 2, -4, -.28, -42, 26, .2, 2.08, .72, 2.34, 1.08, 0),
    pose(.25, 7, -7, -.5, -66, 48, -.25, 2.32, .3, 2.5, 1.13, 0, .98, 1.03),
    pose(.38, 10, -6, -.28, -28, 68, .22, 1.98, .7, 2.22, 1.12, 0),
    pose(.52, 5, -4, .08, 38, -64, 1.92, .28, 2.24, .62, 1.12, 0),
    pose(.66, -3, -5, .34, 65, -34, 2.22, -.18, 2.45, .28, 1.12, 0, .98, 1.03),
    pose(.8, -6, -2, .18, 26, -18, 1.72, .42, 2.05, .84, 1.07, 0),
    pose(.92, -2, 1, .04, 4, -2, 1.25, .9, 1.78, 1.35, 1.02, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  rush: [
    pose(0, -6, 5, -.09, -16, 18, 1.4, .72, 1.92, 1.2, .98, 8, 1.03, .97),
    pose(.14, -8, 3, -.12, -25, 22, 1.72, .4, 2.06, .86, 1.02, 5),
    pose(.28, 5, -2, -.04, -20, 14, .58, 1.4, 1.1, 1.78, 1.08, 0),
    pose(.45, 14, -4, .015, -11, 8, .08, 1.68, .5, 2.0, 1.16, 0, .98, 1.03),
    pose(.6, 18, -3, .035, -4, 2, -.12, 1.8, .3, 2.1, 1.2, 0, .97, 1.04),
    pose(.74, 11, -1, .025, 4, -3, .24, 1.56, .72, 1.9, 1.14, 0),
    pose(.88, 4, 0, .008, 3, 0, .62, 1.34, 1.12, 1.72, 1.06, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  throw: [
    pose(0, -2, 2, -.02, -12, 14, 1.28, 1.42, 1.82, 1.9, 1.02, 5),
    pose(.16, -5, 6, -.05, -25, 26, .72, .88, 1.24, 1.36, 1.1, 12, 1.04, .95),
    pose(.32, 4, 3, .02, -31, 34, .12, .18, .52, .58, 1.2, 8),
    pose(.48, 10, -1, .07, -18, 20, -.12, -.06, .24, .3, 1.27, 1, .98, 1.03),
    pose(.64, 7, -2, .04, -6, 9, .1, .16, .46, .54, 1.18, 0),
    pose(.8, 3, 0, .015, 1, 2, .5, .64, 1.0, 1.12, 1.08, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  throwVictim: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
    pose(.12, -7, -5, -.08, -18, 20, .28, 2.02, .58, 2.28, 1.08, 4, 1.02, .98),
    pose(.26, -12, -14, -.2, -32, 35, -.24, 2.24, .18, 2.46, 1.14, 0, 1.04, .96),
    pose(.42, -5, -28, -.38, -48, 50, -.62, 2.42, -.18, 2.58, 1.18, 0, 1.03, .97),
    pose(.58, 8, -34, -.56, -58, 60, -1.02, 2.56, -.52, 2.7, 1.16, 0, 1.02, .98),
    pose(.72, 18, -18, -.42, -44, 46, -1.18, 2.34, -.74, 2.48, 1.12, 0),
    pose(.86, 12, -5, -.2, -28, 30, -.72, 1.98, -.22, 2.2, 1.08, 4),
    pose(1, 4, 2, -.08, -16, 18, .12, 1.72, .52, 1.98, 1.04, 8),
  ],
  throwEscape: [
    pose(0, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
    pose(.16, -4, 3, -.08, -18, 20, .38, 1.9, .8, 2.22, 1.08, 5, 1.02, .98),
    pose(.34, -9, 4, -.14, -28, 31, -.16, 2.15, .32, 2.42, 1.16, 8, 1.04, .96),
    pose(.52, 3, 1, .07, -17, 19, 2.1, -.1, 2.4, .34, 1.12, 4),
    pose(.7, 5, 0, .04, -8, 10, 1.58, .32, 2.0, .8, 1.08, 1),
    pose(.86, 2, 0, .012, -5, 6, 1.22, .78, 1.78, 1.28, 1.03, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  landing: [
    pose(0, 0, 2, 0, 13, -13, .84, 1.32, 1.46, 1.72, 1, 5, 1.01, .98),
    pose(.18, -1, 7, -.015, 24, -23, .68, 1.48, 1.32, 1.86, 1.02, 14, 1.035, .95),
    pose(.38, -2, 10, -.02, 31, -30, .58, 1.56, 1.24, 1.94, 1.04, 20, 1.05, .93),
    pose(.58, 0, 6, .01, 18, -17, .78, 1.38, 1.44, 1.8, 1.02, 11, 1.025, .97),
    pose(.78, 1, 2, .008, 7, -6, .94, 1.25, 1.62, 1.65, 1.01, 4),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
  dash: [
    pose(0, -5, 4, -.1, -20, 22, 1.38, .72, 1.9, 1.18, .98, 7, 1.025, .97),
    pose(.14, -7, 1, -.14, -34, 27, 1.68, .42, 2.08, .86, 1.03, 2),
    pose(.3, 5, -3, -.09, -25, 19, .52, 1.5, 1.02, 1.88, 1.09, 0),
    pose(.48, 10, -4, -.06, -14, 10, .22, 1.7, .72, 2.02, 1.13, 0, .985, 1.025),
    pose(.66, 7, -2, -.035, -5, 3, .42, 1.56, .92, 1.92, 1.1, 0),
    pose(.84, 3, 0, -.012, 2, 0, .76, 1.34, 1.3, 1.72, 1.05, 0),
    pose(1, 0, 0, 0, -4, 4, 1.03, 1.18, 1.72, 1.55, 1, 0),
  ],
};

interface CharacterMotionFlavor {
  stride: number;
  upperBody: number;
  snap: number;
  bounce: number;
  reach: number;
  recovery: number;
}

const FLAVOR: Record<string, CharacterMotionFlavor> = {
  RYU: { stride: 1, upperBody: .9, snap: 1, bounce: .82, reach: 1, recovery: 1 },
  KEN: { stride: 1.08, upperBody: 1.02, snap: 1.12, bounce: 1.02, reach: 1.03, recovery: 1.08 },
  CHUNLI: { stride: 1.14, upperBody: .82, snap: 1.12, bounce: 1.08, reach: 1.12, recovery: 1.1 },
  ALEX: { stride: .82, upperBody: 1.18, snap: .94, bounce: .65, reach: 1.07, recovery: .84 },
  DUDLEY: { stride: .96, upperBody: .72, snap: 1.16, bounce: .86, reach: 1.03, recovery: 1.12 },
  MAKOTO: { stride: .94, upperBody: 1.1, snap: 1.28, bounce: .82, reach: 1.1, recovery: .96 },
  IBUKI: { stride: 1.16, upperBody: .84, snap: 1.18, bounce: 1.24, reach: 1.02, recovery: 1.18 },
  YUN: { stride: 1.18, upperBody: .88, snap: 1.2, bounce: 1.16, reach: 1.05, recovery: 1.2 },
  URIEN: { stride: .91, upperBody: 1.18, snap: 1.05, bounce: .7, reach: 1.1, recovery: .9 },
  GILL: { stride: .9, upperBody: 1.15, snap: 1.08, bounce: .68, reach: 1.12, recovery: .92 },
};

const DEFAULT_FLAVOR: CharacterMotionFlavor = { stride: 1, upperBody: 1, snap: 1, bounce: 1, reach: 1, recovery: 1 };

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => t * t * (3 - 2 * t);

function sampleTimeline(clip: MotionClip, progress: number): MotionPose {
  const frames = CLIPS[clip];
  const p = clamp01(progress);
  let a = frames[0]!;
  let b = frames[frames.length - 1]!;
  for (let i = 0; i < frames.length - 1; i += 1) {
    const left = frames[i]!;
    const right = frames[i + 1]!;
    if (p >= left.at && p <= right.at) { a = left; b = right; break; }
  }
  const span = Math.max(.0001, b.at - a.at);
  const t = smooth(clamp01((p - a.at) / span));
  return {
    bodyX: lerp(a.bodyX, b.bodyX, t), bodyY: lerp(a.bodyY, b.bodyY, t), rotation: lerp(a.rotation, b.rotation, t),
    scaleX: lerp(a.scaleX, b.scaleX, t), scaleY: lerp(a.scaleY, b.scaleY, t),
    frontLegAngle: lerp(a.frontLegAngle, b.frontLegAngle, t), rearLegAngle: lerp(a.rearLegAngle, b.rearLegAngle, t),
    frontArmAngle: lerp(a.frontArmAngle, b.frontArmAngle, t), rearArmAngle: lerp(a.rearArmAngle, b.rearArmAngle, t),
    frontForearmAngle: lerp(a.frontForearmAngle, b.frontForearmAngle, t), rearForearmAngle: lerp(a.rearForearmAngle, b.rearForearmAngle, t),
    armReach: lerp(a.armReach, b.armReach, t), crouch: lerp(a.crouch, b.crouch, t),
  };
}

export function motionClipForFighter(fighter: Fighter, time: number): { clip: MotionClip; progress: number } {
  if (fighter.throwSyncFrames > 0 && fighter.throwSyncRole === 'victim') return { clip: 'throwVictim', progress: fighter.throwSyncProgress };
  if (fighter.throwSyncFrames > 0 && fighter.throwSyncRole === 'attacker' && fighter.state !== 'attack') return { clip: 'throw', progress: fighter.throwSyncProgress };
  if (fighter.state === 'victory') return { clip: 'victory', progress: Math.min(1, fighter.stateFrame / 72) };
  if (fighter.state === 'ko') return { clip: 'ko', progress: Math.min(1, Math.max(0, (fighter.stateFrame + 90) / 90)) };
  if (fighter.state === 'knockdown') return { clip: 'ko', progress: Math.min(.82, Math.max(0, (fighter.stateFrame + 34) / 34)) };
  if (fighter.throwEscapeFrames > 0) return { clip: 'throwEscape', progress: clamp01(1 - fighter.throwEscapeFrames / 12) };
  if (fighter.landingFrames > 0) return { clip: 'landing', progress: clamp01(1 - fighter.landingFrames / 8) };
  if (fighter.dashFrames > 0) return { clip: 'dash', progress: clamp01(1 - fighter.dashFrames / 8) };
  if (fighter.state === 'attack' && fighter.currentMove) {
    const move = fighter.currentMove;
    const total = Math.max(1, move.startup + move.active + move.recovery);
    const progress = clamp01(fighter.moveFrame / total);
    if (move.superCost) return { clip: 'super', progress };
    if (move.kind === 'throw' || move.level === 'throw') return { clip: 'throw', progress };
    if (move.kind === 'projectile') return { clip: 'projectile', progress };
    if (move.id.endsWith('_ANTI_AIR')) return { clip: 'antiAir', progress };
    if (move.id.endsWith('_MOBILITY')) {
      const spinning = ['RYU', 'KEN', 'CHUNLI', 'IBUKI'].includes(fighter.character.id);
      return { clip: spinning ? 'spin' : 'rush', progress };
    }
    return { clip: 'special', progress };
  }
  if (fighter.state === 'parry') return { clip: 'parry', progress: clamp01(1 - Math.abs(fighter.stateFrame) / 10) };
  if (fighter.state === 'hit' || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0) return { clip: 'hit', progress: clamp01(1 - Math.abs(fighter.stateFrame) / 20) };
  if (fighter.airborne || fighter.state === 'jump') {
    const velocity = fighter.jumpVelocity;
    const progress = velocity > 6 ? .16 : velocity > 2 ? .3 : velocity > -2 ? .49 : velocity > -6 ? .68 : .84;
    return { clip: 'jump', progress };
  }
  if (fighter.state === 'walk') return { clip: 'walk', progress: ((time * 1.78) % 1 + 1) % 1 };
  return { clip: 'idle', progress: ((time * .43) % 1 + 1) % 1 };
}

export function sampleFighterMotion(fighter: Fighter, time: number): MotionPose {
  const { clip, progress } = motionClipForFighter(fighter, time);
  const base = sampleTimeline(clip, progress);
  const flavor = FLAVOR[fighter.character.id] ?? DEFAULT_FLAVOR;
  const attackClip = clip === 'special' || clip === 'super';
  const move = fighter.currentMove;
  const heavy = move?.button === 'hp' || move?.button === 'hk' || (move?.damage ?? 0) >= 90;
  const snap = attackClip ? flavor.snap * (heavy ? 1.08 : 1) : 1;
  const recoveryBlend = attackClip && progress > .72 ? flavor.recovery : 1;
  const boss = attackClip ? bossMotionFor(fighter.character.id, fighter.currentMove?.id, progress) : null;
  return {
    bodyX: base.bodyX * (clip === 'walk' ? flavor.stride : attackClip ? snap : 1) + (boss?.bodyX ?? 0),
    bodyY: base.bodyY * (clip === 'idle' || clip === 'walk' || clip === 'jump' ? flavor.bounce : 1) + (boss?.bodyY ?? 0),
    rotation: base.rotation * flavor.upperBody * (attackClip ? snap : 1) + (boss?.rotation ?? 0),
    scaleX: (1 + (base.scaleX - 1) * flavor.upperBody) * (boss?.scaleX ?? 1),
    scaleY: (1 + (base.scaleY - 1) * flavor.upperBody) * (boss?.scaleY ?? 1),
    frontLegAngle: base.frontLegAngle * (clip === 'walk' ? flavor.stride : 1),
    rearLegAngle: base.rearLegAngle * (clip === 'walk' ? flavor.stride : 1),
    frontArmAngle: base.frontArmAngle,
    rearArmAngle: base.rearArmAngle,
    frontForearmAngle: base.frontForearmAngle,
    rearForearmAngle: base.rearForearmAngle,
    armReach: base.armReach * flavor.reach * recoveryBlend * (boss?.armReach ?? 1),
    crouch: base.crouch + (boss?.crouch ?? 0),
  };
}

export function animationKeyframeCount(clip: MotionClip): number { return CLIPS[clip].length; }

export function characterMotionSignature(characterId: string): string {
  const f = FLAVOR[characterId] ?? DEFAULT_FLAVOR;
  return `${f.stride.toFixed(2)}:${f.upperBody.toFixed(2)}:${f.snap.toFixed(2)}:${f.bounce.toFixed(2)}:${f.reach.toFixed(2)}:${f.recovery.toFixed(2)}`;
}
