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
const STARTUP_ORDER = new Map<string, number>(['idle', 'walk', 'walk-back', 'jump'].map((kind, index) => [kind, index]));
const MOVEMENT = new Set(['idle','crouch','walk','walk-back','dash','dash-back','jump','landing','hit','throw-attacker','throw-victim','super-hit','fall','knockdown','guard','crouch-parry','crouch-guard','parry']);

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

function releaseSequence(id: string): void {
  const entry = cache.get(id);
  if (!entry) return;
  entry.image.onload = null;
  entry.image.onerror = null;
  entry.image.src = '';
  cache.delete(id);
}

class AnimationTextureManager {
  private qualityPolicy: () => boolean = () => runtimeQuality.currentTier !== 'low';

  setQualityPolicy(policy: () => boolean): void { this.qualityPolicy = policy; }

  wantsHighFrame(): boolean { return this.qualityPolicy(); }

  preloadCharacter(characterId: string, scope: 'movement' | 'combat' | 'ending' = 'movement'): void {
    if (!this.wantsHighFrame()) return;
    // Start the first visible poses before supplemental reactions and attacks.
    const sequences = animationSequencesFor(characterId, true)
      .filter(sequence => sequence.poseAuthored && (scope === 'ending' ? sequence.kind === 'victory' : scope === 'combat' || MOVEMENT.has(sequence.kind)))
      .sort((a, b) => (STARTUP_ORDER.get(a.kind) ?? 4) - (STARTUP_ORDER.get(b.kind) ?? 4));
    for (const sequence of sequences) {
      // Retry only during explicit preparation; drawing keeps the fallback
      // without issuing repeated requests for a failed texture.
      if (cache.get(sequence.id)?.failed) releaseSequence(sequence.id);
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
    for (const sequence of animationSequencesFor(characterId, false)) releaseSequence(sequence.id);
  }

  readyCount(characterId: string): number {
    return animationSequencesFor(characterId, true).filter((sequence) => {
      const entry = cache.get(sequence.id);
      return !!entry && entry.loaded && !entry.failed && entry.image.complete && entry.image.naturalWidth > 0;
    }).length;
  }
}

export const animationTextureManager = new AnimationTextureManager();

interface LiteSequenceEntry {
  sequence: AnimationSequence;
  image?: ImageBitmap;
  failed: boolean;
  loading: boolean;
  used: number;
  controller?: AbortController;
}

// Retain small decoded strips, never full-size HQ Image elements, on LOW/LITE.
class LiteAnimationTextureManager {
  private readonly entries = new Map<string, LiteSequenceEntry>();
  private readonly failed = new Map<string, string>();
  private readonly queue: LiteSequenceEntry[] = [];
  private readonly maxPixels = 1_572_864;
  private pixels = 0;
  private clock = 0;
  private busy = false;

  selection(sequence: AnimationSequence, readyOnly = false): { sequence: AnimationSequence; image: ImageBitmap } | null {
    if (!sequence.enabled || !sequence.poseAuthored || this.failed.has(sequence.id) || typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return null;
    let entry = this.entries.get(sequence.id);
    if (!entry) {
      if (readyOnly) return null;
      while (this.entries.size >= 8) if (!this.evict()) return null;
      entry = { sequence, failed: false, loading: false, used: ++this.clock };
      this.entries.set(sequence.id, entry);
      this.queue.push(entry);
      this.pump();
    }
    entry.used = ++this.clock;
    return entry.image ? { sequence, image: entry.image } : null;
  }

  retryCharacter(characterId: string): void {
    for (const [id, owner] of this.failed) if (owner === characterId) this.failed.delete(id);
    for (const entry of this.entries.values()) {
      if (entry.sequence.characterId === characterId && entry.failed) this.drop(entry);
    }
  }

  release(): void {
    this.failed.clear();
    for (const entry of this.entries.values()) this.drop(entry);
    this.queue.length = 0;
  }

  snapshot(): { entries: number; ready: number; pixels: number; active: boolean } {
    return { entries: this.entries.size, ready: [...this.entries.values()].filter(e => !!e.image).length, pixels: this.pixels, active: this.busy };
  }

  private close(image: ImageBitmap): void {
    try { image.close(); } catch { /* A graphics failure must not stop combat. */ }
  }

  private drop(entry: LiteSequenceEntry): void {
    if (this.entries.get(entry.sequence.id) !== entry) return;
    this.entries.delete(entry.sequence.id);
    const queued = this.queue.indexOf(entry);
    if (queued >= 0) this.queue.splice(queued, 1);
    entry.controller?.abort();
    if (entry.image) {
      this.pixels -= entry.image.width * entry.image.height;
      this.close(entry.image);
      entry.image = undefined;
    }
  }

  private evict(except?: LiteSequenceEntry, readyOnly = false): boolean {
    const oldest = [...this.entries.values()]
      .filter(e => e !== except && !e.loading && (!readyOnly || !!e.image))
      .sort((a, b) => a.used - b.used)[0];
    if (!oldest) return false;
    this.drop(oldest);
    return true;
  }

  private pump(): void {
    if (this.busy) return;
    let entry: LiteSequenceEntry | undefined;
    while (this.queue.length && !entry) {
      const next = this.queue.shift()!;
      if (this.entries.get(next.sequence.id) === next) entry = next;
    }
    if (!entry) return;
    this.busy = true;
    entry.loading = true;
    void this.load(entry).finally(() => { this.busy = false; this.pump(); });
  }

  private async load(entry: LiteSequenceEntry): Promise<void> {
    let image: ImageBitmap | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const sequence = entry.sequence;
      const scale = Math.min(1, 128 / sequence.frameWidth, 112 / sequence.frameHeight);
      const width = Math.max(1, Math.floor(sequence.frameWidth * scale)) * sequence.frameCount;
      const height = Math.max(1, Math.floor(sequence.frameHeight * scale));
      if (width < 1 || height < 1 || !Number.isSafeInteger(width * height) || width * height > this.maxPixels) throw new Error('Oversized lite strip');
      entry.controller = new AbortController();
      const controller = entry.controller;
      timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(sequence.asset, { cache: 'force-cache', signal: entry.controller.signal });
      if (!response.ok) throw new Error('Lite strip unavailable');
      const blob = await response.blob();
      if (this.entries.get(sequence.id) !== entry) return;
      image = await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height, resizeQuality: 'low' });
      // Older implementations may ignore resize options; do not retain HQ pixels.
      if (image.width !== width || image.height !== height) throw new Error('Lite resize unsupported');
      if (this.entries.get(sequence.id) !== entry) return;
      const pixels = width * height;
      while (this.pixels + pixels > this.maxPixels) {
        if (!this.evict(entry, true)) throw new Error('Lite cache budget exhausted');
      }
      entry.image = image;
      this.pixels += pixels;
      image = undefined;
    } catch {
      if (this.entries.get(entry.sequence.id) === entry) {
        entry.failed = true;
        this.failed.set(entry.sequence.id, entry.sequence.characterId);
      }
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (image) this.close(image);
      entry.loading = false;
      entry.controller = undefined;
    }
  }
}

export const liteAnimationTextureManager = new LiteAnimationTextureManager();
