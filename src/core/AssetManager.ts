import { runtimeQuality } from './RuntimeQuality.js';

export type AssetGroupName = 'app-shell' | 'character-hd' | 'character-hq' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'ending';

export const GAME_CACHE_NAME = 'game-cache-v068';

export const ASSET_GROUPS: Record<AssetGroupName, readonly string[]> = {
  'app-shell': [
    '/art/title-keyart.png', '/art/roster-mural.png', '/audio/title-theme.ogg', '/audio/select-theme.ogg',
    '/art/portraits/ryu.webp', '/art/portraits/ken.webp', '/art/portraits/chunli.webp', '/art/portraits/alex.webp',
    '/art/portraits/dudley.webp', '/art/portraits/makoto.webp', '/art/portraits/ibuki.webp', '/art/portraits/yun.webp',
    '/art/combat-sprites/ryu.webp', '/art/combat-sprites/ken.webp', '/art/combat-sprites/chunli.webp', '/art/combat-sprites/alex.webp',
    '/art/combat-sprites/dudley.webp', '/art/combat-sprites/makoto.webp', '/art/combat-sprites/ibuki.webp', '/art/combat-sprites/yun.webp',
    '/art/attack-atlases/ryu.webp', '/art/attack-atlases/ken.webp', '/art/attack-atlases/chunli.webp', '/art/attack-atlases/alex.webp',
    '/art/attack-atlases/dudley.webp', '/art/attack-atlases/makoto.webp', '/art/attack-atlases/ibuki.webp', '/art/attack-atlases/yun.webp',
  ],
  'character-hd': [
    '/art/character-quality-manifest.json',
    '/art/combat-sprites-hd/ryu.webp', '/art/combat-sprites-hd/ken.webp', '/art/combat-sprites-hd/chunli.webp', '/art/combat-sprites-hd/alex.webp',
    '/art/combat-sprites-hd/dudley.webp', '/art/combat-sprites-hd/makoto.webp', '/art/combat-sprites-hd/ibuki.webp', '/art/combat-sprites-hd/yun.webp',
    '/art/attack-atlases-hd/ryu.webp', '/art/attack-atlases-hd/ken.webp', '/art/attack-atlases-hd/chunli.webp', '/art/attack-atlases-hd/alex.webp',
    '/art/attack-atlases-hd/dudley.webp', '/art/attack-atlases-hd/makoto.webp', '/art/attack-atlases-hd/ibuki.webp', '/art/attack-atlases-hd/yun.webp',
  ],
  'character-hq': [
    '/art/hq-character-master-manifest.json',
    '/art/combat-sprites-hq/ryu.webp', '/art/combat-sprites-hq/chunli.webp',
    '/art/combat-sprites-hq/ken.webp', '/art/combat-sprites-hq/ibuki.webp',
    '/art/animation-hq/ryu/manifest.json',
    '/art/animation-hq/ryu/idle.webp', '/art/animation-hq/ryu/walk.webp', '/art/animation-hq/ryu/walk-back.webp',
    '/art/animation-hq/ryu/dash.webp', '/art/animation-hq/ryu/jump.webp', '/art/animation-hq/ryu/landing.webp',
    '/art/animation-hq/ryu/hit.webp', '/art/animation-hq/ryu/stand-light.webp', '/art/animation-hq/ryu/stand-heavy.webp',
    '/art/animation-hq/ryu/hadoken.webp', '/art/animation-hq/ryu/shoryuken.webp',
    '/art/animation-hq/ken/manifest.json',
    '/art/animation-hq/ken/idle.webp', '/art/animation-hq/ken/walk.webp', '/art/animation-hq/ken/walk-back.webp',
    '/art/animation-hq/ken/dash.webp', '/art/animation-hq/ken/jump.webp', '/art/animation-hq/ken/landing.webp', '/art/animation-hq/ken/hit.webp',
    '/art/special-keyposes/ken/hadoken.webp', '/art/special-keyposes/ken/shoryuken.webp',
    '/art/special-keyposes/ken/tatsumaki.webp', '/art/special-keyposes/ken/super-rush.webp',
    '/art/special-keyposes/chunli/kikoken.webp', '/art/special-keyposes/chunli/spinning-bird-kick.webp',
    '/art/animation-hq/chunli/manifest.json',
    '/art/animation-hq/chunli/idle.webp', '/art/animation-hq/chunli/walk.webp', '/art/animation-hq/chunli/walk-back.webp',
    '/art/animation-hq/chunli/dash.webp', '/art/animation-hq/chunli/jump.webp', '/art/animation-hq/chunli/landing.webp', '/art/animation-hq/chunli/hit.webp',
    '/art/animation-hq/ibuki/manifest.json',
    '/art/animation-hq/ibuki/idle.webp', '/art/animation-hq/ibuki/walk.webp', '/art/animation-hq/ibuki/walk-back.webp',
    '/art/animation-hq/ibuki/dash.webp', '/art/animation-hq/ibuki/jump.webp', '/art/animation-hq/ibuki/landing.webp', '/art/animation-hq/ibuki/hit.webp',
  ],
  'stage-1': ['/assets/scenes/Stage1Scene.js', '/art/stage1-newyork.png', '/art/foregrounds/stage1-foreground.webp', '/audio/stage1-theme.ogg'],
  'stage-2': ['/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage2Scene.js', '/art/stage2-hongkong.png', '/art/foregrounds/stage2-foreground.webp', '/audio/stage2-theme.ogg'],
  'stage-3': ['/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage3Scene.js', '/art/stage3-japan.png', '/art/foregrounds/stage3-foreground.webp', '/audio/stage3-theme.ogg'],
  'stage-4': ['/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage4Scene.js', '/art/stage4-london.png', '/art/foregrounds/stage4-foreground.webp', '/audio/stage4-theme.ogg'],
  'stage-5': ['/assets/scenes/Stage1Scene.js', '/assets/scenes/Stage5Scene.js', '/art/stage5-secretsociety.png', '/art/foregrounds/stage5-foreground.webp', '/art/portraits/urien.webp', '/art/portraits/gill.webp', '/audio/stage5-theme.ogg', '/audio/final-boss-theme.ogg'],
  'ending': ['/assets/scenes/EndingScene.js', '/assets/game/EndingProfiles.js', '/art/ending-keyart.png', '/audio/ending-theme.ogg'],
};

