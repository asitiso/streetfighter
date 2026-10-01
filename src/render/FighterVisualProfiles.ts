export type HandShape = 'fist' | 'glove' | 'palm' | 'knife' | 'grab';
export type FootShape = 'bare' | 'shoe' | 'boot' | 'slipper' | 'ninja' | 'sneaker';
export type SuperPoseFamily = 'wave' | 'uppercut' | 'barrage' | 'kickRush' | 'throw' | 'spiral' | 'install' | 'aerial' | 'powerRush';

export interface FighterVisualProfile {
  hand: HandShape;
  projectileHand: HandShape;
  throwHand: HandShape;
  foot: FootShape;
  shoulderTwist: number;
  headLag: number;
  limbTaper: number;
}

export interface SuperPoseProfile {
  family: SuperPoseFamily;
  leadAngle: number;
  rearAngle: number;
  leadReach: number;
  rearReach: number;
  hand: HandShape;
  bodyTwist: number;
  legDrive: number;
}

const DEFAULT: FighterVisualProfile = {
  hand: 'fist', projectileHand: 'palm', throwHand: 'grab', foot: 'bare', shoulderTwist: 1, headLag: 1, limbTaper: 1,
};

const FIGHTERS: Readonly<Record<string, FighterVisualProfile>> = {
  RYU: { hand: 'fist', projectileHand: 'palm', throwHand: 'grab', foot: 'bare', shoulderTwist: 1, headLag: .92, limbTaper: 1 },
  KEN: { hand: 'fist', projectileHand: 'palm', throwHand: 'grab', foot: 'bare', shoulderTwist: 1.08, headLag: 1.08, limbTaper: .96 },
  CHUNLI: { hand: 'palm', projectileHand: 'palm', throwHand: 'grab', foot: 'slipper', shoulderTwist: .9, headLag: .82, limbTaper: .9 },
  ALEX: { hand: 'fist', projectileHand: 'fist', throwHand: 'grab', foot: 'boot', shoulderTwist: 1.24, headLag: .72, limbTaper: 1.16 },
  DUDLEY: { hand: 'glove', projectileHand: 'glove', throwHand: 'glove', foot: 'shoe', shoulderTwist: .76, headLag: .7, limbTaper: 1.02 },
  MAKOTO: { hand: 'knife', projectileHand: 'palm', throwHand: 'grab', foot: 'bare', shoulderTwist: 1.2, headLag: .78, limbTaper: .94 },
  IBUKI: { hand: 'knife', projectileHand: 'knife', throwHand: 'grab', foot: 'ninja', shoulderTwist: 1.04, headLag: 1.18, limbTaper: .86 },
  YUN: { hand: 'palm', projectileHand: 'palm', throwHand: 'grab', foot: 'sneaker', shoulderTwist: 1.06, headLag: 1.08, limbTaper: .9 },
  URIEN: { hand: 'fist', projectileHand: 'palm', throwHand: 'grab', foot: 'boot', shoulderTwist: 1.18, headLag: .68, limbTaper: 1.12 },
  GILL: { hand: 'palm', projectileHand: 'palm', throwHand: 'grab', foot: 'bare', shoulderTwist: 1.12, headLag: .62, limbTaper: 1.08 },
};

export function fighterVisualProfile(characterId: string): FighterVisualProfile {
  return FIGHTERS[characterId] ?? DEFAULT;
}


export interface FighterAnatomyProfile {
  faceWidth: number;
  faceHeight: number;
  jaw: number;
  eyeSpacing: number;
  browTilt: number;
  neckWidth: number;
  shoulderScale: number;
  chestScale: number;
  waistScale: number;
  armScale: number;
  legScale: number;
  wristSnap: number;
  ankleSnap: number;
  hitTwist: number;
  koSpin: number;
  koSlide: number;
  victoryLift: number;
  victoryLean: number;
}

