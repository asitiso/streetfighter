export const GAME_CACHE_PREFIX = 'game-cache-';

export interface CacheUpgradePlan {
  currentCache: string;
  staleGameCaches: string[];
  preservedCaches: string[];
  saveSeparated: boolean;
  safe: boolean;
}

export function planCacheUpgrade(existingCaches: readonly string[], currentCache: string, saveDbName: string): CacheUpgradePlan {
  const staleGameCaches = existingCaches.filter((name) => name.startsWith(GAME_CACHE_PREFIX) && name !== currentCache);
  const preservedCaches = existingCaches.filter((name) => !name.startsWith(GAME_CACHE_PREFIX) || name === currentCache);
  const saveSeparated = !saveDbName.startsWith(GAME_CACHE_PREFIX) && saveDbName !== currentCache;
  return {
    currentCache,
    staleGameCaches,
    preservedCaches,
    saveSeparated,
    safe: saveSeparated && staleGameCaches.every((name) => name.startsWith(GAME_CACHE_PREFIX)),
  };
}

export function simulatePreviousReleaseUpgrade(currentCache: string, saveDbName: string): CacheUpgradePlan {
  return planCacheUpgrade(['game-cache-v024', 'game-cache-v025', 'game-cache-v026', 'game-cache-v027', 'game-cache-v028', currentCache, 'browser-runtime-cache'], currentCache, saveDbName);
}
