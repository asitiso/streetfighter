import type { CombatEvent } from '../combat/CombatTypes.js';
import { artImage } from './ImageAssets.js';
import { runtimeQuality } from '../core/RuntimeQuality.js';

export function propImpactSample(event: CombatEvent): { row: number; frame: number; size: number; alpha: number; finished: boolean } | null {
  if ((event.type !== 'prop-hit' && event.type !== 'prop-break') || !Number.isFinite(event.ttl)) return null;
  const label = event.label?.toUpperCase() ?? '';
  const row = /CRATE|STALL/.test(label) ? 0 : /VENDING|CONSOLE|TANK/.test(label) ? 2 : /BAG/.test(label) ? 3 : /TRASH|BIN|HYDRANT|LANTERN/.test(label) ? 1 : -1;
  if (row < 0) return null;
  const isBreak = event.type === 'prop-break';
  const elapsed = Math.max(0, (isBreak ? 42 : 18) - event.ttl);
  const visualTicks = isBreak ? 18 : 6;
  return {
    row, frame: Math.min(isBreak ? 5 : 2, Math.floor(elapsed / (isBreak ? 3 : 2))),
    size: isBreak ? 108 : 52,
    alpha: Math.pow(Math.max(0, 1 - elapsed / visualTicks), .35),
    finished: elapsed >= visualTicks,
  };
}

// Returning true after the short visual ends also suppresses the legacy spoke/label effect.
// Event lifetime, impact audio and damage stay under CombatWorld/Stage1Scene ownership.
export function drawPropImpact(ctx: CanvasRenderingContext2D, event: CombatEvent): boolean {
  if (!runtimeQuality.current.secondaryFx) return false;
  const sample = propImpactSample(event);
  if (!sample) return false;
  const atlas = artImage('prop-impact-v1');
  if (!atlas || atlas.naturalWidth !== 768 || atlas.naturalHeight !== 512) return false;
  if (sample.finished) return true;
  ctx.save();
  ctx.globalAlpha *= sample.alpha;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(atlas, sample.frame * 128, sample.row * 128, 128, 128, event.x - sample.size / 2, event.y - sample.size / 2, sample.size, sample.size);
  ctx.restore();
  return true;
}
