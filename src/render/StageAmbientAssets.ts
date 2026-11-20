import { artImage } from './ImageAssets.js';
import { runtimeQuality } from '../core/RuntimeQuality.js';

const PROFILES = [
  { anchors: [.22, .70], y: .66, size: 80, alpha: .30 },
  { anchors: [.16, .50], y: .50, size: 76, alpha: .34 },
  { anchors: [.24, .74], y: .34, size: 88, alpha: .55 },
  { anchors: [.25, .70], y: .85, size: 92, alpha: .48 },
  { anchors: [.03, .97], y: .45, size: 64, alpha: .72 },
] as const;

// Uses the scene presentation clock only; never advances simulation or owns a timer.
export function drawStageAmbient(ctx: CanvasRenderingContext2D, stageId: number, time: number, mode: 'belt' | 'duel', stageLength: number, scroll = 0): number {
  if (!runtimeQuality.current.secondaryFx || !Number.isFinite(time) || !Number.isFinite(scroll) || !Number.isFinite(stageLength) || stageLength <= 0) return 0;
  const profile = PROFILES[stageId - 1];
  if (!profile) return 0;
  const atlas = artImage('stage-ambient-v1');
  if (!atlas || atlas.naturalWidth !== 768 || atlas.naturalHeight !== 640) return 0;
  const width = mode === 'belt' ? stageLength : 2160;
  const origin = mode === 'belt' ? 0 : -440;
  const limit = runtimeQuality.currentTier === 'high' ? 2 : 1;
  const baseAlpha = ctx.globalAlpha;
  let draws = 0, instances = 0;
  ctx.save();
  for (let index = 0; index < profile.anchors.length; index += 1) {
    const x = origin + width * profile.anchors[index]! + (stageId === 3 ? Math.sin(time * .7 + index) * 10 : 0);
    const y = -100 + 820 * profile.y;
    const size = profile.size;
    if (x + size / 2 < scroll - 32 || x - size / 2 > scroll + 1280 + 32) continue;
    if (instances >= limit) break;
    instances += 1;
    const clock = ((time * 8 + index * 2) % 6 + 6) % 6;
    const frame = Math.floor(clock), blend = clock - frame;
    ctx.globalAlpha = baseAlpha * profile.alpha * (1 - blend);
    ctx.drawImage(atlas, frame * 128, (stageId - 1) * 128, 128, 128, x - size / 2, y - size * 120 / 128, size, size);
    draws += 1;
    if (blend > 0) {
      ctx.globalAlpha = baseAlpha * profile.alpha * blend;
      ctx.drawImage(atlas, ((frame + 1) % 6) * 128, (stageId - 1) * 128, 128, 128, x - size / 2, y - size * 120 / 128, size, size);
      draws += 1;
    }
  }
  ctx.restore();
  return draws;
}
