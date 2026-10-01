import { latencyStats, type TouchLatencyResult } from './DeviceCertification.js';

export class TouchLatencyProbe {
  private samples: number[] = [];
  private active = false;
  private target: HTMLElement | null = null;
  private callback: ((result: TouchLatencyResult) => void) | null = null;

  start(target: HTMLElement, callback: (result: TouchLatencyResult) => void): void {
    this.stop();
    this.samples = [];
    this.active = true;
    this.target = target;
    this.callback = callback;
    target.addEventListener('pointerdown', this.onPointerDown, { passive: true });
  }

  stop(): void {
    if (this.target) this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.active = false;
    this.target = null;
    this.callback = null;
  }

  get sampleCount(): number { return this.samples.length; }
  get running(): boolean { return this.active; }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.active || event.pointerType === 'mouse') return;
    const rawTime = event.timeStamp;
    const eventTime = rawTime > 1e12 ? rawTime - performance.timeOrigin : rawTime;
    requestAnimationFrame(() => {
      const delta = Math.max(0, performance.now() - eventTime);
      if (Number.isFinite(delta) && delta < 500) this.samples.push(delta);
      const stats = latencyStats(this.samples);
      const result: TouchLatencyResult = { samples: [...this.samples], ...stats, measuredAt: new Date().toISOString() };
      this.callback?.(result);
      if (this.samples.length >= 8) this.stop();
    });
  };
}
