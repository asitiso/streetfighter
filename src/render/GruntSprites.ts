import type { Fighter } from '../combat/Fighter.js';
import type { ProjectileInstance } from '../combat/CombatWorld.js';
import { gruntById, type GruntKind } from '../combat/GruntLibrary.js';
import { heldWeaponOf, isHeldByGrab, PICKUP_ORDER, type Pickup, type PickupKind } from '../combat/BeltSystems.js';
import { defenseCrouchBlend } from './CombatSpriteProfiles.js';
import { artImage, type ArtAssetKey } from './ImageAssets.js';

/** grunts-v1 atlases: 7 cells of 384x448, feet on y=423, drawn at half size like the playable HD sprites. */
export const GRUNT_POSES = ['idle', 'walk', 'windup', 'strike', 'hit', 'down', 'grabbed'] as const;
export type GruntPose = typeof GRUNT_POSES[number];
const CELL_W = 384, CELL_H = 448, DRAW_W = 192, DRAW_H = 224, DRAW_TOP = -220;
const ITEM_W = 320, ITEM_H = 160, ITEM_BASE = 152;
const ITEMS = [...PICKUP_ORDER, 'bottle'] as const;

function gruntKey(kind: GruntKind): ArtAssetKey { return `grunt-${kind}` as ArtAssetKey; }

/** Pose choice is presentation only; it never touches combat state. */
export function gruntPoseFor(fighter: Fighter): GruntPose {
  if (isHeldByGrab(fighter) && fighter.state === 'hit') return 'grabbed';
  if (fighter.state === 'ko' || fighter.state === 'knockdown') return 'down';
  if (fighter.state === 'hit') return 'hit';
  if (fighter.throwSyncFrames > 0 && fighter.throwSyncRole === 'attacker') return 'strike';
  const move = fighter.currentMove;
  if (fighter.state === 'attack' && move) {
    if (fighter.moveFrame < move.startup || fighter.eliteRecoveryOpen) return 'windup';
    if (fighter.moveFrame < move.startup + move.active + Math.ceil(move.recovery * .45)) return 'strike';
    return 'windup';
  }
  if (fighter.state === 'block') return 'windup';
  if (fighter.state === 'walk' || fighter.state === 'jump') return Math.floor(fighter.animationFrame / 9) % 2 ? 'walk' : 'idle';
  return 'idle';
}

/** Mark committed attacks during the same startup window as the windup sprite. */
export function drawGruntAttackWarning(ctx: CanvasRenderingContext2D, fighter: Fighter, alpha: number): boolean {
  const move = fighter.currentMove;
  if (fighter.side !== 'enemy' || fighter.hp <= 0 || !gruntById(fighter.character.id)
    || fighter.state !== 'attack' || !move || fighter.throwSyncFrames > 0
    || move.startup < 9 || fighter.moveFrame >= move.startup
    || !(move.guardBreak || move.knockdown || move.projectile || (fighter.lateElite && move.eliteRecoveryBonus))) return false;

  const x = fighter.previousX + (fighter.x - fighter.previousX) * alpha;
  const y = fighter.previousY + (fighter.y - fighter.previousY) * alpha;
  ctx.save();
  ctx.translate(x, y - fighter.jumpHeight - 178 * fighter.character.heightScale);
  ctx.beginPath();
  ctx.moveTo(-12, -7);
  ctx.lineTo(12, -7);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#211206';
  ctx.fillStyle = '#ffd173';
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  return true;
}

export function drawGruntRecoveryOpening(ctx: CanvasRenderingContext2D, fighter: Fighter, alpha: number): boolean {
  if (!fighter.eliteRecoveryOpen) return false;
  const x = fighter.previousX + (fighter.x - fighter.previousX) * alpha;
  const y = fighter.previousY + (fighter.y - fighter.previousY) * alpha;
  ctx.save();
  ctx.translate(x, y - fighter.jumpHeight - 178 * fighter.character.heightScale);
  ctx.fillStyle = 'rgba(8,19,21,.92)';
  ctx.beginPath(); ctx.roundRect(-36, -13, 72, 26, 6); ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 16px Arial, sans-serif';
  ctx.fillStyle = '#a3f3dc';
  ctx.fillText('OPEN', 0, 1);
  ctx.restore();
  return true;
}

