import { planCacheUpgrade, type CacheUpgradePlan } from './UpdatePolicy.js';

export interface UpgradeHarnessResult {
  plan: CacheUpgradePlan;
  beforeCaches: string[];
  afterCaches: string[];
  saveFingerprintBefore: string;
  saveFingerprintAfter: string;
  savePreserved: boolean;
  currentCachePresent: boolean;
  staleCachesRemoved: boolean;
}

/** Simulates only game-cache removal. Save bytes are deliberately outside CacheStorage. */
export function runReleaseUpgradeHarness(existingCaches: readonly string[], currentCache: string, saveDbName: string, saveFingerprint: string): UpgradeHarnessResult {
  const plan = planCacheUpgrade(existingCaches, currentCache, saveDbName);
  const afterCaches = existingCaches.filter((name) => !plan.staleGameCaches.includes(name));
  if (!afterCaches.includes(currentCache)) afterCaches.push(currentCache);
  const saveFingerprintAfter = saveFingerprint;
  return {
    plan,
    beforeCaches: [...existingCaches],
    afterCaches,
    saveFingerprintBefore: saveFingerprint,
    saveFingerprintAfter,
    savePreserved: saveFingerprintAfter === saveFingerprint,
    currentCachePresent: afterCaches.includes(currentCache),
    staleCachesRemoved: plan.staleGameCaches.every((name) => !afterCaches.includes(name)),
  };
}
