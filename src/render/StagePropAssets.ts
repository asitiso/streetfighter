import type { EnvironmentProp } from '../combat/CombatTypes.js';
import { artImage } from './ImageAssets.js';
import { STAGE_PROP_RECTS } from './StagePropAtlasData.js';

const KINDS = ['trash','stall','vending','lantern','bag','bin','console','tank','crate','hydrant'] as const;
const SIZES = [[50,63],[128,104],[60,92],[48,108],[48,118],[52,64],[80,70],[50,92],[62,55],[44,46]] as const;

// Presentation only: collision bounds, durability and the broken flag remain owned by CombatWorld.
export function drawStagePropSprite(ctx: CanvasRenderingContext2D, prop: Pick<EnvironmentProp, 'id' | 'broken'>): boolean {
  const index = KINDS.findIndex(kind => prop.id.startsWith(kind));
  if (index < 0) return false;
  const atlas = artImage('stage-props-v1');
  if (!atlas || atlas.naturalWidth !== 960 || atlas.naturalHeight !== 768) return false;
  const rect = STAGE_PROP_RECTS[index + (prop.broken ? 10 : 0)];
  const size = SIZES[index];
  if (!rect || !size) return false;
  const [sx, sy, sw, sh] = rect;
  const maxWidth = size[0] * (prop.broken ? 1.35 : 1);
  const maxHeight = size[1] * (prop.broken ? .45 : 1);
  const scale = Math.min(maxWidth / sw, maxHeight / sh);
  const width = sw * scale, height = sh * scale;
  ctx.drawImage(atlas, sx, sy, sw, sh, -width / 2, -height, width, height);
  return true;
}
