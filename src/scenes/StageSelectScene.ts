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

export class StageSelectScene implements Scene {
  private index = 0;
  private time = 0;
  private lock = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    initialStage: number,
    private readonly confirm: (stage: 1 | 2 | 3 | 4 | 5) => void,
    private readonly back: () => void,
  ) {
    this.index = Math.max(0, Math.min(STAGES.length - 1, initialStage - 1));
  }

  enter(): void {}
  exit(): void {}
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.lock > 0) this.lock -= 1;
    if (this.lock > 0) return;
    let next = this.index;
    if (this.input.pressed('up') || this.input.pressed('left')) next -= 1;
    if (this.input.pressed('down') || this.input.pressed('right')) next += 1;
    next = (next + STAGES.length) % STAGES.length;
    if (next !== this.index) { this.index = next; this.lock = 5; this.audio.playMenuMove(); }
    if (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) { this.audio.playUiConfirm(); this.confirm(STAGES[this.index]!.id); }
    if (this.input.pressed('back') || this.input.pressed('lk') || this.input.pressed('hk')) this.back();
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const g = ctx.createLinearGradient(0, 0, 1280, 720); g.addColorStop(0, '#111621'); g.addColorStop(.5, '#17141e'); g.addColorStop(1, '#080a0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2bf4c'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('CAMPAIGN COMPLETE', 58, 58); ctx.fillStyle = '#fff'; ctx.font = '900 48px Impact, sans-serif'; ctx.fillText('STAGE SELECT', 58, 108);
    ctx.fillStyle = 'rgba(255,255,255,.52)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText('REPLAY ANY COMPLETED CHAPTER WITH YOUR SAVED FIGHTER / SUPER ART', 60, 137);

    for (let i = 0; i < STAGES.length; i += 1) {
      const stage = STAGES[i]!; const y = 195 + i * 87; const selected = i === this.index;
      ctx.fillStyle = selected ? `${stage.accent}2f` : 'rgba(255,255,255,.035)'; ctx.strokeStyle = selected ? stage.accent : 'rgba(255,255,255,.09)'; ctx.lineWidth = selected ? 4 : 2; ctx.beginPath(); ctx.roundRect(74, y, 780, 68, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = stage.accent; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText(`0${stage.id}`, 98, y + 29); ctx.fillStyle = '#f5f1e9'; ctx.font = '900 23px Arial Black, sans-serif'; ctx.fillText(stage.title, 152, y + 31); ctx.fillStyle = 'rgba(228,234,244,.55)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(stage.subtitle, 153, y + 52);
    }

    const stage = STAGES[this.index]!; const pulse = .35 + Math.sin(this.time * 3.2) * .08;
    ctx.fillStyle = `${stage.accent}22`; ctx.beginPath(); ctx.arc(1030, 360, 190 + pulse * 20, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = stage.accent; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(1030, 360, 120, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 64px Impact, sans-serif'; ctx.fillText(`STAGE ${stage.id}`, 1030, 352); ctx.fillStyle = stage.accent; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('READY TO REPLAY', 1030, 390);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText('ENTER / START: PLAY   •   ESC / K: BACK', 1030, 626);
    ctx.restore();
  }
}
