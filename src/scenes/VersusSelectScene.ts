import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import { InputManager, keysForAction, type Action, type KeyBinding } from '../input/InputManager.js';
import { CHARACTERS, type CharacterDef } from '../game/characters.js';
import { artImage, characterPortraitKey, PLAYABLE_PORTRAIT_KEYS, preloadArtAssets } from '../render/ImageAssets.js';
import type { VersusSelection } from '../versus/VersusSession.js';

export type VersusPickStep = 'char' | 'art' | 'ready';
export interface VersusPick { charIndex: number; artIndex: number; step: VersusPickStep }
const ROMAN = ['I', 'II', 'III'];

/** Both players pick a fighter and a Super Art at the same time, then either picks the stage. */
export class VersusSelectScene implements Scene {
  readonly picks: Record<'p1' | 'p2', VersusPick>;
  stageId: 1 | 2 | 3 | 4 | 5;
  private leaving = false;
  private time = 0;

  constructor(
    private readonly input: InputManager,
    readonly p2: InputManager,
    private readonly audio: AudioManager,
    private readonly onStart: (selection: VersusSelection) => void | Promise<void>,
    private readonly onBack: () => void | Promise<void>,
    initial?: VersusSelection,
    private readonly onSelectionModeChange?: (active: boolean) => void,
  ) {
    const idx = (c?: CharacterDef, fallback = 0) => Math.max(0, c ? CHARACTERS.findIndex((x) => x.id === c.id) : fallback);
    this.picks = {
      p1: { charIndex: idx(initial?.p1, 0), artIndex: initial ? initial.p1Art.id - 1 : 0, step: 'char' },
      p2: { charIndex: idx(initial?.p2, 1), artIndex: initial ? initial.p2Art.id - 1 : 0, step: 'char' },
    };
    this.stageId = initial?.stageId ?? 1;
  }

  get bothReady(): boolean { return this.picks.p1.step === 'ready' && this.picks.p2.step === 'ready'; }

  get selection(): VersusSelection {
    const p1 = CHARACTERS[this.picks.p1.charIndex]!, p2 = CHARACTERS[this.picks.p2.charIndex]!;
    return { p1, p1Art: p1.superArts[this.picks.p1.artIndex]!, p2, p2Art: p2.superArts[this.picks.p2.artIndex]!, stageId: this.stageId };
  }

