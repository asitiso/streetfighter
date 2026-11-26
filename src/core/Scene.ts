export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  compactTouchControls?: boolean;
}

export interface Scene {
  readonly frontendTheme?: 'title' | 'select' | 'ending';
  enter(): Promise<void> | void;
  exit(next?: Scene): Promise<void> | void;
  fixedUpdate(dt: number, tick: number): void;
  render(render: RenderContext, alpha: number, frameDt: number): void;
  resize(width: number, height: number): void;
  onQualityChange?(): void;
  pointerTap?(x: number, y: number): void;
  destroy(): void;
}