export const CAMPAIGN_OFFLINE_URLS = Array.from(new Set([
  '/art/special-keyposes/ken/hadoken.webp', '/art/special-keyposes/ken/shoryuken.webp',
  '/art/special-keyposes/ken/tatsumaki.webp', '/art/special-keyposes/ken/super-rush.webp',
  '/art/special-keyposes/chunli/kikoken.webp', '/art/special-keyposes/chunli/spinning-bird-kick.webp',
  ...ASSET_GROUPS['stage-1'],
  ...ASSET_GROUPS['stage-2'],
  ...ASSET_GROUPS['stage-3'],
  ...ASSET_GROUPS['stage-4'],
  ...ASSET_GROUPS['stage-5'],
  ...ASSET_GROUPS.ending,
]));

export interface OfflineCampaignStatus {
  supported: boolean;
  ready: boolean;
  cached: number;
  total: number;
  missing: string[];
}

export interface OfflineTransitionDetail {
  id: '1-2' | '2-3' | '3-4' | '4-5' | '5-ending';
  label: string;
  ready: boolean;
  missing: string[];
}

export interface OfflineTransitionStatus {
  ready: boolean;
  readyCount: number;
  total: number;
  transitions: OfflineTransitionDetail[];
}


export interface OfflineDynamicImportStep {
  id: OfflineTransitionDetail['id'];
  label: string;
  url: string;
  exportName: string;
  ready: boolean;
  durationMs: number;
  error?: string;
}

export interface OfflineDynamicImportAudit {
  supported: boolean;
  offline: boolean;
  controlled: boolean;
  ready: boolean;
  loaded: number;
  total: number;
  steps: OfflineDynamicImportStep[];
  message: string;
}

export const OFFLINE_TRANSITIONS: readonly { id: OfflineTransitionDetail['id']; label: string; urls: readonly string[] }[] = [
  { id: '1-2', label: 'STAGE 1 → 2', urls: ASSET_GROUPS['stage-2'] },
  { id: '2-3', label: 'STAGE 2 → 3', urls: ASSET_GROUPS['stage-3'] },
  { id: '3-4', label: 'STAGE 3 → 4', urls: ASSET_GROUPS['stage-4'] },
  { id: '4-5', label: 'STAGE 4 → 5', urls: ASSET_GROUPS['stage-5'] },
  { id: '5-ending', label: 'STAGE 5 → ENDING', urls: ASSET_GROUPS.ending },
];

export class AssetManager {
  private loadedGroups = new Set<string>();
  private loading = new Map<string, Promise<void>>();

