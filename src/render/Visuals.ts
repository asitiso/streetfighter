import type { Fighter } from '../combat/Fighter.js';
import type { CharacterDef } from '../game/characters.js';
import { motionClipForFighter, sampleFighterMotion, type MotionClip } from './AnimationPoseLibrary.js';
import { fighterAnatomyProfile, fighterVisualProfile, superPoseProfile, type HandShape, type FootShape, type SuperPoseProfile } from './FighterVisualProfiles.js';
import { sampleStrikePose } from './FighterKinematicsProfiles.js';
import { bossMotionFor } from './BossAnimationProfiles.js';
import { throwMotionFor } from './ThrowAnimationProfiles.js';
import { throwJointPoseFor } from './ThrowJointProfiles.js';
import { superVictimPoseFor } from './SuperVictimProfiles.js';
import { characterTextureManager } from './CharacterTextureManager.js';
import { combatSpritePose } from './CombatSpriteProfiles.js';
import { attackSpriteSample, ATTACK_ATLAS_FRAME_HEIGHT, ATTACK_ATLAS_FRAME_WIDTH } from './AttackSpriteProfiles.js';
import { contactVisualEnvelope, contactVisualProfile } from './ContactVisualProfiles.js';
import { heroContactSample } from './HeroContactProfiles.js';
import { victimReactionSample } from './VictimReactionProfiles.js';
import { animationTransitionSample } from './AnimationTransitionProfiles.js';
import { animationSequenceSample } from './AnimationTimingMapper.js';
import { animationTextureManager } from './AnimationTextureManager.js';
import { animationFrameProfile } from './AnimationFrameProfiles.js';
import { specialKeyPoseAsset, specialKeyPoseImage, specialKeyPoseOpacity } from './SpecialKeyPoseLibrary.js';


interface NaturalizedRenderPose {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  torsoTwist: number;
}

interface MotionRenderMemory extends NaturalizedRenderPose {
  velocityX: number;
  velocityY: number;
  rotationVelocity: number;
  scaleVelocityX: number;
  scaleVelocityY: number;
  torsoVelocity: number;
  worldVelocityX: number;
  worldVelocityY: number;
  lastTime: number;
  lastState: string;
}

const MOTION_RENDER_MEMORY = new WeakMap<Fighter, MotionRenderMemory>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function naturalizeRenderPose(
  fighter: Fighter,
  time: number,
  target: NaturalizedRenderPose,
  flavour: 'sprite' | 'atlas',
): NaturalizedRenderPose {
  const previous = MOTION_RENDER_MEMORY.get(fighter);
  const worldVelocityX = fighter.x - fighter.previousX;
  const worldVelocityY = fighter.y - fighter.previousY;
  if (!previous) {
    const seeded: MotionRenderMemory = {
      ...target,
      velocityX: 0,
      velocityY: 0,
      rotationVelocity: 0,
      scaleVelocityX: 0,
      scaleVelocityY: 0,
      torsoVelocity: 0,
      worldVelocityX,
      worldVelocityY,
      lastTime: time,
      lastState: fighter.state,
    };
    MOTION_RENDER_MEMORY.set(fighter, seeded);
    return target;
  }

  const dtRaw = Number.isFinite(time - previous.lastTime) ? time - previous.lastTime : 1 / 60;
  const dt = clamp(dtRaw > 0 ? dtRaw : 1 / 60, 1 / 180, 1 / 20);
  const stateChanged = previous.lastState != fighter.state;
  const accelX = worldVelocityX - previous.worldVelocityX;
  const accelY = worldVelocityY - previous.worldVelocityY;
  const speed = Math.hypot(worldVelocityX, worldVelocityY);
  let response = flavour === 'atlas' ? 0.34 : 0.24;
  if (fighter.airborne) response += 0.05;
  if (stateChanged) response += flavour === 'atlas' ? 0.18 : 0.12;
  if (fighter.state === 'hit' || fighter.state === 'block' || fighter.state === 'parry') response += 0.08;
  response = clamp(response, 0.14, 0.58);
  const damping = flavour === 'atlas' ? 0.56 : 0.62;
  const settle = clamp(1 - fighter.stateFrame / 8, 0, 1);
  const accelerationLeadX = -accelX * (flavour === 'atlas' ? 0.38 : 0.28);
  const accelerationLeadY = -accelY * (flavour === 'atlas' ? 0.22 : 0.16);
  const settleShiftX = settle * (fighter.state === 'idle' ? -fighter.facing * Math.min(2.2, Math.abs(previous.worldVelocityX) * 0.52) : 0);
  const settleRotation = settle * (fighter.state === 'idle' ? fighter.facing * previous.worldVelocityX * 0.0026 : 0);
  const targetOffsetX = target.offsetX + accelerationLeadX + settleShiftX;
  const targetOffsetY = target.offsetY + accelerationLeadY;
  const targetRotation = target.rotation - accelX * 0.0042 * fighter.facing + settleRotation;
  const targetScaleX = target.scaleX + clamp(speed * 0.0028, 0, 0.018);
  const targetScaleY = target.scaleY - clamp(speed * 0.0018, 0, 0.012);
  const targetTorsoTwist = target.torsoTwist - accelX * 0.01 * fighter.facing;

  previous.velocityX = previous.velocityX * damping + (targetOffsetX - previous.offsetX) * response * 1.45;
  previous.velocityY = previous.velocityY * damping + (targetOffsetY - previous.offsetY) * response * 1.45;
  previous.rotationVelocity = previous.rotationVelocity * damping + (targetRotation - previous.rotation) * response * 1.35;
  previous.scaleVelocityX = previous.scaleVelocityX * damping + (targetScaleX - previous.scaleX) * response * 1.2;
  previous.scaleVelocityY = previous.scaleVelocityY * damping + (targetScaleY - previous.scaleY) * response * 1.2;
  previous.torsoVelocity = previous.torsoVelocity * damping + (targetTorsoTwist - previous.torsoTwist) * response * 1.25;

  const gain = dt * 60;
  previous.offsetX += (targetOffsetX - previous.offsetX) * response + previous.velocityX * gain;
  previous.offsetY += (targetOffsetY - previous.offsetY) * response + previous.velocityY * gain;
  previous.rotation += (targetRotation - previous.rotation) * response + previous.rotationVelocity * gain;
  previous.scaleX += (targetScaleX - previous.scaleX) * response + previous.scaleVelocityX * gain;
  previous.scaleY += (targetScaleY - previous.scaleY) * response + previous.scaleVelocityY * gain;
  previous.torsoTwist += (targetTorsoTwist - previous.torsoTwist) * response + previous.torsoVelocity * gain;

  previous.scaleX = clamp(previous.scaleX, 0.88, 1.18);
  previous.scaleY = clamp(previous.scaleY, 0.82, 1.2);
  previous.rotation = clamp(previous.rotation, -1.5, 1.5);
  previous.torsoTwist = clamp(previous.torsoTwist, -0.42, 0.42);
  previous.worldVelocityX = worldVelocityX;
  previous.worldVelocityY = worldVelocityY;
  previous.lastTime = time;
  previous.lastState = fighter.state;

  return {
    offsetX: previous.offsetX,
    offsetY: previous.offsetY,
    rotation: previous.rotation,
    scaleX: previous.scaleX,
    scaleY: previous.scaleY,
    torsoTwist: previous.torsoTwist,
  };
}

export function drawCharacterPortrait(ctx: CanvasRenderingContext2D, character: CharacterDef, x: number, y: number, scale: number, facing: 1 | -1, time = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale * character.widthScale, scale * character.heightScale);
  const breathe = Math.sin(time * 2.2) * 2.2;
  ctx.translate(0, breathe);
  drawShadow(ctx);
  drawLeg(ctx, -18, character.primary, -3, character);
  drawLeg(ctx, 20, character.primary, 3, character);
  drawTorso(ctx, character);
  drawClothingSecondary(ctx, character, time, .35);
  drawArm(ctx, -1, character, time);
  drawArm(ctx, 1, character, time + 1.1);
  drawHead(ctx, character, time, .35);
  ctx.restore();
}

export type CharacterPreviewPose = 'idle' | 'walk' | 'signature' | 'parry' | 'victory';

export function secondaryMotionKindFor(characterId: string): string {
  if (characterId === 'RYU' || characterId === 'ALEX') return 'headband';
  if (characterId === 'IBUKI') return 'ponytail-mask';
  if (characterId === 'CHUNLI') return 'ribbon-sash';
  if (characterId === 'MAKOTO') return 'belt-tails';
  if (characterId === 'DUDLEY') return 'bow-coattail';
  if (characterId === 'YUN') return 'cap-shirt';
  if (characterId === 'KEN') return 'long-hair';
  return 'minimal';
}

export type CombatAnimationPhase = 'neutral' | 'anticipation' | 'contact' | 'follow-through' | 'recovery';

export function combatAnimationPhase(fighter: Fighter): CombatAnimationPhase {
  const move = fighter.currentMove;
  if (!move || fighter.state !== 'attack') return 'neutral';
  if (fighter.moveFrame < move.startup) return 'anticipation';
  if (fighter.moveFrame < move.startup + move.active) return 'contact';
  const recoveryFrame = fighter.moveFrame - move.startup - move.active;
  if (recoveryFrame < Math.max(2, Math.floor(move.recovery * .42))) return 'follow-through';
  return 'recovery';
}

export function characterPreviewPose(time: number): CharacterPreviewPose {
  const t = ((time % 6.4) + 6.4) % 6.4;
  if (t < 1.25) return 'idle';
  if (t < 2.55) return 'walk';
  if (t < 3.85) return 'signature';
  if (t < 4.75) return 'parry';
  return 'victory';
}

