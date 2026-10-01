import type { RenderContext, Scene } from './Scene.js';

export class SceneManager {
  private current: Scene | null = null;
  private width = 1280;
  private height = 720;
  private transitionTail: Promise<void> = Promise.resolve();

  setScene(scene: Scene): Promise<void> {
    const transition = async (): Promise<void> => {
      const previous = this.current;
      this.current = null;
      if (previous) {
        await previous.exit();
        previous.destroy();
      }

      this.current = scene;
      scene.resize(this.width, this.height);
      try {
        await scene.enter();
      } catch (error) {
        if (this.current === scene) this.current = null;
        try { await scene.exit(); } catch { /* preserve original enter error */ }
        try { scene.destroy(); } catch { /* preserve original enter error */ }
        throw error;
      }
    };

    const next = this.transitionTail.then(transition, transition);
    this.transitionTail = next.catch(() => undefined);
    return next;
  }

  fixedUpdate(dt: number, tick: number): void {
    this.current?.fixedUpdate(dt, tick);
  }

  render(render: RenderContext, alpha: number, frameDt: number): void {
    this.current?.render(render, alpha, frameDt);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.current?.resize(width, height);
  }
}