const DEFAULT_ANATOMY: FighterAnatomyProfile = {
  faceWidth: 1, faceHeight: 1, jaw: 1, eyeSpacing: 1, browTilt: 0, neckWidth: 1,
  shoulderScale: 1, chestScale: 1, waistScale: 1, armScale: 1, legScale: 1,
  wristSnap: .08, ankleSnap: .05, hitTwist: 1, koSpin: 1, koSlide: 1, victoryLift: 1, victoryLean: 0,
};

const ANATOMY: Readonly<Record<string, FighterAnatomyProfile>> = {
  RYU:    { faceWidth: 1.00, faceHeight: 1.02, jaw: 1.08, eyeSpacing: 1.00, browTilt: -.12, neckWidth: 1.08, shoulderScale: 1.05, chestScale: 1.05, waistScale: .98, armScale: 1.02, legScale: 1.02, wristSnap: .10, ankleSnap: .05, hitTwist: 1.00, koSpin: 1.00, koSlide: 1.00, victoryLift: 1.00, victoryLean: -.03 },
  KEN:    { faceWidth: .98, faceHeight: 1.03, jaw: 1.02, eyeSpacing: 1.02, browTilt: -.08, neckWidth: 1.02, shoulderScale: 1.01, chestScale: 1.00, waistScale: .96, armScale: .98, legScale: 1.03, wristSnap: .14, ankleSnap: .11, hitTwist: 1.08, koSpin: 1.08, koSlide: 1.04, victoryLift: 1.12, victoryLean: -.08 },
  CHUNLI: { faceWidth: .94, faceHeight: .98, jaw: .86, eyeSpacing: 1.08, browTilt: .02, neckWidth: .84, shoulderScale: .91, chestScale: .94, waistScale: .80, armScale: .88, legScale: 1.08, wristSnap: .18, ankleSnap: .17, hitTwist: .92, koSpin: .88, koSlide: .88, victoryLift: .95, victoryLean: .04 },
  ALEX:   { faceWidth: 1.08, faceHeight: 1.07, jaw: 1.18, eyeSpacing: .96, browTilt: -.15, neckWidth: 1.24, shoulderScale: 1.22, chestScale: 1.19, waistScale: 1.09, armScale: 1.18, legScale: 1.13, wristSnap: .07, ankleSnap: .04, hitTwist: 1.22, koSpin: 1.18, koSlide: 1.28, victoryLift: 1.18, victoryLean: -.11 },
  DUDLEY: { faceWidth: .96, faceHeight: 1.04, jaw: 1.00, eyeSpacing: .96, browTilt: -.04, neckWidth: .96, shoulderScale: 1.04, chestScale: 1.02, waistScale: .91, armScale: 1.02, legScale: .98, wristSnap: .20, ankleSnap: .06, hitTwist: .82, koSpin: .94, koSlide: .94, victoryLift: .88, victoryLean: .03 },
  MAKOTO: { faceWidth: .93, faceHeight: .97, jaw: .92, eyeSpacing: .98, browTilt: -.10, neckWidth: .91, shoulderScale: .94, chestScale: .92, waistScale: .86, armScale: .94, legScale: .96, wristSnap: .24, ankleSnap: .09, hitTwist: 1.16, koSpin: .90, koSlide: .86, victoryLift: 1.04, victoryLean: -.06 },
  IBUKI:  { faceWidth: .91, faceHeight: .96, jaw: .84, eyeSpacing: 1.04, browTilt: .03, neckWidth: .84, shoulderScale: .88, chestScale: .87, waistScale: .79, armScale: .86, legScale: .91, wristSnap: .28, ankleSnap: .19, hitTwist: .96, koSpin: .82, koSlide: .82, victoryLift: 1.10, victoryLean: .09 },
  YUN:    { faceWidth: .92, faceHeight: .98, jaw: .88, eyeSpacing: 1.02, browTilt: -.02, neckWidth: .88, shoulderScale: .91, chestScale: .90, waistScale: .82, armScale: .90, legScale: .94, wristSnap: .22, ankleSnap: .16, hitTwist: 1.02, koSpin: .86, koSlide: .90, victoryLift: 1.08, victoryLean: -.04 },
  URIEN:  { faceWidth: 1.06, faceHeight: 1.06, jaw: 1.16, eyeSpacing: .95, browTilt: -.16, neckWidth: 1.18, shoulderScale: 1.18, chestScale: 1.15, waistScale: 1.05, armScale: 1.13, legScale: 1.10, wristSnap: .09, ankleSnap: .05, hitTwist: 1.18, koSpin: 1.10, koSlide: 1.22, victoryLift: 1.14, victoryLean: -.08 },
  GILL:   { faceWidth: 1.03, faceHeight: 1.08, jaw: 1.10, eyeSpacing: 1.00, browTilt: -.10, neckWidth: 1.14, shoulderScale: 1.16, chestScale: 1.13, waistScale: 1.03, armScale: 1.10, legScale: 1.08, wristSnap: .12, ankleSnap: .07, hitTwist: 1.10, koSpin: 1.04, koSlide: 1.14, victoryLift: 1.20, victoryLean: -.02 },
};