export function drawGruntSprite(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number): boolean {
  const def = gruntById(fighter.character.id);
  if (!def) return false;
  const atlas = artImage(gruntKey(def.kind));
  if (!atlas || atlas.naturalWidth !== CELL_W * GRUNT_POSES.length || atlas.naturalHeight !== CELL_H) return false;
  const pose = gruntPoseFor(fighter);
  const index = GRUNT_POSES.indexOf(pose);
  const sx = fighter.character.widthScale, sy = fighter.character.heightScale;
  ctx.save();
  ctx.translate(x, y);
  // Ground shadow (stays on the floor while airborne).
  const lift = Math.max(0, fighter.jumpHeight);
  ctx.save();
  ctx.globalAlpha = .34 * Math.max(.35, 1 - lift / 220);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 2, (pose === 'down' ? 70 : 44) * sx, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.translate(0, -lift);
  const bob = pose === 'idle' ? Math.sin(fighter.animationFrame * .09) * 1.4 : pose === 'walk' ? -Math.abs(Math.sin(fighter.animationFrame * .35)) * 2.5 : 0;
  ctx.translate(0, bob);
  if (pose === 'down' && fighter.airborne) ctx.rotate(-fighter.facing * .18);
  if (pose === 'hit') ctx.translate(-fighter.facing * 4, 0);
  ctx.scale(fighter.facing * sx, sy);
  ctx.drawImage(atlas, index * CELL_W, 0, CELL_W, CELL_H, -DRAW_W / 2, DRAW_TOP, DRAW_W, DRAW_H);
  if (fighter.hitFlash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(.55, fighter.hitFlash * .09);
    ctx.drawImage(atlas, index * CELL_W, 0, CELL_W, CELL_H, -DRAW_W / 2, DRAW_TOP, DRAW_W, DRAW_H);
  }
  ctx.restore();
  return true;
}

function itemAtlas(): HTMLImageElement | null {
  const atlas = artImage('pickups-v1');
  return atlas && atlas.naturalWidth === ITEM_W * ITEMS.length && atlas.naturalHeight === ITEM_H ? atlas : null;
}

function drawItem(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, item: typeof ITEMS[number], scale: number, anchor: 'bottom' | 'handle' | 'center'): void {
  const index = ITEMS.indexOf(item);
  const w = ITEM_W * scale, h = ITEM_H * scale;
  if (anchor === 'bottom') ctx.drawImage(atlas, index * ITEM_W, 0, ITEM_W, ITEM_H, -w / 2, -ITEM_BASE * scale, w, h);
  else if (anchor === 'center') ctx.drawImage(atlas, index * ITEM_W, 0, ITEM_W, ITEM_H, -w / 2, -h * .7, w, h);
  else ctx.drawImage(atlas, index * ITEM_W, 0, ITEM_W, ITEM_H, -w * .2, -h * .7, w, h);
}

const PICKUP_SCALE: Readonly<Record<PickupKind, number>> = { apple: .42, chicken: .44, coins: .4, pipe: .42, knife: .42, sword: .44 };

