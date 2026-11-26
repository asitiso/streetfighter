import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';

const STAGES = [
  { id: 1, title: 'NEW YORK — DOWNTOWN', subtitle: 'Street Brawlers / Downtown Duel', accent: '#d45a54' },
  { id: 2, title: 'HONG KONG — NIGHT MARKET', subtitle: 'Neon Market / Speed Pressure', accent: '#d24b91' },
  { id: 3, title: 'JAPAN — KARATE DISTRICT', subtitle: 'Dojo / Parry & Counter', accent: '#d6a34a' },
  { id: 4, title: 'LONDON — FIGHT CLUB', subtitle: 'Boxing / Grapple / Underground', accent: '#5a9bb9' },
  { id: 5, title: 'SECRET SOCIETY FACILITY', subtitle: 'Urien / Gill / Final Duel', accent: '#8170cf' },
] as const;

const STAGE_ACTION_RETRY = 'OPEN FAILED • RETRY OR CHOOSE ANOTHER STAGE';

export class StageSelectScene implements Scene {
  private index = 0;
  private time = 0;
  private transitioning = false;
  private errorMessage = '';
  private entryId = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    initialStage: number,
    private readonly confirm: (stage: 1 | 2 | 3 | 4 | 5) => void | Promise<void>,
    private readonly back: (stage: 1 | 2 | 3 | 4 | 5) => void | Promise<void>,
    private readonly onError?: (error: unknown) => void,
    private initialFailed = false,
    private readonly onControlsChange?: (active: boolean) => void,
  ) {
    this.index = Math.max(0, Math.min(STAGES.length - 1, initialStage - 1));
  }

  enter(): void {
    this.onControlsChange?.(true);
    this.entryId += 1;
    this.transitioning = false;
    this.errorMessage = this.initialFailed ? STAGE_ACTION_RETRY : '';
    this.initialFailed = false;
    const entry = this.entryId;
    void this.audio.unlock().then(() => {
      if (entry === this.entryId) this.audio.startFrontendTheme?.('select');
    }).catch(() => undefined);
  }
  exit(): void { this.onControlsChange?.(false); this.entryId += 1; this.audio.stopFrontendTheme?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void { this.onControlsChange?.(false); this.entryId += 1; }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.transitioning) return;
    let next = this.index;
    if (this.input.pressed('up') || this.input.pressed('left')) next -= 1;
    if (this.input.pressed('down') || this.input.pressed('right')) next += 1;
    next = (next + STAGES.length) % STAGES.length;
    if (next !== this.index) { this.index = next; this.errorMessage = ''; this.audio.playMenuMove(); }
    if (this.input.pressed('back') || this.input.pressed('lk') || this.input.pressed('hk')) {
      this.runAction(this.back);
      return;
    }
    if (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) {
      this.audio.playUiConfirm();
      this.runAction(this.confirm);
    }
  }

  private runAction(action: (stage: 1 | 2 | 3 | 4 | 5) => void | Promise<void>): void {
    this.transitioning = true;
    this.errorMessage = '';
    const entry = this.entryId;
    const failed = (error: unknown) => {
      if (entry !== this.entryId) return;
      this.transitioning = false;
      this.errorMessage = STAGE_ACTION_RETRY;
      try { this.onError?.(error); } catch { /* Keep retry usable if diagnostics fail. */ }
    };
    try { void Promise.resolve(action(STAGES[this.index]!.id)).catch(failed); }
    catch (error) { failed(error); }
  }

  render({ ctx, width, height, compactTouchControls = false }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const g = ctx.createLinearGradient(0, 0, 1280, 720); g.addColorStop(0, '#111621'); g.addColorStop(.5, '#17141e'); g.addColorStop(1, '#080a0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2bf4c'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('CAMPAIGN COMPLETE', 58, 58); ctx.fillStyle = '#fff'; ctx.font = '900 48px Impact, sans-serif'; ctx.fillText('STAGE SELECT', 58, 108);
    ctx.fillStyle = 'rgba(255,255,255,.52)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText('REPLAY ANY COMPLETED CHAPTER WITH YOUR SAVED FIGHTER / SUPER ART', 60, 137);

    for (let i = 0; i < STAGES.length; i += 1) {
      const stage = STAGES[i]!; const y = compactTouchControls ? 188 + i * 72 : 195 + i * 80; const selected = i === this.index;
      ctx.fillStyle = selected ? `${stage.accent}2f` : 'rgba(255,255,255,.035)'; ctx.strokeStyle = selected ? stage.accent : 'rgba(255,255,255,.09)'; ctx.lineWidth = selected ? 4 : 2; ctx.beginPath(); ctx.roundRect(74, y, 780, compactTouchControls ? 62 : 68, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = stage.accent; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText(`0${stage.id}`, 98, y + 29); ctx.fillStyle = '#f5f1e9'; ctx.font = '900 23px Arial Black, sans-serif'; ctx.fillText(stage.title, 152, y + 31); ctx.fillStyle = 'rgba(228,234,244,.55)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(stage.subtitle, 153, y + 52);
    }

    const stage = STAGES[this.index]!; const pulse = .35 + Math.sin(this.time * 3.2) * .08;
    ctx.fillStyle = `${stage.accent}22`; ctx.beginPath(); ctx.arc(1030, 360, 190 + pulse * 20, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = stage.accent; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(1030, 360, 120, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 64px Impact, sans-serif'; ctx.fillText(`STAGE ${stage.id}`, 1030, 352); ctx.fillStyle = stage.accent; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('READY TO REPLAY', 1030, 390);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText(compactTouchControls ? '← → SELECT • CONFIRM: PLAY • BACK: TITLE' : 'ARROWS: SELECT • CONFIRM: PLAY • BACK: TITLE', 1030, compactTouchControls ? 527 : 570);
    if (this.errorMessage) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ff9b9b'; ctx.font = '800 14px Arial, sans-serif';
      ctx.fillText(this.errorMessage, 640, 166);
    }
    ctx.restore();
  }
}