export function fighterAnatomyProfile(characterId: string): FighterAnatomyProfile {
  return ANATOMY[characterId] ?? DEFAULT_ANATOMY;
}

export function anatomyProfileSignature(characterId: string): string {
  const p = fighterAnatomyProfile(characterId);
  return [p.faceWidth,p.faceHeight,p.jaw,p.eyeSpacing,p.neckWidth,p.shoulderScale,p.chestScale,p.waistScale,p.armScale,p.legScale,p.wristSnap,p.ankleSnap,p.hitTwist,p.koSpin,p.koSlide,p.victoryLift,p.victoryLean].map(v => v.toFixed(2)).join(':');
}

const SUPER_POSES: Readonly<Record<string, SuperPoseProfile>> = {
  RYU_SA1: { family: 'wave', leadAngle: -.08, rearAngle: .12, leadReach: 1.22, rearReach: 1.08, hand: 'palm', bodyTwist: .08, legDrive: .25 },
  RYU_SA2: { family: 'uppercut', leadAngle: -1.48, rearAngle: .28, leadReach: 1.34, rearReach: .78, hand: 'fist', bodyTwist: -.12, legDrive: .72 },
  RYU_SA3: { family: 'wave', leadAngle: -.03, rearAngle: .03, leadReach: 1.3, rearReach: 1.2, hand: 'palm', bodyTwist: .04, legDrive: .38 },
  KEN_SA1: { family: 'uppercut', leadAngle: -1.42, rearAngle: -.88, leadReach: 1.32, rearReach: 1.02, hand: 'fist', bodyTwist: -.16, legDrive: .82 },
  KEN_SA2: { family: 'uppercut', leadAngle: -1.56, rearAngle: -1.08, leadReach: 1.42, rearReach: 1.12, hand: 'fist', bodyTwist: -.2, legDrive: .95 },
  KEN_SA3: { family: 'kickRush', leadAngle: -.32, rearAngle: .62, leadReach: 1.02, rearReach: .9, hand: 'fist', bodyTwist: .1, legDrive: 1 },
  CHUNLI_SA1: { family: 'wave', leadAngle: -.2, rearAngle: .2, leadReach: 1.18, rearReach: 1.12, hand: 'palm', bodyTwist: .02, legDrive: .3 },
  CHUNLI_SA2: { family: 'kickRush', leadAngle: -.58, rearAngle: .54, leadReach: .94, rearReach: .88, hand: 'palm', bodyTwist: .08, legDrive: 1.1 },
  CHUNLI_SA3: { family: 'aerial', leadAngle: -.92, rearAngle: .36, leadReach: 1.02, rearReach: .9, hand: 'palm', bodyTwist: -.08, legDrive: 1.16 },
  ALEX_SA1: { family: 'throw', leadAngle: -.48, rearAngle: .48, leadReach: 1.22, rearReach: 1.22, hand: 'grab', bodyTwist: .16, legDrive: .76 },
  ALEX_SA2: { family: 'powerRush', leadAngle: -.1, rearAngle: .36, leadReach: 1.36, rearReach: .92, hand: 'fist', bodyTwist: .18, legDrive: .92 },
  ALEX_SA3: { family: 'throw', leadAngle: -.76, rearAngle: .18, leadReach: 1.16, rearReach: 1.04, hand: 'grab', bodyTwist: -.08, legDrive: .86 },
  DUDLEY_SA1: { family: 'uppercut', leadAngle: -1.38, rearAngle: .26, leadReach: 1.28, rearReach: .76, hand: 'glove', bodyTwist: -.12, legDrive: .78 },
  DUDLEY_SA2: { family: 'barrage', leadAngle: -.18, rearAngle: .2, leadReach: 1.22, rearReach: 1.14, hand: 'glove', bodyTwist: .14, legDrive: .62 },
  DUDLEY_SA3: { family: 'spiral', leadAngle: -.12, rearAngle: .42, leadReach: 1.38, rearReach: .9, hand: 'glove', bodyTwist: .22, legDrive: .78 },
  MAKOTO_SA1: { family: 'barrage', leadAngle: -.04, rearAngle: .4, leadReach: 1.42, rearReach: .72, hand: 'knife', bodyTwist: .24, legDrive: .66 },
  MAKOTO_SA2: { family: 'powerRush', leadAngle: -.16, rearAngle: .52, leadReach: 1.34, rearReach: .82, hand: 'fist', bodyTwist: .28, legDrive: .96 },
  MAKOTO_SA3: { family: 'install', leadAngle: -.72, rearAngle: .72, leadReach: .86, rearReach: .86, hand: 'palm', bodyTwist: 0, legDrive: .18 },
  IBUKI_SA1: { family: 'aerial', leadAngle: -.62, rearAngle: .46, leadReach: 1.02, rearReach: .92, hand: 'knife', bodyTwist: -.08, legDrive: .84 },
  IBUKI_SA2: { family: 'throw', leadAngle: -.38, rearAngle: .38, leadReach: 1.08, rearReach: 1.08, hand: 'grab', bodyTwist: .1, legDrive: .74 },
  IBUKI_SA3: { family: 'barrage', leadAngle: -.26, rearAngle: .56, leadReach: 1.16, rearReach: .84, hand: 'knife', bodyTwist: .16, legDrive: .94 },
  YUN_SA1: { family: 'uppercut', leadAngle: -1.08, rearAngle: .22, leadReach: 1.1, rearReach: .82, hand: 'palm', bodyTwist: -.1, legDrive: .82 },
  YUN_SA2: { family: 'barrage', leadAngle: -.2, rearAngle: .42, leadReach: 1.24, rearReach: .94, hand: 'palm', bodyTwist: .18, legDrive: .92 },
  YUN_SA3: { family: 'install', leadAngle: -.62, rearAngle: .62, leadReach: .9, rearReach: .9, hand: 'palm', bodyTwist: 0, legDrive: .22 },
};

export function superPoseProfile(moveId: string): SuperPoseProfile | null {
  return SUPER_POSES[moveId] ?? null;
}

export function visualProfileSignature(characterId: string): string {
  const p = fighterVisualProfile(characterId);
  return `${p.hand}:${p.projectileHand}:${p.throwHand}:${p.foot}:${p.shoulderTwist.toFixed(2)}:${p.headLag.toFixed(2)}:${p.limbTaper.toFixed(2)}`;
}

export function superPoseSignature(moveId: string): string {
  const p = superPoseProfile(moveId);
  return p ? `${p.family}:${p.leadAngle.toFixed(2)}:${p.rearAngle.toFixed(2)}:${p.leadReach.toFixed(2)}:${p.hand}:${p.legDrive.toFixed(2)}` : 'none';
}
