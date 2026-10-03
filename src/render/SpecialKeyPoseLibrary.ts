import type { MoveData } from '../combat/CombatTypes.js';
import { animationSequenceKindForAttack } from './AnimationTimingMapper.js';

const KEN_SPECIALS: Record<string, string> = {
  hadoken: '/art/special-keyposes/ken/hadoken.webp',
  shoryuken: '/art/special-keyposes/ken/shoryuken.webp',
  tatsumaki: '/art/special-keyposes/ken/tatsumaki.webp',
  'super-rush': '/art/special-keyposes/ken/super-rush.webp',
};
const CHUNLI_SPECIALS = {
  CHUNLI_PRIMARY: '/art/special-keyposes/chunli/kikoken.webp',
  CHUNLI_EX_PRIMARY: '/art/special-keyposes/chunli/kikoken.webp',
  CHUNLI_SA1: '/art/special-keyposes/chunli/kikoken.webp',
  CHUNLI_MOBILITY: '/art/special-keyposes/chunli/spinning-bird-kick.webp',
  CHUNLI_SA2: '/art/special-keyposes/chunli/spinning-bird-kick.webp',
} as Record<string, string>;
const SPECIALS_BY_CHARACTER: Record<string, Record<string, string>> = {
  KEN: KEN_SPECIALS,
  CHUNLI: CHUNLI_SPECIALS,
};

const images = new Map<string, HTMLImageElement>();

export function specialKeyPoseAsset(characterId: string, move: MoveData): string | null {
  if (characterId === 'CHUNLI') return CHUNLI_SPECIALS[move.id] ?? null;
  if (characterId !== 'KEN') return null;
  const kind = animationSequenceKindForAttack(characterId, move);
  return kind ? KEN_SPECIALS[kind] ?? null : null;
}

// Blend the contact art into the existing attack motion without claiming an authored strip.
export function specialKeyPoseOpacity(move: MoveData, moveFrame: number): number {
  const lead = Math.min(3, move.startup);
  if (moveFrame < move.startup - lead) return 0;
  if (moveFrame < move.startup) return (moveFrame - (move.startup - lead) + 1) / (lead + 1);
  const recoveryStart = move.startup + move.active;
  if (moveFrame < recoveryStart) return 1;
  const trail = Math.min(5, move.recovery);
  if (moveFrame >= recoveryStart + trail) return 0;
  return (trail - (moveFrame - recoveryStart)) / (trail + 1);
}

export function preloadSpecialKeyPoses(characterId: string): void {
  if (typeof Image === 'undefined') return;
  for (const asset of new Set(Object.values(SPECIALS_BY_CHARACTER[characterId] ?? {}))) {
    if (images.has(asset)) continue;
    const image = new Image();
    image.decoding = 'async';
    image.src = asset;
    images.set(asset, image);
  }
}

export function specialKeyPoseImage(asset: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!images.has(asset)) preloadSpecialKeyPoses(asset.includes('/chunli/') ? 'CHUNLI' : 'KEN');
  const image = images.get(asset);
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

export function releaseSpecialKeyPoses(characterId: string): void {
  for (const asset of Object.values(SPECIALS_BY_CHARACTER[characterId] ?? {})) {
    const image = images.get(asset);
    if (image) image.src = '';
    images.delete(asset);
  }
}