export function drawCharacterPreview(
  ctx: CanvasRenderingContext2D,
  character: CharacterDef,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1,
  time = 0,
  pose: CharacterPreviewPose = characterPreviewPose(time),
): void {
  ctx.save();
  ctx.translate(x, y);
  const walkT = pose === 'walk' ? Math.sin(time * 10.5) : 0;
  const breathe = Math.sin(time * 2.5) * 2.3;
  const attackPulse = pose === 'signature' ? Math.sin(Math.min(1, ((time % 1.3) / 1.3)) * Math.PI) : 0;
  ctx.translate(pose === 'walk' ? walkT * 12 : pose === 'signature' ? facing * attackPulse * 12 : 0, breathe);
  ctx.scale(facing * scale * character.widthScale, scale * character.heightScale);

  if (pose === 'signature') {
    ctx.save();
    ctx.globalAlpha = .13 + attackPulse * .12;
    ctx.translate(-facing * 22, 0);
    drawShadow(ctx);
    drawPreviewSignaturePose(ctx, character, time - .06, attackPulse * .75);
    ctx.restore();
  }

  drawShadow(ctx);
  if (pose === 'walk') {
    drawLeg(ctx, -18 + walkT * 13, character.primary, -4 - walkT * 1.2, character);
    drawLeg(ctx, 20 - walkT * 13, character.primary, 4 + walkT * 1.2, character);
  } else if (pose === 'signature' && ['CHUNLI', 'KEN', 'IBUKI', 'YUN'].includes(character.id)) {
    drawLeg(ctx, -17, character.primary, -8, character);
    ctx.save(); ctx.rotate(-.42 + attackPulse * .38); drawExtendedLimb(ctx, 8, -59, 108 + attackPulse * 62, character.primary, 18); ctx.restore();
  } else {
    drawLeg(ctx, -18, character.primary, pose === 'victory' ? -10 : -3, character);
    drawLeg(ctx, 20, character.primary, pose === 'victory' ? 8 : 3, character);
  }
  drawTorso(ctx, character);
  drawClothingSecondary(ctx, character, time, pose === 'signature' ? 1.1 : pose === 'walk' ? .65 : .3);

  if (pose === 'signature') drawPreviewSignaturePose(ctx, character, time, attackPulse);
  else if (pose === 'parry') drawParryArms(ctx, character);
  else if (pose === 'victory') drawVictoryPose(ctx, character, time);
  else {
    drawArm(ctx, -1, character, time + (pose === 'walk' ? Math.PI : 0));
    drawArm(ctx, 1, character, time + 1.1);
  }
  drawHead(ctx, character, time, pose === 'signature' ? 1.1 : pose === 'walk' ? .65 : .3, 0, pose === 'victory' ? 'victory' : pose === 'signature' || pose === 'parry' ? 'focus' : 'neutral');

  if (pose === 'parry') {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(18, -112, 3, 18, -112, 72);
    glow.addColorStop(0, 'rgba(112,235,255,.86)');
    glow.addColorStop(.4, 'rgba(76,133,255,.3)');
    glow.addColorStop(1, 'rgba(76,133,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(18, -112, 72, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPreviewSignaturePose(ctx: CanvasRenderingContext2D, c: CharacterDef, time: number, power: number): void {
  const p = Math.max(.18, Math.min(1.15, power));
  if (c.id === 'RYU') {
    drawArm(ctx, -1, c, time);
    ctx.save(); ctx.rotate(-.12 + p * .06); drawExtendedLimb(ctx, 22, -116, 86 + p * 54, c.primary, 15); ctx.restore();
  } else if (c.id === 'KEN') {
    ctx.save(); ctx.rotate(-1.16 + p * .34); drawExtendedLimb(ctx, 19, -118, 95 + p * 52, c.primary, 15); ctx.restore();
    drawArm(ctx, -1, c, time + .8);
  } else if (c.id === 'CHUNLI') {
    drawArm(ctx, -1, c, time); drawArm(ctx, 1, c, time + .5);
  } else if (c.id === 'ALEX') {
    ctx.save(); ctx.rotate(-.34); drawExtendedLimb(ctx, 22, -116, 76 + p * 34, c.primary, 19); ctx.restore();
    ctx.save(); ctx.rotate(.34); drawExtendedLimb(ctx, 4, -101, 72 + p * 30, c.primary, 19); ctx.restore();
  } else if (c.id === 'DUDLEY') {
    ctx.save(); ctx.rotate(-.12); drawExtendedLimb(ctx, 20, -113, 72 + p * 45, c.primary, 16); ctx.restore();
    ctx.save(); ctx.rotate(.18); drawExtendedLimb(ctx, 6, -99, 63 + p * 24, c.accent, 15); ctx.restore();
  } else if (c.id === 'MAKOTO') {
    drawArm(ctx, -1, c, time);
    ctx.save(); ctx.rotate(-.04); drawExtendedLimb(ctx, 24, -114, 84 + p * 64, c.primary, 16); ctx.restore();
  } else if (c.id === 'IBUKI') {
    drawArm(ctx, -1, c, time + 1.4);
    ctx.save(); ctx.rotate(-.42); drawExtendedLimb(ctx, 20, -113, 72 + p * 42, c.primary, 13); ctx.restore();
  } else if (c.id === 'YUN') {
    ctx.save(); ctx.rotate(-.22); drawExtendedLimb(ctx, 20, -114, 78 + p * 40, c.primary, 14); ctx.restore();
    ctx.save(); ctx.rotate(.28); drawExtendedLimb(ctx, 5, -100, 62 + p * 22, c.accent, 13); ctx.restore();
  } else {
    drawArm(ctx, -1, c, time);
    ctx.save(); ctx.rotate(-.08); drawExtendedLimb(ctx, 21, -116, 88 + p * 44, c.primary, 17); ctx.restore();
  }
}

function throwPairVisual(fighter: Fighter): { x:number; y:number; rotation:number; crouch:number; armSpread:number; lift:number } {
  if (fighter.throwSyncFrames <= 0 || !fighter.throwSyncRole) return { x:0, y:0, rotation:0, crouch:0, armSpread:0, lift:0 };
  return throwMotionFor(fighter.throwSyncStyle, fighter.throwSyncRole, fighter.throwSyncProgress, fighter.throwSyncDirection);
}


function drawAtlasFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  hd: boolean,
  row: number,
  frame: number,
  alpha: number,
): void {
  const smoothing = ctx.imageSmoothingEnabled;
  const smoothingQuality = ctx.imageSmoothingQuality;
  characterTextureManager.configureSampling(ctx, hd);
  ctx.globalAlpha = alpha;
  const sourceFrameWidth = Math.max(1, image.naturalWidth / 5);
  const sourceFrameHeight = Math.max(1, image.naturalHeight / 4);
  ctx.drawImage(
    image,
    frame * sourceFrameWidth,
    row * sourceFrameHeight,
    sourceFrameWidth,
    sourceFrameHeight,
    -96,
    -220,
    ATTACK_ATLAS_FRAME_WIDTH,
    ATTACK_ATLAS_FRAME_HEIGHT,
  );
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = smoothingQuality;
}


function drawHighFrameSequenceSprite(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, time: number): boolean {
  if (!characterTextureManager.wantsHd()) return false;
  const sample = animationSequenceSample(fighter, time);
  if (!sample) return false;
  const texture = animationTextureManager.selection(sample.sequence);
  if (!texture) return false;
  const image = texture.image;
  const sequence = sample.sequence;
  const frameWidth = image.naturalWidth / Math.max(1, sequence.frameCount);
  const frameHeight = image.naturalHeight;
  const velocity = fighter.x - fighter.previousX;
  const stable = fighter.state === 'idle' && Math.abs(velocity) < .2 && fighter.jumpHeight <= 1;
  const baseX = characterTextureManager.snapCoordinate(x, true, stable);
  const baseY = characterTextureManager.snapCoordinate(y, true, stable);

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.save();
  ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
  drawShadow(ctx);
  ctx.restore();
  if (fighter.state === 'jump') ctx.translate(0, -fighter.jumpHeight);

  const frameProfile = animationFrameProfile(fighter.character.id, sequence.kind);
  const lockStrength = sequence.footLock ? frameProfile.footLockStrength : 0;
  if (lockStrength > 0) {
    const anchorX = frameProfile.anchorX[sample.frame] ?? 0;
    const anchorY = frameProfile.anchorY[sample.frame] ?? 0;
    // Anchor data uses source pixels; all sequence canvases draw at half scale * .88.
    const sourceToWorld = .44;
    ctx.translate(
      fighter.facing * anchorX * lockStrength * sourceToWorld,
      anchorY * lockStrength * sourceToWorld,
    );
  }

  ctx.scale(fighter.facing * fighter.character.widthScale * .88, fighter.character.heightScale * .88);
  if (fighter.hitFlash > 0) ctx.filter = 'brightness(2.1) saturate(.5)';
  const smoothing = ctx.imageSmoothingEnabled;
  const smoothingQuality = ctx.imageSmoothingQuality;
  characterTextureManager.configureSampling(ctx, true);
  ctx.drawImage(
    image,
    sample.frame * frameWidth,
    0,
    frameWidth,
    frameHeight,
    -sequence.frameWidth / 4,
    -220,
    sequence.frameWidth / 2,
    sequence.frameHeight / 2,
  );
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = smoothingQuality;
  ctx.restore();
  return true;
}

function drawSpecialKeyPoseSprite(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, time: number): boolean {
  const move = fighter.currentMove;
  if (fighter.state !== 'attack' || !move || !characterTextureManager.wantsHd()) return false;
  const opacity = specialKeyPoseOpacity(move, fighter.moveFrame);
  if (opacity <= 0) return false;
  const asset = specialKeyPoseAsset(fighter.character.id, move);
  if (!asset) return false;
  const image = specialKeyPoseImage(asset);
  if (!image) return false;

  if (opacity < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - opacity;
    if (!drawAttackAtlasSprite(ctx, fighter, x, y, time)) drawAssetCombatSprite(ctx, fighter, x, y, time);
    ctx.restore();
  }

  const activeProgress = Math.max(0, Math.min(1, (fighter.moveFrame - move.startup) / Math.max(1, move.active)));
  const lift = asset.includes('shoryuken') ? activeProgress * 10 : asset.includes('tatsumaki') || asset.includes('spinning-bird-kick') ? Math.sin(activeProgress * Math.PI) * 5 : 0;
  const drive = asset.includes('hadoken') || asset.includes('kikoken') ? activeProgress * 4 : asset.includes('super-rush') ? activeProgress * 7 : 0;
  const rotation = asset.includes('tatsumaki') || asset.includes('spinning-bird-kick') ? Math.sin(activeProgress * Math.PI * 2) * .045 : 0;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(x + fighter.facing * drive, y - lift);
  ctx.save();
  ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
  drawShadow(ctx);
  ctx.restore();
  ctx.translate(0, -fighter.jumpHeight);
  ctx.rotate(fighter.facing * rotation);
  ctx.scale(fighter.facing * fighter.character.widthScale * .88, fighter.character.heightScale * .88);
  if (fighter.hitFlash > 0) ctx.filter = 'brightness(2.1) saturate(.5)';
  const smoothing = ctx.imageSmoothingEnabled;
  const smoothingQuality = ctx.imageSmoothingQuality;
  characterTextureManager.configureSampling(ctx, true);
  ctx.drawImage(image, -96, -220, 192, 224);
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = smoothingQuality;
  ctx.restore();
  return true;
}

function drawAttackAtlasSprite(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, time: number): boolean {
  const texture = characterTextureManager.attackSelection(fighter.character.id);
  if (!texture) return false;
  const image = texture.image;
  const sample = attackSpriteSample(fighter);
  if (!sample.useAtlas) return false;
  const renderPose = naturalizeRenderPose(fighter, time, {
    offsetX: sample.offsetX,
    offsetY: sample.offsetY,
    rotation: sample.rotation,
    scaleX: sample.scaleX,
    scaleY: sample.scaleY,
    torsoTwist: 0,
  }, 'atlas');

  const velocity = fighter.x - fighter.previousX;
  const stableHdBase = texture.hd && Math.abs(velocity) < .35 && sample.phase !== 'follow-through';
  const baseX = characterTextureManager.snapCoordinate(x, texture.hd, stableHdBase);
  const baseY = characterTextureManager.snapCoordinate(y, texture.hd, stableHdBase);

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.save();
  ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
  drawShadow(ctx);
  ctx.restore();

  const baseScaleX = fighter.character.widthScale * .88 * sample.scaleX;
  const baseScaleY = fighter.character.heightScale * .88 * sample.scaleY;
  const travel = Math.max(-8, Math.min(8, velocity * 1.6));

  // Movement echoes bridge baked frames together so startup/follow-through do not read as card swaps.
  if (sample.afterimage > .04) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 2; i >= 1; i -= 1) {
      const echoAlpha = sample.afterimage * (.14 / i);
      ctx.save();
      ctx.translate(
        fighter.facing * (renderPose.offsetX - i * (8 + sample.smear * 7)) - travel * i,
        renderPose.offsetY + i * .7,
      );
      ctx.rotate(renderPose.rotation * .72);
      ctx.scale(fighter.facing * baseScaleX, baseScaleY);
      ctx.filter = i === 2 ? 'blur(1.2px) brightness(1.3)' : 'brightness(1.18)';
      drawAtlasFrame(ctx, image, texture.hd, sample.row, sample.frame, echoAlpha);
      ctx.restore();
    }
    ctx.restore();
  }

  // Horizontal smear behind fast specials/supers; deliberately subtle for normals/throws.
  if (sample.smear > .18) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(fighter.facing * (renderPose.offsetX - 10 * sample.smear) - travel, renderPose.offsetY);
    ctx.rotate(renderPose.rotation * .6);
    ctx.scale(fighter.facing * baseScaleX * (1 + sample.smear * .12), baseScaleY * (1 - sample.smear * .025));
    ctx.filter = 'blur(1.6px) brightness(1.45) saturate(1.15)';
    drawAtlasFrame(ctx, image, texture.hd, sample.row, sample.frame, Math.min(.22, sample.smear * .12));
    ctx.restore();
  }

  ctx.translate(fighter.facing * renderPose.offsetX, renderPose.offsetY);
  ctx.rotate(renderPose.rotation);
  ctx.scale(fighter.facing * fighter.character.widthScale * .88 * renderPose.scaleX, fighter.character.heightScale * .88 * renderPose.scaleY);
  if (fighter.hitFlash > 0) ctx.filter = 'brightness(2.1) saturate(.5)';
  drawAtlasFrame(ctx, image, texture.hd, sample.row, sample.frame, sample.alpha);
  ctx.restore();
  return true;
}

