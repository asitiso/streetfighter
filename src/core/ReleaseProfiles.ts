export type ReleaseProfileId = 'entry' | 'standard' | 'performance';

export interface ReleaseDeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  dpr?: number;
  pixelCount?: number;
  mobile?: boolean;
}

export interface ReleaseProfile {
  id: ReleaseProfileId;
  label: string;
  recommendedQuality: 'low' | 'balanced' | 'high';
  idlePrefetchDelayMs: number;
  description: string;
}

export const RELEASE_PROFILES: Record<ReleaseProfileId, ReleaseProfile> = {
  entry: {
    id: 'entry',
    label: 'ENTRY MOBILE',
    recommendedQuality: 'low',
    idlePrefetchDelayMs: 900,
    description: 'Lower DPR and secondary effects; combat timing stays fixed at 60Hz.',
  },
  standard: {
    id: 'standard',
    label: 'STANDARD MOBILE',
    recommendedQuality: 'balanced',
    idlePrefetchDelayMs: 500,
    description: 'Balanced visuals and prefetching for typical modern phones.',
  },
  performance: {
    id: 'performance',
    label: 'PERFORMANCE',
    recommendedQuality: 'high',
    idlePrefetchDelayMs: 250,
    description: 'Higher DPR and secondary effects for high-headroom devices.',
  },
};

export function detectReleaseProfile(hints: ReleaseDeviceHints): ReleaseProfileId {
  const memory = hints.deviceMemory ?? 4;
  const cores = hints.hardwareConcurrency ?? 4;
  const dpr = hints.dpr ?? 1;
  const pixels = hints.pixelCount ?? 1280 * 720;
  const effectivePixels = pixels * Math.min(2, Math.max(1, dpr));

  if (memory <= 2 || cores <= 2 || effectivePixels > 6_000_000) return 'entry';
  if (memory >= 8 && cores >= 8 && effectivePixels <= 4_500_000 && !hints.mobile) return 'performance';
  if (memory >= 6 && cores >= 8 && effectivePixels <= 3_800_000) return 'performance';
  return 'standard';
}

export function releaseProfileFor(hints: ReleaseDeviceHints): ReleaseProfile {
  return RELEASE_PROFILES[detectReleaseProfile(hints)];
}
