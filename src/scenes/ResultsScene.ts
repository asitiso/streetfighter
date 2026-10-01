import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { StageResult } from '../game/StageResult.js';
import { campaignTotals, formatClearTime } from '../game/StageResult.js';

const STAGE_NAMES = ['NEW YORK', 'HONG KONG', 'JAPAN', 'LONDON', 'SECRET SOCIETY'] as const;

export class ResultsScene implements Scene {
  private time = 0;
  private page = 0;
  private lock = 0;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly results: readonly StageResult[],
    private readonly onBack: () => void,
  ) {}

  enter(): void { this.audio.playStagePulse(); }
  exit(): void {}
  resize(_width: number, _height: number): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.lock > 0) this.lock -= 1;
    if (this.lock <= 0 && (this.input.pressed('left') || this.input.pressed('right'))) {
      this.page = this.page === 0 ? 1 : 0;
      this.lock = 7;
      this.audio.playMenuMove();
    }
    if (this.input.pressed('start') || this.input.pressed('lp') || this.input.pressed('lk')) {
      this.audio.playUiConfirm();
      this.onBack();
    }
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, '#161b29'); bg.addColorStop(.45, '#251b28'); bg.addColorStop(1, '#080b11');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 720);
    for (let x = 0; x < 1280; x += 80) {
      const h = 80 + ((x * 17) % 210); ctx.fillStyle = x % 160 === 0 ? '#171d29' : '#121720'; ctx.fillRect(x, 510 - h, 64, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 510, 1280, 210);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e7c568'; ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillText('CAMPAIGN ARCHIVE', 640, 72);
    ctx.fillStyle = '#fff'; ctx.font = '900 56px Impact, Arial Black, sans-serif'; ctx.fillText(this.page === 0 ? 'BATTLE RECORD' : 'CAMPAIGN TOTALS', 640, 132);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText('← → CHANGE PAGE   •   P / K / START RETURN', 640, 160);

    if (this.page === 0) this.drawStageTable(ctx);
    else this.drawTotals(ctx);

    const dotX = 620;
    for (let i = 0; i < 2; i += 1) { ctx.fillStyle = i === this.page ? '#e7c568' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(dotX + i * 40, 648, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  private drawStageTable(ctx: CanvasRenderingContext2D): void {
    const rows = [...this.results].sort((a, b) => a.stageId - b.stageId);
    const headers = ['STAGE', 'TIME', 'DEFEATED', 'DAMAGE', 'TAKEN', 'MAX COMBO', 'PARRY', 'SUPER'];
    const xs = [115, 305, 405, 530, 650, 790, 980, 1100];
    ctx.textAlign = 'left'; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillStyle = 'rgba(231,197,104,.82)';
    headers.forEach((header, i) => ctx.fillText(header, xs[i]!, 222));
    ctx.fillStyle = 'rgba(231,197,104,.45)'; ctx.fillRect(105, 238, 1070, 2);
    for (let index = 0; index < 5; index += 1) {
      const stageId = (index + 1) as 1 | 2 | 3 | 4 | 5;
      const result = rows.find((row) => row.stageId === stageId);
      const y = 280 + index * 58;
      ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.025)'; ctx.beginPath(); ctx.roundRect(100, y - 30, 1080, 44, 8); ctx.fill();
      ctx.fillStyle = result ? '#f4efe6' : 'rgba(255,255,255,.24)'; ctx.font = '800 12px Arial, sans-serif';
      ctx.fillText(`${stageId}. ${STAGE_NAMES[index]}`, xs[0]!, y);
      if (!result) { ctx.fillText('—', xs[1]!, y); continue; }
      ctx.font = '800 11px ui-monospace, monospace';
      ctx.fillText(formatClearTime(result.clearSeconds), xs[1]!, y);
      ctx.fillText(String(result.defeatedEnemies), xs[2]!, y);
      ctx.fillText(String(result.damageDealt), xs[3]!, y);
      ctx.fillText(String(result.damageTaken), xs[4]!, y);
      ctx.fillText(`${result.maxComboHits}H / ${result.maxComboDamage}`, xs[5]!, y);
      ctx.fillText(result.redParries > 0 ? `${result.parries} (${result.redParries}R)` : String(result.parries), xs[6]!, y);
      ctx.fillText(String(result.supersUsed), xs[7]!, y);
    }
  }

  private drawTotals(ctx: CanvasRenderingContext2D): void {
    const total = campaignTotals(this.results);
    const cards = [
      ['CLEAR TIME', formatClearTime(total.clearSeconds)], ['FIGHTERS DEFEATED', String(total.defeatedEnemies)],
      ['DAMAGE DEALT', String(total.damageDealt)], ['DAMAGE TAKEN', String(total.damageTaken)],
      ['BEST COMBO', `${total.maxComboHits} HIT / ${total.maxComboDamage}`], ['PARRIES', total.redParries > 0 ? `${total.parries} • RED ${total.redParries}` : String(total.parries)],
      ['SUPERS USED', String(total.supersUsed)], ['THROWS LANDED', String(total.throwsLanded)],
    ] as const;
    for (let i = 0; i < cards.length; i += 1) {
      const col = i % 4; const row = Math.floor(i / 4); const x = 135 + col * 260; const y = 250 + row * 160;
      ctx.fillStyle = 'rgba(5,8,14,.58)'; ctx.strokeStyle = 'rgba(231,197,104,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 230, 124, 14); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(cards[i]![0], x + 115, y + 34);
      ctx.fillStyle = i === 4 ? '#fff1bd' : '#f3eee5'; ctx.font = i === 4 ? '900 22px Impact, sans-serif' : '900 28px Impact, sans-serif'; ctx.fillText(cards[i]![1], x + 115, y + 82);
    }
  }
}