/** Floor items: bob/sparkle, and weapons blink before they vanish. */
export function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number): boolean {
  const atlas = itemAtlas();
  if (!atlas) return false;
  const remaining = pickup.life - pickup.age;
  if (remaining < 120 && Math.floor(remaining / 6) % 2 === 0) return true;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.globalAlpha = .3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.translate(0, -pickup.z - (pickup.z === 0 ? Math.abs(Math.sin(time * 3 + pickup.id)) * 2 : 0));
  drawItem(ctx, atlas, pickup.kind, PICKUP_SCALE[pickup.kind], 'bottom');
  if (pickup.z === 0) {
    const glint = (Math.sin(time * 4 + pickup.id * 1.7) + 1) * .5;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,246,200,${.25 + glint * .35})`;
    ctx.beginPath(); ctx.arc(14, -38, 2 + glint * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return true;
}

/** The weapon in the player's hand, swung with the attack. */
export function drawHeldWeapon(ctx: CanvasRenderingContext2D, fighter: Fighter, x: number, y: number): boolean {
  const weapon = heldWeaponOf(fighter);
  const atlas = itemAtlas();
  if (!weapon || !atlas || fighter.state === 'knockdown' || fighter.state === 'ko') return false;
  const move = fighter.currentMove;
  let angle = -1.05, reach = 30, height = 118;
  if (fighter.state === 'block' && fighter.character.id === 'KEN' && weapon.kind === 'pipe' && defenseCrouchBlend(fighter) === 0) {
    // Ken tucks his lead hand closer to the body in the standing guard pose.
    reach = 22;
    height = 102;
  } else if (fighter.state === 'attack' && move?.id.startsWith('WEAPON_')) {
    const total = move.startup + move.active;
    const t = Math.min(1, fighter.moveFrame / Math.max(1, total));
    angle = fighter.moveFrame < move.startup ? -1.05 - t * .9 : -1.9 + Math.min(1, (fighter.moveFrame - move.startup + 1) / Math.max(1, move.active)) * 2.25;
    reach = fighter.moveFrame < move.startup ? 18 : 44;
    height = 128;
  }
  ctx.save();
  ctx.translate(x + fighter.facing * reach, y - height - fighter.jumpHeight);
  ctx.scale(fighter.facing, 1);
  ctx.rotate(angle);
  drawItem(ctx, atlas, weapon.kind, weapon.kind === 'sword' ? .38 : weapon.kind === 'pipe' ? .34 : .36, 'handle');
  ctx.restore();
  return true;
}

/** Bottles and tossed weapons spin through the air as sprites. */
export function drawItemProjectile(ctx: CanvasRenderingContext2D, projectile: ProjectileInstance, time: number): boolean {
  const id = projectile.move.id;
  const item = id === 'GRUNT_THROWER_BOTTLE' ? 'bottle' : id === 'WEAPON_TOSS_PIPE' ? 'pipe' : id === 'WEAPON_TOSS_KNIFE' ? 'knife' : id === 'WEAPON_TOSS_SWORD' ? 'sword' : null;
  if (!item) return false;
  const atlas = itemAtlas();
  if (!atlas) return false;
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(time * (item === 'knife' ? 18 : 12) * Math.sign(projectile.vx || 1));
  drawItem(ctx, atlas, item, item === 'bottle' ? .36 : .4, 'center');
  ctx.restore();
  return true;
}

const IDLE_HEIGHT: Readonly<Record<GruntKind, number>> = { punk: 342, knife: 330, bruiser: 352, kicker: 321, soldier: 345, thrower: 336 };

/** HUD portrait cropped from the grunt's own idle frame (head and shoulders). */
export function drawGruntPortrait(ctx: CanvasRenderingContext2D, character: { id: string }, x: number, y: number, size: number, accent: string): boolean {
  const def = gruntById(character.id);
  if (!def) return false;
  const atlas = artImage(gruntKey(def.kind));
  if (!atlas || atlas.naturalWidth !== CELL_W * GRUNT_POSES.length) return false;
  const top = 423 - IDLE_HEIGHT[def.kind] - 4;
  const crop = 132;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, size, size, Math.max(6, size * .18)); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x, y, size, size);
  ctx.drawImage(atlas, CELL_W / 2 - crop / 2, top, crop, crop, x, y, size, size);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = accent; ctx.globalAlpha = .78; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, size, size, Math.max(6, size * .18)); ctx.stroke();
  ctx.restore();
  return true;
}
