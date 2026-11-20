export type FixedUpdate = (dtSeconds: number, tick: number) => void;
export type RenderUpdate = (alpha: number, frameDtSeconds: number) => void;

export class FixedStepLoop {
  private readonly stepMs = 1000 / 60;
  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private tick = 0;
  private runVersion = 0;

  constructor(
    private readonly fixedUpdate: FixedUpdate,
    private readonly renderUpdate: RenderUpdate,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    // A new run must not consume unfinished catchup from the stopped frame.
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.createFrame(++this.runVersion));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  get combatTick(): number {
    return this.tick;
  }

  // Capture the run once, so even an already-dispatched old callback is inert.
  private createFrame(version: number): FrameRequestCallback {
    const frame: FrameRequestCallback = (now) => {
      if (!this.running || version !== this.runVersion) return;

      const elapsedMs = now - this.lastTime;
      const frameMs = Math.min(100, elapsedMs);
      this.lastTime = now;
      this.accumulator += frameMs;

      let safety = 0;
      while (this.accumulator >= this.stepMs && safety < 6) {
        this.tick += 1;
        this.accumulator -= this.stepMs;
        this.fixedUpdate(this.stepMs / 1000, this.tick);
        if (!this.running || version !== this.runVersion) return;
        safety += 1;
      }

      // Simulation catchup is capped; performance consumers need the real frame cost.
      this.renderUpdate(this.accumulator / this.stepMs, elapsedMs / 1000);
      if (this.running && version === this.runVersion) this.rafId = requestAnimationFrame(frame);
    };
    return frame;
  }
}
