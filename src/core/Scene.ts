export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export interface Scene {
  enter(): Promise<void> | void;
  exit(): Promise<void> | void;
  fixedUpdate(dt: number, tick: number): void;
  render(render: RenderContext, alpha: number, frameDt: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