function drawAssetCombatSprite(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number, time: number): boolean {
  const texture = characterTextureManager.combatSelection(fighter.character.id);
  if (!texture) return false;
  const image = texture.image;
  const pose = combatSpritePose(fighter, time);
  if (!pose.useSprite) return false;
  const renderPose = naturalizeRenderPose(fighter, time, pose, 'sprite');

  const velocity = fighter.x - fighter.previousX;
  const stableHdBase = texture.hd && Math.abs(velocity) < .28 && fighter.jumpHeight <= 1 && fighter.dashFrames <= 0;
  const baseX = characterTextureManager.snapCoordinate(x, texture.hd, stableHdBase);
  const baseY = characterTextureManager.snapCoordinate(y, texture.hd, stableHdBase);

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.save();
  ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
  drawShadow(ctx);
  ctx.restore();

  const motionStrength = Math.min(1, Math.abs(velocity) / 5.8 + (fighter.dashFrames > 0 ? .65 : 0));
  const victimEcho = fighter.state === 'hit' ? victimReactionSample(fighter) : null;
  if (victimEcho && victimEcho.echo > .08) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 2; i >= 1; i -= 1) {
      ctx.save();
      ctx.translate(
        fighter.facing * renderPose.offsetX + fighter.lastHitDirection * i * (6 + victimEcho.echo * 9),
        renderPose.offsetY - i * (1.2 + victimEcho.sequencePulse * 1.8),
      );
      ctx.rotate(renderPose.rotation - victimEcho.rotation * .28 * i);
      ctx.scale(
        fighter.facing * fighter.character.widthScale * .88 * renderPose.scaleX,
        fighter.character.heightScale * .88 * renderPose.scaleY,
      );
      ctx.globalAlpha = victimEcho.echo * (.09 / i);
      ctx.filter = i === 2 ? 'blur(1.3px) brightness(1.35)' : 'brightness(1.18)';
      const smoothing = ctx.imageSmoothingEnabled;
      const smoothingQuality = ctx.imageSmoothingQuality;
      characterTextureManager.configureSampling(ctx, texture.hd);
      ctx.drawImage(image, -96, -220, 192, 224);
      ctx.imageSmoothingEnabled = smoothing;
      ctx.imageSmoothingQuality = smoothingQuality;
      ctx.restore();
    }
    ctx.restore();
  }
  if (motionStrength > .18 && (fighter.state === 'walk' || fighter.state === 'jump')) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 2; i >= 1; i -= 1) {
      ctx.save();
      ctx.translate(
        fighter.facing * renderPose.offsetX - velocity * i * 1.9 - fighter.facing * i * 2.5,
        renderPose.offsetY + i * .6,
      );
      ctx.rotate(renderPose.rotation - renderPose.torsoTwist * .25);
      ctx.scale(
        fighter.facing * fighter.character.widthScale * .88 * renderPose.scaleX,
        fighter.character.heightScale * .88 * renderPose.scaleY,
      );
      ctx.globalAlpha = motionStrength * (.08 / i);
      ctx.filter = i === 2 ? 'blur(1.1px) brightness(1.25)' : 'brightness(1.12)';
      const smoothing = ctx.imageSmoothingEnabled;
      const smoothingQuality = ctx.imageSmoothingQuality;
      characterTextureManager.configureSampling(ctx, texture.hd);
      ctx.drawImage(image, -96, -220, 192, 224);
      ctx.imageSmoothingEnabled = smoothing;
      ctx.imageSmoothingQuality = smoothingQuality;
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.translate(fighter.facing * renderPose.offsetX, renderPose.offsetY);
  ctx.rotate(renderPose.rotation + renderPose.torsoTwist * .16);
  ctx.scale(fighter.facing * fighter.character.widthScale * .88 * renderPose.scaleX, fighter.character.heightScale * .88 * renderPose.scaleY);
  ctx.globalAlpha = pose.alpha;
  if (fighter.hitFlash > 0) ctx.filter = 'brightness(2.1) saturate(.5)';
  const smoothing = ctx.imageSmoothingEnabled;
  const smoothingQuality = ctx.imageSmoothingQuality;
  characterTextureManager.configureSampling(ctx, texture.hd);
  ctx.drawImage(image, -96, -220, 192, 224);
  ctx.imageSmoothingEnabled = smoothing;
  ctx.imageSmoothingQuality = smoothingQuality;

  if (fighter.state === 'parry') {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(20, -112, 4, 20, -112, 78);
    glow.addColorStop(0, 'rgba(110,238,255,.86)');
    glow.addColorStop(.38, 'rgba(76,128,255,.34)');
    glow.addColorStop(1, 'rgba(76,128,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(20, -112, 78, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,250,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(18, -112, 38 + Math.sin(time * 12) * 4, -.8, .8); ctx.stroke();
  }
  ctx.restore();
  return true;
}

export function drawCombatFighter(ctx: CanvasRenderingContext2D, fighter: Fighter, alpha: number, time: number): void {
  const x = fighter.previousX + (fighter.x - fighter.previousX) * alpha;
  const y = fighter.previousY + (fighter.y - fighter.previousY) * alpha;
  const transition = animationTransitionSample(fighter);
  ctx.save();
  if (transition.active) {
    ctx.translate(x, y);
    ctx.translate(fighter.facing * transition.offsetX, transition.offsetY);
    ctx.rotate(transition.rotation);
    ctx.scale(transition.scaleX, transition.scaleY);
    ctx.translate(-x, -y);
  }
  if (drawHighFrameSequenceSprite(ctx, fighter, x, y, time)) { ctx.restore(); return; }
  if (drawSpecialKeyPoseSprite(ctx, fighter, x, y, time)) { ctx.restore(); return; }
  if (drawAttackAtlasSprite(ctx, fighter, x, y, time)) { ctx.restore(); return; }
  if (drawAssetCombatSprite(ctx, fighter, x, y, time)) { ctx.restore(); return; }
  const throwPair = throwPairVisual(fighter);
  const throwJoints = fighter.throwSyncFrames > 0 && fighter.throwSyncRole ? throwJointPoseFor(fighter.throwSyncStyle, fighter.throwSyncRole, fighter.throwSyncProgress) : null;
  const superVictimActive = fighter.superVictimFrames > 0 && fighter.throwSyncFrames <= 0;
  const victimReaction = victimReactionSample(fighter);
  const superVictim = superVictimActive ? superVictimPoseFor(fighter.superVictimMotif, fighter.superVictimProgress, fighter.superVictimDirection, fighter.superVictimHitIndex, fighter.superVictimHitTotal) : { x:0, y:0, rotation:0, scaleX:1, scaleY:1, armOpen:0, legKick:0, flash:0 };
  const move = fighter.currentMove;
  const anatomy = fighterAnatomyProfile(fighter.character.id);
  const motion = sampleFighterMotion(fighter, time);
  const motionState = motionClipForFighter(fighter, time);
  const animationPhase = combatAnimationPhase(fighter);
  const attackFrame = move ? fighter.moveFrame : 0;
  const totalFrames = move ? Math.max(1, move.startup + move.active + move.recovery) : 1;
  const attackP = move ? Math.min(1, attackFrame / totalFrames) : 0;
  const active = fighter.isMoveActive();
  const strikePose = move && fighter.state === 'attack' && move.button ? sampleStrikePose(fighter.character.id, move.button, attackP, active, move) : null;
  const moving = fighter.state === 'walk';
  const idleBreath = fighter.state === 'idle' ? Math.sin(time * 3.25) * 2.4 : 0;
  const walkBounce = moving ? Math.abs(Math.sin(time * 11.5)) * 3.2 : 0;
  const stride = moving ? Math.sin(time * 11.5) * 13 : 0;
  const crouch = fighter.state === 'crouch' ? 22 : 0;
  const hitPhase = fighter.state === 'hit' ? Math.min(1, Math.abs(fighter.stateFrame) / 18) : 0;
  const hitDirectionLocal = fighter.lastHitDirection * fighter.facing;
  const zoneLean = fighter.lastHitZone === 'head' ? 1.16 : fighter.lastHitZone === 'leg' ? .68 : fighter.lastHitZone === 'launch' ? 1.24 : fighter.lastHitZone === 'throw' ? 1.38 : 1;
  const reactionLeanScale = (fighter.lastHitReaction === 'low' ? .72 : fighter.lastHitReaction === 'launch' ? 1.22 : fighter.lastHitReaction === 'throw' ? 1.35 : fighter.lastHitReaction === 'high' ? 1.08 : 1) * zoneLean;
  const hitLean = fighter.state === 'hit' ? (-10 - hitPhase * 10) * hitDirectionLocal * reactionLeanScale : fighter.state === 'block' ? -6 : 0;
  const reactionY = fighter.state === 'hit' ? (fighter.lastHitZone === 'leg' ? 10 : fighter.lastHitZone === 'launch' ? -11 : fighter.lastHitZone === 'head' ? -3 : fighter.lastHitZone === 'throw' ? 6 : 1) * hitPhase : 0;
  const jumpTilt = fighter.airborne ? Math.max(-.12, Math.min(.14, fighter.jumpVelocity * -.012)) : 0;
  const startupT = move ? Math.min(1, fighter.moveFrame / Math.max(1, move.startup)) : 0;
  const activeT = move && fighter.moveFrame >= move.startup ? Math.min(1, (fighter.moveFrame - move.startup + 1) / Math.max(1, move.active)) : 0;
  const recoveryT = move && fighter.moveFrame >= move.startup + move.active ? Math.min(1, (fighter.moveFrame - move.startup - move.active + 1) / Math.max(1, move.recovery)) : 0;
  const explosive = fighter.character.id === 'MAKOTO' || fighter.character.id === 'ALEX' ? 1.28 : fighter.character.id === 'IBUKI' || fighter.character.id === 'YUN' ? 1.1 : 1;
  const keyframePulse = animationPhase === 'anticipation' ? -6 * (1 - startupT) : animationPhase === 'contact' ? 5 + Math.sin(activeT * Math.PI) * 7 : animationPhase === 'follow-through' ? 4 * (1 - recoveryT) : 0;
  const bodyLunge = move && fighter.state === 'attack' ? (((active ? 10 + move.damage * .025 : -5 * (1 - startupT)) * explosive * (1 - recoveryT * .65)) + keyframePulse) : 0;
  const moveTilt = move?.id.endsWith('_MOBILITY') ? -.15 * fighter.facing : move?.id.endsWith('_ANTI_AIR') ? -.08 * fighter.facing : move?.technique === 'air' ? -.12 * fighter.facing : move?.technique === 'command' ? -.06 * fighter.facing : 0;

  ctx.save();
  ctx.translate(x + throwPair.x + superVictim.x, y + throwPair.y + superVictim.y);
  ctx.save();
  ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
  drawShadow(ctx);
  ctx.restore();

  if (move?.id.endsWith('_MOBILITY') && fighter.state === 'attack' && attackP > .12 && attackP < .78) {
    for (let i = 3; i >= 1; i -= 1) {
      ctx.save();
      ctx.globalAlpha = .08 * i;
      ctx.translate(-fighter.facing * i * 19, -fighter.jumpHeight);
      ctx.scale(fighter.facing * fighter.character.widthScale, fighter.character.heightScale);
      drawGhostPose(ctx, fighter.character, time - i * .08);
      ctx.restore();
    }
  }

  ctx.translate(
    fighter.facing * (bodyLunge + motion.bodyX) + (!superVictimActive && victimReaction.active ? victimReaction.offsetX : 0),
    -fighter.jumpHeight - idleBreath - walkBounce + crouch + throwPair.crouch + motion.bodyY + motion.crouch + reactionY + (move && fighter.state === 'attack' && !active ? (1 - startupT) * 3 : 0) + (!superVictimActive && victimReaction.active ? victimReaction.offsetY : 0),
  );
  const phaseTilt = animationPhase === 'anticipation' ? -.028 : animationPhase === 'contact' ? .032 : animationPhase === 'follow-through' ? .018 : animationPhase === 'recovery' ? -.01 : 0;
  const contactProfile = contactVisualProfile(fighter);
  const contactEnvelope = contactVisualEnvelope(fighter);
  const heroContact = heroContactSample(fighter);
  const heroProfile = heroContact.profile;
  if (contactEnvelope > 0) {
    ctx.translate(fighter.facing * contactProfile.drive * contactEnvelope, -contactProfile.lift * contactEnvelope);
  }
  if (heroContact.active && heroProfile) {
    const releasePull = heroContact.phase === 'release' ? -.22 : 1;
    ctx.translate(
      fighter.facing * heroProfile.bodyDrive * heroContact.intensity * releasePull,
      -heroProfile.bodyLift * heroContact.intensity,
    );
  }
  ctx.rotate(jumpTilt + moveTilt + motion.rotation * fighter.facing + phaseTilt * fighter.facing + throwPair.rotation + superVictim.rotation + (!superVictimActive && victimReaction.active ? victimReaction.rotation : 0) + (strikePose?.hipAngle ?? 0) * Math.PI / 180 * .08 * fighter.facing + (move && fighter.state === 'attack' ? (activeT * .018 - recoveryT * .012) * fighter.facing : 0) + fighter.facing * contactProfile.rotate * contactEnvelope + (heroContact.active && heroProfile ? fighter.facing * heroProfile.bodyRotate * heroContact.intensity : 0));
  const heroScaleX = heroContact.active && heroProfile ? 1 + (heroProfile.stretchX - 1) * heroContact.intensity : 1;
  const heroScaleY = heroContact.active && heroProfile ? 1 + (heroProfile.stretchY - 1) * heroContact.intensity : 1;
  ctx.scale(
    fighter.facing * fighter.character.widthScale * motion.scaleX * superVictim.scaleX * (1 + (contactProfile.scaleX - 1) * contactEnvelope) * heroScaleX * (!superVictimActive && victimReaction.active ? victimReaction.scaleX : 1),
    fighter.character.heightScale * motion.scaleY * superVictim.scaleY * (1 + (contactProfile.scaleY - 1) * contactEnvelope) * heroScaleY * (!superVictimActive && victimReaction.active ? victimReaction.scaleY : 1),
  );
  if (fighter.hitFlash > 0 || superVictim.flash > .18) ctx.filter = `brightness(${fighter.hitFlash > 0 ? 2.35 : 1.65 + superVictim.flash * .7}) saturate(${fighter.hitFlash > 0 ? .4 : .72})`;
  if (fighter.state === 'knockdown' || fighter.state === 'ko') {
    const downProgress = Math.max(0, Math.min(1, 1 - Math.abs(Math.min(0, fighter.stateFrame)) / 34));
    const koStyle = (fighter.character.id === 'ALEX' || fighter.character.id === 'URIEN' ? 1.12 : fighter.character.id === 'IBUKI' || fighter.character.id === 'YUN' ? .88 : 1) * anatomy.koSpin;
    const koDirection = fighter.character.id === 'CHUNLI' || fighter.character.id === 'MAKOTO' ? .9 : 1;
    ctx.rotate(-Math.PI * (.24 + downProgress * .3) * koStyle * koDirection);
    ctx.translate((-8 - downProgress * 25) * anatomy.koSlide, -10 + downProgress * (fighter.character.id === 'DUDLEY' ? 12 : 22));
  } else if (fighter.wallBounceFrames > 0) {
    ctx.rotate(fighter.facing * .36);
  } else if (fighter.groundBounceFrames > 0) {
    ctx.rotate(-fighter.facing * .22);
  } else if (fighter.state === 'victory') {
    ctx.translate(0, -6 * anatomy.victoryLift);
    ctx.rotate(anatomy.victoryLean + Math.sin(time * 2.2) * .015 * anatomy.victoryLift);
  } else if (hitLean !== 0) {
    ctx.rotate(hitLean * anatomy.hitTwist * Math.PI / 180);
  }

  if (throwJoints) {
    drawJointedLeg(ctx, -17, fighter.character.primary, throwJoints.rearLegUpper, throwJoints.rearKnee, 1, fighter.character);
    drawJointedLeg(ctx, 18, fighter.character.primary, throwJoints.frontLegUpper, throwJoints.frontKnee, 1, fighter.character);
  } else if (superVictimActive) {
    drawJointedLeg(ctx, -17, fighter.character.primary, -12 - superVictim.legKick * 24, 18 + superVictim.legKick * 16, 1, fighter.character, -superVictim.legKick * 18);
    drawJointedLeg(ctx, 18, fighter.character.primary, 14 + superVictim.legKick * 28, -10 - superVictim.legKick * 12, 1, fighter.character, superVictim.legKick * 22);
  } else if (fighter.state === 'victory') {
    drawLeg(ctx, -20, fighter.character.primary, -10, fighter.character);
    drawLeg(ctx, 19, fighter.character.primary, 8, fighter.character);
  } else if (move?.superCost && superPoseProfile(move.id)) {
    drawSuperLowerBody(ctx, fighter, superPoseProfile(move.id)!, activeT);
  } else if (['antiAir', 'spin', 'rush', 'throw', 'throwEscape', 'landing', 'dash'].includes(motionState.clip)) {
    drawSpecialLowerBody(ctx, fighter, motionState.clip, motion.frontLegAngle, motion.rearLegAngle, motionState.progress, active);
  } else if (fighter.state === 'jump' || (move?.technique === 'air' && fighter.state === 'attack' && !move.button?.endsWith('k'))) {
    drawJointedLeg(ctx, -14, fighter.character.primary, motion.rearLegAngle, 18, 1, fighter.character);
    drawJointedLeg(ctx, 15, fighter.character.primary, motion.frontLegAngle, -24, 1, fighter.character);
  } else if (move && fighter.state === 'attack' && (move.button?.endsWith('k') || move.id.endsWith('_MOBILITY'))) {
    const extend = active ? 1 : Math.sin(Math.min(1, attackP * 1.8) * Math.PI) * .75;
    const hip = strikePose?.hipAngle ?? (-48 + extend * 38);
    const knee = strikePose?.kneeAngle ?? (-8 + extend * 18);
    const legReach = strikePose?.legReach ?? (1.08 + extend * .2);
    const ankle = strikePose?.ankleAngle ?? 0;
    drawJointedLeg(ctx, -17, fighter.character.primary, -7 - (strikePose?.hipAngle ?? 0) * .16, 12 + (strikePose?.kneeAngle ?? 0) * .08, 1, fighter.character, -ankle * .35);
    if (active && (fighter.character.id === 'CHUNLI' || fighter.character.id === 'KEN' || fighter.character.id === 'IBUKI' || fighter.character.id === 'YUN')) {
      for (let smear = 2; smear >= 1; smear -= 1) { ctx.save(); ctx.globalAlpha = .08 * smear; ctx.rotate(-.52 + extend * .31 - smear * .045); drawExtendedLimb(ctx, 8, -59, 108 + extend * 58, fighter.character.accent, 15); ctx.restore(); }
    }
    drawJointedLeg(ctx, 17, fighter.character.primary, hip, knee, legReach, fighter.character, ankle);
  } else {
    const motionStride = fighter.state === 'walk' ? stride * .24 : 0;
    drawJointedLeg(ctx, -17 + motionStride, fighter.character.primary, motion.rearLegAngle, 12 + motion.rearLegAngle * -.15, 1, fighter.character);
    drawJointedLeg(ctx, 18 - motionStride, fighter.character.primary, motion.frontLegAngle, -8 + motion.frontLegAngle * -.12, 1, fighter.character);
  }

  const superBodyTwist = move?.superCost ? (superPoseProfile(move.id)?.bodyTwist ?? 0) * (active ? 1 : .45) : 0;
  const torsoTwist = ((fighter.state === 'hit' ? (-.16 - hitPhase * .1) * anatomy.hitTwist : fighter.state === 'block' ? -.06 : move && fighter.state === 'attack' ? (active ? .09 : -.05) * fighter.facing : 0) + superBodyTwist + (throwJoints?.torsoTwist ?? 0) + (!superVictimActive && victimReaction.active ? victimReaction.torsoTwist : 0)) * fighterVisualProfile(fighter.character.id).shoulderTwist;
  drawTorso(ctx, fighter.character, torsoTwist);
  const secondaryEnergy = fighter.state === 'attack' ? 1.15 : fighter.airborne ? 1 : fighter.dashFrames > 0 ? 1.2 : fighter.state === 'walk' ? .62 : fighter.state === 'hit' ? .9 : .28;
  drawClothingSecondary(ctx, fighter.character, time, secondaryEnergy);

  if (throwJoints) {
    drawThrowPairArms(ctx, fighter, throwJoints);
  } else if (superVictimActive) {
    drawSuperVictimReactionArms(ctx, fighter, superVictim.armOpen);
  } else if (fighter.state === 'block') {
    drawGuardArms(ctx, fighter.character);
  } else if (fighter.state === 'victory') {
    drawVictoryPose(ctx, fighter.character, time, fighter.stateFrame);
  } else if (fighter.state === 'hit') {
    drawHitReactionArms(ctx, fighter, hitPhase);
  } else if (fighter.state === 'knockdown' || fighter.state === 'ko') {
    drawKnockdownArms(ctx, fighter.character);
  } else if (move && fighter.state === 'attack') {
    drawAttackPose(ctx, fighter, move.id, attackP, active, time);
  } else if (fighter.state === 'parry') {
    drawParryArms(ctx, fighter.character);
  } else {
    drawMotionArm(ctx, -1, fighter.character, motion.rearArmAngle, motion.rearForearmAngle, motion.armReach);
    drawMotionArm(ctx, 1, fighter.character, motion.frontArmAngle, motion.frontForearmAngle, motion.armReach);
  }
  const zoneHead = fighter.lastHitZone === 'head' ? 1.42 : fighter.lastHitZone === 'leg' ? .45 : fighter.lastHitZone === 'torso' ? .82 : 1;
  const headTurn = ((superVictimActive ? -18 * superVictim.armOpen * fighter.superVictimDirection : fighter.state === 'hit' ? (-10 - hitPhase * 9) * anatomy.hitTwist * zoneHead : move && fighter.state === 'attack' ? (active ? 5 : -3) : 0) + (!superVictimActive && victimReaction.active ? victimReaction.headSnap * 38 : 0)) * fighterVisualProfile(fighter.character.id).headLag;
  const expression = fighter.state === 'hit' || fighter.state === 'ko' || fighter.state === 'knockdown' ? 'hit' : fighter.state === 'victory' ? 'victory' : fighter.state === 'attack' || fighter.state === 'parry' ? 'focus' : 'neutral';
  drawHead(ctx, fighter.character, time, secondaryEnergy, headTurn, expression);

  if (move?.superCost && fighter.state === 'attack') {
    const pulse = .45 + Math.sin(time * 24) * .18;
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createRadialGradient(0, -105, 22, 0, -105, 125);
    aura.addColorStop(0, `rgba(255,245,150,${pulse})`);
    aura.addColorStop(.4, `rgba(103,205,255,${pulse * .45})`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -105, 125, 0, Math.PI * 2); ctx.fill();
  }

  const bossAccent = fighter.state === 'attack' && fighter.currentMove ? bossMotionFor(fighter.character.id, fighter.currentMove.id, attackP) : null;
  if (bossAccent && bossAccent.aura > .18) {
    ctx.globalCompositeOperation = 'screen';
    const bossColor = fighter.character.id === 'GILL' ? '255,208,126' : '187,137,255';
    const r = 70 + bossAccent.aura * 70;
    const glow = ctx.createRadialGradient(0, -104, 12, 0, -104, r);
    glow.addColorStop(0, `rgba(${bossColor},${.13 + bossAccent.aura * .2})`); glow.addColorStop(1, `rgba(${bossColor},0)`);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -104, r, 0, Math.PI * 2); ctx.fill();
  }

  if (fighter.state === 'parry') {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(18, -112, 4, 18, -112, 82);
    glow.addColorStop(0, 'rgba(101,226,255,.85)');
    glow.addColorStop(.35, 'rgba(80,124,255,.35)');
    glow.addColorStop(1, 'rgba(80,124,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(18, -112, 82, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}



function drawThrowPairArms(ctx: CanvasRenderingContext2D, fighter: Fighter, pose: ReturnType<typeof throwJointPoseFor>): void {
  const c = fighter.character;
  const attacker = fighter.throwSyncRole === 'attacker';
  const frontHand: HandShape = attacker ? 'grab' : fighterHandShape(c, 'neutral');
  const rearHand: HandShape = attacker ? 'grab' : fighterHandShape(c, 'neutral');
  drawMotionArm(ctx, 1, c, pose.frontArmUpper, pose.frontArmFore, attacker ? 1.08 : 1, frontHand, attacker ? .08 : -.04);
  drawMotionArm(ctx, -1, c, pose.rearArmUpper, pose.rearArmFore, attacker ? 1.04 : .98, rearHand, attacker ? -.06 : .04);
}

function drawSuperVictimReactionArms(ctx: CanvasRenderingContext2D, fighter: Fighter, openness: number): void {
  const c = fighter.character;
  const spread = Math.max(.15, Math.min(1.25, openness));
  const dir = fighter.superVictimDirection * fighter.facing;
  ctx.save(); ctx.rotate(-dir * (.78 + spread * .42)); drawStyledExtendedLimb(ctx, 10, -112, 58 + spread * 18, c.primary, 14, c, fighterHandShape(c, 'neutral')); ctx.restore();
  ctx.save(); ctx.rotate(dir * (.62 + spread * .36)); drawStyledExtendedLimb(ctx, 0, -96, 55 + spread * 16, c.secondary, 13, c, fighterHandShape(c, 'neutral')); ctx.restore();
}

function drawSignatureSuperPose(ctx: CanvasRenderingContext2D, fighter: Fighter, power: number, activeT: number): boolean {
  const move = fighter.currentMove;
  if (!move?.superCost) return false;
  const profile = superPoseProfile(move.id);
  if (!profile) return false;
  const c = fighter.character;
  const pulse = .88 + Math.sin(activeT * Math.PI) * .22;
  const leadLength = 88 * profile.leadReach * power * pulse;
  const rearLength = 78 * profile.rearReach * (.9 + power * .1);
  const hand = profile.hand;

  if (profile.family === 'kickRush' || profile.family === 'aerial') {
    drawMotionArm(ctx, -1, c, .6, 1.2, .9);
    drawMotionArm(ctx, 1, c, 1.5, 1.9, .82);
    ctx.save(); ctx.rotate(-.55 + activeT * .28); drawExtendedLimb(ctx, 8, -61, 122 + profile.legDrive * 62 * power, c.primary, 18); ctx.restore();
    return true;
  }
  if (profile.family === 'install') {
    ctx.save(); ctx.rotate(profile.leadAngle); drawStyledExtendedLimb(ctx, 18, -116, leadLength * .78, c.primary, 15, c, hand); ctx.restore();
    ctx.save(); ctx.rotate(profile.rearAngle); drawStyledExtendedLimb(ctx, -2, -105, rearLength * .78, c.secondary, 14, c, hand); ctx.restore();
    return true;
  }
  ctx.save(); ctx.rotate(profile.leadAngle + Math.sin(activeT * Math.PI) * .04); drawStyledExtendedLimb(ctx, 18, -116, leadLength, c.primary, c.id === 'ALEX' ? 21 : 16, c, hand); ctx.restore();
  ctx.save(); ctx.rotate(profile.rearAngle - Math.sin(activeT * Math.PI) * .025); drawStyledExtendedLimb(ctx, 3, -98, rearLength, c.secondary, c.id === 'ALEX' ? 19 : 14, c, profile.family === 'throw' ? 'grab' : hand); ctx.restore();
  if (profile.family === 'barrage' || profile.family === 'spiral') {
    for (let i = 1; i <= 2; i += 1) { ctx.save(); ctx.globalAlpha = .12 / i; ctx.rotate(profile.leadAngle - i * .08); drawExtendedLimb(ctx, 16 - i * 4, -114 + i * 2, leadLength * (1 - i * .08), c.accent, 10 + i); ctx.restore(); }
  }
  return true;
}

function drawStyledExtendedLimb(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string, width: number, c: CharacterDef, hand: HandShape): void {
  ctx.strokeStyle = 'rgba(5,7,12,.88)'; ctx.lineWidth = width + 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + 4); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + 4); ctx.stroke();
  const anatomy = fighterAnatomyProfile(c.id);
  const snap = anatomy.wristSnap * (length >= 90 ? 1.35 : 1);
  drawHandSilhouette(ctx, x + length + 3, y + 4, c, hand, snap, Math.max(.82, width / 15) * anatomy.armScale);
}

function drawAttackPose(ctx: CanvasRenderingContext2D, fighter: Fighter, moveId: string, attackP: number, active: boolean, time: number): void {
  const c = fighter.character;
  const move = fighter.currentMove;
  const frame = fighter.moveFrame;
  const startup = Math.max(1, move?.startup ?? 1);
  const activeFrames = Math.max(1, move?.active ?? 1);
  const recovery = Math.max(1, move?.recovery ?? 1);
  const startupT = Math.min(1, frame / startup);
  const activeT = frame >= startup ? Math.min(1, (frame - startup + 1) / activeFrames) : 0;
  const recoveryT = frame >= startup + activeFrames ? Math.min(1, (frame - startup - activeFrames + 1) / recovery) : 0;
  const snap = c.id === 'MAKOTO' ? 1.22 : c.id === 'DUDLEY' ? 1.14 : c.id === 'YUN' || c.id === 'IBUKI' ? 1.08 : 1;
  const contactProfile = contactVisualProfile(fighter);
  const contactEnvelope = contactVisualEnvelope(fighter);
  const contactReach = 1 + (contactProfile.limbReach - 1) * contactEnvelope;
  const power = (active ? Math.min(1.18, (1 + Math.sin(activeT * Math.PI) * .12) * snap) : Math.max(.12, Math.sin(Math.min(1, attackP * 1.65) * Math.PI) * (1 - recoveryT * .45))) * contactReach;
  const phase = combatAnimationPhase(fighter);
  const jointPose = sampleStrikePose(c.id, move?.button ?? 'hp', attackP, active, move);
  if (!active && frame < startup) {
    ctx.save(); ctx.globalAlpha = .55; ctx.rotate(.18 * (1 - startupT)); drawExtendedLimb(ctx, -4, -98, 45 + startupT * 20, c.secondary, 12); ctx.restore();
    ctx.save(); ctx.globalAlpha = .2 + (1 - startupT) * .16; ctx.rotate(-.14); drawExtendedLimb(ctx, 7, -106, 42 + startupT * 15, c.accent, 9); ctx.restore();
  }
  if (phase === 'follow-through') {
    ctx.save(); ctx.globalAlpha = .18 * (1 - recoveryT); ctx.rotate(.2); drawExtendedLimb(ctx, 8, -108, 96 + power * 36, c.accent, 11); ctx.restore();
  }
  if (active && (move?.multiHit || move?.technique === 'target' || c.id === 'DUDLEY' || c.id === 'YUN')) {
    for (let smear = 3; smear >= 1; smear -= 1) { ctx.save(); ctx.globalAlpha = .055 * smear; ctx.rotate(-.2 - smear * .04); drawExtendedLimb(ctx, 20 - smear * 5, -112 + smear * 3, 84 + power * 44, c.accent, 10 + smear); ctx.restore(); }
  }
  if (move?.kind === 'projectile' && !move.superCost) {
    const gather = 1 - Math.min(1, startupT);
    drawMotionArm(ctx, -1, c, .82 + gather * .18, 1.30 + gather * .22, .82 + power * .16, fighterHandShape(c, 'projectile'), -jointPose.wristAngle * .25);
    drawMotionArm(ctx, 1, c, -.08 + jointPose.shoulderAngle * .34, .16 + jointPose.elbowAngle * .28, .96 + power * .22, fighterHandShape(c, 'projectile'), jointPose.wristAngle * 1.15);
    if (active || frame >= startup) {
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(74, -101, 3, 74, -101, 35 + power * 12);
      glow.addColorStop(0, 'rgba(255,255,255,.92)'); glow.addColorStop(.35, move.color + 'cc'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(74, -101, 40 + power * 10, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (move?.technique === 'air') {
    if (move.button?.endsWith('k')) {
      drawArm(ctx, -1, c, time); drawArm(ctx, 1, c, time + .5);
      ctx.save(); ctx.rotate(-.62 + power * .34); drawExtendedLimb(ctx, 10, -66, 112 + power * 62, c.primary, 18); ctx.restore();
    } else {
      drawArm(ctx, -1, c, time);
      ctx.save(); ctx.rotate(-.28 + power * .18); drawExtendedLimb(ctx, 18, -118, 82 + power * 62, c.primary, 15); ctx.restore();
    }
    return;
  }
  if (move?.technique === 'command') {
    drawArm(ctx, -1, c, time);
    if (move.button?.endsWith('k')) { ctx.save(); ctx.rotate(-.32 + power * .26); drawExtendedLimb(ctx, 7, -62, 124 + power * 58, c.primary, 19); ctx.restore(); }
    else { ctx.save(); ctx.rotate(-.18 + power * .16); drawExtendedLimb(ctx, 16, -114, 108 + power * 54, c.primary, 18); ctx.restore(); }
    return;
  }
  if (move?.technique === 'target') {
    ctx.save(); ctx.globalAlpha = .42; ctx.rotate(.08); drawExtendedLimb(ctx, 12, -105, 92 + power * 36, c.accent, 12); ctx.restore();
    ctx.save(); ctx.rotate(-.16 + power * .12); drawExtendedLimb(ctx, 18, -118, 94 + power * 58, c.primary, 16); ctx.restore();
    return;
  }
  if (move?.superCost && drawSignatureSuperPose(ctx, fighter, power, activeT)) return;
  if (move?.superCost) {
    if (c.id === 'CHUNLI' || c.id === 'IBUKI' || c.id === 'YUN') {
      ctx.save(); ctx.rotate(-.72 + activeT * .24); drawExtendedLimb(ctx, 14, -112, 88 + power * 48, c.accent, 14); ctx.restore();
      ctx.save(); ctx.rotate(.48 - activeT * .18); drawExtendedLimb(ctx, 5, -96, 82 + power * 40, c.primary, 13); ctx.restore();
    } else if (c.id === 'ALEX') {
      ctx.save(); ctx.rotate(-.58); drawExtendedLimb(ctx, 22, -112, 88 + power * 42, c.primary, 21); ctx.restore();
      ctx.save(); ctx.rotate(.5); drawExtendedLimb(ctx, 2, -92, 86 + power * 38, c.primary, 21); ctx.restore();
    } else {
      ctx.save(); ctx.rotate(-.12 + power * .08); drawExtendedLimb(ctx, 15, -117, 112 + power * 62, c.primary, 19); ctx.restore();
      ctx.save(); ctx.rotate(.13); drawExtendedLimb(ctx, 8, -94, 96 + power * 48, c.accent, 16); ctx.restore();
    }
    return;
  }
  if (moveId.endsWith('_PRIMARY')) {
    drawMotionArm(ctx, -1, c, .9, 1.46, .86, fighterHandShape(c, 'neutral'), -jointPose.wristAngle * .12);
    drawMotionArm(ctx, 1, c, jointPose.shoulderAngle * .72, jointPose.elbowAngle * .7, .98 + power * .18, fighterHandShape(c, move?.kind === 'projectile' ? 'projectile' : 'neutral'), jointPose.wristAngle);
    return;
  }
  if (moveId.endsWith('_ANTI_AIR')) {
    const rise = Math.sin(Math.min(1, attackP * 1.28) * Math.PI);
    drawMotionArm(ctx, 1, c, -1.46 + rise * .16, -1.18 + rise * .12, 1.12 + power * .16, fighterHandShape(c, 'neutral'), jointPose.wristAngle * .8);
    drawMotionArm(ctx, -1, c, .32 - rise * .18, .9 - rise * .16, .72 + power * .04, fighterHandShape(c, 'neutral'), -jointPose.wristAngle * .14);
    return;
  }
  if (move?.kind === 'throw' || move?.level === 'throw') {
    const grip = Math.sin(Math.min(1, attackP * 1.35) * Math.PI);
    drawMotionArm(ctx, 1, c, -.36 + grip * .24, -.12 + grip * .18, 1.02 + grip * .22, fighterHandShape(c, 'throw'), jointPose.wristAngle * .55);
    drawMotionArm(ctx, -1, c, .38 - grip * .2, .18 - grip * .12, 1 + grip * .2, fighterHandShape(c, 'throw'), -jointPose.wristAngle * .45);
    return;
  }
  if (moveId.endsWith('_MOBILITY')) {
    const spinning = ['RYU', 'KEN', 'CHUNLI', 'IBUKI'].includes(c.id);
    if (spinning) {
      const sweep = Math.sin(attackP * Math.PI * 2);
      ctx.save(); ctx.rotate(-.9 + sweep * .55); drawExtendedLimb(ctx, 9, -112, 72 + power * 24, c.primary, 13); ctx.restore();
      ctx.save(); ctx.rotate(.85 - sweep * .45); drawExtendedLimb(ctx, -4, -93, 64 + power * 20, c.secondary, 12); ctx.restore();
    } else {
      drawMotionArm(ctx, 1, c, -.08 + jointPose.shoulderAngle * .3, .08 + jointPose.elbowAngle * .24, 1.08 + power * .28, fighterHandShape(c, 'neutral'), jointPose.wristAngle * .9);
      drawMotionArm(ctx, -1, c, .48, 1.08, .78 + power * .05, fighterHandShape(c, 'neutral'), -jointPose.wristAngle * .15);
    }
    return;
  }
  if (fighter.currentMove?.button && drawCharacterNormalFlavor(ctx, fighter, power)) return;
  if (fighter.currentMove?.button?.endsWith('k')) {
    drawArm(ctx, -1, c, time);
    drawArm(ctx, 1, c, time + .5);
    return;
  }
  drawArm(ctx, -1, c, time);
  ctx.save(); ctx.rotate(-.12 + power * .12); drawExtendedLimb(ctx, 22, -118, 80 + power * 55, c.primary, 15); ctx.restore();
}


function drawCharacterNormalFlavor(ctx: CanvasRenderingContext2D, fighter: Fighter, power: number): boolean {
  const c = fighter.character;
  const move = fighter.currentMove;
  const button = move?.button;
  if (!button) return false;
  const kick = button.endsWith('k');
  const pose = sampleStrikePose(c.id, button, fighter.moveFrame / Math.max(1, (move?.startup ?? 1) + (move?.active ?? 1) + (move?.recovery ?? 1)), fighter.isMoveActive(), move);
  const rearGuardLift = c.id === 'DUDLEY' ? .22 : c.id === 'MAKOTO' ? -.08 : c.id === 'CHUNLI' ? .1 : 0;
  const hand = fighterHandShape(c, 'neutral');

  if (kick) {
    // Kicks are driven by the lower-body chain; the arms keep a character-specific guard/counter-balance.
    drawMotionArm(ctx, -1, c, .72 + rearGuardLift, 1.34 + rearGuardLift, .88 + power * .05, hand, -.04 * pose.wristAngle);
    drawMotionArm(ctx, 1, c, 1.36 - rearGuardLift * .5, 1.82 - rearGuardLift * .4, .78 + power * .04, hand, .03 * pose.wristAngle);
    return true;
  }

  const rearUpper = c.id === 'DUDLEY' ? .28 : c.id === 'ALEX' ? .52 : c.id === 'MAKOTO' ? .82 : 1.0;
  const rearFore = c.id === 'DUDLEY' ? .72 : c.id === 'ALEX' ? 1.12 : c.id === 'MAKOTO' ? 1.42 : 1.58;
  const rearReach = c.id === 'ALEX' ? .94 : c.id === 'DUDLEY' ? .82 : .9;
  drawMotionArm(ctx, -1, c, rearUpper, rearFore, rearReach, hand, -pose.wristAngle * .18);
  drawMotionArm(ctx, 1, c, pose.shoulderAngle, pose.elbowAngle, pose.reach, hand, pose.wristAngle);

  if (c.id === 'DUDLEY' && fighter.isMoveActive()) {
    ctx.save(); ctx.globalAlpha = .16; drawMotionArm(ctx, 1, c, pose.shoulderAngle - .1, pose.elbowAngle - .14, pose.reach * .94, hand, pose.wristAngle * .8); ctx.restore();
  } else if (c.id === 'MAKOTO' && fighter.isMoveActive()) {
    ctx.save(); ctx.globalAlpha = .14; ctx.translate(10 * power, 0); drawMotionArm(ctx, 1, c, pose.shoulderAngle, pose.elbowAngle, pose.reach * 1.04, hand, pose.wristAngle); ctx.restore();
  } else if ((c.id === 'IBUKI' || c.id === 'YUN') && fighter.isMoveActive()) {
    ctx.save(); ctx.globalAlpha = .1; ctx.translate(-8, 2); drawMotionArm(ctx, 1, c, pose.shoulderAngle - .08, pose.elbowAngle - .08, pose.reach * .93, hand, pose.wristAngle * 1.08); ctx.restore();
  }
  return true;
}

function drawVictoryPose(ctx: CanvasRenderingContext2D, c: CharacterDef, time: number, stateFrame = 120): void {
  const anatomy = fighterAnatomyProfile(c.id);
  const phase = Math.max(0, Math.min(1, stateFrame / 72));
  const settle = phase < .35 ? phase / .35 : 1;
  const hold = phase < .72 ? 0 : Math.min(1, (phase - .72) / .28);
  const pulse = Math.sin(time * 3.2) * .06 * anatomy.victoryLift * (0.35 + settle * .65);
  ctx.save(); ctx.translate(0, -4 * (anatomy.victoryLift - 1) * settle); ctx.rotate(anatomy.victoryLean * .35 * settle + Math.sin(time * 2.1) * .01 * hold);
  if (c.id === 'RYU') {
    ctx.save(); ctx.rotate(-.86 - pulse); drawExtendedLimb(ctx, 18, -119, 78, c.primary, 16); ctx.restore();
    ctx.save(); ctx.rotate(.52); drawExtendedLimb(ctx, 7, -98, 58, c.accent, 13); ctx.restore();
  } else if (c.id === 'KEN') {
    ctx.save(); ctx.rotate(-1.48 + pulse); drawExtendedLimb(ctx, 19, -121, 112, c.primary, 16); ctx.restore();
    ctx.save(); ctx.rotate(.32); drawExtendedLimb(ctx, 8, -99, 68, c.accent, 14); ctx.restore();
  } else if (c.id === 'CHUNLI') {
    ctx.save(); ctx.rotate(-1.2); drawExtendedLimb(ctx, 18, -118, 84, c.primary, 13); ctx.restore();
    ctx.save(); ctx.rotate(1.05); drawExtendedLimb(ctx, 4, -94, 70, c.primary, 13); ctx.restore();
  } else if (c.id === 'ALEX') {
    ctx.save(); ctx.rotate(-1.68); drawExtendedLimb(ctx, 22, -118, 105, c.primary, 19); ctx.restore();
    ctx.save(); ctx.rotate(-1.18); drawExtendedLimb(ctx, 2, -112, 94, c.primary, 19); ctx.restore();
  } else if (c.id === 'DUDLEY') {
    ctx.save(); ctx.rotate(-.34); drawExtendedLimb(ctx, 18, -112, 62, c.primary, 16); ctx.restore();
    ctx.save(); ctx.rotate(.34); drawExtendedLimb(ctx, 7, -100, 59, c.primary, 16); ctx.restore();
  } else if (c.id === 'MAKOTO') {
    ctx.save(); ctx.rotate(-1.02); drawExtendedLimb(ctx, 18, -118, 88, c.primary, 15); ctx.restore();
    ctx.save(); ctx.rotate(.1); drawExtendedLimb(ctx, 5, -98, 58, c.accent, 13); ctx.restore();
  } else if (c.id === 'IBUKI') {
    ctx.save(); ctx.rotate(-1.8 + pulse); drawExtendedLimb(ctx, 18, -117, 84, c.primary, 13); ctx.restore();
    ctx.save(); ctx.rotate(.86); drawExtendedLimb(ctx, 5, -98, 65, c.primary, 13); ctx.restore();
  } else if (c.id === 'YUN') {
    ctx.save(); ctx.rotate(-.48); drawExtendedLimb(ctx, 18, -115, 73, c.primary, 14); ctx.restore();
    ctx.save(); ctx.rotate(1.28); drawExtendedLimb(ctx, 4, -96, 75, c.accent, 13); ctx.restore();
  } else {
    ctx.save(); ctx.rotate(-1.08 - pulse); drawExtendedLimb(ctx, 20, -120, 94, c.primary, 16); ctx.restore();
    ctx.save(); ctx.rotate(.28 + pulse * .4); drawExtendedLimb(ctx, 8, -101, 72, c.accent, 14); ctx.restore();
  }
  ctx.restore();
}


function drawHitReactionArms(ctx: CanvasRenderingContext2D, fighter: Fighter, phase: number): void {
  const c = fighter.character;
  const anatomy = fighterAnatomyProfile(c.id);
  const direction = fighter.lastHitDirection * fighter.facing;
  const kind = fighter.lastHitReaction;
  const zone = fighter.lastHitZone;
  const kindScale = kind === 'launch' ? 1.34 : kind === 'throw' ? 1.42 : kind === 'low' ? .74 : kind === 'high' ? 1.12 : 1;
  const zoneScale = zone === 'head' ? 1.18 : zone === 'leg' ? .72 : zone === 'launch' ? 1.28 : zone === 'throw' ? 1.4 : 1;
  const recoil = anatomy.hitTwist * kindScale * zoneScale;
  const verticalBias = zone === 'leg' ? .42 : zone === 'launch' ? -.48 : zone === 'head' ? -.12 : zone === 'throw' ? .2 : 0;
  ctx.save(); ctx.rotate(direction * (-.95 * recoil - phase * .22 * recoil) + verticalBias); drawStyledExtendedLimb(ctx, 8, -109, 62 * anatomy.armScale, c.primary, 14 * anatomy.armScale, c, fighterHandShape(c, 'neutral')); ctx.restore();
  ctx.save(); ctx.rotate(direction * (.72 * recoil + phase * .18 * recoil) - verticalBias * .6); drawStyledExtendedLimb(ctx, 2, -92, 58 * anatomy.armScale, c.primary, 13 * anatomy.armScale, c, fighterHandShape(c, 'neutral')); ctx.restore();
}

function drawKnockdownArms(ctx: CanvasRenderingContext2D, c: CharacterDef): void {
  const anatomy = fighterAnatomyProfile(c.id);
  ctx.save(); ctx.rotate(-1.42 * anatomy.koSpin); drawStyledExtendedLimb(ctx, 7, -108, 64 * anatomy.armScale, c.primary, 14 * anatomy.armScale, c, fighterHandShape(c, 'neutral')); ctx.restore();
  ctx.save(); ctx.rotate(.92 * anatomy.koSpin); drawStyledExtendedLimb(ctx, 0, -91, 58 * anatomy.armScale, c.primary, 13 * anatomy.armScale, c, fighterHandShape(c, 'neutral')); ctx.restore();
}

function drawGuardArms(ctx: CanvasRenderingContext2D, c: CharacterDef): void {
  ctx.save(); ctx.rotate(-.65); drawExtendedLimb(ctx, 12, -113, 58, c.primary, 14); ctx.restore();
  ctx.save(); ctx.rotate(-.42); drawExtendedLimb(ctx, 1, -92, 58, c.primary, 14); ctx.restore();
}

function drawParryArms(ctx: CanvasRenderingContext2D, c: CharacterDef): void {
  drawArm(ctx, -1, c, .2);
  ctx.save(); ctx.rotate(-.24); drawExtendedLimb(ctx, 18, -112, 58, c.primary, 14); ctx.restore();
}

function drawGhostPose(ctx: CanvasRenderingContext2D, c: CharacterDef, time: number): void {
  drawLeg(ctx, -17, c.primary, -7, c);
  drawLeg(ctx, 18, c.primary, 8, c);
  drawTorso(ctx, c);
  drawClothingSecondary(ctx, c, time, .8);
  drawArm(ctx, -1, c, time);
  drawArm(ctx, 1, c, time + .7);
  drawHead(ctx, c, time, .8);
}

function drawShadow(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,.36)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 46, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorso(ctx: CanvasRenderingContext2D, c: CharacterDef, twist = 0): void {
  const anatomy = fighterAnatomyProfile(c.id);
  const grad = ctx.createLinearGradient(-40, -136, 44, -54);
  if (c.id === 'GILL') {
    grad.addColorStop(0, '#b94e43'); grad.addColorStop(.49, '#b94e43'); grad.addColorStop(.51, '#4579ba'); grad.addColorStop(1, '#4579ba');
  } else if (c.id === 'URIEN') {
    grad.addColorStop(0, '#6e78a1'); grad.addColorStop(.5, '#b79278'); grad.addColorStop(1, '#384158');
  } else {
    grad.addColorStop(0, c.secondary); grad.addColorStop(.48, c.primary); grad.addColorStop(1, c.secondary);
  }
  const baseShoulder = c.id === 'ALEX' || c.id === 'URIEN' || c.id === 'GILL' ? 42 : 34;
  const shoulder = baseShoulder * anatomy.shoulderScale;
  const chest = 39 * anatomy.chestScale;
  const waist = 34 * anatomy.waistScale;
  const neck = 9 * anatomy.neckWidth;
  const leftShoulderY = -136 + twist * 26;
  const rightShoulderY = -134 - twist * 26;
  const waistShift = twist * 24;
  ctx.fillStyle = grad; ctx.strokeStyle = 'rgba(5,7,12,.72)'; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-neck, -143);
  ctx.quadraticCurveTo(-chest * .55, -143, -shoulder, leftShoulderY);
  ctx.quadraticCurveTo(-chest - twist * 6, -105, -waist + waistShift * .2, -63);
  ctx.quadraticCurveTo(waistShift, -45, waist + waistShift * .75, -63);
  ctx.quadraticCurveTo(chest + twist * 7, -104, shoulder, rightShoulderY);
  ctx.quadraticCurveTo(chest * .55, -143, neck, -143);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (c.id === 'DUDLEY') {
    ctx.fillStyle = '#f2eee4'; ctx.beginPath(); ctx.moveTo(-22, -136); ctx.lineTo(0, -78); ctx.lineTo(22, -136); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b23c3d'; ctx.beginPath(); ctx.moveTo(-13, -121); ctx.lineTo(0, -112); ctx.lineTo(-13, -104); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(13, -121); ctx.lineTo(0, -112); ctx.lineTo(13, -104); ctx.closePath(); ctx.fill();
  } else if (c.id === 'ALEX') {
    ctx.strokeStyle = '#c59662'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-23, -132); ctx.lineTo(-14, -65); ctx.moveTo(23, -132); ctx.lineTo(14, -65); ctx.stroke();
  } else if (c.id === 'CHUNLI') {
    ctx.fillStyle = c.accent; ctx.fillRect(-7, -138, 14, 76); ctx.strokeStyle = '#f1e7cd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, -128); ctx.lineTo(-5, -102); ctx.lineTo(-26, -76); ctx.stroke();
  } else if (c.id === 'IBUKI') {
    ctx.strokeStyle = 'rgba(36,31,35,.75)'; ctx.lineWidth = 3; for (let y = -124; y < -76; y += 10) { ctx.beginPath(); ctx.moveTo(-28, y); ctx.lineTo(28, y + 18); ctx.stroke(); }
  } else if (c.id === 'YUN') {
    ctx.fillStyle = '#ece2c6'; ctx.fillRect(-29, -126, 58, 10); ctx.fillStyle = c.accent; ctx.fillRect(-18, -91, 36, 8);
  } else if (c.id === 'MAKOTO') {
    ctx.fillStyle = '#4c392b'; ctx.fillRect(-7, -136, 14, 72);
  } else if (c.id === 'RYU' || c.id === 'KEN') {
    ctx.fillStyle = 'rgba(30,25,25,.38)'; ctx.beginPath(); ctx.moveTo(-12, -137); ctx.lineTo(0, -91); ctx.lineTo(12, -137); ctx.closePath(); ctx.fill();
  } else if (c.id === 'GILL') {
    ctx.strokeStyle = '#f0d17b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -139); ctx.lineTo(0, -62); ctx.stroke();
  }
  if (Math.abs(twist) > .025) {
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-24 + twist * 8, -112); ctx.quadraticCurveTo(twist * 32, -94, 24 + twist * 14, -82); ctx.stroke();
  }
  ctx.fillStyle = c.accent;
  ctx.fillRect(-waist + 3 + twist * 7, -68, waist * 2 - 6, c.id === 'ALEX' ? 12 : 9);
}

function drawClothingSecondary(ctx: CanvasRenderingContext2D, c: CharacterDef, time: number, energy: number): void {
  const sway = Math.sin(time * 7.2 + c.id.length) * (3 + energy * 7);
  const lag = Math.cos(time * 5.6 + c.id.charCodeAt(0)) * (2 + energy * 4);
  ctx.save();
  ctx.lineCap = 'round';
  if (c.id === 'CHUNLI') {
    ctx.strokeStyle = '#f0e2b1'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-28, -94); ctx.quadraticCurveTo(-46 - energy * 10, -80 + sway, -58 - energy * 17, -62 + lag); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, -92); ctx.quadraticCurveTo(44 + energy * 9, -77 - sway, 55 + energy * 16, -57 - lag); ctx.stroke();
  } else if (c.id === 'MAKOTO') {
    ctx.strokeStyle = '#d7b04a'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-5, -69); ctx.quadraticCurveTo(-27 - energy * 8, -50 + sway, -39 - energy * 14, -35 + lag); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -69); ctx.quadraticCurveTo(24 + energy * 8, -49 - sway, 36 + energy * 13, -31 - lag); ctx.stroke();
  } else if (c.id === 'DUDLEY') {
    ctx.strokeStyle = '#b23c3d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-8, -112); ctx.quadraticCurveTo(-27 - energy * 8, -105 + sway * .5, -36 - energy * 12, -90 + lag); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -112); ctx.quadraticCurveTo(26 + energy * 7, -105 - sway * .5, 34 + energy * 11, -90 - lag); ctx.stroke();
  } else if (c.id === 'YUN') {
    ctx.strokeStyle = c.accent; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-18, -90); ctx.quadraticCurveTo(-35 - energy * 7, -79 + sway, -45 - energy * 11, -68 + lag); ctx.stroke();
  }
  ctx.restore();
}

