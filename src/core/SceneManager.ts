import type { RenderContext, Scene } from './Scene.js';

export class SceneManager {
  private current: Scene | null = null;
  private width = 1280;
  private height = 720;

  async setScene(scene: Scene): Promise<void> {
    if (this.current) {
      await this.current.exit();
      this.current.destroy();
    }
    this.current = scene;
    this.current.resize(this.width, this.height);
    await this.current.enter();
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
