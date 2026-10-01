import { OFFLINE_TRANSITIONS, type OfflineTransitionDetail } from './AssetManager.js';

export interface OfflineHarnessStep {
  id: OfflineTransitionDetail['id'];
  label: string;
  ready: boolean;
  loaded: string[];
  missing: string[];
}

export interface OfflineHarnessResult {
  ready: boolean;
  steps: OfflineHarnessStep[];
  traversed: number;
  total: number;
}

/**
 * Deterministic offline transition harness. The reader must only expose bytes already
 * present in an offline cache; no network fallback is allowed by this function.
 */
export async function runOfflineCampaignHarness(readCached: (url: string) => Promise<Uint8Array | string | null>): Promise<OfflineHarnessResult> {
  const steps: OfflineHarnessStep[] = [];
  for (const transition of OFFLINE_TRANSITIONS) {
    const loaded: string[] = [];
    const missing: string[] = [];
    for (const url of transition.urls) {
      const value = await readCached(url);
      if (value == null || (typeof value === 'string' && value.length === 0) || (value instanceof Uint8Array && value.byteLength === 0)) missing.push(url);
      else loaded.push(url);
    }
    steps.push({ id: transition.id, label: transition.label, ready: missing.length === 0, loaded, missing });
  }
  const traversed = steps.filter((step) => step.ready).length;
  return { ready: traversed === steps.length, steps, traversed, total: steps.length };
}