  enter(): void { this.leaving = false; this.onSelectionModeChange?.(true); preloadArtAssets(PLAYABLE_PORTRAIT_KEYS); }
  exit(): void { this.leaving = true; this.onSelectionModeChange?.(false); }
  resize(): void {}
  destroy(): void { this.leaving = true; this.onSelectionModeChange?.(false); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.leaving) return;
    if (this.bothReady) { this.updateStage(); return; }
    for (const side of ['p1', 'p2'] as const) {
      const input = side === 'p1' ? this.input : this.p2;
      const back = input.pressed('back') || input.pressed('lk');
      if (side === 'p1' && back && this.picks.p1.step === 'char') { this.leave(this.onBack); return; }
      this.updatePick(side, input, back);
    }
  }

  /** One player's cursor: ← → changes the fighter / Super Art, confirm advances, back steps back. */
  updatePick(side: 'p1' | 'p2', input: InputManager, back = input.pressed('back') || input.pressed('lk')): void {
    const pick = this.picks[side];
    const confirm = input.pressed('confirm') || input.pressed('lp') || input.pressed('start');
    const dir = input.pressed('left') ? -1 : input.pressed('right') ? 1 : 0;
    if (pick.step === 'char') {
      if (dir) { pick.charIndex = (pick.charIndex + dir + CHARACTERS.length) % CHARACTERS.length; this.audio.playMenuMove(); }
      if (confirm) { pick.step = 'art'; this.audio.playUiConfirm(); }
    } else if (pick.step === 'art') {
      if (dir || input.pressed('up') || input.pressed('down')) { pick.artIndex = (pick.artIndex + (dir || (input.pressed('up') ? -1 : 1)) + 3) % 3; this.audio.playMenuMove(); }
      if (confirm) { pick.step = 'ready'; this.audio.playUiConfirm(); }
      else if (back) pick.step = 'char';
    } else if (back) pick.step = 'art';
  }

  private updateStage(): void {
    for (const input of [this.input, this.p2]) {
      if (input.pressed('back') || input.pressed('lk')) { this.picks.p1.step = 'art'; this.picks.p2.step = 'art'; return; }
      const dir = input.pressed('left') ? -1 : input.pressed('right') ? 1 : 0;
      if (dir) { this.stageId = (((this.stageId - 1 + dir + 5) % 5) + 1) as 1 | 2 | 3 | 4 | 5; this.audio.playMenuMove(); }
      if (input.pressed('confirm') || input.pressed('start') || input.pressed('lp')) {
        this.audio.playUiConfirm();
        const selection = this.selection;
        this.leave(() => this.onStart(selection));
        return;
      }
    }
  }

  private leave(action: () => void | Promise<void>): void {
    this.leaving = true;
    void Promise.resolve().then(action).catch(() => { this.leaving = false; });
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#1b1206'); g.addColorStop(.5, '#0e1520'); g.addColorStop(1, '#06182a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 44px Impact, Arial Black, sans-serif'; ctx.fillText('VERSUS', 640, 58);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '800 12px Arial Black, sans-serif'; ctx.fillText('LOCAL 2 PLAYERS • BEST OF 3', 640, 80);
    const sel = this.selection;
    this.drawCard(ctx, 'p1', sel.p1, sel.p1Art, 70, '#ffd34d');
    this.drawCard(ctx, 'p2', sel.p2, sel.p2Art, 690, '#7fe3ff');
    ctx.fillStyle = '#f1bd51'; ctx.font = '900 50px Impact, Arial Black, sans-serif'; ctx.fillText('VS', 640, 250);
    // Stage row.
    const ready = this.bothReady;
    ctx.fillStyle = ready ? 'rgba(255,211,77,.16)' : 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.roundRect(440, 418, 400, 44, 10); ctx.fill();
    if (ready) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = ready ? '#fff' : 'rgba(255,255,255,.5)'; ctx.font = '900 16px Arial Black, sans-serif';
    ctx.fillText(ready ? `◀ STAGE ${this.stageId} ▶   CONFIRM TO FIGHT` : `STAGE ${this.stageId}  •  BOTH PLAYERS READY TO PICK`, 640, 446);
    this.drawControls(ctx);
    ctx.restore();
  }

  private drawCard(ctx: CanvasRenderingContext2D, side: 'p1' | 'p2', c: CharacterDef, art: CharacterDef['superArts'][number], x: number, color: string): void {
    const pick = this.picks[side];
    ctx.fillStyle = 'rgba(6,10,16,.82)'; ctx.beginPath(); ctx.roundRect(x, 96, 520, 310, 16); ctx.fill();
    ctx.strokeStyle = pick.step === 'ready' ? color : 'rgba(255,255,255,.14)'; ctx.lineWidth = pick.step === 'ready' ? 3 : 1; ctx.stroke();
    const key = characterPortraitKey(c.id), img = key ? artImage(key) : null;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x + 12, 108, 220, 284, 12); ctx.clip();
    if (img && img.naturalWidth) {
      const s = Math.max(220 / img.naturalWidth, 284 / img.naturalHeight);
      ctx.drawImage(img, x + 122 - img.naturalWidth * s / 2, 108, img.naturalWidth * s, img.naturalHeight * s);
    } else { ctx.fillStyle = c.secondary; ctx.fillRect(x + 12, 108, 220, 284); }
    ctx.restore();
    const tx = x + 250;
    ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText(side.toUpperCase(), tx, 134);
    ctx.fillStyle = '#fff'; ctx.font = '900 34px Impact, Arial Black, sans-serif'; ctx.fillText(`${pick.step === 'char' ? '◀ ' : ''}${c.name}${pick.step === 'char' ? ' ▶' : ''}`, tx, 174);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '800 12px Arial, sans-serif'; ctx.fillText(c.style, tx, 194);
    ctx.fillStyle = pick.step === 'art' ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)'; ctx.beginPath(); ctx.roundRect(tx - 8, 212, 268, 78, 10); ctx.fill();
    if (pick.step === 'art') { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = color; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(`SUPER ART ${ROMAN[art.id - 1]}${pick.step === 'art' ? '   ◀ ▶' : ''}`, tx, 232);
    ctx.fillStyle = '#fff'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText(art.name, tx, 256);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(`${art.subtitle} • ${art.stocks} STOCK${art.stocks > 1 ? 'S' : ''}`, tx, 276);
    const status = pick.step === 'char' ? '← → FIGHTER  •  CONFIRM' : pick.step === 'art' ? '← → SUPER ART  •  CONFIRM  •  BACK' : 'READY!';
    ctx.fillStyle = pick.step === 'ready' ? color : 'rgba(255,255,255,.75)'; ctx.font = `900 ${pick.step === 'ready' ? 22 : 12}px Arial Black, sans-serif`;
    ctx.fillText(status, tx, 330);
    const pads = InputManager.connectedGamepads();
    const pad = pads[side === 'p1' ? 0 : 1];
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText(pad ? `GAMEPAD ${side === 'p1' ? 1 : 2}: ${pad.id.slice(0, 34)}` : `GAMEPAD ${side === 'p1' ? 1 : 2}: NOT CONNECTED`, tx, 380);
  }

  private drawControls(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(6,10,16,.82)'; ctx.beginPath(); ctx.roundRect(70, 478, 1140, 222, 14); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#f1bd51'; ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText('CONTROLS / KEY CONFIG', 640, 502);
    const rows: Array<[string, Action[]]> = [['MOVE ← → ↑ ↓', ['left', 'right', 'up', 'down']], ['JUMP', ['jump']], ['LP / MP / HP', ['lp', 'mp', 'hp']], ['LK / MK / HK', ['lk', 'mk', 'hk']], ['START / PAUSE', ['start']], ['CONFIRM / BACK', ['confirm', 'back']]];
    const column = (bindings: readonly KeyBinding[], x: number, color: string, label: string) => {
      ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText(label, x, 528);
      rows.forEach(([name, actions], i) => {
        const y = 552 + i * 22;
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 11px Arial, sans-serif'; ctx.fillText(name, x, y);
        ctx.fillStyle = '#fff'; ctx.font = '900 12px Arial, sans-serif';
        ctx.fillText(actions.map((a) => keysForAction(bindings, a).join('/') || '—').join('  '), x + 130, y);
      });
    };
    column(this.input.bindings, 100, '#ffd34d', 'P1 KEYBOARD');
    column(this.p2.bindings, 660, '#7fe3ff', 'P2 KEYBOARD');
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('GAMEPADS: 1ST PAD = P1, 2ND PAD = P2 • D-PAD/STICK MOVE • A B Y = LP MP HP • X LB RB = LK MK HK • START = START • TOUCH CONTROLS DRIVE P1 ONLY', 640, 690);
  }
}
