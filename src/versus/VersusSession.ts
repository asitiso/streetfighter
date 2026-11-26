import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';

export type VersusSide = 'p1' | 'p2';
export type VersusWinner = VersusSide | 'draw';
export type VersusExit = 'rematch' | 'select' | 'title';

export interface VersusSelection {
  p1: CharacterDef; p1Art: SuperArtDef;
  p2: CharacterDef; p2Art: SuperArtDef;
  stageId: 1 | 2 | 3 | 4 | 5;
}

export const VERSUS_RESULT_OPTIONS: readonly VersusExit[] = ['rematch', 'select', 'title'];
const OPTION_LABEL: Record<VersusExit, string> = { rematch: 'REMATCH', select: 'CHARACTER SELECT', title: 'TITLE' };
/** Frames the K.O. / winner banner plays before the rematch menu accepts input. */
export const VERSUS_RESULT_MENU_DELAY = 90;

/** One local 2-player match: P2's input, the match outcome, a running set score and the post-match menu. */
export class VersusSession {
  result: { winner: VersusWinner; p1Rounds: number; p2Rounds: number; reason: string } | null = null;
  resultFrames = 0;
  menuIndex = 0;
  private exiting = false;

  constructor(
    readonly selection: VersusSelection,
    readonly p2: InputManager,
    private readonly onExit: (target: VersusExit, selection: VersusSelection) => void | Promise<void>,
    /** Match wins carried across rematches in this sitting. */
    readonly score: { p1: number; p2: number } = { p1: 0, p2: 0 },
  ) {}

  get menuReady(): boolean { return !!this.result && this.resultFrames >= VERSUS_RESULT_MENU_DELAY; }

  finish(winner: VersusWinner, p1Rounds: number, p2Rounds: number, reason: string): void {
    if (this.result) return;
    this.result = { winner, p1Rounds, p2Rounds, reason };
    if (winner === 'p1') this.score.p1 += 1;
    if (winner === 'p2') this.score.p2 += 1;
    this.resultFrames = 0;
    this.menuIndex = 0;
  }

  /** Either player can drive the post-match menu. */
  updateResult(p1: InputManager): void {
    if (!this.result) return;
    this.resultFrames += 1;
    if (!this.menuReady || this.exiting) return;
    const any = (action: Parameters<InputManager['pressed']>[0]) => p1.pressed(action) || this.p2.pressed(action);
    const n = VERSUS_RESULT_OPTIONS.length;
    if (any('up') || any('left')) this.menuIndex = (this.menuIndex + n - 1) % n;
    if (any('down') || any('right')) this.menuIndex = (this.menuIndex + 1) % n;
    if (any('confirm') || any('start') || any('lp')) this.choose(VERSUS_RESULT_OPTIONS[this.menuIndex]!);
  }

  choose(target: VersusExit): void {
    if (this.exiting) return;
    this.exiting = true;
    void Promise.resolve().then(() => this.onExit(target, this.selection)).catch(() => { this.exiting = false; });
  }

  sideLabel(side: VersusSide): string { return `${side.toUpperCase()} ${(side === 'p1' ? this.selection.p1 : this.selection.p2).name}`; }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Player tags under the life bars + set score.
    ctx.font = '900 13px Arial Black, sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd34d'; ctx.fillText('P1', 44, 128);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7fe3ff'; ctx.fillText('P2', 1236, 128);
    if (!this.result) {
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(8,12,20,.86)'; ctx.beginPath(); ctx.roundRect(566, 146, 148, 24, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText(`VERSUS  ${this.score.p1} - ${this.score.p2}`, 640, 163);
    }
    if (this.result && this.resultFrames >= 20) this.drawResult(ctx);
    ctx.restore();
  }

  private drawResult(ctx: CanvasRenderingContext2D): void {
    const r = this.result!, fade = Math.min(1, (this.resultFrames - 20) / 14);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(3,5,10,.72)'; ctx.fillRect(0, 0, 1280, 720);
    const color = r.winner === 'p1' ? '#ffd34d' : r.winner === 'p2' ? '#7fe3ff' : '#ffffff';
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.font = '900 84px Impact, Arial Black, sans-serif'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    const title = r.winner === 'draw' ? 'DRAW GAME' : `${r.winner.toUpperCase()} WINS`;
    ctx.strokeText(title, 640, 230); ctx.fillStyle = color; ctx.fillText(title, 640, 230);
    ctx.font = '900 26px Arial Black, sans-serif'; ctx.fillStyle = '#fff4d6';
    ctx.fillText(r.winner === 'draw' ? `${this.selection.p1.name} VS ${this.selection.p2.name}` : this.sideLabel(r.winner).replace(/^P\d /, ''), 640, 276);
    ctx.font = '800 15px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fillText(`ROUNDS ${r.p1Rounds} - ${r.p2Rounds}  •  ${r.reason}  •  SET ${this.score.p1} - ${this.score.p2}`, 640, 308);
    if (this.menuReady) {
      VERSUS_RESULT_OPTIONS.forEach((option, i) => {
        const y = 360 + i * 56, active = i === this.menuIndex;
        ctx.fillStyle = active ? 'rgba(255,211,77,.18)' : 'rgba(255,255,255,.06)';
        ctx.beginPath(); ctx.roundRect(470, y, 340, 44, 10); ctx.fill();
        if (active) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,.72)'; ctx.font = '900 17px Arial Black, sans-serif';
        ctx.fillText(OPTION_LABEL[option], 640, y + 29);
      });
      ctx.font = '700 12px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillText('P1 OR P2: ← → SELECT  •  START / CONFIRM / LP', 640, 552);
    }
    ctx.globalAlpha = 1;
  }
}
