import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import { BOSS_CHARACTERS, CHARACTERS, type CharacterDef } from '../game/characters.js';
import { artImage, characterPortraitKey, preloadArtAssets, type ArtAssetKey } from '../render/ImageAssets.js';

export interface TrainingSelection { player: CharacterDef; dummy: CharacterDef; stageId: 1 | 2 | 3 | 4 | 5 }
type Row = 'player' | 'dummy' | 'stage' | 'start' | 'back';
export const TRAINING_SELECT_ROWS: readonly Row[] = ['player', 'dummy', 'stage', 'start', 'back'];

/** Training mode setup: any playable fighter vs any dummy (bosses included) on any stage. */
export class TrainingSelectScene implements Scene {
  index = 0;
  playerIndex: number;
  dummyIndex: number;
  stageId: 1 | 2 | 3 | 4 | 5 = 1;
  private leaving = false;
  private time = 0;
  readonly dummies: readonly CharacterDef[] = [...CHARACTERS, ...BOSS_CHARACTERS];

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly onStart: (selection: TrainingSelection) => void | Promise<void>,
    private readonly onBack: () => void | Promise<void>,
    initial?: Partial<TrainingSelection>,
  ) {
    this.playerIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === (initial?.player?.id ?? 'RYU')));
    this.dummyIndex = Math.max(0, this.dummies.findIndex((c) => c.id === (initial?.dummy?.id ?? 'KEN')));
    this.stageId = initial?.stageId ?? 1;
  }

  get selection(): TrainingSelection { return { player: CHARACTERS[this.playerIndex]!, dummy: this.dummies[this.dummyIndex]!, stageId: this.stageId }; }

  enter(): void {
    this.leaving = false;
    preloadArtAssets(this.dummies.map((c) => characterPortraitKey(c.id)).filter((k): k is ArtAssetKey => !!k));
  }
  exit(): void { this.leaving = true; }
  resize(): void {}
  destroy(): void { this.leaving = true; }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.leaving) return;
    if (this.input.pressed('back') || this.input.pressed('lk')) { this.leave(this.onBack); return; }
    const old = this.index;
    if (this.input.pressed('up')) this.index = (this.index + TRAINING_SELECT_ROWS.length - 1) % TRAINING_SELECT_ROWS.length;
    if (this.input.pressed('down')) this.index = (this.index + 1) % TRAINING_SELECT_ROWS.length;
    if (old !== this.index) this.audio.playMenuMove();
    if (this.input.pressed('left')) this.adjust(-1);
    if (this.input.pressed('right')) this.adjust(1);
    if (this.input.pressed('confirm') || this.input.touchPressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) {
      const row = TRAINING_SELECT_ROWS[this.index]!;
      if (row === 'back') this.leave(this.onBack);
      else { this.audio.playUiConfirm(); this.leave(() => this.onStart(this.selection)); }
    }
  }

  adjust(direction: -1 | 1): void {
    const row = TRAINING_SELECT_ROWS[this.index]!;
    if (row === 'player') this.playerIndex = (this.playerIndex + direction + CHARACTERS.length) % CHARACTERS.length;
    else if (row === 'dummy') this.dummyIndex = (this.dummyIndex + direction + this.dummies.length) % this.dummies.length;
    else if (row === 'stage') this.stageId = (((this.stageId - 1 + direction + 5) % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    else return;
    this.audio.playMenuMove();
  }

  private leave(action: () => void | Promise<void>): void {
    this.leaving = true;
    void Promise.resolve().then(action).catch(() => { this.leaving = false; });
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#071420'); g.addColorStop(.55, '#10202c'); g.addColorStop(1, '#1d1222');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.globalAlpha = .06; ctx.strokeStyle = '#7fe3ff';
    for (let y = 0; y < 720; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 46px Impact, Arial Black, sans-serif'; ctx.fillText('TRAINING MODE', 640, 76);
    ctx.fillStyle = '#7fe3ff'; ctx.font = '800 13px Arial Black, sans-serif'; ctx.fillText('ANY FIGHTER VS ANY DUMMY • FRAME DATA • INPUT DISPLAY', 640, 102);
    const { player, dummy } = this.selection;
    this.drawCard(ctx, player, 120, 'YOU', this.index === 0);
    this.drawCard(ctx, dummy, 880, 'DUMMY', this.index === 1);
    ctx.fillStyle = '#f1bd51'; ctx.font = '900 54px Impact, Arial Black, sans-serif'; ctx.fillText('VS', 640, 300);
    TRAINING_SELECT_ROWS.forEach((row, i) => {
      const top = 400 + i * 48, active = i === this.index;
      ctx.fillStyle = active ? 'rgba(127,227,255,.16)' : 'rgba(255,255,255,.04)';
      ctx.beginPath(); ctx.roundRect(400, top, 480, 40, 9); ctx.fill();
      if (active) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.fillStyle = active ? '#fff' : '#d6dbe3'; ctx.font = '900 15px Arial Black, sans-serif';
      ctx.fillText(row === 'player' ? 'FIGHTER' : row === 'dummy' ? 'DUMMY' : row === 'stage' ? 'STAGE' : row === 'start' ? 'START TRAINING' : 'BACK TO TITLE', 422, top + 26);
      ctx.textAlign = 'right'; ctx.fillStyle = active ? '#7fe3ff' : 'rgba(255,255,255,.6)'; ctx.font = '800 13px Arial, sans-serif';
      const value = row === 'player' ? `◀ ${player.name} ▶` : row === 'dummy' ? `◀ ${dummy.name} ▶` : row === 'stage' ? `◀ STAGE ${this.stageId} ▶` : row === 'start' ? 'ENTER' : 'ESC';
      ctx.fillText(value, 860, top + 26);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('↑ ↓ SELECT  •  ← → CHANGE  •  ENTER / START CONFIRM  •  ESC / LK BACK', 640, 676);
    ctx.restore();
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: CharacterDef, x: number, tag: string, active: boolean): void {
    ctx.fillStyle = 'rgba(6,10,16,.8)'; ctx.beginPath(); ctx.roundRect(x, 130, 280, 240, 18); ctx.fill();
    ctx.strokeStyle = active ? '#7fe3ff' : 'rgba(255,255,255,.12)'; ctx.lineWidth = active ? 3 : 1; ctx.stroke();
    const key = characterPortraitKey(c.id), img = key ? artImage(key) : null;
    if (img && img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(x + 10, 140, 260, 172, 12); ctx.clip();
      const scale = Math.max(260 / img.naturalWidth, 172 / img.naturalHeight);
      ctx.drawImage(img, x + 140 - img.naturalWidth * scale / 2, 140 - (img.naturalHeight * scale - 172) * .15, img.naturalWidth * scale, img.naturalHeight * scale);
      ctx.restore();
    } else { ctx.fillStyle = c.secondary; ctx.beginPath(); ctx.roundRect(x + 10, 140, 260, 172, 12); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 26px Impact, Arial Black, sans-serif'; ctx.fillText(c.name, x + 140, 342);
    ctx.fillStyle = tag === 'YOU' ? '#f1bd51' : '#7fe3ff'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(`${tag} • ${c.style}`, x + 140, 361);
  }
}
