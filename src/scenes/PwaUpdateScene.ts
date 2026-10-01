import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import type { PwaUpdateManager, PwaUpdateStatus } from '../core/PwaUpdateManager.js';

export class PwaUpdateScene implements Scene {
  private time = 0;
  private status: PwaUpdateStatus | null = null;
  private busy = false;
  private message = 'CHECKING UPDATE STATE';

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly updates: PwaUpdateManager,
    private readonly onBack: () => void,
  ) {}

  enter(): void { this.audio.playStagePulse(); void this.refresh(); }
  exit(): void {}
  resize(): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.busy) return;
    if (this.input.pressed('lp')) { this.audio.playUiConfirm(); void this.check(); }
    if (this.input.pressed('mp')) { this.audio.playUiConfirm(); void this.apply(); }
    if (this.input.pressed('hp')) { this.audio.playUiConfirm(); void this.rollback(); }
    if (this.input.pressed('back') || this.input.pressed('lk') || this.input.touchPressed('start')) { this.audio.playUiConfirm(); this.onBack(); }
  }

  private async refresh(): Promise<void> { this.status = await this.updates.status(); this.message = this.status.lastAction; }
  private async check(): Promise<void> { this.busy = true; this.message = 'CHECKING SERVER'; this.status = await this.updates.checkForUpdate(); this.message = this.status.lastAction; this.busy = false; }
  private async apply(): Promise<void> {
    this.busy = true; const result = await this.updates.applyWaitingUpdate(); this.message = result.message; this.status = await this.updates.status(); this.busy = false;
    if (result.applied) window.setTimeout(() => window.location.reload(), 450);
  }
  private async rollback(): Promise<void> {
    this.busy = true; const result = this.status?.rollbackActive ? await this.updates.restoreCurrent() : await this.updates.rollbackPrevious(); this.message = result.message; this.status = await this.updates.status(); this.busy = false;
    if (result.applied) window.setTimeout(() => window.location.reload(), 450);
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const grad = ctx.createLinearGradient(0, 0, 1280, 720); grad.addColorStop(0, '#17172a'); grad.addColorStop(1, '#08080f'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillText('PWA UPDATE / ROLLBACK', 86, 78);
    ctx.fillStyle = 'rgba(220,228,240,.56)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText('KEEP ONE PREVIOUS GAME CACHE • SAVE DB IS NEVER ROLLED BACK', 88, 103);

    const rows = [
      ['SERVICE WORKER', this.status?.supported ? 'SUPPORTED' : 'UNSUPPORTED'],
      ['CURRENT CACHE', this.status?.currentCache ?? 'CHECKING'],
      ['PREVIOUS CACHE', this.status?.previousCache ?? 'NONE'],
      ['PAGE CONTROL', this.status?.controlled ? 'CONTROLLED' : 'NOT CONTROLLED'],
      ['WAITING UPDATE', this.status?.waiting ? 'READY TO APPLY' : this.status?.installing ? 'INSTALLING' : 'NONE'],
      ['ROLLBACK MODE', this.status?.rollbackActive ? `ACTIVE • ${this.status.rollbackActive}` : 'CURRENT ASSETS'],
      ['AUTO RECOVERY', this.status?.pendingRecovery ? 'ARMED • BOOT MUST CONFIRM' : 'READY'],
      ['LAST ACTION', this.busy ? 'WORKING…' : this.message],
    ];
    let y = 142;
    for (const [label, value] of rows) {
      ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(86, y, 710, 46, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(220,228,240,.52)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText(label!, 106, y + 17);
      ctx.fillStyle = '#f2f4f7'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillText(value!, 106, y + 35); y += 53;
    }

    const previousReady = !!this.status?.previousCache;
    this.drawAction(ctx, 850, 180, 'LP', 'CHECK UPDATE', 'Ask the browser registration to check the server', '#8fc9ff');
    this.drawAction(ctx, 850, 300, 'MP', 'APPLY WAITING UPDATE', 'Arms previous-cache recovery, activates worker, then reloads', '#8be0b4');
    this.drawAction(ctx, 850, 420, 'HP', this.status?.rollbackActive ? 'RESTORE CURRENT' : 'ROLL BACK ASSETS', this.status?.rollbackActive ? `Return to ${this.status.currentCache}` : previousReady ? `Use previous deferred campaign content; current launcher stays safe` : 'No previous game cache retained', (previousReady || this.status?.rollbackActive) ? '#ffd071' : '#777');
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,228,240,.54)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText('ROLLBACK KEEPS CURRENT LAUNCHER/UPDATE UI • DEFERRED CAMPAIGN CONTENT CAN USE PREVIOUS CACHE • SAVE UNCHANGED', 640, 646);
    ctx.fillText('LK / START  BACK', 640, 680);
    ctx.restore();
  }

  private drawAction(ctx: CanvasRenderingContext2D, x: number, y: number, key: string, title: string, detail: string, color: string): void {
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 340, 94, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = '900 19px Arial Black, sans-serif'; ctx.fillText(`${key}  ${title}`, x + 22, y + 34);
    ctx.fillStyle = 'rgba(225,232,242,.58)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText(detail, x + 22, y + 60);
  }
}
