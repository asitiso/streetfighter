export type ArtAssetKey =
  | 'title-keyart'
  | 'roster-mural'
  | 'stage-1'
  | 'stage-2'
  | 'stage-3'
  | 'stage-4'
  | 'stage-5'
  | 'ending-keyart'
  | 'foreground-1'
  | 'foreground-2'
  | 'foreground-3'
  | 'foreground-4'
  | 'foreground-5'
  | 'portrait-ryu'
  | 'portrait-ken'
  | 'portrait-chunli'
  | 'portrait-alex'
  | 'portrait-dudley'
  | 'portrait-makoto'
  | 'portrait-ibuki'
  | 'portrait-yun'
  | 'portrait-urien'
  | 'portrait-gill'
  | 'sprite-ryu'
  | 'sprite-ken'
  | 'sprite-chunli'
  | 'sprite-alex'
  | 'sprite-dudley'
  | 'sprite-makoto'
  | 'sprite-ibuki'
  | 'sprite-yun'
  | 'sprite-ryu-hd'
  | 'sprite-ken-hd'
  | 'sprite-chunli-hd'
  | 'sprite-alex-hd'
  | 'sprite-dudley-hd'
  | 'sprite-makoto-hd'
  | 'sprite-ibuki-hd'
  | 'sprite-yun-hd'
  | 'sprite-ryu-hq'
  | 'sprite-ken-hq'
  | 'sprite-chunli-hq'
  | 'sprite-ibuki-hq'
  | 'attack-ryu'
  | 'attack-ken'
  | 'attack-chunli'
  | 'attack-alex'
  | 'attack-dudley'
  | 'attack-makoto'
  | 'attack-ibuki'
  | 'attack-yun'
  | 'attack-ryu-hd'
  | 'attack-ken-hd'
  | 'attack-chunli-hd'
  | 'attack-alex-hd'
  | 'attack-dudley-hd'
  | 'attack-makoto-hd'
  | 'attack-ibuki-hd'
  | 'attack-yun-hd';

export const ART_ASSET_PATHS: Record<ArtAssetKey, string> = {
  'title-keyart': '/art/title-keyart.png',
  'roster-mural': '/art/roster-mural.png',
  'stage-1': '/art/stage1-newyork.png',
  'stage-2': '/art/stage2-hongkong.png',
  'stage-3': '/art/stage3-japan.png',
  'stage-4': '/art/stage4-london.png',
  'stage-5': '/art/stage5-secretsociety.png',
  'ending-keyart': '/art/ending-keyart.png',
  'foreground-1': '/art/foregrounds/stage1-foreground.webp',
  'foreground-2': '/art/foregrounds/stage2-foreground.webp',
  'foreground-3': '/art/foregrounds/stage3-foreground.webp',
  'foreground-4': '/art/foregrounds/stage4-foreground.webp',
  'foreground-5': '/art/foregrounds/stage5-foreground.webp',
  'portrait-ryu': '/art/portraits/ryu.webp',
  'portrait-ken': '/art/portraits/ken.webp',
  'portrait-chunli': '/art/portraits/chunli.webp',
  'portrait-alex': '/art/portraits/alex.webp',
  'portrait-dudley': '/art/portraits/dudley.webp',
  'portrait-makoto': '/art/portraits/makoto.webp',
  'portrait-ibuki': '/art/portraits/ibuki.webp',
  'portrait-yun': '/art/portraits/yun.webp',
  'portrait-urien': '/art/portraits/urien.webp',
  'portrait-gill': '/art/portraits/gill.webp',
  'sprite-ryu': '/art/combat-sprites/ryu.webp',
  'sprite-ken': '/art/combat-sprites/ken.webp',
  'sprite-chunli': '/art/combat-sprites/chunli.webp',
  'sprite-alex': '/art/combat-sprites/alex.webp',
  'sprite-dudley': '/art/combat-sprites/dudley.webp',
  'sprite-makoto': '/art/combat-sprites/makoto.webp',
  'sprite-ibuki': '/art/combat-sprites/ibuki.webp',
  'sprite-yun': '/art/combat-sprites/yun.webp',
  'sprite-ryu-hd': '/art/combat-sprites-hd/ryu.webp',
  'sprite-ken-hd': '/art/combat-sprites-hd/ken.webp',
  'sprite-chunli-hd': '/art/combat-sprites-hd/chunli.webp',
  'sprite-alex-hd': '/art/combat-sprites-hd/alex.webp',
  'sprite-dudley-hd': '/art/combat-sprites-hd/dudley.webp',
  'sprite-makoto-hd': '/art/combat-sprites-hd/makoto.webp',
  'sprite-ibuki-hd': '/art/combat-sprites-hd/ibuki.webp',
  'sprite-yun-hd': '/art/combat-sprites-hd/yun.webp',
  'sprite-ryu-hq': '/art/combat-sprites-hq/ryu.webp',
  'sprite-ken-hq': '/art/combat-sprites-hq/ken.webp',
  'sprite-chunli-hq': '/art/combat-sprites-hq/chunli.webp',
  'sprite-ibuki-hq': '/art/combat-sprites-hq/ibuki.webp',
  'attack-ryu': '/art/attack-atlases/ryu.webp',
  'attack-ken': '/art/attack-atlases/ken.webp',
  'attack-chunli': '/art/attack-atlases/chunli.webp',
  'attack-alex': '/art/attack-atlases/alex.webp',
  'attack-dudley': '/art/attack-atlases/dudley.webp',
  'attack-makoto': '/art/attack-atlases/makoto.webp',
  'attack-ibuki': '/art/attack-atlases/ibuki.webp',
  'attack-yun': '/art/attack-atlases/yun.webp',
  'attack-ryu-hd': '/art/attack-atlases-hd/ryu.webp',
  'attack-ken-hd': '/art/attack-atlases-hd/ken.webp',
  'attack-chunli-hd': '/art/attack-atlases-hd/chunli.webp',
  'attack-alex-hd': '/art/attack-atlases-hd/alex.webp',
  'attack-dudley-hd': '/art/attack-atlases-hd/dudley.webp',
  'attack-makoto-hd': '/art/attack-atlases-hd/makoto.webp',
  'attack-ibuki-hd': '/art/attack-atlases-hd/ibuki.webp',
  'attack-yun-hd': '/art/attack-atlases-hd/yun.webp',
};