function drawHeadSecondaryBehind(ctx: CanvasRenderingContext2D, c: CharacterDef, time: number, energy: number): void {
  const sway = Math.sin(time * 8 + c.id.length * .7) * (4 + energy * 8);
  const lift = Math.cos(time * 6.2 + c.id.length) * (2 + energy * 3);
  ctx.save(); ctx.lineCap = 'round';
  if (c.id === 'RYU') {
    ctx.strokeStyle = '#9b2831'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(16, -191); ctx.quadraticCurveTo(38 + energy * 14, -187 + sway, 58 + energy * 18, -176 + lift); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, -187); ctx.quadraticCurveTo(34 + energy * 10, -173 - sway * .45, 50 + energy * 16, -158 - lift); ctx.stroke();
  } else if (c.id === 'ALEX') {
    ctx.strokeStyle = '#b53b3f'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(18, -192); ctx.quadraticCurveTo(42 + energy * 16, -190 + sway, 65 + energy * 18, -181 + lift); ctx.stroke();
  } else if (c.id === 'IBUKI') {
    ctx.strokeStyle = '#40373b'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(-12, -197); ctx.quadraticCurveTo(-38 - energy * 13, -213 + sway, -50 - energy * 18, -230 + lift); ctx.stroke();
    ctx.strokeStyle = '#5e4b43'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-18, -190); ctx.quadraticCurveTo(-43 - energy * 11, -180 + sway, -57 - energy * 16, -165 + lift); ctx.stroke();
  } else if (c.id === 'KEN') {
    ctx.strokeStyle = '#e8c64d'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-12, -195); ctx.quadraticCurveTo(-30 - energy * 8, -207 + sway * .6, -38 - energy * 12, -218 + lift); ctx.stroke();
  }
  ctx.restore();
}


