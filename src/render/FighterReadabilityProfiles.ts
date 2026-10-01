export interface FighterReadabilityProfile {
  contrastRadiusX: number;
  contrastRadiusY: number;
  contrastAlpha: number;
  rimAlpha: number;
  rimWidth: number;
  closeSpacingThreshold: number;
  separationAlpha: number;
  foregroundFadeRadius: number;
  foregroundMinAlpha: number;
  fxProtection: number;
}

const PROFILES: Record<number, FighterReadabilityProfile> = {
  1: { contrastRadiusX: 66, contrastRadiusY: 118, contrastAlpha: .16, rimAlpha: .26, rimWidth: 4.2, closeSpacingThreshold: 116, separationAlpha: .12, foregroundFadeRadius: 118, foregroundMinAlpha: .28, fxProtection: .92 },
  2: { contrastRadiusX: 72, contrastRadiusY: 124, contrastAlpha: .2,  rimAlpha: .31, rimWidth: 4.8, closeSpacingThreshold: 122, separationAlpha: .15, foregroundFadeRadius: 132, foregroundMinAlpha: .2,  fxProtection: .82 },
  3: { contrastRadiusX: 64, contrastRadiusY: 116, contrastAlpha: .14, rimAlpha: .23, rimWidth: 4.0, closeSpacingThreshold: 112, separationAlpha: .11, foregroundFadeRadius: 112, foregroundMinAlpha: .34, fxProtection: .96 },
  4: { contrastRadiusX: 74, contrastRadiusY: 126, contrastAlpha: .22, rimAlpha: .3,  rimWidth: 5.0, closeSpacingThreshold: 124, separationAlpha: .16, foregroundFadeRadius: 138, foregroundMinAlpha: .2,  fxProtection: .8 },
  5: { contrastRadiusX: 78, contrastRadiusY: 132, contrastAlpha: .23, rimAlpha: .34, rimWidth: 5.4, closeSpacingThreshold: 128, separationAlpha: .17, foregroundFadeRadius: 142, foregroundMinAlpha: .18, fxProtection: .78 },
};

const DEFAULT = PROFILES[1]!;

export function fighterReadabilityProfile(stageId: number): FighterReadabilityProfile {
  return PROFILES[stageId] ?? DEFAULT;
}

export function foregroundOcclusionAlpha(stageId: number, distance: number): number {
  const p = fighterReadabilityProfile(stageId);
  if (distance >= p.foregroundFadeRadius) return 1;
  const t = Math.max(0, Math.min(1, distance / p.foregroundFadeRadius));
  const eased = t * t * (3 - 2 * t);
  return p.foregroundMinAlpha + (1 - p.foregroundMinAlpha) * eased;
}

export function closeSpacingStrength(stageId: number, distance: number): number {
  const p = fighterReadabilityProfile(stageId);
  if (distance >= p.closeSpacingThreshold) return 0;
  const t = 1 - Math.max(0, distance) / p.closeSpacingThreshold;
  return t * t * (3 - 2 * t);
}
