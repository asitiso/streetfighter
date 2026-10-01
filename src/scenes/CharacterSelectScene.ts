import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import { CHARACTERS, type CharacterDef } from '../game/characters.js';
import { characterPreviewPose, drawCharacterPreview } from '../render/Visuals.js';
import { artImage, characterPortraitKey, PLAYABLE_PORTRAIT_KEYS, preloadArtAssets } from '../render/ImageAssets.js';
import { characterTextureManager } from '../render/CharacterTextureManager.js';

export class CharacterSelectScene implements Scene {
  private index = 0;
  private time = 0;
  private lock = 0;
  private transitioning = false;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    initialCharacter: string,
    private readonly confirm: (character: CharacterDef) => void,
  ) {
    const initial = CHARACTERS.findIndex((character) => character.id === initialCharacter);
    this.index = initial >= 0 ? initial : 0;
  }

  enter(): void {
    preloadArtAssets(['roster-mural', ...PLAYABLE_PORTRAIT_KEYS]);
    characterTextureManager.focusCharacter(CHARACTERS[this.index]!.id);
    void this.audio.unlock().then(() => this.audio.startFrontendTheme?.('select')).catch(() => undefined);
  }
  exit(): void { this.audio.stopFrontendTheme?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.transitioning) return;
    if (this.lock > 0) this.lock -= 1;
    if (this.lock > 0) return;

    let next = this.index;
    if (this.input.pressed('left')) next -= 1;
    if (this.input.pressed('right')) next += 1;
    if (this.input.pressed('up')) next -= 4;
    if (this.input.pressed('down')) next += 4;
    next = (next + CHARACTERS.length) % CHARACTERS.length;
    if (next !== this.index) {
      this.index = next;
      characterTextureManager.focusCharacter(CHARACTERS[this.index]!.id);
      this.lock = 6;
      this.audio.playMenuMove();
    }

    if (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) {
      const character = CHARACTERS[this.index]!;
      this.transitioning = true;
      this.audio.playUiConfirm();
      this.confirm(character);
    }
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    this.drawBackground(ctx);
    this.drawStageLights(ctx);
    this.drawHeader(ctx);
    this.drawGrid(ctx);
    this.drawSelected(ctx, CHARACTERS[this.index]!);
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const art = artImage('roster-mural');
    if (art) {
      ctx.drawImage(art, 0, 0, 1280, 720);
      const veil = ctx.createLinearGradient(0, 0, 0, 720);
      veil.addColorStop(0, 'rgba(8,12,20,.28)');
      veil.addColorStop(.56, 'rgba(8,10,14,.48)');
      veil.addColorStop(1, 'rgba(8,10,14,.76)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, 1280, 720);
    } else {
      const g = ctx.createLinearGradient(0, 0, 1280, 720);
      g.addColorStop(0, '#101622');
      g.addColorStop(.55, '#1b1720');
      g.addColorStop(1, '#090b10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);
    }

    ctx.fillStyle = 'rgba(3,6,10,.32)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let x = -200; x < 1500; x += 56) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 360, 720); ctx.stroke();
    }
  }

  private drawStageLights(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sweep = (this.time * 85) % 1500 - 120;
    const beam = ctx.createLinearGradient(sweep - 140, 0, sweep + 140, 0);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(.5, 'rgba(235,197,92,.055)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam; ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1c052';
    ctx.font = '900 18px Arial Black, sans-serif';
    ctx.fillText('SELECT YOUR FIGHTER', 52, 54);
    ctx.fillStyle = '#f6f2ea';
    ctx.font = '900 42px Impact, Arial Black, sans-serif';
    ctx.fillText('CHARACTER SELECT', 52, 101);
    ctx.fillStyle = 'rgba(232,236,244,.62)';
    ctx.font = '600 13px Arial, sans-serif';
    ctx.fillText('8 PLAYABLE FIGHTERS • BELT ACTION + DUEL READY', 54, 126);
  }

  private drawPortraitCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number, focusY = .28): void {
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

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const startX = 52;
    const startY = 180;
    const cardW = 154;
    const cardH = 182;
    const gapX = 14;
    const gapY = 16;

    for (let i = 0; i < CHARACTERS.length; i += 1) {
      const character = CHARACTERS[i]!;
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const selected = i === this.index;

      ctx.save();
      if (selected) {
        ctx.shadowColor = character.accent;
        ctx.shadowBlur = 24;
      }
      ctx.fillStyle = selected ? 'rgba(246,240,223,.13)' : 'rgba(255,255,255,.045)';
      ctx.strokeStyle = selected ? character.accent : 'rgba(255,255,255,.1)';
      ctx.lineWidth = selected ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cardW - 4, 122, 10); ctx.clip();
      const portrait = characterPortraitKey(character.id);
      const portraitImage = portrait ? artImage(portrait) : null;
      if (portraitImage) {
        this.drawPortraitCover(ctx, portraitImage, x + 2, y + 2, cardW - 4, 122, .18);
        const wash = ctx.createLinearGradient(x, y, x, y + 122);
        wash.addColorStop(0, 'rgba(0,0,0,.02)');
        wash.addColorStop(1, 'rgba(6,8,14,.36)');
        ctx.fillStyle = wash;
        ctx.fillRect(x + 2, y + 2, cardW - 4, 122);
      } else {
        const portraitScale = selected ? .72 : .66;
        drawCharacterPreview(ctx, character, x + cardW * .52, y + 146, portraitScale, 1, this.time + i * .37);
      }
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px Arial Black, sans-serif';
      ctx.fillText(character.name, x + 12, y + 149);
      ctx.fillStyle = 'rgba(230,235,244,.58)';
      ctx.font = '700 9px Arial, sans-serif';
      ctx.fillText(character.style, x + 12, y + 168);
    }
  }

  private drawSelected(ctx: CanvasRenderingContext2D, character: CharacterDef): void {
    const panelX = 770;
    ctx.fillStyle = 'rgba(6,8,13,.5)';
    ctx.beginPath(); ctx.roundRect(panelX, 132, 458, 530, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.roundRect(panelX + 18, 150, 422, 360, 18); ctx.clip();
    const glow = ctx.createRadialGradient(1000, 330, 30, 1000, 330, 260);
    glow.addColorStop(0, `${character.accent}55`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(panelX, 130, 470, 390);
    const portrait = characterPortraitKey(character.id);
    const portraitImage = portrait ? artImage(portrait) : null;
    if (portraitImage) {
      this.drawPortraitCover(ctx, portraitImage, panelX + 18, 150, 422, 360, .09);
      const veil = ctx.createLinearGradient(panelX + 18, 150, panelX + 18, 510);
      veil.addColorStop(0, 'rgba(0,0,0,.02)');
      veil.addColorStop(.6, 'rgba(5,8,14,.1)');
      veil.addColorStop(1, 'rgba(5,8,14,.52)');
      ctx.fillStyle = veil;
      ctx.fillRect(panelX + 18, 150, 422, 360);
    } else {
      drawCharacterPreview(ctx, character, 1004, 525, 1.75, -1, this.time + this.index * .19);
    }
    ctx.restore();

    ctx.fillStyle = '#f4efe6';
    ctx.textAlign = 'left';
    ctx.font = '900 52px Impact, Arial Black, sans-serif';
    ctx.fillText(character.name, panelX + 28, 565);
    ctx.fillStyle = character.accent;
    ctx.font = '800 14px Arial Black, sans-serif';
    ctx.fillText(`${character.country}  •  ${character.style}`, panelX + 30, 592);
    const previewPose = characterPreviewPose(this.time + this.index * .19);
    const poseLabel = previewPose === 'signature' ? 'SIGNATURE ATTACK' : previewPose.toUpperCase();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '900 9px Arial Black, sans-serif';
    ctx.fillText(`LIVE MOVE PREVIEW • ${poseLabel}`, panelX + 30, 609);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(panelX + 270, 568, 145, 30, 15); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = character.accent; ctx.font = '900 10px Arial Black, sans-serif';
    ctx.fillText(character.power > 1.05 ? 'POWER FIGHTER' : character.speed > 1.08 ? 'SPEED FIGHTER' : character.reach > 1.08 ? 'FOOTSIE FIGHTER' : 'ALL-ROUNDER', panelX + 342, 588);
    ctx.textAlign = 'left';

    const stats = [['SPD', character.speed], ['PWR', character.power], ['RCH', character.reach]] as const;
    stats.forEach(([label, value], index) => {
      const y = 630 + index * 17;
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText(label, panelX + 30, y);
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(panelX + 70, y - 8, 120, 7);
      ctx.fillStyle = character.accent; ctx.fillRect(panelX + 70, y - 8, Math.min(120, 96 * value), 7);
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = '800 13px Arial, sans-serif';
    ctx.fillText('← ↑ ↓ → SELECT    ENTER / START CONFIRM', 1218, 690);
  }
}