interface ArtAssetEntry {
  image: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
}

const cache = new Map<ArtAssetKey, ArtAssetEntry>();

function ensureEntry(key: ArtAssetKey): ArtAssetEntry | null {
  if (typeof Image === 'undefined') return null;
  const existing = cache.get(key);
  if (existing) return existing;
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'eager';
  const entry: ArtAssetEntry = { image, loaded: false, failed: false };
  image.onload = () => { entry.loaded = true; entry.failed = false; };
  image.onerror = () => { entry.failed = true; entry.loaded = false; };
  image.src = ART_ASSET_PATHS[key];
  cache.set(key, entry);
  return entry;
}

export function preloadArtAssets(keys: readonly ArtAssetKey[]): void {
  for (const key of keys) ensureEntry(key);
}

export function artImage(key: ArtAssetKey): HTMLImageElement | null {
  const entry = ensureEntry(key);
  if (!entry || entry.failed || !entry.loaded || !entry.image.complete || entry.image.naturalWidth === 0) return null;
  return entry.image;
}

export function isArtAssetReady(key: ArtAssetKey): boolean {
  const entry = cache.get(key);
  return !!entry && entry.loaded && !entry.failed && entry.image.complete && entry.image.naturalWidth > 0;
}

export function hasArtAssetFailed(key: ArtAssetKey): boolean {
  return cache.get(key)?.failed === true;
}

export function unloadArtAsset(key: ArtAssetKey): void {
  const entry = cache.get(key);
  if (entry) {
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.src = '';
  }
  cache.delete(key);
}

export function stageArtKey(stageId: 1 | 2 | 3 | 4 | 5): ArtAssetKey {
  return (`stage-${stageId}`) as ArtAssetKey;
}

export function stageForegroundKey(stageId: 1 | 2 | 3 | 4 | 5): ArtAssetKey {
  return (`foreground-${stageId}`) as ArtAssetKey;
}

export function characterPortraitKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'portrait-ryu';
    case 'KEN': return 'portrait-ken';
    case 'CHUNLI': return 'portrait-chunli';
    case 'ALEX': return 'portrait-alex';
    case 'DUDLEY': return 'portrait-dudley';
    case 'MAKOTO': return 'portrait-makoto';
    case 'IBUKI': return 'portrait-ibuki';
    case 'YUN': return 'portrait-yun';
    case 'URIEN': return 'portrait-urien';
    case 'GILL': return 'portrait-gill';
    default: return null;
  }
}

