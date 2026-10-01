export type FixedUpdate = (dtSeconds: number, tick: number) => void;
export type RenderUpdate = (alpha: number, frameDtSeconds: number) => void;

export class FixedStepLoop {
  private readonly stepMs = 1000 / 60;
  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private tick = 0;

  constructor(
    private readonly fixedUpdate: FixedUpdate,
    private readonly renderUpdate: RenderUpdate,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  get combatTick(): number {
    return this.tick;
  }

  private frame = (now: number): void => {
    if (!this.running) return;

    const frameMs = Math.min(100, now - this.lastTime);
    this.lastTime = now;
    this.accumulator += frameMs;

    let safety = 0;
    while (this.accumulator >= this.stepMs && safety < 6) {
      this.tick += 1;
      this.fixedUpdate(this.stepMs / 1000, this.tick);
      this.accumulator -= this.stepMs;
      safety += 1;
    }

    this.renderUpdate(this.accumulator / this.stepMs, frameMs / 1000);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
