import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import { drawCharacterPortrait } from '../render/Visuals.js';
import { artImage, characterPortraitKey, preloadArtAssets } from '../render/ImageAssets.js';
import { characterTextureManager } from '../render/CharacterTextureManager.js';

export class SuperArtSelectScene implements Scene {
  private selected = 0;
  private time = 0;
  private lock = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly character: CharacterDef,
    initialArt: 1 | 2 | 3,
    private readonly confirm: (art: SuperArtDef) => void,
    private readonly back: () => void,
  ) {
    this.selected = initialArt - 1;
  }

  enter(): void {
    const portrait = characterPortraitKey(this.character.id);
    if (portrait) preloadArtAssets([portrait]);
    characterTextureManager.focusCharacter(this.character.id);
    void this.audio.unlock().then(() => this.audio.startFrontendTheme?.('select')).catch(() => undefined);
  }
  exit(): void { this.audio.stopFrontendTheme?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.lock > 0) this.lock -= 1;
    if (this.lock === 0) {
      const old = this.selected;
      if (this.input.pressed('up') || this.input.pressed('left')) this.selected = (this.selected + 2) % 3;
      if (this.input.pressed('down') || this.input.pressed('right')) this.selected = (this.selected + 1) % 3;
      if (old !== this.selected) {
        this.lock = 6;
        this.audio.playMenuMove();
      }
    }

    if (this.input.pressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) {
      this.audio.playUiConfirm();
      this.confirm(this.character.superArts[this.selected]!);
    }
    if (this.input.pressed('lk')) this.back();
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    this.drawBackground(ctx);
    this.drawCharacter(ctx);
    this.drawCards(ctx);
    ctx.restore();
  }

  private drawPortraitCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number, focusY = .16): void {
    const source = image as HTMLImageElement;
    const iw = source.naturalWidth || (source as any).width || width;
    const ih = source.naturalHeight || (source as any).height || height;
    const scale = Math.max(width / iw, height / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const offsetX = x + (width - drawW) * .5;
    const offsetY = y + (height - drawH) * focusY;
    ctx.drawImage(source, offsetX, offsetY, drawW, drawH);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createRadialGradient(870, 300, 40, 870, 320, 720);
    g.addColorStop(0, `${this.character.accent}33`);
    g.addColorStop(.38, '#1a1b25');
    g.addColorStop(1, '#090b10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    for (let y = 0; y < 720; y += 8) ctx.fillRect(0, y, 1280, 1);
  }

  private drawCharacter(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 550, 720); ctx.clip();
    const portrait = characterPortraitKey(this.character.id);
    const portraitImage = portrait ? artImage(portrait) : null;
    if (portraitImage) {
      this.drawPortraitCover(ctx, portraitImage, 0, 0, 550, 720, .08);
    } else {
      drawCharacterPortrait(ctx, this.character, 280, 690, 2.45, 1, this.time);
    }
    ctx.restore();
    const overlay = ctx.createLinearGradient(0, 0, 550, 0);
    overlay.addColorStop(0, 'rgba(0,0,0,.54)');
    overlay.addColorStop(.62, 'rgba(0,0,0,.28)');
    overlay.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = overlay; ctx.fillRect(0, 0, 550, 720);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 540, 550, 180);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4efe5'; ctx.font = '900 66px Impact, Arial Black, sans-serif'; ctx.fillText(this.character.name, 54, 118);
    ctx.fillStyle = this.character.accent; ctx.font = '800 14px Arial Black, sans-serif'; ctx.fillText('CHOOSE ONE SUPER ART', 57, 148);
  }

  private drawCards(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = '900 32px Arial Black, sans-serif'; ctx.fillText('SUPER ART SELECT', 610, 86);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '600 12px Arial, sans-serif'; ctx.fillText('GAUGE LENGTH AND STOCK COUNT CHANGE YOUR BATTLE PLAN', 612, 108);

    for (let i = 0; i < 3; i += 1) {
      const art = this.character.superArts[i]!;
      const y = 152 + i * 160;
      const active = i === this.selected;
      ctx.fillStyle = active ? 'rgba(255,255,255,.105)' : 'rgba(255,255,255,.035)';
      ctx.strokeStyle = active ? this.character.accent : 'rgba(255,255,255,.09)';
      ctx.lineWidth = active ? 4 : 2;
      ctx.beginPath(); ctx.roundRect(600, y, 615, 130, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? this.character.accent : 'rgba(255,255,255,.32)';
      ctx.font = '900 30px Impact, Arial Black, sans-serif'; ctx.fillText(`SA ${['I', 'II', 'III'][i]}`, 626, y + 43);
      ctx.fillStyle = '#f6f1e8'; ctx.font = '900 24px Arial Black, sans-serif'; ctx.fillText(art.name, 730, y + 42);
      ctx.fillStyle = 'rgba(255,255,255,.56)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(art.subtitle, 730, y + 65);
      ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(730, y + 86, 300, 10);
      ctx.fillStyle = this.character.accent; ctx.fillRect(730, y + 86, Math.min(300, art.gauge * 2.25), 10);
      ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '800 11px Arial, sans-serif'; ctx.fillText(`STOCK × ${art.stocks}`, 1050, y + 95);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '800 13px Arial, sans-serif';
    ctx.fillText('↑ ↓ SELECT    P / START CONFIRM    LK BACK', 1216, 681);
  }
}
