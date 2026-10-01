import type { CombatEvent } from '../combat/CombatTypes.js';

export interface CinematicTimingProfile {
  kickFrames: number;
  kickPower: number;
  focusFrames: number;
  focusZoom: number;
  slowFrames: number;
  letterboxFrames: number;
  rhythmPan: number;
  catchFrames: number;
  catchZoom: number;
}

const BASE: CinematicTimingProfile = {
  kickFrames: 6,
  kickPower: 3.2,
  focusFrames: 8,
  focusZoom: 1.03,
  slowFrames: 0,
  letterboxFrames: 0,
  rhythmPan: 0,
  catchFrames: 0,
  catchZoom: 1,
};

function hitRatio(event: CombatEvent): number {
  const total = Math.max(1, event.hitTotal ?? 1);
  const index = Math.max(1, Math.min(total, event.hitIndex ?? 1));
  return total <= 1 ? 1 : (index - 1) / (total - 1);
}

export function cinematicTimingForEvent(event: CombatEvent): CinematicTimingProfile {
  const ratio = hitRatio(event);
  const total = Math.max(1, event.hitTotal ?? 1);
  const finalHit = total > 1 && (event.hitIndex ?? 1) >= total;
  const power = Math.max(0, event.power);

  if (event.type === 'red-parry') return { ...BASE, kickFrames: 9, kickPower: 5.8, focusFrames: 28, focusZoom: 1.14, slowFrames: 18, letterboxFrames: 22, rhythmPan: 4 };
  if (event.type === 'parry') return { ...BASE, kickFrames: 6, kickPower: 3.6, focusFrames: 20, focusZoom: 1.09, slowFrames: 11, letterboxFrames: 13, rhythmPan: 2 };
  if (event.type === 'wall-bounce') return { ...BASE, kickFrames: 10, kickPower: 7.1, focusFrames: 13, focusZoom: 1.055, rhythmPan: 6, catchFrames: 28, catchZoom: 1.07 };
  if (event.type === 'ground-bounce') return { ...BASE, kickFrames: 9, kickPower: 6.5, focusFrames: 12, focusZoom: 1.05, rhythmPan: 3, catchFrames: 24, catchZoom: 1.065 };
  if (event.type === 'super-impact') {
    const decisive = total === 1 || finalHit;
    const pulse = total > 1 ? .74 + ratio * .18 + (finalHit ? .28 : 0) : 1;
    return {
      ...BASE,
      kickFrames: decisive ? 13 : 9,
      kickPower: Math.min(11, (5.8 + power / 62) * pulse),
      focusFrames: decisive ? 22 : 13,
      focusZoom: decisive ? 1.13 : 1.075 + ratio * .018,
      slowFrames: decisive ? 7 : 2,
      letterboxFrames: decisive ? 12 : 0,
      rhythmPan: total > 1 ? (ratio - .5) * 12 : 4,
    };
  }
  if (event.type === 'counter') return { ...BASE, kickFrames: 9, kickPower: Math.min(8.2, 4.3 + power / 48), focusFrames: 12, focusZoom: 1.06, slowFrames: 3, rhythmPan: 3 };
  if (event.type === 'air-hit' || event.type === 'command-hit' || event.type === 'target-hit' || event.type === 'hit') {
    const heavy = power >= 85;
    const multiScale = total > 1 ? .74 + ratio * .18 + (finalHit ? .2 : 0) : 1;
    return {
      ...BASE,
      kickFrames: heavy ? (finalHit ? 9 : 7) : 5,
      kickPower: Math.min(8.4, (2.2 + power / 44) * multiScale),
      focusFrames: heavy ? 9 : 6,
      focusZoom: heavy ? 1.045 + (finalHit ? .018 : 0) : 1.025,
      slowFrames: finalHit && heavy ? 2 : 0,
      rhythmPan: total > 1 ? (ratio - .5) * 8 : 0,
    };
  }
  if (event.type === 'enemy-collision' || event.type === 'wall-impact') return { ...BASE, kickFrames: 8, kickPower: Math.min(8, 3.6 + power / 55), focusFrames: 8, focusZoom: 1.04, catchFrames: event.type === 'wall-impact' ? 16 : 0, catchZoom: 1.045 };
  return BASE;
}

export function cinematicTimingDigest(event: CombatEvent): string {
  const p = cinematicTimingForEvent(event);
  return [p.kickFrames,p.kickPower,p.focusFrames,p.focusZoom,p.slowFrames,p.letterboxFrames,p.rhythmPan,p.catchFrames,p.catchZoom]
    .map((v) => typeof v === 'number' ? v.toFixed(3) : String(v)).join(':');
}
