import { runtimeQuality } from '../core/RuntimeQuality.js';
import { APPROVED_HQ_CHARACTER_IDS, hqMasterApproved } from './HqCharacterMasterRegistry.js';
import { animationTextureManager } from './AnimationTextureManager.js';
import { preloadSpecialKeyPoses, releaseSpecialKeyPoses } from './SpecialKeyPoseLibrary.js';
import {
  artImage,
  attackAtlasHdKey,
  attackAtlasKey,
  combatSpriteHdKey,
  combatSpriteHqKey,
  combatSpriteKey,
  isArtAssetReady,
  preloadArtAssets,
  unloadArtAsset,
  type ArtAssetKey,
} from './ImageAssets.js';

export type CharacterTextureQuality = 'auto' | 'hd' | 'lite';
export type CharacterTextureTier = 'hq' | 'hd' | 'lite';

export interface CharacterTextureSelection {
  key: ArtAssetKey;
  image: HTMLImageElement;
  hd: boolean;
  hq: boolean;
  tier: CharacterTextureTier;
}

const STORAGE_KEY = 'ssc-character-texture-quality-v1';
const PLAYABLE = ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'] as const;

type PlayableId = typeof PLAYABLE[number];

function isMode(value: string | null): value is CharacterTextureQuality {
  return value === 'auto' || value === 'hd' || value === 'lite';
}

function deviceMemoryGb(): number | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
}

