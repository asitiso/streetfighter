import type { AudioManager } from '../core/AudioManager.js';
import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { GameSave } from '../save/SaveManager.js';
import { TouchControls, type TouchControlSettings } from '../ui/TouchControls.js';
import { characterTextureManager } from '../render/CharacterTextureManager.js';

type RowId = 'audio' | 'vibration' | 'character-quality' | 'stick-size' | 'button-size' | 'opacity' | 'edit-layout' | 'reset-layout' | 'back';
const ROWS: readonly RowId[] = ['audio', 'vibration', 'character-quality', 'stick-size', 'button-size', 'opacity', 'edit-layout', 'reset-layout', 'back'];

export class OptionsScene implements Scene {
  private index = 0;
  private lock = 0;
  private time = 0;
  private editingLayout = false;
  private audioEnabled: boolean;
  private settings: TouchControlSettings;
  private readonly selectedCharacter: string;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly touch: TouchControls,
    save: GameSave,
    private readonly persist: (patch: Partial<GameSave>) => void,
    private readonly back: () => void,
  ) {
    this.audioEnabled = save.audioEnabled;
    this.selectedCharacter = save.selectedCharacter;
    this.settings = {
      stickScale: save.touchStickScale,
      buttonScale: save.touchButtonScale,
      opacity: save.touchOpacity,
      stickX: save.touchStickX,
      stickY: save.touchStickY,
      buttonsX: save.touchButtonsX,
      buttonsY: save.touchButtonsY,
      vibrationEnabled: save.vibrationEnabled,
    };
    this.touch.setSettings(this.settings);
  }

  enter(): void { this.touch.setVisible(true); }
  exit(): void { this.touch.setEditMode(false); }
  resize(_width: number, _height: number): void {}
  destroy(): void { this.touch.setEditMode(false); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.lock > 0) this.lock -= 1;

    if (this.editingLayout) {
      if (this.input.pressed('start')) {
        this.editingLayout = false;
        this.touch.setEditMode(false);
        this.commitTouch();
        this.audio.playUiConfirm();
      }
      return;
    }

    if (this.lock === 0) {
      const old = this.index;
      if (this.input.pressed('up')) this.index = (this.index + ROWS.length - 1) % ROWS.length;
      if (this.input.pressed('down')) this.index = (this.index + 1) % ROWS.length;
      if (old !== this.index) { this.lock = 5; this.audio.playMenuMove(); }
      if (this.input.pressed('left')) this.adjust(-1);
      if (this.input.pressed('right')) this.adjust(1);
    }

    if (this.input.pressed('start') || this.input.pressed('lp') || this.input.pressed('mp') || this.input.pressed('hp')) this.activate();
    if (this.input.pressed('lk')) this.leave();
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save();
    ctx.scale(width / 1280, height / 720);
    this.drawBackground(ctx);
    this.drawPanel(ctx);
    if (this.editingLayout) this.drawEditOverlay(ctx);
    ctx.restore();
  }

  private adjust(direction: -1 | 1): void {
    const row = ROWS[this.index]!;
    if (row === 'audio' || row === 'vibration') { this.toggle(row); return; }
    if (row === 'character-quality') { characterTextureManager.cycle(direction); characterTextureManager.preloadCharacter(this.selectedCharacter); this.audio.playMenuMove(); this.lock = 4; return; }
    if (row === 'stick-size') this.settings.stickScale = this.step(this.settings.stickScale, direction * .05, .7, 1.4);
    else if (row === 'button-size') this.settings.buttonScale = this.step(this.settings.buttonScale, direction * .05, .7, 1.4);
    else if (row === 'opacity') this.settings.opacity = this.step(this.settings.opacity, direction * .05, .3, 1);
    else return;
    this.touch.setSettings(this.settings);
    this.commitTouch();
    this.audio.playMenuMove();
    this.lock = 4;
  }

  private activate(): void {
    const row = ROWS[this.index]!;
    if (row === 'audio' || row === 'vibration') { this.toggle(row); return; }
    if (row === 'character-quality') { characterTextureManager.cycle(1); characterTextureManager.preloadCharacter(this.selectedCharacter); this.audio.playUiConfirm(); this.lock = 5; return; }
    if (row === 'edit-layout') {
      this.editingLayout = true;
      this.touch.setEditMode(true, (next) => { this.settings = next; }, (next) => { this.settings = next; this.commitTouch(); });
      this.audio.playUiConfirm();
      return;
    }
    if (row === 'reset-layout') {
      this.settings = this.touch.resetSettings();
      this.commitTouch();
      this.audio.playUiConfirm();
      return;
    }
    if (row === 'back') this.leave();
  }

  private toggle(row: 'audio' | 'vibration'): void {
    if (row === 'audio') {
      this.audioEnabled = !this.audioEnabled;
      this.audio.setEnabled(this.audioEnabled);
      this.persist({ audioEnabled: this.audioEnabled });
    } else {
      this.settings.vibrationEnabled = !this.settings.vibrationEnabled;
      this.touch.setSettings(this.settings);
      this.persist({ vibrationEnabled: this.settings.vibrationEnabled });
    }
    this.audio.playUiConfirm();
    this.lock = 5;
  }

  private commitTouch(): void {
    this.touch.setSettings(this.settings);
    this.persist({
      touchStickScale: this.settings.stickScale,
      touchButtonScale: this.settings.buttonScale,
      touchOpacity: this.settings.opacity,
      touchStickX: this.settings.stickX,
      touchStickY: this.settings.stickY,
      touchButtonsX: this.settings.buttonsX,
      touchButtonsY: this.settings.buttonsY,
      vibrationEnabled: this.settings.vibrationEnabled,
    });
  }

  private leave(): void {
    this.touch.setEditMode(false);
    this.editingLayout = false;
    this.commitTouch();
    this.back();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#0c111c'); g.addColorStop(.5, '#171a25'); g.addColorStop(1, '#24131a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    ctx.globalAlpha = .07; ctx.strokeStyle = '#fff';
    for (let x = -720; x < 1600; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 720, 720); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  private drawPanel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(4,7,12,.72)'; ctx.beginPath(); ctx.roundRect(318, 42, 644, 636, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 38px Impact, Arial Black, sans-serif'; ctx.fillText('OPTIONS', 370, 78);
    ctx.fillStyle = '#f0bd4f'; ctx.font = '800 12px Arial Black, sans-serif'; ctx.fillText('VISUAL QUALITY + MOBILE CONTROL', 372, 104);

    const y0 = 145;
    for (let i = 0; i < ROWS.length; i += 1) {
      const row = ROWS[i]!;
      const y = y0 + i * 55;
      const active = i === this.index;
      ctx.fillStyle = active ? 'rgba(240,189,79,.15)' : 'rgba(255,255,255,.025)';
      ctx.strokeStyle = active ? '#efbd52' : 'rgba(255,255,255,.07)'; ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(360, y - 31, 560, 46, 9); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillStyle = active ? '#fff4cc' : '#e7e9ed'; ctx.fillText(this.rowLabel(row), 382, y - 2);
      ctx.textAlign = 'right'; ctx.fillStyle = active ? '#f4ca70' : 'rgba(255,255,255,.56)'; ctx.font = '800 13px Arial, sans-serif'; ctx.fillText(this.rowValue(row), 895, y - 2);
    }

    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.56)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('↑ ↓ SELECT  •  ← → ADJUST  •  P / START CONFIRM  •  LK BACK', 640, 670);
  }

  private drawEditOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(14,18,26,.94)'; ctx.beginPath(); ctx.roundRect(362, 190, 556, 245, 22); ctx.fill();
    ctx.strokeStyle = '#f1c85c'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 30px Impact, sans-serif'; ctx.fillText('EDIT TOUCH LAYOUT', 640, 250);
    ctx.fillStyle = '#f4cf6f'; ctx.font = '800 15px Arial Black, sans-serif'; ctx.fillText('DRAG THE D-PAD AND 6-BUTTON GROUPS', 640, 290);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '600 13px Arial, sans-serif';
    ctx.fillText('손에 가장 편한 위치로 직접 옮기세요.', 640, 326);
    ctx.fillText('완료하려면 START를 누르세요.', 640, 352);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText('Layout changes are saved when you release a control group.', 640, 400);
  }

  private rowLabel(row: RowId): string {
    if (row === 'audio') return 'AUDIO';
    if (row === 'vibration') return 'VIBRATION';
    if (row === 'character-quality') return 'CHARACTER QUALITY';
    if (row === 'stick-size') return 'D-PAD SIZE';
    if (row === 'button-size') return 'BUTTON SIZE';
    if (row === 'opacity') return 'CONTROL OPACITY';
    if (row === 'edit-layout') return 'EDIT CONTROL POSITIONS';
    if (row === 'reset-layout') return 'RESET TOUCH LAYOUT';
    return 'BACK TO TITLE';
  }

  private rowValue(row: RowId): string {
    if (row === 'audio') return this.audioEnabled ? 'ON' : 'OFF';
    if (row === 'vibration') return this.settings.vibrationEnabled ? 'ON' : 'OFF';
    if (row === 'character-quality') { const mode = characterTextureManager.currentMode === 'hd' ? 'HIGH' : characterTextureManager.currentMode.toUpperCase(); const hdReady = characterTextureManager.hdReadyCount(); const hqApproved = characterTextureManager.hqApprovedCount(); return `${mode} • ${characterTextureManager.effectiveLabelFor(this.selectedCharacter)} • HQ ${hqApproved}/4${hdReady ? ` • HD ${hdReady}/8` : ''}`; }
    if (row === 'stick-size') return `${Math.round(this.settings.stickScale * 100)}%`;
    if (row === 'button-size') return `${Math.round(this.settings.buttonScale * 100)}%`;
    if (row === 'opacity') return `${Math.round(this.settings.opacity * 100)}%`;
    if (row === 'edit-layout') return 'DRAG';
    if (row === 'reset-layout') return 'DEFAULT';
    return 'RETURN';
  }

  private step(value: number, delta: number, min: number, max: number): number { return Math.round(Math.max(min, Math.min(max, value + delta)) * 100) / 100; }
}