  async loadGroup(name: AssetGroupName, onProgress?: (done: number, total: number) => void): Promise<void> {
    if (this.loadedGroups.has(name)) { onProgress?.(1, 1); return; }
    const existing = this.loading.get(name);
    if (existing) { await existing; onProgress?.(1, 1); return; }
    const urls = ASSET_GROUPS[name] ?? [];
    const task = (async () => {
      if (urls.length === 0) { this.loadedGroups.add(name); onProgress?.(1, 1); return; }
      let done = 0;
      onProgress?.(0, urls.length);
      await Promise.all(urls.map(async (url) => {
        this.modulePreload(url);
        const preferFreshCode = typeof navigator !== 'undefined' && navigator.onLine !== false && url.startsWith('/assets/') && url.endsWith('.js');
        const response = await this.fetchWithCacheFallback(url, preferFreshCode);
        if (!response.ok) throw new Error(`Asset preload failed: ${url} (${response.status})`);
        done += 1;
        onProgress?.(done, urls.length);
      }));
      this.loadedGroups.add(name);
      this.notifyServiceWorker(urls);
    })();
    this.loading.set(name, task);
    try { await task; } finally { this.loading.delete(name); }
  }

  prefetchGroup(name: AssetGroupName): void {
    if (this.loadedGroups.has(name) || this.loading.has(name)) return;
    const run = () => { void this.loadGroup(name).catch(() => undefined); };
    const delay = runtimeQuality.releaseProfile.idlePrefetchDelayMs;
    const idle = (globalThis as typeof globalThis & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(run, { timeout: Math.max(900, delay * 3) });
    else setTimeout(run, delay);
  }

  async prepareOfflineCampaign(onProgress?: (done: number, total: number) => void): Promise<OfflineCampaignStatus> {
    const urls = CAMPAIGN_OFFLINE_URLS;
    let done = 0;
    onProgress?.(0, urls.length);
    for (const url of urls) {
      this.modulePreload(url);
      const response = await this.fetchWithCacheFallback(url, true);
      if (!response.ok) throw new Error(`Offline cache failed: ${url} (${response.status})`);
      done += 1;
      onProgress?.(done, urls.length);
    }
    this.notifyServiceWorker(urls);
    return this.verifyOfflineCampaign();
  }

  async verifyOfflineCampaign(): Promise<OfflineCampaignStatus> {
    if (typeof caches === 'undefined') return { supported: false, ready: false, cached: 0, total: CAMPAIGN_OFFLINE_URLS.length, missing: [...CAMPAIGN_OFFLINE_URLS] };
    const missing: string[] = [];
    const cache = await caches.open(GAME_CACHE_NAME);
    for (const url of CAMPAIGN_OFFLINE_URLS) {
      const response = await cache.match(url);
      if (!response) missing.push(url);
    }
    return { supported: true, ready: missing.length === 0, cached: CAMPAIGN_OFFLINE_URLS.length - missing.length, total: CAMPAIGN_OFFLINE_URLS.length, missing };
  }


  async verifyOfflineTransitions(): Promise<OfflineTransitionStatus> {
    if (typeof caches === 'undefined') {
      const transitions = OFFLINE_TRANSITIONS.map((transition) => ({ id: transition.id, label: transition.label, ready: false, missing: [...transition.urls] }));
      return { ready: false, readyCount: 0, total: transitions.length, transitions };
    }
    const cache = await caches.open(GAME_CACHE_NAME);
    const transitions: OfflineTransitionDetail[] = [];
    for (const transition of OFFLINE_TRANSITIONS) {
      const missing: string[] = [];
      for (const url of transition.urls) if (!await cache.match(url)) missing.push(url);
      transitions.push({ id: transition.id, label: transition.label, ready: missing.length === 0, missing });
    }
    const readyCount = transitions.filter((transition) => transition.ready).length;
    return { ready: readyCount === transitions.length, readyCount, total: transitions.length, transitions };
  }


  async auditOfflineDynamicImports(timeoutMs = 12_000): Promise<OfflineDynamicImportAudit> {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
    const supported = typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    const specs = [
      { id: '1-2', label: 'STAGE 1 → 2', url: '/assets/scenes/Stage2Scene.js', exportName: 'Stage2Scene' },
      { id: '2-3', label: 'STAGE 2 → 3', url: '/assets/scenes/Stage3Scene.js', exportName: 'Stage3Scene' },
      { id: '3-4', label: 'STAGE 3 → 4', url: '/assets/scenes/Stage4Scene.js', exportName: 'Stage4Scene' },
      { id: '4-5', label: 'STAGE 4 → 5', url: '/assets/scenes/Stage5Scene.js', exportName: 'Stage5Scene' },
      { id: '5-ending', label: 'STAGE 5 → ENDING', url: '/assets/scenes/EndingScene.js', exportName: 'EndingScene' },
    ] as const;
    if (!supported) return { supported: false, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'MODULE WORKER UNSUPPORTED' };
    if (!offline) return { supported: true, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'TURN ON AIRPLANE MODE / GO OFFLINE' };
    if (!controlled) return { supported: true, offline, controlled, ready: false, loaded: 0, total: specs.length, steps: [], message: 'SERVICE WORKER NOT CONTROLLING APP' };

    const cached = await this.verifyOfflineTransitions();
    if (!cached.ready) return { supported: true, offline, controlled, ready: false, loaded: cached.readyCount, total: cached.total, steps: [], message: `OFFLINE CACHE INCOMPLETE ${cached.readyCount}/${cached.total}` };

    const source = `
const specs = ${JSON.stringify(specs)};
const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
(async () => {
  const steps = [];
  for (const spec of specs) {
    const started = now();
    try {
      const mod = await import(spec.url);
      const ready = typeof mod[spec.exportName] === 'function';
      steps.push({ ...spec, ready, durationMs: Math.max(0, now() - started), ...(ready ? {} : { error: 'EXPECTED EXPORT MISSING' }) });
    } catch (error) {
      steps.push({ ...spec, ready: false, durationMs: Math.max(0, now() - started), error: String(error) });
    }
  }
  self.postMessage({ steps });
})().catch((error) => self.postMessage({ fatal: String(error), steps: [] }));`;
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      const steps = await new Promise<OfflineDynamicImportStep[]>((resolve) => {
        const worker = new Worker(blobUrl, { type: 'module', name: 'ssc-offline-import-audit' });
        let settled = false;
        const finish = (value: OfflineDynamicImportStep[]) => { if (settled) return; settled = true; worker.terminate(); resolve(value); };
        const timer = window.setTimeout(() => finish(specs.map((spec) => ({ ...spec, ready: false, durationMs: timeoutMs, error: 'AUDIT TIMEOUT' }))), timeoutMs);
        worker.onmessage = (event: MessageEvent<{ steps?: OfflineDynamicImportStep[] }>) => { window.clearTimeout(timer); finish(Array.isArray(event.data?.steps) ? event.data.steps : []); };
        worker.onerror = (event) => { window.clearTimeout(timer); finish(specs.map((spec) => ({ ...spec, ready: false, durationMs: 0, error: event.message || 'MODULE WORKER ERROR' }))); };
      });
      const loaded = steps.filter((step) => step.ready).length;
      return { supported: true, offline, controlled, ready: loaded === specs.length, loaded, total: specs.length, steps, message: loaded === specs.length ? `OFFLINE DYNAMIC IMPORT ${loaded}/${specs.length} PASS` : `OFFLINE DYNAMIC IMPORT ${loaded}/${specs.length} CHECK` };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async verifyNetworkCutFallback(urls: readonly string[] = CAMPAIGN_OFFLINE_URLS): Promise<{ ready: boolean; cached: number; total: number; missing: string[] }> {
    if (typeof caches === 'undefined') return { ready: false, cached: 0, total: urls.length, missing: [...urls] };
    const cache = await caches.open(GAME_CACHE_NAME);
    const missing: string[] = [];
    for (const url of urls) if (!await cache.match(url)) missing.push(url);
    return { ready: missing.length === 0, cached: urls.length - missing.length, total: urls.length, missing };
  }

  invalidateGroup(name: AssetGroupName): void { this.loadedGroups.delete(name); }
  hasGroup(name: string): boolean { return this.loadedGroups.has(name); }

  private async fetchWithCacheFallback(url: string, preferNetwork: boolean): Promise<Response> {
    const cached = async (): Promise<Response | undefined> => {
      if (typeof caches === 'undefined') return undefined;
      try {
        const cache = await caches.open(GAME_CACHE_NAME);
        return await cache.match(url) ?? undefined;
      } catch { return undefined; }
    };

    if (!preferNetwork) {
      const hit = await cached();
      if (hit) return hit;
    }

    try {
      const response = await fetch(url, { cache: preferNetwork ? 'reload' : 'force-cache' });
      if (response.ok) await this.cacheResponse(url, response.clone());
      return response;
    } catch (error) {
      const hit = await cached();
      if (hit) return hit;
      throw error;
    }
  }

  private async cacheResponse(url: string, response: Response): Promise<void> {
    if (typeof caches === 'undefined' || !response.ok) return;
    try { const cache = await caches.open(GAME_CACHE_NAME); await cache.put(url, response); } catch { /* CacheStorage can be unavailable in privacy modes. */ }
  }

  private notifyServiceWorker(urls: readonly string[]): void {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller || urls.length === 0) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls: [...urls] });
  }

  private modulePreload(url: string): void {
    if (typeof document === 'undefined' || document.querySelector(`link[data-game-preload="${url}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    link.dataset.gamePreload = url;
    document.head.appendChild(link);
  }
}