function fighterHandShape(c: CharacterDef, purpose: 'neutral' | 'projectile' | 'throw'): HandShape {
  const profile = fighterVisualProfile(c.id);
  return purpose === 'projectile' ? profile.projectileHand : purpose === 'throw' ? profile.throwHand : profile.hand;
}

function drawHandSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, c: CharacterDef, shape: HandShape, angle = 0, scale = 1): void {
  const skin = c.id === 'GILL' ? '#d9a27c' : c.id === 'URIEN' ? '#b78f7a' : '#c99169';
  const glove = c.id === 'DUDLEY' ? '#b9353d' : c.id === 'ALEX' ? '#6b4c35' : c.accent;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(5,7,12,.88)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  if (shape === 'glove') {
    ctx.fillStyle = glove; ctx.beginPath(); ctx.ellipse(3, 0, 15, 13, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.secondary; ctx.fillRect(-12, 8, 16, 7);
  } else if (shape === 'palm' || shape === 'knife') {
    ctx.fillStyle = shape === 'knife' ? glove : skin;
    ctx.beginPath(); ctx.roundRect(-7, -7, shape === 'knife' ? 23 : 20, shape === 'knife' ? 10 : 14, 5); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.beginPath();
    const fingers = shape === 'knife' ? 2 : 3;
    for (let i = 0; i < fingers; i += 1) { const fy = -4 + i * 4; ctx.moveTo(7, fy); ctx.lineTo(18 + (shape === 'knife' ? 4 : 0), fy - 1); }
    ctx.stroke();
  } else if (shape === 'grab') {
    ctx.strokeStyle = glove; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(4, 0, 11, -.95, 1.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(5,7,12,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(4, 0, 14, -.95, 1.05); ctx.stroke();
  } else {
    ctx.fillStyle = glove; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.quadraticCurveTo(2, -14, 13, -5); ctx.lineTo(14, 5); ctx.quadraticCurveTo(2, 13, -10, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawFootSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, c: CharacterDef | undefined, shape: FootShape, scale = 1): void {
  const primary = c?.primary ?? '#353039';
  const accent = c?.accent ?? '#49424c';
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(5,7,12,.9)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  if (shape === 'boot') {
    ctx.fillStyle = '#2d2b31'; ctx.beginPath(); ctx.moveTo(-8,-13); ctx.lineTo(8,-11); ctx.lineTo(15,-2); ctx.lineTo(30,2); ctx.lineTo(27,12); ctx.lineTo(-6,11); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (shape === 'slipper') {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(12, 4, 20, 8, .05, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#efe3c1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2,1); ctx.lineTo(13,-4); ctx.lineTo(22,3); ctx.stroke();
  } else if (shape === 'ninja') {
    ctx.fillStyle = '#3f373d'; ctx.beginPath(); ctx.moveTo(-8,-10); ctx.lineTo(7,-10); ctx.lineTo(15,-2); ctx.lineTo(28,4); ctx.lineTo(23,11); ctx.lineTo(-7,9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#796554'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8,-3); ctx.lineTo(19,8); ctx.stroke();
  } else if (shape === 'sneaker' || shape === 'shoe') {
    ctx.fillStyle = shape === 'sneaker' ? primary : '#2c292c'; ctx.beginPath(); ctx.roundRect(-8,-8,38,17,7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shape === 'sneaker' ? '#ece2c6' : accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2,-2); ctx.lineTo(18,-2); ctx.stroke();
  } else {
    ctx.fillStyle = '#b9825f'; ctx.beginPath(); ctx.moveTo(-7,-7); ctx.quadraticCurveTo(8,-9,28,0); ctx.quadraticCurveTo(31,8,19,10); ctx.lineTo(-7,8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawJointedLeg(ctx: CanvasRenderingContext2D, hipX: number, color: string, upperAngle: number, kneeBend: number, reach = 1, character?: CharacterDef, ankleOffset = 0): void {
  const anatomy = character ? fighterAnatomyProfile(character.id) : null;
  const legScale = anatomy?.legScale ?? 1;
  const upperLen = 51 * reach * legScale;
  const lowerLen = 47 * reach * legScale;
  const a = upperAngle * Math.PI / 180;
  const kneeA = (upperAngle + kneeBend) * Math.PI / 180;
  const hipY = -56;
  const kneeX = hipX + Math.sin(a) * upperLen;
  const kneeY = hipY + Math.cos(a) * upperLen;
  const footX = kneeX + Math.sin(kneeA) * lowerLen;
  const footY = kneeY + Math.cos(kneeA) * lowerLen;
  ctx.strokeStyle = 'rgba(6,8,12,.86)'; ctx.lineWidth = 25 * legScale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 16 * legScale;
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
  const ankle = (anatomy?.ankleSnap ?? 0) * Math.sign(Math.sin(kneeA) || 1) + ankleOffset;
  drawFootSilhouette(ctx, footX, footY, kneeA - Math.PI / 2 + ankle, character, character ? fighterVisualProfile(character.id).foot : 'shoe', reach * legScale);
}


function drawSuperLowerBody(ctx: CanvasRenderingContext2D, fighter: Fighter, profile: SuperPoseProfile, activeT: number): void {
  const c = fighter.character;
  const drive = Math.sin(Math.min(1, Math.max(0, activeT)) * Math.PI) * profile.legDrive;
  if (profile.family === 'uppercut') {
    drawJointedLeg(ctx, -18, c.primary, -28 - drive * 24, 36 + drive * 18, 1.02, c);
    drawJointedLeg(ctx, 18, c.primary, -52 - drive * 34, -30 + drive * 18, 1.08, c);
  } else if (profile.family === 'kickRush' || profile.family === 'aerial') {
    drawJointedLeg(ctx, -17, c.primary, -10 + drive * 16, 30, .98, c);
    drawJointedLeg(ctx, 17, c.primary, -62 + drive * 46, -18 - drive * 18, 1.26, c);
  } else if (profile.family === 'throw') {
    drawJointedLeg(ctx, -23, c.primary, -22 - drive * 10, 44, 1.08, c);
    drawJointedLeg(ctx, 23, c.primary, 22 + drive * 10, -44, 1.08, c);
  } else if (profile.family === 'powerRush' || profile.family === 'barrage' || profile.family === 'spiral') {
    drawJointedLeg(ctx, -20, c.primary, -28 + drive * 8, 32, 1.04, c);
    drawJointedLeg(ctx, 20, c.primary, 18 + drive * 18, -36, 1.12, c);
  } else {
    drawJointedLeg(ctx, -19, c.primary, -12 - drive * 8, 26, 1.02, c);
    drawJointedLeg(ctx, 19, c.primary, 12 + drive * 8, -26, 1.02, c);
  }
}

function drawSpecialLowerBody(ctx: CanvasRenderingContext2D, fighter: Fighter, clip: MotionClip, front: number, rear: number, progress: number, active: boolean): void {
  const c = fighter.character;
  if (clip === 'antiAir') {
    const lift = Math.sin(Math.min(1, progress * 1.35) * Math.PI);
    drawJointedLeg(ctx, -17, c.primary, rear * .55, 22 + lift * 18, 1, c);
    drawJointedLeg(ctx, 17, c.primary, front - lift * 28, -48 + lift * 22, 1.04, c);
    return;
  }
  if (clip === 'spin') {
    const sweep = Math.sin(progress * Math.PI * 2);
    ctx.save(); ctx.globalAlpha = .16; ctx.strokeStyle = c.accent; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(3, -58, 92, -1.1 + progress * Math.PI * 1.3, .3 + progress * Math.PI * 1.3); ctx.stroke(); ctx.restore();
    drawJointedLeg(ctx, -15, c.primary, rear * .4, 28, .96, c);
    drawJointedLeg(ctx, 15, c.primary, sweep * 68 - 12, -8 + Math.cos(progress * Math.PI * 2) * 24, 1.24, c);
    return;
  }
  if (clip === 'rush' || clip === 'dash') {
    const drive = Math.sin(progress * Math.PI);
    drawJointedLeg(ctx, -18, c.primary, rear - 12 * drive, 28, 1.02, c);
    drawJointedLeg(ctx, 18, c.primary, front + 16 * drive, -30, 1.08, c);
    return;
  }
  if (clip === 'throw') {
    drawJointedLeg(ctx, -21, c.primary, rear - 12, 34, 1.04, c);
    drawJointedLeg(ctx, 21, c.primary, front + 13, -32, 1.04, c);
    return;
  }
  if (clip === 'throwEscape') {
    const brace = Math.sin(progress * Math.PI);
    drawJointedLeg(ctx, -22, c.primary, rear - 18 * brace, 38, 1.04, c);
    drawJointedLeg(ctx, 22, c.primary, front + 18 * brace, -38, 1.04, c);
    return;
  }
  if (clip === 'landing') {
    const compress = Math.sin(progress * Math.PI);
    drawJointedLeg(ctx, -18, c.primary, rear + 13 * compress, 42 + 18 * compress, 1, c);
    drawJointedLeg(ctx, 18, c.primary, front - 13 * compress, -42 - 18 * compress, 1, c);
    return;
  }
  drawJointedLeg(ctx, -17, c.primary, rear, 16, 1, c);
  drawJointedLeg(ctx, 18, c.primary, front, -16, active ? 1.08 : 1, c);
}

function drawHead(ctx: CanvasRenderingContext2D, c: CharacterDef, time = 0, energy = .3, turn = 0, expression: 'neutral' | 'focus' | 'hit' | 'victory' = 'neutral'): void {
  const anatomy = fighterAnatomyProfile(c.id);
  ctx.save();
  ctx.translate(turn * .22, Math.abs(turn) * .025);
  ctx.rotate(turn * Math.PI / 180 * .22);
  drawHeadSecondaryBehind(ctx, c, time, energy);
  const skin = c.id === 'GILL' ? '#d9a27c' : c.id === 'URIEN' ? '#b78f7a' : '#c99169';
  const faceW = 25 * anatomy.faceWidth;
  const faceH = 30 * anatomy.faceHeight;
  ctx.fillStyle = skin; ctx.strokeStyle = 'rgba(5,7,12,.8)'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-faceW + 3, -178);
  ctx.quadraticCurveTo(-faceW * .96, -171 - faceH * .82, 1, -171 - faceH);
  ctx.quadraticCurveTo(faceW * 1.02, -171 - faceH * .82, faceW + 4, -176);
  ctx.quadraticCurveTo(faceW * .82 * anatomy.jaw, -151, 4, -145);
  ctx.quadraticCurveTo(-faceW * .76 * anatomy.jaw, -151, -faceW + 3, -178);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (c.id === 'CHUNLI') {
    ctx.fillStyle = '#171926'; ctx.beginPath(); ctx.arc(-23, -195, 15, 0, Math.PI * 2); ctx.arc(25, -195, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e9d68c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-23, -195, 11, 0, Math.PI * 2); ctx.arc(25, -195, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#171926'; ctx.beginPath(); ctx.moveTo(-24, -180); ctx.quadraticCurveTo(2, -208, 29, -181); ctx.lineTo(22, -191); ctx.quadraticCurveTo(0, -203, -20, -191); ctx.closePath(); ctx.fill();
  } else if (c.id === 'KEN') {
    ctx.fillStyle = '#e8c64d'; ctx.beginPath(); ctx.moveTo(-28, -184); ctx.quadraticCurveTo(-8, -217, 32, -190); ctx.lineTo(28, -170); ctx.lineTo(17, -191); ctx.lineTo(4, -176); ctx.lineTo(-7, -197); ctx.lineTo(-22, -174); ctx.closePath(); ctx.fill();
  } else if (c.id === 'ALEX') {
    ctx.fillStyle = '#d5b44b'; ctx.beginPath(); ctx.moveTo(-27, -186); ctx.quadraticCurveTo(0, -210, 28, -185); ctx.quadraticCurveTo(7, -196, -25, -178); ctx.fill();
    ctx.fillStyle = '#b53b3f'; ctx.fillRect(-30, -195, 52, 7); ctx.beginPath(); ctx.moveTo(20, -192); ctx.lineTo(48, -185); ctx.lineTo(21, -181); ctx.closePath(); ctx.fill();
  } else if (c.id === 'DUDLEY') {
    ctx.fillStyle = '#1d2526'; ctx.beginPath(); ctx.moveTo(-24, -183); ctx.quadraticCurveTo(4, -211, 30, -183); ctx.quadraticCurveTo(10, -195, -21, -179); ctx.fill();
    ctx.strokeStyle = '#2b1b18'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, -158); ctx.quadraticCurveTo(13, -152, 22, -160); ctx.stroke();
  } else if (c.id === 'MAKOTO') {
    ctx.fillStyle = '#272125'; ctx.beginPath(); ctx.moveTo(-23, -184); ctx.quadraticCurveTo(2, -207, 28, -181); ctx.lineTo(19, -192); ctx.lineTo(4, -181); ctx.lineTo(-8, -195); ctx.lineTo(-22, -178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d7b04a'; ctx.fillRect(-28, -194, 45, 6);
  } else if (c.id === 'IBUKI') {
    ctx.fillStyle = '#40373b'; ctx.beginPath(); ctx.moveTo(-25, -184); ctx.quadraticCurveTo(2, -210, 30, -181); ctx.quadraticCurveTo(5, -195, -22, -178); ctx.fill();
    ctx.fillStyle = '#5e4b43'; ctx.beginPath(); ctx.moveTo(-5, -199); ctx.lineTo(-34, -225); ctx.lineTo(-18, -181); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a5550'; ctx.beginPath(); ctx.moveTo(-20, -171); ctx.lineTo(27, -174); ctx.lineTo(22, -155); ctx.lineTo(-18, -157); ctx.closePath(); ctx.fill();
  } else if (c.id === 'YUN') {
    ctx.fillStyle = '#234f7d'; ctx.beginPath(); ctx.ellipse(1, -193, 31, 13, -.05, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-23, -193, 46, 17); ctx.beginPath(); ctx.moveTo(18, -190); ctx.lineTo(48, -184); ctx.lineTo(18, -179); ctx.closePath(); ctx.fill();
  } else if (c.id === 'URIEN') {
    ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-26, -185); ctx.quadraticCurveTo(4, -219, 31, -184); ctx.lineTo(20, -197); ctx.lineTo(7, -182); ctx.lineTo(-3, -202); ctx.lineTo(-18, -180); ctx.closePath(); ctx.fill();
  } else if (c.id === 'GILL') {
    ctx.fillStyle = '#ece3d1'; ctx.beginPath(); ctx.moveTo(-26, -185); ctx.quadraticCurveTo(0, -219, 31, -184); ctx.lineTo(26, -154); ctx.lineTo(13, -190); ctx.lineTo(3, -163); ctx.lineTo(-8, -193); ctx.lineTo(-20, -159); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0cf73'; ctx.beginPath(); ctx.moveTo(-18, -202); ctx.lineTo(-8, -216); ctx.lineTo(0, -202); ctx.lineTo(9, -216); ctx.lineTo(19, -201); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = c.secondary; ctx.beginPath(); ctx.moveTo(-24, -181); ctx.quadraticCurveTo(2, -211, 30, -184); ctx.quadraticCurveTo(14, -194, 2, -189); ctx.quadraticCurveTo(-8, -198, -24, -181); ctx.fill();
    if (c.id === 'RYU') { ctx.fillStyle = '#9b2831'; ctx.fillRect(-27, -194, 42, 6); ctx.beginPath(); ctx.moveTo(12, -193); ctx.lineTo(45, -187); ctx.lineTo(14, -181); ctx.closePath(); ctx.fill(); }
  }


  const eyeGap = 9.5 * anatomy.eyeSpacing;
  const browY = -178;
  const expressionBrow = expression === 'hit' ? .18 : expression === 'focus' ? -.08 : expression === 'victory' ? -.03 : 0;
  const browTilt = anatomy.browTilt + expressionBrow;
  ctx.strokeStyle = '#17131b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-eyeGap - 8, browY - browTilt * 10); ctx.lineTo(-eyeGap + 3, browY + browTilt * 10);
  ctx.moveTo(eyeGap - 3, browY + browTilt * 10); ctx.lineTo(eyeGap + 8, browY - browTilt * 10);
  ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath();
  ctx.moveTo(-eyeGap - 4, -172); ctx.lineTo(-eyeGap + 4, -172 + browTilt * 3);
  ctx.moveTo(eyeGap - 4, -172 - browTilt * 3); ctx.lineTo(eyeGap + 4, -172); ctx.stroke();
  ctx.strokeStyle = 'rgba(74,43,33,.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(2 + turn * .05, -170); ctx.lineTo(5 + turn * .1, -161); ctx.lineTo(1, -159); ctx.stroke();
  ctx.strokeStyle = c.id === 'DUDLEY' ? '#2b1b18' : 'rgba(65,35,31,.75)'; ctx.lineWidth = c.id === 'DUDLEY' ? 4 : 2.2;
  const mouthCurve = expression === 'hit' ? 6 : expression === 'victory' ? -3 : expression === 'focus' ? 1 : 0;
  ctx.beginPath(); ctx.moveTo(-5, -153); ctx.quadraticCurveTo(3, -149 + anatomy.jaw * 1.5 + mouthCurve, 11, -153); ctx.stroke();
  ctx.restore();
}

function drawMotionArm(ctx: CanvasRenderingContext2D, side: -1 | 1, c: CharacterDef, upperAngle: number, forearmAngle: number, reach: number, handShape: HandShape = fighterHandShape(c, 'neutral'), wristOffset = 0): void {
  const anatomy = fighterAnatomyProfile(c.id);
  const shoulderX = side * 29 * anatomy.shoulderScale;
  const shoulderY = -125;
  const upperLen = 42 * reach * anatomy.armScale;
  const foreLen = 37 * reach * anatomy.armScale;
  const elbowX = shoulderX + side * Math.cos(upperAngle) * upperLen;
  const elbowY = shoulderY + Math.sin(upperAngle) * upperLen;
  const handX = elbowX + side * Math.cos(forearmAngle) * foreLen;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;
  ctx.strokeStyle = 'rgba(7,9,13,.82)';
  ctx.lineWidth = 20 * anatomy.armScale;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
  ctx.strokeStyle = c.primary;
  ctx.lineWidth = 13 * anatomy.armScale;
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
  drawHandSilhouette(ctx, handX, handY, c, handShape, forearmAngle + anatomy.wristSnap * side + wristOffset * side, anatomy.armScale);
}

function drawArm(ctx: CanvasRenderingContext2D, side: -1 | 1, c: CharacterDef, time: number): void {
  const anatomy = fighterAnatomyProfile(c.id);
  const sway = Math.sin(time * 2.5 + side) * 4;
  const shoulder = side * 29 * anatomy.shoulderScale;
  const elbow = side * (46 + sway) * anatomy.armScale;
  const hand = side * 31 * anatomy.armScale;
  ctx.strokeStyle = 'rgba(7,9,13,.82)'; ctx.lineWidth = 20 * anatomy.armScale; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(shoulder, -125); ctx.lineTo(elbow, -91); ctx.lineTo(hand, -65); ctx.stroke();
  ctx.strokeStyle = c.primary; ctx.lineWidth = 13 * anatomy.armScale;
  ctx.beginPath(); ctx.moveTo(shoulder, -125); ctx.lineTo(elbow, -91); ctx.lineTo(hand, -65); ctx.stroke();
  drawHandSilhouette(ctx, hand, -64, c, fighterHandShape(c, 'neutral'), (side > 0 ? .4 : Math.PI - .4) + anatomy.wristSnap * side, anatomy.armScale);
}

function drawLeg(ctx: CanvasRenderingContext2D, x: number, color: string, angle: number, character?: CharacterDef): void {
  const anatomy = character ? fighterAnatomyProfile(character.id) : null;
  const legScale = anatomy?.legScale ?? 1;
  ctx.save(); ctx.translate(x, -55); ctx.rotate(angle * Math.PI / 180);
  ctx.strokeStyle = 'rgba(6,8,12,.85)'; ctx.lineWidth = 24 * legScale; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * .25, 52 * legScale); ctx.lineTo(x * .3, 94 * legScale); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 16 * legScale;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * .25, 52 * legScale); ctx.lineTo(x * .3, 94 * legScale); ctx.stroke();
  drawFootSilhouette(ctx, x * .3, 92 * legScale, anatomy?.ankleSnap ?? 0, character, character ? fighterVisualProfile(character.id).foot : 'shoe', legScale);
  ctx.restore();
}

function drawExtendedLimb(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string, width: number): void {
  ctx.strokeStyle = 'rgba(5,7,12,.88)'; ctx.lineWidth = width + 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + 4); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + 4); ctx.stroke();
  ctx.fillStyle = color; ctx.strokeStyle = 'rgba(5,7,12,.88)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x + length + 5, y + 4, Math.max(7, width * .58), Math.max(5, width * .42), .04, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
