type PoseBlendCanvas = OffscreenCanvas | HTMLCanvasElement;
let canvas: PoseBlendCanvas | null = null;

export function acquirePoseBlendCanvas(): PoseBlendCanvas | null {
  if (!canvas) {
    if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(512, 512);
    else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
    }
  }
  return canvas;
}

export function releasePoseBlendCanvas(): void {
  if (!canvas) return;
  // Resize before releasing the reference so the large backing need not wait for GC.
  canvas.width = canvas.height = 1;
  canvas = null;
}
