export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeAreaSnapshot {
  supported: boolean;
  landscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
  insets: SafeAreaInsets;
  canvasInsideSafeArea: boolean;
  ready: boolean;
  note: string;
}

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 10) / 10 : 0;
}

export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position:fixed', 'left:0', 'top:0', 'width:0', 'height:0', 'visibility:hidden', 'pointer-events:none',
    'padding-top:env(safe-area-inset-top, 0px)', 'padding-right:env(safe-area-inset-right, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)', 'padding-left:env(safe-area-inset-left, 0px)',
  ].join(';');
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = { top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft) };
  probe.remove();
  return insets;
}

export function safeViewportSize(width: number, height: number, insets: SafeAreaInsets): { width: number; height: number } {
  return {
    width: Math.max(1, width - Math.max(0, insets.left) - Math.max(0, insets.right)),
    height: Math.max(1, height - Math.max(0, insets.top) - Math.max(0, insets.bottom)),
  };
}

export function measureSafeArea(canvas?: HTMLCanvasElement | null): SafeAreaSnapshot {
  if (typeof window === 'undefined') {
    return { supported: false, landscape: true, viewportWidth: 1280, viewportHeight: 720, insets: { top: 0, right: 0, bottom: 0, left: 0 }, canvasInsideSafeArea: false, ready: false, note: 'SAFE AREA UNAVAILABLE OUTSIDE BROWSER' };
  }
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  const insets = readSafeAreaInsets();
  const landscape = viewportWidth >= viewportHeight;
  let canvasInsideSafeArea = false;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const epsilon = 1.5;
    canvasInsideSafeArea = rect.left + epsilon >= insets.left
      && rect.top + epsilon >= insets.top
      && rect.right - epsilon <= viewportWidth - insets.right
      && rect.bottom - epsilon <= viewportHeight - insets.bottom;
  }
  const ready = landscape && canvasInsideSafeArea;
  const note = `AUTO: landscape ${landscape ? 'yes' : 'no'} • safe insets L${insets.left}/R${insets.right}/T${insets.top}/B${insets.bottom}px • canvas ${canvasInsideSafeArea ? 'inside' : 'outside'}`;
  return { supported: true, landscape, viewportWidth, viewportHeight, insets, canvasInsideSafeArea, ready, note };
}
