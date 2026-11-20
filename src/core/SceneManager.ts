import { releasePoseBlendCanvas } from '../render/PoseBlendBuffer.js';
import type { RenderContext, Scene } from './Scene.js';

export class SceneManager {
  private current: Scene | null = null;
  get activeScene(): Scene | null { return this.current; }
  private width = 1280;
  private height = 720;
  private transitionTail: Promise<void> = Promise.resolve();

  setScene(scene: Scene): Promise<void> {
    const transition = async (): Promise<void> => {
      const previous = this.current;
      this.current = null;
      releasePoseBlendCanvas();
      if (previous) {
        try { await previous.exit(); }
        catch (error) {
          try { previous.destroy(); } catch { /* preserve original exit error */ }
          throw error;
        }
        previous.destroy();
      }

      this.current = scene;
      try {
        scene.resize(this.width, this.height);
        await scene.enter();
      } catch (error) {
        if (this.current === scene) {
          this.current = null;
          releasePoseBlendCanvas();
        }
        try { await scene.exit(); } catch { /* preserve original enter error */ }
        try { scene.destroy(); } catch { /* preserve original enter error */ }
        throw error;
      }
    };

    const next = this.transitionTail.then(transition, transition);
    this.transitionTail = next.catch(() => undefined);
    return next;
  }

  // Wait for the queue and never overwrite a live or newer requested scene.
  recoverIfEmpty(createScene: () => Scene): Promise<boolean> {
    const tail = this.transitionTail;
    return tail.then(() => {
      if (this.current || this.transitionTail !== tail) return false;
      return this.setScene(createScene()).then(() => true);
    });
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
