import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import { drawCombatFighter } from '../render/Visuals.js';
import { characterTextureManager } from '../render/CharacterTextureManager.js';
import { Fighter } from '../combat/Fighter.js';
import type { StageResult } from '../game/StageResult.js';
import { campaignTotals, formatClearTime } from '../game/StageResult.js';
import { endingProfileFor } from '../game/EndingProfiles.js';
import { artImage, preloadArtAssets } from '../render/ImageAssets.js';

export interface EndingResumeState {
  readonly time: number;
  readonly stateFrame: number;
  readonly animationFrame: number;
}

const HERO_REVEAL_DELAY = .55;
const HERO_REVEAL_DURATION = 1.1;

export class EndingScene implements Scene {
  private time = 0;
  private returning = false;
  private returnError = "";
  private entryId = 0;
  private readonly hero: Fighter;
  private readonly ending;
  private readonly totals;
  private compactStoryLines?: string[];

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly character: CharacterDef,
    private readonly superArt: SuperArtDef,
    results: readonly StageResult[],
    private readonly onFinish: (resume: EndingResumeState) => void | Promise<void>,
    private readonly onError?: (error: unknown) => void,
    resume?: EndingResumeState,
    private initialFailed = false,
    private readonly onControlsChange?: (endingMode: boolean) => void,
    private readonly hasVisibleTouchReturn?: () => boolean,
  ) {
    this.hero = new Fighter(character, 'player', 220, 500, 1, superArt);
    this.hero.enterVictoryPose();
    if (resume) {
      this.time = resume.time;
      this.hero.stateFrame = resume.stateFrame;
      this.hero.animationFrame = resume.animationFrame;
    }
    this.ending = endingProfileFor(character.id);
    this.totals = campaignTotals(results);
  }

  enter(): void {
    this.entryId += 1;
    this.returning = false;
    this.returnError = this.initialFailed ? 'RETURN FAILED • PRESS START / ENTER / ATTACK TO RETRY' : '';
    this.initialFailed = false;
    this.onControlsChange?.(true);
    characterTextureManager.focusEnding(this.character.id);
    preloadArtAssets(['ending-keyart']);
    this.audio.playStagePulse();
    this.audio.playEndingTransition?.();
    this.audio.startFrontendTheme?.('ending');
  }
  exit(): void { this.entryId += 1; this.onControlsChange?.(false); this.audio.stopFrontendTheme?.(); this.audio.stopSoundscape?.(); }
  resize(_width: number, _height: number): void {}
  destroy(): void { this.entryId += 1; this.onControlsChange?.(false); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.time >= HERO_REVEAL_DELAY + HERO_REVEAL_DURATION) {
      this.hero.stateFrame += 1;
      this.hero.animationFrame += 1;
    }
    if (!this.returning && (this.input.pressed('start') || this.input.touchPressed('start') || this.input.pressed('confirm') || this.input.pressed('back')
      || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')
      || this.input.pressed('lk') || this.input.pressed('mk') || this.input.pressed('hk'))) {
      this.returning = true;
      this.returnError = '';
      const entry = this.entryId;
      const failed = (error: unknown) => {
        if (entry !== this.entryId) return;
        this.returning = false;
        this.returnError = 'RETURN FAILED • PRESS START / ENTER / ATTACK TO RETRY';
        try { this.onError?.(error); } catch { /* Keep retry usable if diagnostics fail. */ }
      };
      try { void Promise.resolve(this.onFinish({ time: this.time, stateFrame: this.hero.stateFrame, animationFrame: this.hero.animationFrame })).catch(failed); }
      catch (error) { failed(error); }
    }
  }

  render({ ctx, width, height }: RenderContext, alpha: number): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const touchReturnVisible = this.hasVisibleTouchReturn?.() ?? false;
    this.drawBackdrop(ctx);
    this.drawMemoryStrip(ctx, touchReturnVisible);
    this.drawHero(ctx, alpha);
    this.drawEndingCopy(ctx, touchReturnVisible);
    this.drawRecord(ctx, touchReturnVisible);
    this.drawPrompt(ctx, touchReturnVisible);
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
    if (!art) {
      for (let x = 0; x < 1280; x += 82) {
        const height = 75 + ((x * 19) % 180);
        ctx.fillStyle = x % 164 === 0 ? 'rgba(28,34,46,.38)' : 'rgba(18,23,33,.44)';
        ctx.fillRect(x, 545 - height, 68, height);
      }
    }
  }

  private drawMemoryStrip(ctx: CanvasRenderingContext2D, compact = false): void {
    const memories = [
      ['NEW YORK', '#c96c55'], ['HONG KONG', '#ef4f86'], ['JAPAN', '#d4b36c'], ['LONDON', '#6784a6'], ['SOCIETY', '#7c67b4'],
    ] as const;
    const reveal = Math.min(1, Math.max(0, (this.time - .3) / 1.3));
    const fade = compact ? Math.max(0, Math.min(1, (1.7 - this.time) / .25)) : 1;
    if (reveal * fade <= 0) return;
    for (let i = 0; i < memories.length; i += 1) {
      const x = 72 + i * 232; const [label, color] = memories[i]!;
      ctx.globalAlpha = reveal * fade * (.72 + Math.sin(this.time * .8 + i) * .06);
      ctx.fillStyle = 'rgba(5,7,12,.52)'; ctx.beginPath(); ctx.roundRect(x, 250, 190, 56, 9); ctx.fill();
      ctx.strokeStyle = `${color}77`; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(x + 9, 258, 172, 5);
      ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; ctx.font = '800 9px Arial, sans-serif'; ctx.fillText(label, x + 95, 289);
    }
    ctx.globalAlpha = 1;
  }

  private drawHero(ctx: CanvasRenderingContext2D, alpha: number): void {
    const enter = Math.min(1, Math.max(0, (this.time - HERO_REVEAL_DELAY) / HERO_REVEAL_DURATION));
    ctx.save(); ctx.globalAlpha = enter; ctx.translate(0, (1-enter) * 22); drawCombatFighter(ctx, this.hero, alpha, this.time); ctx.restore();
  }

  private drawEndingCopy(ctx: CanvasRenderingContext2D, compact = false): void {
    const reveal = Math.min(1, Math.max(0, (this.time - 1.2) / 1.1));
    ctx.globalAlpha = reveal;
    ctx.textAlign = 'center'; ctx.fillStyle = this.ending.accent; ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText(this.ending.location, 640, 72);
    ctx.fillStyle = '#fff'; ctx.font = '900 58px Impact, Arial Black, sans-serif'; ctx.fillText(this.ending.title, 640, 137);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = '800 12px Arial, sans-serif'; ctx.fillText(`${this.character.name} • SA ${this.superArt.id}: ${this.superArt.name}`, 640, 167);

    const boxReveal = Math.min(1, Math.max(0, (this.time - 1.7) / .45));
    if (boxReveal > 0) {
      const panelX = 390;
      const panelY = compact ? 244 : 322;
      const panelWidth = 812;
      const panelHeight = compact ? 242 : 164;
      const textX = panelX + 30;
      const textWidth = panelWidth - 60;
      ctx.globalAlpha = boxReveal;
      ctx.fillStyle = 'rgba(8,12,20,.94)'; ctx.beginPath(); ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14); ctx.fill();
      ctx.strokeStyle = `${this.ending.accent}88`; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f5efe6';
      ctx.font = compact ? '700 27px Arial, sans-serif' : '800 18px Arial, sans-serif';
      const lines = compact ? (this.compactStoryLines ??= this.wrapStory(ctx, textWidth)) : this.ending.epilogue;
      const firstLine = panelY + (compact ? 34 : 38);
      const lineHeight = compact ? 30 : 33;
      lines.forEach((line, index) => ctx.fillText(line, textX, firstLine + index * lineHeight, textWidth));
      ctx.fillStyle = '#fff0c8';
      ctx.font = compact ? '900 20px Arial, sans-serif' : '900 15px Arial Black, sans-serif';
      ctx.fillText(this.ending.closing, textX, panelY + panelHeight - 21, textWidth);
    }
    ctx.globalAlpha = 1;
  }

  private wrapStory(ctx: CanvasRenderingContext2D, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of this.ending.epilogue) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > width) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  private drawRecord(ctx: CanvasRenderingContext2D, compact = false): void {
    const stats = [
      ['TIME', formatClearTime(this.totals.clearSeconds)], ['DEFEATED', String(this.totals.defeatedEnemies)], ['DAMAGE', String(this.totals.damageDealt)],
      ['BEST COMBO', `${this.totals.maxComboHits}H / ${this.totals.maxComboDamage}`], ['PARRY', String(this.totals.parries)], ['SUPER', String(this.totals.supersUsed)],
    ] as const;
    const top = compact ? 498 : 510;
    const cardHeight = compact ? 48 : 68;
    const cardWidth = compact ? 174 : 145;
    const gap = compact ? 12 : 14;
    const firstX = (1280 - (stats.length * cardWidth + (stats.length - 1) * gap)) / 2;
    const labelY = top + (compact ? 18 : 23);
    const valueY = top + (compact ? 41 : 50);
    const labelFont = compact ? '800 21px Arial, sans-serif' : '800 14px Arial, sans-serif';
    const valueFont = compact ? '900 26px Impact, sans-serif' : '900 22px Impact, sans-serif';
    const textWidth = cardWidth - 16;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const [index, [label, value]] of stats.entries()) {
      const x = firstX + index * (cardWidth + gap);
      const centerX = x + cardWidth / 2;
      ctx.fillStyle = 'rgba(8,10,16,.9)';
      ctx.beginPath(); ctx.roundRect(x, top, cardWidth, cardHeight, 9); ctx.fill();
      ctx.fillStyle = '#e6dfd5';
      ctx.font = labelFont;
      ctx.fillText(label, centerX, labelY, textWidth);
      ctx.fillStyle = '#fff4dc';
      ctx.font = valueFont;
      ctx.fillText(value, centerX, valueY, textWidth);
    }
  }

  private drawPrompt(ctx: CanvasRenderingContext2D, touchReturnVisible = false): void {
    ctx.textAlign = 'center';
    const status = this.returnError || (this.returning ? 'RETURNING TO TITLE...' : '');
    if (status || !touchReturnVisible) {
      ctx.fillStyle = '#fff4dc';
      ctx.font = '800 18px Arial, sans-serif';
      ctx.fillText(status || 'ENTER / START / ATTACK TO RETURN TO TITLE', 640, touchReturnVisible ? 234 : 600, 1160);
    }
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText('STAGE SELECT + BATTLE RECORD UNLOCKED', 640, 210);
  }
}
