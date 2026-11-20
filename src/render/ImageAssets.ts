export type ArtAssetKey =
  | 'hit-impact-atlas'
  | 'prop-impact-v1'
  | 'stage-ambient-v1'
  | 'stage-props-v1'
  | 'grunt-punk'
  | 'grunt-knife'
  | 'grunt-bruiser'
  | 'grunt-kicker'
  | 'grunt-soldier'
  | 'grunt-thrower'
  | 'pickups-v1'
  | 'combat-impact-atlas'
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
  'hit-impact-atlas': '/art/fx/hit-impact-v2.webp',
  'combat-impact-atlas': '/art/fx/combat-impact-v1.webp',
  'title-keyart': '/art/title-keyart.png',
  'roster-mural': '/art/roster-mural.png',
  'prop-impact-v1': '/art/prop-impact-v1/atlas.webp',
  'stage-ambient-v1': '/art/stage-ambient-v1/atlas.webp',
  'stage-props-v1': '/art/stage-props-v1/atlas.webp',
  'grunt-punk': '/art/grunts-v1/punk.webp',
  'grunt-knife': '/art/grunts-v1/knife.webp',
  'grunt-bruiser': '/art/grunts-v1/bruiser.webp',
  'grunt-kicker': '/art/grunts-v1/kicker.webp',
  'grunt-soldier': '/art/grunts-v1/soldier.webp',
  'grunt-thrower': '/art/grunts-v1/thrower.webp',
  'pickups-v1': '/art/grunts-v1/pickups.webp',
  'stage-1': '/art/stage-backgrounds-v2/newyork.webp',
  'stage-2': '/art/stage-backgrounds-v2/hongkong.webp',
  'stage-3': '/art/stage-backgrounds-v2/japan.webp',
  'stage-4': '/art/stage-backgrounds-v2/london.webp',
  'stage-5': '/art/stage-backgrounds-v2/society.webp',
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
  'sprite-ryu': '/art/combat-sprites/ryu-authored-v1.png',
  'sprite-ken': '/art/combat-sprites/ken-authored-v1.png',
  'sprite-chunli': '/art/combat-sprites/chunli-authored-v1.png',
  'sprite-alex': '/art/combat-sprites/alex-authored-v1.png',
  'sprite-dudley': '/art/combat-sprites/dudley-authored-v1.png',
  'sprite-makoto': '/art/combat-sprites/makoto-authored-v1.png',
  'sprite-ibuki': '/art/combat-sprites/ibuki-authored-v1.png',
  'sprite-yun': '/art/combat-sprites/yun-authored-v1.png',
  'sprite-ryu-hd': '/art/combat-sprites-hd/ryu-authored-v1.png',
  'sprite-ken-hd': '/art/combat-sprites-hd/ken-authored-v1.png',
  'sprite-chunli-hd': '/art/combat-sprites-hd/chunli-authored-v1.png',
  'sprite-alex-hd': '/art/combat-sprites-hd/alex-authored-v1.png',
  'sprite-dudley-hd': '/art/combat-sprites-hd/dudley-authored-v1.png',
  'sprite-makoto-hd': '/art/combat-sprites-hd/makoto-authored-v1.png',
  'sprite-ibuki-hd': '/art/combat-sprites-hd/ibuki-authored-v1.png',
  'sprite-yun-hd': '/art/combat-sprites-hd/yun-authored-v1.png',
  'sprite-ryu-hq': '/art/combat-sprites-hq/ryu.webp',
  'sprite-ken-hq': '/art/combat-sprites-hq/ken.webp',
  'sprite-chunli-hq': '/art/combat-sprites-hq/chunli.webp',
  'sprite-ibuki-hq': '/art/combat-sprites-hq/ibuki.webp',
  'attack-ryu': '/art/attack-atlases/ryu-authored-v1.webp',
  'attack-ken': '/art/attack-atlases/ken-authored-v1.webp',
  'attack-chunli': '/art/attack-atlases/chunli-authored-v1.webp',
  'attack-alex': '/art/attack-atlases/alex-authored-v1.webp',
  'attack-dudley': '/art/attack-atlases/dudley-authored-v1.webp',
  'attack-makoto': '/art/attack-atlases/makoto-authored-v1.webp',
  'attack-ibuki': '/art/attack-atlases/ibuki-authored-v1.webp',
  'attack-yun': '/art/attack-atlases/yun-authored-v1.webp',
  'attack-ryu-hd': '/art/attack-atlases-hd/ryu-authored-v1.webp',
  'attack-ken-hd': '/art/attack-atlases-hd/ken-authored-v1.webp',
  'attack-chunli-hd': '/art/attack-atlases-hd/chunli-authored-v1.webp',
  'attack-alex-hd': '/art/attack-atlases-hd/alex-authored-v1.webp',
  'attack-dudley-hd': '/art/attack-atlases-hd/dudley-authored-v1.webp',
  'attack-makoto-hd': '/art/attack-atlases-hd/makoto-authored-v1.webp',
  'attack-ibuki-hd': '/art/attack-atlases-hd/ibuki-authored-v1.webp',
  'attack-yun-hd': '/art/attack-atlases-hd/yun-authored-v1.webp',
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
  for (const key of keys) {
    // Screen preparation may retry failures; render reads keep their fallback.
    if (cache.get(key)?.failed) unloadArtAsset(key);
    ensureEntry(key);
  }
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
