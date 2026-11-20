import type { CombatEvent } from '../combat/CombatTypes.js';
import { artImage } from './ImageAssets.js';

const ROWS: Partial<Record<CombatEvent['type'], number>> = {
  hit: 0, 'air-hit': 0, 'command-hit': 0, 'target-hit': 0,
  block: 1, parry: 2, 'red-parry': 3, counter: 3,
};

export interface CombatImpactSample { row: number; frame: number; size: number; alpha: number; }

export function combatImpactSample(event: CombatEvent): CombatImpactSample | null {
  const row = ROWS[event.type];
  if (row === undefined || event.ttl <= 0) return null;
  const duration = event.type === 'parry' || event.type === 'red-parry' ? 24 : event.type === 'target-hit' ? 22 : 16;
  const progress = Math.max(0, Math.min(1, 1 - event.ttl / duration));
  const baseSize = row === 1 ? 100 : row === 2 ? 132 : row === 3 ? 140 : 116;
  const powerScale = .9 + Math.min(160, Math.max(0, event.power)) / 400;
  return {
    row, frame: Math.min(3, Math.floor(progress * 4)),
    size: Math.min(192, baseSize * powerScale * (1 + progress * .12)),
    alpha: Math.pow(1 - progress, .7) * .95,
  };
}

// Only ordinary hit sparks use the new pack; defense and counter art keep their timing.
export function hitImpactSample(event: CombatEvent): CombatImpactSample | null {
  const sample = combatImpactSample(event);
  if (!sample || sample.row !== 0) return null;
  const duration = event.type === 'target-hit' ? 22 : 16;
  const progress = Math.max(0, Math.min(1, 1 - event.ttl / duration));
  return { ...sample, frame: Math.min(7, Math.floor(progress * 8)) };
}

export function drawCombatImpact(ctx: CanvasRenderingContext2D, event: CombatEvent): boolean {
  const hit = hitImpactSample(event);
  const optionalImage = hit ? artImage('hit-impact-atlas') : null;
  const useHitPack = optionalImage?.naturalWidth === 1536 && optionalImage.naturalHeight === 192;
  const sample = useHitPack ? hit : combatImpactSample(event);
  if (!sample) return false;
  const image = useHitPack ? optionalImage : artImage('combat-impact-atlas');
  if (!image || (!useHitPack && (image.naturalWidth !== image.naturalHeight || image.naturalWidth > 2048 || image.naturalWidth < 4))) return false;
  const cell = useHitPack ? 192 : image.naturalWidth / 4;
  ctx.save();
  ctx.globalAlpha *= sample.alpha;
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, sample.frame * cell, sample.row * cell, cell, cell,
    event.x - sample.size / 2, event.y - sample.size / 2, sample.size, sample.size);
  ctx.restore();
  return true;
}
