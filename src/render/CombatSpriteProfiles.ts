import type { Fighter } from '../combat/Fighter.js';
import { motionPolishProfile, plantedStep, softTriangle } from './MotionPolishProfiles.js';
import { victimReactionSample } from './VictimReactionProfiles.js';
import { locomotionProfile } from './LocomotionProfiles.js';

export interface CombatSpritePose {
  useSprite: boolean;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  torsoTwist: number;
  footPlant: number;
  speed: number;
}

const PLAYABLE = new Set(['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN']);
const EMPTY: CombatSpritePose = { useSprite:false, offsetX:0, offsetY:0, rotation:0, scaleX:1, scaleY:1, alpha:1, torsoTwist:0, footPlant:0, speed:0 };

export function combatSpriteEnabledFor(characterId: string): boolean {
  return PLAYABLE.has(characterId);
}

export function combatSpritePose(fighter: Fighter, time: number): CombatSpritePose {
  if (!combatSpriteEnabledFor(fighter.character.id)) return EMPTY;
  if (fighter.throwSyncFrames > 0 || fighter.superVictimFrames > 0 || fighter.wallBounceFrames > 0 || fighter.groundBounceFrames > 0) return EMPTY;
  if (fighter.state === 'attack') return EMPTY;

  const polish = motionPolishProfile(fighter.character.id);
  const locomotion = locomotionProfile(fighter.character.id);
  const velocityX = fighter.x - fighter.previousX;
  const velocityY = fighter.y - fighter.previousY;
  const speed = Math.min(1.7, Math.hypot(velocityX, velocityY) / 5.4);
  const stateClock = fighter.stateFrame / 60;
  const walkRate = (2.18 + speed * 1.7) * locomotion.walkCadence;
  const walkPhase01 = ((stateClock * walkRate) % 1 + 1) % 1;
  const footPlant = plantedStep(walkPhase01) * polish.footPlant * locomotion.heelPlant;
  const strideWave = Math.sin(walkPhase01 * Math.PI * 2);
  const counterStrideWave = Math.sin(walkPhase01 * Math.PI * 4 + Math.PI * .25);
  const stepLift = softTriangle(walkPhase01) * locomotion.stepLift;
  const stateEntry = Math.max(0, 1 - fighter.stateFrame / 7);
  const breathe = (Math.sin(time * (2.65 + polish.bob * .35) * locomotion.idleRate) + Math.sin(time * (5.1 + polish.bob * .22) * locomotion.idleRate) * .18) * (1.15 + polish.bob * .75) * locomotion.idleShift;
  let offsetX = 0;
  let offsetY = breathe;
  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;
  let alpha = 1;
  let torsoTwist = 0;

  switch (fighter.state) {
    case 'idle': {
      const shift = (Math.sin(time * (1.8 + polish.bob * .25) * locomotion.idleRate) + Math.sin(time * 3.95 * locomotion.idleRate + .8) * .18) * (1.4 + polish.stride * .7) * locomotion.idleShift;
      const settle = stateEntry * Math.max(0, Math.min(1, Math.abs(velocityX) / 2.4 + Math.abs(velocityY) / 3.5 + (fighter.landingFrames > 0 ? .32 : 0)));
      offsetX = shift * .45 * fighter.facing * polish.lean - fighter.facing * settle * 2.2 * locomotion.dashLean;
      offsetY += Math.abs(shift) * .22 - footPlant * .18 + settle * 1.6;
      rotation = shift * .0035 * polish.lean + fighter.facing * settle * .018 * locomotion.dashLean;
      torsoTwist = shift * .01 * polish.torsoTwist + fighter.facing * settle * .028 * polish.torsoTwist;
      scaleX = 1 + Math.abs(shift) * .0016 + settle * .018;
      scaleY = 1 - Math.abs(shift) * .0012 - settle * .02;
      break;
    }
    case 'walk': {
      const direction = Math.sign(velocityX || fighter.facing);
      const engage = Math.max(.32, Math.min(1, fighter.stateFrame / 6));
      const stride = strideWave * (2.8 + speed * 3.6) * polish.stride * locomotion.strideLength * engage;
      const suspension = counterStrideWave * (1.1 + speed * 1.6) * locomotion.hipSway * .42;
      offsetX = stride + direction * speed * 1.8 * locomotion.dashDrive - fighter.facing * stateEntry * 1.6 * locomotion.dashLean;
      offsetY += stepLift * (1.1 + speed * 2.15) * polish.bob - footPlant * .7 + suspension;
      rotation = strideWave * (.011 + speed * .012) * polish.lean * locomotion.hipSway - fighter.facing * stateEntry * .012 * locomotion.dashLean;
      torsoTwist = strideWave * .035 * polish.torsoTwist * locomotion.hipSway + counterStrideWave * .012 * polish.torsoTwist;
      scaleX = 1 + stepLift * .011 * polish.stride + speed * .008 + stateEntry * .01;
      scaleY = 1 - stepLift * .009 + footPlant * .004 - stateEntry * .008;
      break;
    }
    case 'crouch':
      offsetY += 21 + polish.footPlant * 2.2;
      offsetX -= fighter.facing * 1.5 * polish.lean;
      scaleX = 1.045 + polish.footPlant * .014;
      scaleY = .79;
      rotation = -.014 * fighter.facing * polish.lean;
      torsoTwist = -.025 * fighter.facing * polish.torsoTwist;
      break;
    case 'jump': {
      const rise = Math.max(-1, Math.min(1, fighter.jumpVelocity / Math.max(1, fighter.combatProfile.jumpVelocity)));
      const tuck = Math.min(1, fighter.jumpHeight / 145) * polish.jumpTuck;
      const apex = Math.max(0, 1 - Math.abs(rise));
      const launch = Math.max(0, Math.min(1, (26 - fighter.jumpHeight) / 26)) * Math.max(0, Math.min(1, rise + .2));
      offsetY -= fighter.jumpHeight + apex * 2.4 * (locomotion.apexHang - 1) + launch * 4.2;
      offsetX += fighter.facing * Math.max(-3.4, Math.min(3.4, velocityX * .5 * locomotion.airDrift)) - fighter.facing * launch * 1.4 * locomotion.riseLean;
      const airLean = rise >= 0 ? locomotion.riseLean : locomotion.fallLean;
      rotation = (-rise * .075 * airLean + velocityX * .005 * locomotion.airDrift - launch * .022 * locomotion.riseLean) * fighter.facing * polish.lean;
      scaleX = .985 + tuck * .018 + apex * .006 * locomotion.apexHang - launch * .016;
      scaleY = 1.015 - tuck * .012 - apex * .004 * locomotion.apexHang + launch * .024;
      torsoTwist = (-rise * .055 * airLean - launch * .02 * locomotion.riseLean) * fighter.facing * polish.torsoTwist;
      break;
    }
    case 'parry': {
      const pulse = Math.min(1, fighter.stateFrame / 6);
      offsetX = -fighter.facing * (3 + pulse * 2.4);
      offsetY -= 1.5 + pulse;
      rotation = -.055 * fighter.facing * polish.lean;
      scaleX = 1.018 + pulse * .012;
      scaleY = 1 - pulse * .006;
      torsoTwist = -.06 * fighter.facing * polish.torsoTwist;
      break;
    }
    case 'block': {
      const recoil = Math.max(0, 1 - fighter.stateFrame / 12) * polish.hitRecoil;
      offsetX = -fighter.facing * (4 + recoil * 4.5);
      offsetY += 1.5 + recoil;
      rotation = -.045 * fighter.facing * polish.lean;
      scaleX = .985 - recoil * .015;
      scaleY = 1.01 + recoil * .008;
      torsoTwist = -.045 * fighter.facing * polish.torsoTwist;
      break;
    }
    case 'hit': {
      const reaction = victimReactionSample(fighter);
      const recoil = reaction.impact * polish.hitRecoil;
      offsetX = reaction.offsetX;
      offsetY += reaction.offsetY;
      rotation = reaction.rotation * polish.lean;
      scaleX = reaction.scaleX;
      scaleY = reaction.scaleY;
      torsoTwist = reaction.torsoTwist * polish.torsoTwist;
      alpha = .97 + Math.min(.03, recoil * .03);
      break;
    }
    case 'knockdown':
    case 'ko': {
      const p = Math.max(.22, Math.min(1, Math.abs(fighter.stateFrame) / 28));
      offsetX = -fighter.facing * (12 + p * 16);
      offsetY += 47 + p * 14;
      rotation = -fighter.facing * (1.02 + p * .32);
      scaleX = 1.02;
      scaleY = .92;
      torsoTwist = -.1 * fighter.facing;
      break;
    }
    case 'victory': {
      const settle = Math.min(1, fighter.stateFrame / Math.max(12, 28 * polish.recoverySettle));
      offsetY -= 6 + settle * 2 + Math.sin(time * 2.05) * 1.6;
      rotation = Math.sin(time * 1.75) * .009 * polish.lean;
      scaleX = 1.025 + settle * .012;
      scaleY = 1.025 + settle * .012;
      torsoTwist = Math.sin(time * 1.2) * .02 * polish.torsoTwist;
      break;
    }
    default:
      offsetY += Math.sin(time * 1.1) * .45;
      torsoTwist = Math.sin(time * 1.45) * .012 * polish.torsoTwist;
      break;
  }

  if (!fighter.airborne && fighter.landingFrames > 0 && (fighter.state === 'idle' || fighter.state === 'walk')) {
    const landingP = Math.max(0, Math.min(1, fighter.landingFrames / 8));
    const squash = landingP * locomotion.landingSquash;
    const settleWave = Math.sin((1 - landingP) * Math.PI) * locomotion.landingSettle;
    const rebound = Math.sin((1 - landingP) * Math.PI * 2) * Math.max(0, 1 - landingP) * .55;
    offsetY += squash * 7.5 - settleWave * 1.4 - rebound * 1.2;
    scaleX *= 1 + squash * .032 + rebound * .01;
    scaleY *= 1 - squash * .052 - rebound * .014;
    rotation += fighter.facing * (settleWave * .006 + rebound * .004) * locomotion.dashLean;
    torsoTwist += fighter.facing * (settleWave * .012 + rebound * .01) * locomotion.hipSway;
  }

  if (fighter.dashFrames > 0 && !fighter.airborne && (fighter.state === 'walk' || fighter.state === 'idle')) {
    const dashP = Math.max(0, Math.min(1, fighter.dashFrames / 8));
    offsetX += fighter.facing * dashP * 5.5 * locomotion.dashDrive;
    rotation -= fighter.facing * dashP * .025 * locomotion.dashLean;
    scaleX *= 1 + dashP * .025 * locomotion.dashDrive;
    scaleY *= 1 - dashP * .012;
    torsoTwist -= fighter.facing * dashP * .018 * locomotion.dashLean;
  }

  return { useSprite:true, offsetX, offsetY, rotation, scaleX, scaleY, alpha, torsoTwist, footPlant, speed };
}
