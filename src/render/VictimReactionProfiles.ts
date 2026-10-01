import type { Fighter } from '../combat/Fighter.js';

export interface VictimReactionProfile {
  mass: number;
  recoilX: number;
  recoilY: number;
  twist: number;
  compress: number;
  torsoTwist: number;
  headLag: number;
  multiPulse: number;
  bounceCurl: number;
  settle: number;
}

export interface VictimReactionSample {
  active: boolean;
  impact: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  torsoTwist: number;
  headSnap: number;
  echo: number;
  sequencePulse: number;
}

const DEFAULT: VictimReactionProfile = {
  mass: 1,
  recoilX: 1,
  recoilY: 1,
  twist: 1,
  compress: 1,
  torsoTwist: 1,
  headLag: 1,
  multiPulse: 1,
  bounceCurl: 1,
  settle: 1,
};

const PROFILES: Record<string, VictimReactionProfile> = {
  RYU:    { mass:1.02, recoilX:.92, recoilY:.92, twist:.9,  compress:.92, torsoTwist:.9,  headLag:.9,  multiPulse:.9,  bounceCurl:.92, settle:1.08 },
  KEN:    { mass:.96, recoilX:1.06, recoilY:1.02, twist:1.06, compress:.94, torsoTwist:1.04, headLag:1.08, multiPulse:1.04, bounceCurl:1.02, settle:.94 },
  CHUNLI: { mass:.9,  recoilX:1.02, recoilY:1.08, twist:1.12, compress:.86, torsoTwist:1.1,  headLag:1.02, multiPulse:1.12, bounceCurl:1.1,  settle:.88 },
  ALEX:   { mass:1.2,  recoilX:.78, recoilY:.82, twist:.78, compress:1.08, torsoTwist:.8,  headLag:.72, multiPulse:.82, bounceCurl:.84, settle:1.22 },
  DUDLEY: { mass:1.04, recoilX:.88, recoilY:.92, twist:.9,  compress:.9,  torsoTwist:.94, headLag:.8,  multiPulse:.96, bounceCurl:.9,  settle:.92 },
  MAKOTO: { mass:.94, recoilX:1.08, recoilY:1.02, twist:1.14, compress:.9,  torsoTwist:1.14, headLag:.92, multiPulse:1.08, bounceCurl:1.04, settle:1.02 },
  IBUKI:  { mass:.82, recoilX:1.18, recoilY:1.16, twist:1.24, compress:.82, torsoTwist:1.22, headLag:1.18, multiPulse:1.18, bounceCurl:1.22, settle:.78 },
  YUN:    { mass:.84, recoilX:1.16, recoilY:1.1,  twist:1.2,  compress:.84, torsoTwist:1.2,  headLag:1.12, multiPulse:1.16, bounceCurl:1.18, settle:.8 },
  URIEN:  { mass:1.18, recoilX:.82, recoilY:.86, twist:.82, compress:1.06, torsoTwist:.84, headLag:.7,  multiPulse:.86, bounceCurl:.88, settle:1.16 },
  GILL:   { mass:1.16, recoilX:.8,  recoilY:.9,  twist:.8,  compress:1.02, torsoTwist:.82, headLag:.66, multiPulse:.88, bounceCurl:.9,  settle:1.1 },
};

