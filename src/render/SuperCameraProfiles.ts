export interface SuperCameraProfile {
  zoom: number;
  panForward: number;
  panY: number;
  duration: number;
  letterbox: number;
  slow: number;
}

const DEFAULT: SuperCameraProfile = { zoom: 1.12, panForward: 22, panY: -8, duration: 28, letterbox: 28, slow: 14 };
const PROFILES: Readonly<Record<string, SuperCameraProfile>> = {
  wave: { zoom: 1.10, panForward: 34, panY: -4, duration: 30, letterbox: 26, slow: 13 },
  electric: { zoom: 1.16, panForward: 18, panY: -18, duration: 36, letterbox: 34, slow: 18 },
  flame: { zoom: 1.15, panForward: 18, panY: -36, duration: 35, letterbox: 32, slow: 17 },
  rush: { zoom: 1.12, panForward: 48, panY: -2, duration: 34, letterbox: 26, slow: 10 },
  burst: { zoom: 1.13, panForward: 10, panY: -14, duration: 32, letterbox: 28, slow: 14 },
  leap: { zoom: 1.15, panForward: 12, panY: -44, duration: 34, letterbox: 30, slow: 16 },
  punch: { zoom: 1.15, panForward: 32, panY: -10, duration: 32, letterbox: 30, slow: 16 },
  kunai: { zoom: 1.11, panForward: 40, panY: -24, duration: 31, letterbox: 26, slow: 11 },
  launch: { zoom: 1.145, panForward: 16, panY: -40, duration: 33, letterbox: 30, slow: 16 },
  uppercut: { zoom: 1.145, panForward: 12, panY: -42, duration: 32, letterbox: 30, slow: 16 },
  barrage: { zoom: 1.125, panForward: 28, panY: -10, duration: 34, letterbox: 28, slow: 12 },
  kickRush: { zoom: 1.115, panForward: 44, panY: 0, duration: 34, letterbox: 26, slow: 10 },
  throw: { zoom: 1.17, panForward: 5, panY: -16, duration: 36, letterbox: 34, slow: 18 },
  spiral: { zoom: 1.135, panForward: 24, panY: -16, duration: 34, letterbox: 30, slow: 14 },
  install: { zoom: 1.155, panForward: 0, panY: -28, duration: 40, letterbox: 38, slow: 20 },
  aerial: { zoom: 1.14, panForward: 18, panY: -48, duration: 34, letterbox: 30, slow: 15 },
  powerRush: { zoom: 1.14, panForward: 48, panY: -8, duration: 34, letterbox: 30, slow: 13 },
};

export function superCameraProfileForMotif(motif?: string): SuperCameraProfile { return (motif && PROFILES[motif]) || DEFAULT; }
export function superCameraProfileSignature(motif?: string): string { const p=superCameraProfileForMotif(motif); return `${p.zoom.toFixed(3)}:${p.panForward}:${p.panY}:${p.duration}:${p.letterbox}:${p.slow}`; }
