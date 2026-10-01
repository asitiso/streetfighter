import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import { drawCombatFighter } from '../render/Visuals.js';
import { Fighter } from '../combat/Fighter.js';
import type { StageResult } from '../game/StageResult.js';
import { campaignTotals, formatClearTime } from '../game/StageResult.js';
import { endingProfileFor } from '../game/EndingProfiles.js';
import { artImage, preloadArtAssets } from '../render/ImageAssets.js';

export class EndingScene implements Scene {
  private time = 0;
  private readonly hero: Fighter;
  private readonly ending;
  private readonly totals;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly character: CharacterDef,
    private readonly superArt: SuperArtDef,
    results: readonly StageResult[],
    private readonly onFinish: () => void,
  ) {
    this.hero = new Fighter(character, 'player', 640, 538, 1, superArt);
    this.hero.enterVictoryPose();
    this.ending = endingProfileFor(character.id);
    this.totals = campaignTotals(results);
  }

  enter(): void {
    preloadArtAssets(['ending-keyart']);
    this.audio.playStagePulse();
    this.audio.playEndingTransition?.();
    this.audio.startFrontendTheme?.('ending');
  }
  exit(): void { this.audio.stopFrontendTheme?.(); this.audio.stopSoundscape?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.hero.stateFrame += 1;
    if (this.time > 6.8 && (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp'))) this.onFinish();
  }

  render({ ctx, width, height }: RenderContext, alpha: number): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    this.drawBackdrop(ctx);
    this.drawMemoryStrip(ctx);
    this.drawHero(ctx, alpha);
    this.drawEndingCopy(ctx);
    this.drawRecord(ctx);
    this.drawPrompt(ctx);
    ctx.restore();
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D): void {
    const phase = Math.min(1, this.time / 1.4);
    const art = artImage('ending-keyart');
    if (art) {
      ctx.drawImage(art, 0, 0, 1280, 720);
      const artVeil = ctx.createLinearGradient(0, 0, 0, 720);
      artVeil.addColorStop(0, 'rgba(12,18,26,.1)');
      artVeil.addColorStop(.58, 'rgba(10,10,14,.18)');
      artVeil.addColorStop(1, 'rgba(7,9,14,.72)');
      ctx.fillStyle = artVeil;
      ctx.fillRect(0, 0, 1280, 720);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      if (this.ending.motif === 'sunrise') { grad.addColorStop(0, '#6c3945'); grad.addColorStop(.48, '#d58261'); grad.addColorStop(1, '#111722'); }
      else if (this.ending.motif === 'night') { grad.addColorStop(0, '#10243d'); grad.addColorStop(.5, '#421d43'); grad.addColorStop(1, '#090b12'); }
      else if (this.ending.motif === 'dojo') { grad.addColorStop(0, '#44352d'); grad.addColorStop(.5, '#755c45'); grad.addColorStop(1, '#111016'); }
      else if (this.ending.motif === 'arena') { grad.addColorStop(0, '#182431'); grad.addColorStop(.5, '#4b2931'); grad.addColorStop(1, '#090b0f'); }
      else { grad.addColorStop(0, '#141c30'); grad.addColorStop(.5, '#40243c'); grad.addColorStop(1, '#080b12'); }
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `${this.ending.accent}22`; ctx.beginPath(); ctx.arc(640, 230, 190 + Math.sin(this.time * .5) * 16, 0, Math.PI * 2); ctx.fill();
    if (this.time < 1.35) { ctx.fillStyle = `rgba(255,247,220,${(1-phase)*.62})`; ctx.fillRect(0,0,1280,720); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(7,9,14,.7)'; ctx.fillRect(0, 545, 1280, 175);
    for (let x = 0; x < 1280; x += 82) {
      const h = 75 + ((x * 19) % 180); ctx.fillStyle = x % 164 === 0 ? 'rgba(28,34,46,.38)' : 'rgba(18,23,33,.44)'; ctx.fillRect(x, 545-h, 68, h);
    }
  }

  private drawMemoryStrip(ctx: CanvasRenderingContext2D): void {
    const memories = [
      ['NEW YORK', '#c96c55'], ['HONG KONG', '#ef4f86'], ['JAPAN', '#d4b36c'], ['LONDON', '#6784a6'], ['SOCIETY', '#7c67b4'],
    ] as const;
    const reveal = Math.min(1, Math.max(0, (this.time - .3) / 1.3));
    for (let i = 0; i < memories.length; i += 1) {
      const x = 72 + i * 232; const [label, color] = memories[i]!;
      ctx.globalAlpha = reveal * (.72 + Math.sin(this.time * .8 + i) * .06);
      ctx.fillStyle = 'rgba(5,7,12,.52)'; ctx.beginPath(); ctx.roundRect(x, 250, 190, 56, 9); ctx.fill();
      ctx.strokeStyle = `${color}77`; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(x + 9, 258, 172, 5);
      ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; ctx.font = '800 9px Arial, sans-serif'; ctx.fillText(label, x + 95, 289);
    }
    ctx.globalAlpha = 1;
  }

  private drawHero(ctx: CanvasRenderingContext2D, alpha: number): void {
    const enter = Math.min(1, Math.max(0, (this.time - .55) / 1.1));
    ctx.save(); ctx.globalAlpha = enter; ctx.translate(0, (1-enter) * 22); drawCombatFighter(ctx, this.hero, alpha, this.time); ctx.restore();
  }

  private drawEndingCopy(ctx: CanvasRenderingContext2D): void {
    const reveal = Math.min(1, Math.max(0, (this.time - 1.2) / 1.1));
    ctx.globalAlpha = reveal;
    ctx.textAlign = 'center'; ctx.fillStyle = this.ending.accent; ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText(this.ending.location, 640, 72);
    ctx.fillStyle = '#fff'; ctx.font = '900 58px Impact, Arial Black, sans-serif'; ctx.fillText(this.ending.title, 640, 137);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '800 12px Arial, sans-serif'; ctx.fillText(`${this.character.name} • SA ${this.superArt.id}: ${this.superArt.name}`, 640, 167);

    const boxReveal = Math.min(1, Math.max(0, (this.time - 1.7) / 1.1));
    ctx.globalAlpha = boxReveal;
    ctx.fillStyle = 'rgba(5,8,13,.72)'; ctx.beginPath(); ctx.roundRect(260, 326, 760, 152, 18); ctx.fill();
    ctx.strokeStyle = `${this.ending.accent}55`; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f2ece2'; ctx.font = '800 15px Arial, sans-serif';
    this.ending.epilogue.forEach((line, index) => ctx.fillText(line, 640, 365 + index * 31));
    ctx.fillStyle = this.ending.accent; ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillText(this.ending.closing, 640, 456);
    ctx.globalAlpha = 1;
  }

  private drawRecord(ctx: CanvasRenderingContext2D): void {
    const reveal = Math.min(1, Math.max(0, (this.time - 3.7) / 1.25));
    if (reveal <= 0) return;
    const stats = [
      ['TIME', formatClearTime(this.totals.clearSeconds)], ['DEFEATED', String(this.totals.defeatedEnemies)], ['DAMAGE', String(this.totals.damageDealt)],
      ['BEST COMBO', `${this.totals.maxComboHits}H / ${this.totals.maxComboDamage}`], ['PARRY', String(this.totals.parries)], ['SUPER', String(this.totals.supersUsed)],
    ] as const;
    ctx.globalAlpha = reveal;
    for (let i = 0; i < stats.length; i += 1) {
      const x = 210 + i * 145; ctx.fillStyle = 'rgba(8,10,16,.74)'; ctx.beginPath(); ctx.roundRect(x, 510, 125, 68, 9); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.font = '900 8px Arial Black, sans-serif'; ctx.fillText(stats[i]![0], x + 62, 532);
      ctx.fillStyle = '#f4eee5'; ctx.font = '900 16px Impact, sans-serif'; ctx.fillText(stats[i]![1], x + 62, 558);
    }
    ctx.globalAlpha = 1;
  }

  private drawPrompt(ctx: CanvasRenderingContext2D): void {
    const pulse = .55 + Math.sin(this.time * 4) * .25;
    ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,255,255,${this.time > 6.8 ? pulse : .18})`; ctx.font = '800 14px Arial, sans-serif';
    ctx.fillText(this.time > 6.8 ? 'PRESS START TO RETURN TO TITLE' : 'BATTLE RECORD ARCHIVED', 640, 650);
    ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText('STAGE SELECT + BATTLE RECORD UNLOCKED', 640, 682);
  }
}
