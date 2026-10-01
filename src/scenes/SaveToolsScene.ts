import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import type { GameSave, SaveHealth } from '../save/SaveManager.js';

export interface SaveToolsContext {
  current: () => GameSave | null;
  health: () => SaveHealth;
  exportSave: () => Promise<{ filename: string; text: string }>;
  importSave: (text: string) => Promise<GameSave>;
  onImported: (save: GameSave) => void;
}

export class SaveToolsScene implements Scene {
  private time = 0;
  private busy = false;
  private message = 'READY';
  private messageGood = true;
  private inputElement: HTMLInputElement | null = null;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly context: SaveToolsContext,
    private readonly onBack: () => void,
  ) {}

  enter(): void { this.audio.playStagePulse(); }
  exit(): void { this.inputElement?.remove(); this.inputElement = null; }
  resize(): void {}
  destroy(): void { this.inputElement?.remove(); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.busy) return;
    if (this.input.pressed('lp')) { this.audio.playUiConfirm(); void this.exportFile(); }
    if (this.input.pressed('mp')) { this.audio.playUiConfirm(); this.openImportPicker(); }
    if (this.input.pressed('back') || this.input.pressed('lk') || this.input.touchPressed('start')) { this.audio.playUiConfirm(); this.onBack(); }
  }

  private async exportFile(): Promise<void> {
    this.busy = true;
    try {
      const file = await this.context.exportSave();
      const blob = new Blob([file.text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = file.filename; anchor.style.display = 'none';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      this.message = `EXPORTED • ${file.filename}`; this.messageGood = true;
    } catch (error) { this.message = `EXPORT FAILED • ${error instanceof Error ? error.message : String(error)}`; this.messageGood = false; }
    finally { this.busy = false; }
  }

  private openImportPicker(): void {
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = '.json,application/json'; picker.style.display = 'none';
    picker.onchange = () => {
      const file = picker.files?.[0];
      if (!file) { picker.remove(); return; }
      this.busy = true;
      void file.text().then((text) => this.context.importSave(text)).then((save) => {
        this.context.onImported(save);
        this.message = `IMPORTED • ${file.name}`; this.messageGood = true;
      }).catch((error) => {
        this.message = `IMPORT REJECTED • ${error instanceof Error ? error.message : String(error)}`; this.messageGood = false;
      }).finally(() => { this.busy = false; picker.remove(); if (this.inputElement === picker) this.inputElement = null; });
    };
    document.body.appendChild(picker); this.inputElement = picker; picker.click();
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720); gradient.addColorStop(0, '#121b27'); gradient.addColorStop(1, '#080a10');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1280, 720);
    const save = this.context.current(); const health = this.context.health();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 38px Arial Black, sans-serif'; ctx.fillText('SAVE TOOLS', 100, 90);
    ctx.fillStyle = 'rgba(220,228,240,.6)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText('PORTABLE BACKUP • CHECKSUM VALIDATION • SAFE IMPORT', 102, 118);

    const cards = [
      ['CURRENT SAVE', save ? `${save.selectedCharacter} • STAGE ${save.currentStage} • ${save.completedStages.length}/5 CLEAR` : 'NOT LOADED'],
      ['SAVE HEALTH', `${health.source.toUpperCase()} • ${health.repaired ? 'REPAIRED' : 'CLEAN'} • BACKUP ${health.backupReady ? 'READY' : 'PENDING'}`],
      ['EXPORT', 'LP • DOWNLOAD PORTABLE JSON BACKUP'],
      ['IMPORT', 'MP • SELECT JSON • VALIDATE • KEEP CURRENT AS BACKUP'],
    ] as const;
    for (let i = 0; i < cards.length; i += 1) {
      const y = 170 + i * 95;
      ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = 'rgba(240,186,69,.24)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(100, y, 1080, 70, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(220,228,240,.52)'; ctx.font = '800 11px Arial, sans-serif'; ctx.fillText(cards[i]![0], 126, y + 25);
      ctx.fillStyle = '#eef2f8'; ctx.font = '900 17px Arial Black, sans-serif'; ctx.fillText(cards[i]![1], 126, y + 51);
    }
    ctx.fillStyle = this.messageGood ? '#8be0b4' : '#ff8292'; ctx.font = '900 13px Arial Black, sans-serif'; ctx.fillText(this.busy ? 'WORKING…' : this.message, 104, 585);
    ctx.fillStyle = 'rgba(220,228,240,.52)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText('Imported files never bypass checksum/sanitization. Your current save is preserved as the backup before replacement.', 104, 615);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText('LP EXPORT  •  MP IMPORT  •  START / LK BACK', 640, 675);
    ctx.restore();
  }
}