export function victimReactionProfile(characterId: string): VictimReactionProfile {
  return PROFILES[characterId] ?? DEFAULT;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function victimReactionSample(fighter: Fighter): VictimReactionSample {
  const p = victimReactionProfile(fighter.character.id);
  const sequenceTotal = Math.max(1, fighter.visualHitSequenceTotal);
  const sequenceIndex = Math.max(1, Math.min(sequenceTotal, fighter.visualHitSequenceIndex));
  const sequenceRatio = sequenceTotal <= 1 ? 1 : (sequenceIndex - 1) / (sequenceTotal - 1);
  const sequenceRemaining = fighter.visualHitSequenceFrames;
  const sequenceDuration = Math.max(1, fighter.visualHitSequenceTotalFrames);
  const sequenceProgress = clamp01(1 - sequenceRemaining / sequenceDuration);
  const pulse = sequenceRemaining > 0
    ? 1 - smooth(sequenceProgress) * .72
    : 0;
  const multiRhythm = sequenceTotal > 1
    ? (.82 + Math.sin((sequenceIndex / sequenceTotal) * Math.PI) * .2) * p.multiPulse
    : 1;
  const power = Math.max(.55, Math.min(1.55, fighter.lastHitPower / 105));
  const zoneX = fighter.lastHitZone === 'leg' ? .72 : fighter.lastHitZone === 'head' ? 1.08 : fighter.lastHitZone === 'launch' ? 1.18 : 1;
  const zoneY = fighter.lastHitZone === 'leg' ? .5 : fighter.lastHitZone === 'head' ? .9 : fighter.lastHitZone === 'launch' ? 1.4 : 1;
  const reactionScale = fighter.lastHitReaction === 'launch' ? 1.3 : fighter.lastHitReaction === 'throw' ? 1.38 : fighter.lastHitReaction === 'high' ? 1.08 : fighter.lastHitReaction === 'low' ? .78 : 1;

  const wall = clamp01(fighter.wallBounceFrames / 18);
  const ground = clamp01(fighter.groundBounceFrames / 16);
  const bounce = Math.max(wall, ground);
  const bounceImpact = bounce > 0 ? (.55 + bounce * .45) * p.bounceCurl : 0;
  const baseImpact = Math.max(pulse * multiRhythm, bounceImpact);
  const direction = fighter.lastHitDirection;
  const finisher = sequenceIndex >= sequenceTotal ? 1 : .72 + sequenceRatio * .16;
  const massDamp = 1 / Math.max(.72, p.mass);

  let offsetX = -direction * 11 * p.recoilX * power * reactionScale * baseImpact * finisher * massDamp;
  let offsetY = -2.8 * p.recoilY * zoneY * power * baseImpact;
  let rotation = -direction * .14 * p.twist * reactionScale * baseImpact;
  let scaleX = 1 - .035 * p.compress * baseImpact;
  let scaleY = 1 + .026 * p.compress * baseImpact;
  let torsoTwist = -direction * .11 * p.torsoTwist * baseImpact;
  let headSnap = -direction * .13 * p.headLag * zoneX * baseImpact;

  if (fighter.lastHitZone === 'leg') {
    offsetY += 8.5 * p.recoilY * baseImpact;
    rotation *= .62;
    scaleX += .018 * baseImpact;
    scaleY -= .025 * baseImpact;
  } else if (fighter.lastHitZone === 'launch') {
    offsetY -= 13 * p.recoilY * baseImpact;
    rotation *= 1.18;
  } else if (fighter.lastHitZone === 'head') {
    offsetY -= 3.5 * baseImpact;
    rotation *= 1.12;
  }

  if (wall > 0) {
    offsetX += -direction * (10 + wall * 18) * p.recoilX * massDamp;
    offsetY -= 8 * wall * p.recoilY;
    rotation += direction * (.22 + wall * .2) * p.bounceCurl;
    scaleX *= .96;
    scaleY *= 1.035;
    torsoTwist += direction * .12 * p.bounceCurl;
  }
  if (ground > 0) {
    offsetY += 16 * ground * p.bounceCurl;
    rotation += -direction * (.14 + ground * .12) * p.bounceCurl;
    scaleX *= 1.04;
    scaleY *= .92;
    torsoTwist += -direction * .08 * p.bounceCurl;
  }

  const echo = clamp01((baseImpact * .42 + bounce * .3) * (sequenceTotal > 1 ? 1.08 : 1) * p.recoilX);
  return {
    active: baseImpact > .03 || bounce > .03,
    impact: baseImpact,
    offsetX,
    offsetY,
    rotation,
    scaleX,
    scaleY,
    torsoTwist,
    headSnap,
    echo,
    sequencePulse: pulse,
  };
}

export function victimReactionProfileDigest(characterId: string): string {
  const p = victimReactionProfile(characterId);
  return [p.mass,p.recoilX,p.recoilY,p.twist,p.compress,p.torsoTwist,p.headLag,p.multiPulse,p.bounceCurl,p.settle]
    .map((v) => v.toFixed(2)).join(':');
}
