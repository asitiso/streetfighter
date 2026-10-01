import type { Scene, RenderContext } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import { artImage, preloadArtAssets } from '../render/ImageAssets.js';

export interface TitleMenuOption {
  id: 'new-game' | 'continue' | 'recover-session' | 'stage-select' | 'battle-record' | 'save-tools' | 'install' | 'device-cert' | 'pwa-update' | 'release-check' | 'diagnostics' | 'options';
  label: string;
  detail: string;
  enabled: boolean;
  action: () => void;
}

export class TitleScene implements Scene {
  private time = 0;
  private confirmed = false;
  private index = 0;
  private lock = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly options: readonly TitleMenuOption[],
  ) {
    const firstEnabled = options.findIndex((option) => option.enabled);
    this.index = firstEnabled >= 0 ? firstEnabled : 0;
  }

  enter(): void {
    preloadArtAssets(['title-keyart']);
    void this.audio.unlock().then(() => this.audio.startFrontendTheme?.('title')).catch(() => undefined);
  }
  exit(): void { this.audio.stopFrontendTheme?.(); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.lock > 0) this.lock -= 1;
    if (this.confirmed || this.lock > 0) return;

    let direction = 0;
    if (this.input.pressed('up') || this.input.pressed('left')) direction = -1;
    if (this.input.pressed('down') || this.input.pressed('right')) direction = 1;
    if (direction !== 0) {
      let next = this.index;
      for (let tries = 0; tries < this.options.length; tries += 1) {
        next = (next + direction + this.options.length) % this.options.length;
        if (this.options[next]?.enabled) break;
      }
      if (next !== this.index && this.options[next]?.enabled) {
        this.index = next;
        this.lock = 5;
        this.audio.playMenuMove();
      }
    }

    if (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) {
      const selected = this.options[this.index];
      if (!selected?.enabled) return;
      this.confirmed = true;
      void this.audio.unlock().then(() => {
        this.audio.playUiConfirm();
        window.setTimeout(() => selected.action(), 100);
      });
    }
  }

  render({ ctx, width, height }: RenderContext): void {
    const sx = width / 1280;
    const sy = height / 720;
    ctx.save();
    ctx.scale(sx, sy);
    this.drawBackdrop(ctx);
    this.drawFighterSilhouettes(ctx);
    this.drawLogo(ctx);
    this.drawMenu(ctx);
    ctx.restore();
  }

  resize(_width: number, _height: number): void {}
  destroy(): void {}

  private drawBackdrop(ctx: CanvasRenderingContext2D): void {
    const art = artImage('title-keyart');
    if (art) {
      ctx.drawImage(art, 0, 0, 1280, 720);
      const veil = ctx.createLinearGradient(0, 0, 0, 720);
      veil.addColorStop(0, 'rgba(6,10,20,.42)');
      veil.addColorStop(.58, 'rgba(8,10,16,.16)');
      veil.addColorStop(1, 'rgba(6,8,12,.72)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, 1280, 720);
    } else {
      const grad = ctx.createRadialGradient(640, 270, 60, 640, 300, 660);
      grad.addColorStop(0, '#52202b'); grad.addColorStop(.45, '#171923'); grad.addColorStop(1, '#090b11');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    }
    const drift = Math.sin(this.time * .18) * 4;
    ctx.save(); ctx.translate(drift, 0);
    for (let i = 0; i < 25; i += 1) {
      const w = 34 + ((i * 37) % 56); const h = 75 + ((i * 83) % 255); const x = i * 56 - 36; const y = 505 - h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(26,31,44,.74)' : 'rgba(20,24,34,.72)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(236,166,57,.34)';
      for (let wy = y + 18; wy < 480; wy += 28) for (let wx = x + 10; wx < x + w - 6; wx += 18) if ((((wx | 0) + (wy | 0) + i) % 5) < 2) ctx.fillRect(wx, wy, 5, 8);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(9,12,18,.52)'; ctx.fillRect(0, 510, 1280, 210); ctx.fillStyle = 'rgba(189,45,66,.55)'; ctx.fillRect(0, 578, 1280, 3);
    ctx.globalAlpha = .08; ctx.strokeStyle = '#fff'; for (let y = 0; y < 720; y += 5) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(1280, y + .5); ctx.stroke(); } ctx.globalAlpha = 1;
  }

  private drawFighterSilhouettes(ctx: CanvasRenderingContext2D): void {
    const pulse = .12 + Math.sin(this.time * 1.7) * .025;
    const fighters = [
      { x: 185, y: 570, face: 1, scale: 1.28, lean: -.11 },
      { x: 1095, y: 570, face: -1, scale: 1.34, lean: .12 },
    ] as const;
    for (const fighter of fighters) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.scale(fighter.face * fighter.scale, fighter.scale);
      ctx.rotate(fighter.lean);
      ctx.globalAlpha = .74;
      ctx.fillStyle = '#080a0f';
      ctx.beginPath(); ctx.ellipse(0, 2, 58, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#090b10'; ctx.lineCap = 'round';
      ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(-13, -78); ctx.lineTo(-28, -12); ctx.moveTo(18, -78); ctx.lineTo(40, -10); ctx.stroke();
      ctx.lineWidth = 62; ctx.beginPath(); ctx.moveTo(0, -175); ctx.lineTo(0, -78); ctx.stroke();
      ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(-25, -151); ctx.lineTo(-72, -103); ctx.moveTo(25, -151); ctx.lineTo(76, -118); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -216, 34, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(197,47,70,${pulse})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -132, 102, -.8, .8); ctx.stroke();
      ctx.restore();
    }
  }

  private drawLogo(ctx: CanvasRenderingContext2D): void {
    const crowded = this.options.length >= 11;
    const y1 = crowded ? 188 : 235;
    const y2 = crowded ? 260 : 308;
    const y3 = crowded ? 306 : 355;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.font = '900 80px Impact, Arial Black, sans-serif'; ctx.strokeStyle = '#0b0f19'; ctx.lineWidth = 15; ctx.strokeText('SIDE-SCROLL', 640, y1); ctx.fillStyle = '#f3eadf'; ctx.fillText('SIDE-SCROLL', 640, y1);
    ctx.font = '900 68px Impact, Arial Black, sans-serif'; ctx.strokeText('CHRONICLES', 640, y2); ctx.fillStyle = '#c52f46'; ctx.fillText('CHRONICLES', 640, y2);
    ctx.font = '700 17px Arial, sans-serif'; ctx.letterSpacing = '6px'; ctx.fillStyle = '#f0ba45'; ctx.fillText('BELT ACTION × 1 VS 1 DUEL', 640, y3); ctx.letterSpacing = '0px';
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    const twoColumn = this.options.length >= 12;
    const startY = twoColumn ? 350 : this.options.length >= 11 ? 350 : this.options.length >= 10 ? 342 : this.options.length >= 8 ? 348 : 366;
    const spacing = twoColumn ? 52 : this.options.length >= 11 ? 27 : this.options.length >= 10 ? 31 : this.options.length >= 8 ? 38 : this.options.length > 5 ? 43 : 50;
    const rowsPerColumn = twoColumn ? Math.ceil(this.options.length / 2) : this.options.length;
    for (let i = 0; i < this.options.length; i += 1) {
      const option = this.options[i]!;
      const col = twoColumn && i >= rowsPerColumn ? 1 : 0;
      const row = twoColumn ? i % rowsPerColumn : i;
      const x = twoColumn ? 238 + col * 410 : 455;
      const width = twoColumn ? 390 : 370;
      const y = startY + row * spacing;
      const selected = i === this.index && option.enabled;
      ctx.fillStyle = selected ? 'rgba(240,186,69,.18)' : 'rgba(255,255,255,.035)';
      ctx.strokeStyle = selected ? '#f0ba45' : option.enabled ? 'rgba(255,255,255,.11)' : 'rgba(255,255,255,.045)';
      ctx.lineWidth = selected ? 3 : 1; ctx.beginPath(); ctx.roundRect(x, y - 29, width, 42, 10); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = '900 17px Arial Black, sans-serif'; ctx.fillStyle = option.enabled ? (selected ? '#fff3c6' : '#eee9df') : 'rgba(255,255,255,.24)'; ctx.fillText(option.label, x + 18, y);
      ctx.textAlign = 'right'; ctx.font = '700 8px Arial, sans-serif'; ctx.fillStyle = option.enabled ? 'rgba(220,226,236,.58)' : 'rgba(255,255,255,.16)'; ctx.fillText(option.detail.slice(0, 42), x + width - 16, y);
    }
    ctx.textAlign = 'center'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillStyle = 'rgba(190,199,216,.66)'; ctx.fillText('↑ ↓ SELECT  •  ENTER / START CONFIRM', 640, 674);
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.fillStyle = 'rgba(190,199,216,.45)'; ctx.fillText('V0.0.63-RC38 • HQ NEW ORIGINALS + RELEASE SEAL', 640, 697);
  }
}