export const PLAYABLE_PORTRAIT_KEYS: readonly ArtAssetKey[] = [
  'portrait-ryu',
  'portrait-ken',
  'portrait-chunli',
  'portrait-alex',
  'portrait-dudley',
  'portrait-makoto',
  'portrait-ibuki',
  'portrait-yun',
] as const;


export function combatSpriteKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'sprite-ryu';
    case 'KEN': return 'sprite-ken';
    case 'CHUNLI': return 'sprite-chunli';
    case 'ALEX': return 'sprite-alex';
    case 'DUDLEY': return 'sprite-dudley';
    case 'MAKOTO': return 'sprite-makoto';
    case 'IBUKI': return 'sprite-ibuki';
    case 'YUN': return 'sprite-yun';
    default: return null;
  }
}

export const PLAYABLE_COMBAT_SPRITE_KEYS: readonly ArtAssetKey[] = [
  'sprite-ryu', 'sprite-ken', 'sprite-chunli', 'sprite-alex',
  'sprite-dudley', 'sprite-makoto', 'sprite-ibuki', 'sprite-yun',
] as const;

export function combatSpriteHdKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'sprite-ryu-hd';
    case 'KEN': return 'sprite-ken-hd';
    case 'CHUNLI': return 'sprite-chunli-hd';
    case 'ALEX': return 'sprite-alex-hd';
    case 'DUDLEY': return 'sprite-dudley-hd';
    case 'MAKOTO': return 'sprite-makoto-hd';
    case 'IBUKI': return 'sprite-ibuki-hd';
    case 'YUN': return 'sprite-yun-hd';
    default: return null;
  }
}

export const PLAYABLE_COMBAT_SPRITE_HD_KEYS: readonly ArtAssetKey[] = [
  'sprite-ryu-hd', 'sprite-ken-hd', 'sprite-chunli-hd', 'sprite-alex-hd',
  'sprite-dudley-hd', 'sprite-makoto-hd', 'sprite-ibuki-hd', 'sprite-yun-hd',
] as const;



export function combatSpriteHqKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'sprite-ryu-hq';
    case 'KEN': return 'sprite-ken-hq';
    case 'CHUNLI': return 'sprite-chunli-hq';
    case 'IBUKI': return 'sprite-ibuki-hq';
    default: return null;
  }
}

export const PILOT_COMBAT_SPRITE_HQ_KEYS: readonly ArtAssetKey[] = [
  'sprite-ryu-hq', 'sprite-ken-hq', 'sprite-chunli-hq', 'sprite-ibuki-hq',
] as const;

export function attackAtlasKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'attack-ryu';
    case 'KEN': return 'attack-ken';
    case 'CHUNLI': return 'attack-chunli';
    case 'ALEX': return 'attack-alex';
    case 'DUDLEY': return 'attack-dudley';
    case 'MAKOTO': return 'attack-makoto';
    case 'IBUKI': return 'attack-ibuki';
    case 'YUN': return 'attack-yun';
    default: return null;
  }
}

export const PLAYABLE_ATTACK_ATLAS_KEYS: readonly ArtAssetKey[] = [
  'attack-ryu', 'attack-ken', 'attack-chunli', 'attack-alex',
  'attack-dudley', 'attack-makoto', 'attack-ibuki', 'attack-yun',
] as const;

export function attackAtlasHdKey(characterId: string): ArtAssetKey | null {
  switch (characterId) {
    case 'RYU': return 'attack-ryu-hd';
    case 'KEN': return 'attack-ken-hd';
    case 'CHUNLI': return 'attack-chunli-hd';
    case 'ALEX': return 'attack-alex-hd';
    case 'DUDLEY': return 'attack-dudley-hd';
    case 'MAKOTO': return 'attack-makoto-hd';
    case 'IBUKI': return 'attack-ibuki-hd';
    case 'YUN': return 'attack-yun-hd';
    default: return null;
  }
}

export const PLAYABLE_ATTACK_ATLAS_HD_KEYS: readonly ArtAssetKey[] = [
  'attack-ryu-hd', 'attack-ken-hd', 'attack-chunli-hd', 'attack-alex-hd',
  'attack-dudley-hd', 'attack-makoto-hd', 'attack-ibuki-hd', 'attack-yun-hd',
] as const;
