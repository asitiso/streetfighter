import { runtimeQuality } from '../core/RuntimeQuality.js';
import { animationSequencesFor, type AnimationSequence } from './AnimationSequenceLibrary.js';

interface SequenceTextureEntry {
  image: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
  lastUsedAt: number;
}

export interface AnimationTextureSelection {
  sequence: AnimationSequence;
  image: HTMLImageElement;
}

const cache = new Map<string, SequenceTextureEntry>();
const MOVEMENT = new Set(['idle','walk','walk-back','dash','jump','landing','hit','guard','parry']);

function now(): number { return typeof performance === 'undefined' ? 0 : performance.now(); }

function ensure(sequence: AnimationSequence): SequenceTextureEntry | null {
  if (typeof Image === 'undefined') return null;
  const current = cache.get(sequence.id);
  if (current) { current.lastUsedAt = now(); return current; }
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'eager';
  const entry: SequenceTextureEntry = { image, loaded:false, failed:false, lastUsedAt:now() };
  image.onload = () => { entry.loaded = true; entry.failed = false; };
  image.onerror = () => { entry.failed = true; entry.loaded = false; };
  image.src = sequence.asset;
  cache.set(sequence.id, entry);
  return entry;
}

class AnimationTextureManager {
  wantsHighFrame(): boolean { return runtimeQuality.currentTier !== 'low'; }

  preloadCharacter(characterId: string, scope: 'movement' | 'combat' = 'movement'): void {
    if (!this.wantsHighFrame()) return;
    for (const sequence of animationSequencesFor(characterId, true)) {
      if (!sequence.poseAuthored) continue;
      if (scope === 'movement' && !MOVEMENT.has(sequence.kind)) continue;
      ensure(sequence);
    }
  }

  selection(sequence: AnimationSequence): AnimationTextureSelection | null {
    if (!sequence.enabled || !sequence.poseAuthored || !this.wantsHighFrame()) return null;
    const entry = ensure(sequence);
    if (!entry || entry.failed || !entry.loaded || !entry.image.complete || entry.image.naturalWidth <= 0) return null;
    entry.lastUsedAt = now();
    return { sequence, image: entry.image };
  }

  releaseCharacter(characterId: string): void {
    for (const sequence of animationSequencesFor(characterId, false)) {
      const entry = cache.get(sequence.id);
      if (!entry) continue;
      entry.image.onload = null;
      entry.image.onerror = null;
      entry.image.src = '';
      cache.delete(sequence.id);
    }
  }

  readyCount(characterId: string): number {
    return animationSequencesFor(characterId, true).filter((sequence) => {
      const entry = cache.get(sequence.id);
      return !!entry && entry.loaded && !entry.failed && entry.image.complete && entry.image.naturalWidth > 0;
    }).length;
  }
}

export const animationTextureManager = new AnimationTextureManager();