class CharacterTextureManager {
  private mode: CharacterTextureQuality = 'auto';
  private recent: string[] = [];

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isMode(stored)) this.mode = stored;
      } catch { /* storage may be blocked */ }
    }
  }

  get currentMode(): CharacterTextureQuality { return this.mode; }

  setMode(mode: CharacterTextureQuality): void {
    this.mode = mode;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* non-fatal */ }
    }
    if (mode === 'lite') this.releaseHighExcept([]);
  }

  cycle(direction: -1 | 1): CharacterTextureQuality {
    const modes: CharacterTextureQuality[] = ['auto', 'hd', 'lite'];
    const index = modes.indexOf(this.mode);
    const next = modes[(index + direction + modes.length) % modes.length]!;
    this.setMode(next);
    return next;
  }

  wantsHd(): boolean {
    if (this.mode === 'hd') return true;
    if (this.mode === 'lite') return false;
    if (runtimeQuality.currentTier === 'low') return false;
    const memory = deviceMemoryGb();
    if (runtimeQuality.currentTier === 'balanced' && memory !== undefined && memory < 4) return false;
    return true;
  }

  wantsHq(characterId: string): boolean {
    return this.wantsHd() && hqMasterApproved(characterId);
  }

  effectiveLabel(): 'HD REMASTER' | 'LITE' { return this.wantsHd() ? 'HD REMASTER' : 'LITE'; }

  effectiveLabelFor(characterId: string): 'HQ ORIGINAL' | 'HD REMASTER' | 'LITE' {
    if (!this.wantsHd()) return 'LITE';
    return this.wantsHq(characterId) ? 'HQ ORIGINAL' : 'HD REMASTER';
  }

  snapCoordinate(value: number, hd: boolean, stable: boolean): number {
    if (!hd || !stable) return value;
    const step = runtimeQuality.currentTier === 'high' ? .5 : 1;
    return Math.round(value / step) * step;
  }

  preloadCharacter(characterId: string): void {
    if (this.wantsHd()) {
      animationTextureManager.preloadCharacter(characterId, 'movement');
      preloadSpecialKeyPoses(characterId);
    }
    const liteCombat = combatSpriteKey(characterId);
    const liteAttack = attackAtlasKey(characterId);
    const keys: ArtAssetKey[] = [];
    if (liteCombat) keys.push(liteCombat);
    if (liteAttack) keys.push(liteAttack);
    if (this.wantsHd()) {
      if (this.wantsHq(characterId)) {
        const hqCombat = combatSpriteHqKey(characterId);
        if (hqCombat) keys.push(hqCombat);
      }
      const hdCombat = combatSpriteHdKey(characterId);
      const hdAttack = attackAtlasHdKey(characterId);
      if (hdCombat) keys.push(hdCombat);
      if (hdAttack) keys.push(hdAttack);
    }
    preloadArtAssets(keys);
  }

  focusCharacter(characterId: string): void {
    this.preloadCharacter(characterId);
    this.recent = [characterId, ...this.recent.filter((id) => id !== characterId)].slice(0, 3);
    if (this.mode !== 'hd') this.releaseHighExcept(this.recent);
  }

  combatSelection(characterId: string): CharacterTextureSelection | null {
    if (this.wantsHq(characterId)) {
      const hqKey = combatSpriteHqKey(characterId);
      if (hqKey) {
        const image = artImage(hqKey);
        if (image) return { key: hqKey, image, hd: true, hq: true, tier: 'hq' };
      }
    }
    return this.resolve(characterId, combatSpriteKey, combatSpriteHdKey);
  }

  attackSelection(characterId: string): CharacterTextureSelection | null {
    // RC34 pilots replace the base combat master. Attack atlases remain
    // on the proven RC32 HD remaster path until RC35.
    return this.resolve(characterId, attackAtlasKey, attackAtlasHdKey);
  }

  hqReady(characterId: string): boolean {
    if (!hqMasterApproved(characterId)) return false;
    const combat = combatSpriteHqKey(characterId);
    return !!combat && isArtAssetReady(combat);
  }

  hqApproved(characterId: string): boolean { return hqMasterApproved(characterId); }

  hqApprovedCount(): number { return PLAYABLE.filter((id) => hqMasterApproved(id)).length; }

  hqReadyCount(): number { return PLAYABLE.filter((id) => this.hqReady(id)).length; }

  hdReady(characterId: string): boolean {
    const combat = combatSpriteHdKey(characterId);
    const attack = attackAtlasHdKey(characterId);
    return !!combat && !!attack && isArtAssetReady(combat) && isArtAssetReady(attack);
  }

  hdReadyCount(): number {
    return PLAYABLE.filter((id) => this.hdReady(id)).length;
  }

  configureSampling(ctx: CanvasRenderingContext2D, hd: boolean): void {
    const smooth = hd || runtimeQuality.currentTier !== 'low';
    ctx.imageSmoothingEnabled = smooth;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = hd ? 'high' : runtimeQuality.currentTier === 'high' ? 'high' : 'medium';
  }

  private resolve(
    characterId: string,
    liteKeyFor: (id: string) => ArtAssetKey | null,
    hdKeyFor: (id: string) => ArtAssetKey | null,
  ): CharacterTextureSelection | null {
    if (this.wantsHd()) {
      const hdKey = hdKeyFor(characterId);
      if (hdKey) {
        const image = artImage(hdKey);
        if (image) return { key: hdKey, image, hd: true, hq: false, tier: 'hd' };
      }
    }
    const liteKey = liteKeyFor(characterId);
    if (!liteKey) return null;
    const image = artImage(liteKey);
    return image ? { key: liteKey, image, hd: false, hq: false, tier: 'lite' } : null;
  }

  private releaseHighExcept(characterIds: readonly string[]): void {
    const keep = new Set(characterIds);
    for (const id of PLAYABLE) {
      if (keep.has(id)) continue;
      const hq = combatSpriteHqKey(id);
      const combat = combatSpriteHdKey(id);
      const attack = attackAtlasHdKey(id);
      if (hq) unloadArtAsset(hq);
      if (combat) unloadArtAsset(combat);
      if (attack) unloadArtAsset(attack);
      animationTextureManager.releaseCharacter(id);
      releaseSpecialKeyPoses(id);
    }
  }
}

export const characterTextureManager = new CharacterTextureManager();
export const PLAYABLE_CHARACTER_TEXTURE_IDS: readonly PlayableId[] = PLAYABLE;
export { APPROVED_HQ_CHARACTER_IDS };
