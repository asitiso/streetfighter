import { RELEASE_PROFILES, detectReleaseProfile, type ReleaseProfileId } from './ReleaseProfiles.js';
export type QualityTier = 'high' | 'balanced' | 'low';

export interface QualitySettings {
  tier: QualityTier;
  dprCap: number;
  particleScale: number;
  backgroundMotionScale: number;
  secondaryFx: boolean;
  scanlines: boolean;
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  high: { tier: 'high', dprCap: 2, particleScale: 1, backgroundMotionScale: 1, secondaryFx: true, scanlines: true },
  balanced: { tier: 'balanced', dprCap: 1.5, particleScale: .66, backgroundMotionScale: .75, secondaryFx: true, scanlines: false },
  low: { tier: 'low', dprCap: 1, particleScale: .42, backgroundMotionScale: .5, secondaryFx: false, scanlines: false },
};

export interface DeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  dpr?: number;
  pixelCount?: number;
  mobile?: boolean;
}

export function chooseInitialQuality(hints: DeviceHints): QualityTier {
  return RELEASE_PROFILES[detectReleaseProfile(hints)].recommendedQuality;
}

class RuntimeQuality {
  private tier: QualityTier = 'balanced';
  private samples: number[] = [];
  private lastChangeAt = 0;
  private forced = false;
  private profile: ReleaseProfileId = 'standard';

  configureFromEnvironment(): void {
    const nav = typeof navigator === 'undefined' ? undefined : navigator as Navigator & { deviceMemory?: number };
    const search = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
    const forced = search?.get('quality');
    const mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const hints = {
      deviceMemory: nav?.deviceMemory,
      hardwareConcurrency: nav?.hardwareConcurrency,
      dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      pixelCount: typeof window === 'undefined' ? 1280 * 720 : Math.max(1, window.innerWidth * window.innerHeight),
      mobile,
    };
    this.profile = detectReleaseProfile(hints);
    this.tier = RELEASE_PROFILES[this.profile].recommendedQuality;
    if (forced === 'high' || forced === 'balanced' || forced === 'low') {
      this.tier = forced;
      this.forced = true;
    }
  }

  get current(): QualitySettings { return SETTINGS[this.tier]; }
  get currentTier(): QualityTier { return this.tier; }
  get releaseProfileId(): ReleaseProfileId { return this.profile; }
  get releaseProfile() { return RELEASE_PROFILES[this.profile]; }

  setTier(tier: QualityTier, forced = true): boolean {
    if (tier === this.tier) return false;
    this.tier = tier;
    this.forced = forced;
    this.samples.length = 0;
    this.lastChangeAt = typeof performance === 'undefined' ? 0 : performance.now();
    return true;
  }

  sampleFrame(frameDtSeconds: number): boolean {
    if (this.forced || !Number.isFinite(frameDtSeconds) || frameDtSeconds <= 0 || frameDtSeconds > .25) return false;
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    if (now - this.lastChangeAt < 12_000) return false;
    this.samples.push(frameDtSeconds);
    if (this.samples.length < 120) return false;
    if (this.samples.length > 180) this.samples.shift();
    const avg = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    const fps = 1 / avg;
    if (fps < 48 && this.tier === 'high') return this.setTier('balanced', false);
    if (fps < 43 && this.tier === 'balanced') return this.setTier('low', false);
    return false;
  }

  particleCount(base: number): number {
    return Math.max(1, Math.round(base * this.current.particleScale));
  }
}

export const runtimeQuality = new RuntimeQuality();
