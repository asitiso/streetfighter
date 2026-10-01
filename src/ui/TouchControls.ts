import type { Action, InputManager } from '../input/InputManager.js';

export interface TouchControlSettings {
  stickScale: number;
  buttonScale: number;
  opacity: number;
  stickX: number;
  stickY: number;
  buttonsX: number;
  buttonsY: number;
  vibrationEnabled: boolean;
}

type DragGroup = 'stick' | 'buttons';

const DEFAULTS: TouchControlSettings = {
  stickScale: 1,
  buttonScale: 1,
  opacity: .72,
  stickX: 38,
  stickY: 28,
  buttonsX: 32,
  buttonsY: 26,
  vibrationEnabled: true,
};

export class TouchControls {
  readonly element = document.createElement('div');
  private active = true;
  private editing = false;
  private settings: TouchControlSettings = { ...DEFAULTS };
  private drag: { group: DragGroup; pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null = null;
  private dpadPointerId: number | null = null;
  private dpadAction: Action | null = null;
  private previewCallback: ((settings: TouchControlSettings) => void) | null = null;
  private commitCallback: ((settings: TouchControlSettings) => void) | null = null;

  constructor(private readonly input: InputManager) {
    this.element.className = 'touch-controls';
    this.element.innerHTML = `
      <div class="dpad" data-layout-group="stick" aria-label="movement">
        <div class="layout-handle">MOVE</div>
        <button data-action="up" class="dpad-up">▲</button>
        <button data-action="left" class="dpad-left">◀</button>
        <div class="dpad-center"></div>
        <button data-action="right" class="dpad-right">▶</button>
        <button data-action="down" class="dpad-down">▼</button>
      </div>
      <div class="fight-buttons" data-layout-group="buttons" aria-label="six button controls">
        <div class="layout-handle">MOVE</div>
        <button data-action="lp">LP</button><button data-action="mp">MP</button><button data-action="hp">HP</button>
        <button data-action="lk">LK</button><button data-action="mk">MK</button><button data-action="hk">HK</button>
      </div>
      <button class="jump-button" data-action="jump">JUMP</button>
      <button class="start-button" data-action="start">START</button>`;

    for (const node of this.element.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const action = node.dataset.action as Action;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        if (this.editing && action !== 'start') return;
        if (this.active) {
          this.input.setTouch(action, true);
          this.vibrate(action === 'left' || action === 'right' || action === 'up' || action === 'down' ? 3 : 7);
        }
      };
      const up = (e: PointerEvent) => {
        e.preventDefault();
        const dpadDirection = action === 'left' || action === 'right' || action === 'up' || action === 'down';
        if (e.type === 'pointerleave' && dpadDirection && this.dpadPointerId === e.pointerId) return;
        this.input.setTouch(action, false);
      };
      node.addEventListener('pointerdown', down);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
      node.addEventListener('pointerleave', up);
    }

    const dpad = this.element.querySelector<HTMLElement>('.dpad');
    dpad?.addEventListener('pointerdown', this.onDpadPointerDown, { capture: true });
    dpad?.addEventListener('pointermove', this.onDpadPointerMove, { passive: false });
    dpad?.addEventListener('pointerup', this.onDpadPointerEnd);
    dpad?.addEventListener('pointercancel', this.onDpadPointerEnd);

    for (const group of this.element.querySelectorAll<HTMLElement>('[data-layout-group]')) {
      group.addEventListener('pointerdown', (event) => this.beginDrag(event, group.dataset.layoutGroup as DragGroup), { capture: true });
    }
    window.addEventListener('pointermove', this.onDragMove, { passive: false });
    window.addEventListener('pointerup', this.endDrag, { passive: false });
    window.addEventListener('pointercancel', this.endDrag, { passive: false });
    this.applySettings();
  }


  releaseAll(): void {
    this.drag = null;
    this.dpadPointerId = null;
    this.dpadAction = null;
    for (const action of ['left','right','up','down','jump','lp','mp','hp','lk','mk','hk','start'] as Action[]) this.input.setTouch(action, false);
  }

  setVisible(visible: boolean): void {
    if (!visible) this.releaseAll();
    this.active = visible;
    this.element.classList.toggle('hidden', !visible);
  }

  setSettings(settings: Partial<TouchControlSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings,
      stickScale: this.clamp(settings.stickScale ?? this.settings.stickScale, .7, 1.4),
      buttonScale: this.clamp(settings.buttonScale ?? this.settings.buttonScale, .7, 1.4),
      opacity: this.clamp(settings.opacity ?? this.settings.opacity, .3, 1),
      stickX: this.clamp(settings.stickX ?? this.settings.stickX, 8, 260),
      stickY: this.clamp(settings.stickY ?? this.settings.stickY, 8, 180),
      buttonsX: this.clamp(settings.buttonsX ?? this.settings.buttonsX, 8, 260),
      buttonsY: this.clamp(settings.buttonsY ?? this.settings.buttonsY, 8, 180),
    };
    this.applySettings();
  }

  getSettings(): TouchControlSettings { return { ...this.settings }; }

  resetSettings(): TouchControlSettings {
    this.settings = { ...DEFAULTS, vibrationEnabled: this.settings.vibrationEnabled };
    this.applySettings();
    return this.getSettings();
  }

  setEditMode(
    editing: boolean,
    onPreview?: (settings: TouchControlSettings) => void,
    onCommit?: (settings: TouchControlSettings) => void,
  ): void {
    this.editing = editing;
    this.previewCallback = onPreview ?? null;
    this.commitCallback = onCommit ?? null;
    this.element.classList.toggle('editing', editing);
    if (!editing) this.drag = null;
    for (const action of ['left','right','up','down','jump','lp','mp','hp','lk','mk','hk','start'] as Action[]) this.input.setTouch(action, false);
  }

  private onDpadPointerDown = (event: PointerEvent): void => {
    if (this.editing || !this.active || this.dpadPointerId !== null) return;
    this.dpadPointerId = event.pointerId;
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.setDpadAction(this.dpadActionAt(event.clientX, event.clientY));
  };

  private onDpadPointerMove = (event: PointerEvent): void => {
    if (this.editing || event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    this.setDpadAction(this.dpadActionAt(event.clientX, event.clientY));
  };

  private onDpadPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    this.setDpadAction(null);
    this.dpadPointerId = null;
  };

  private dpadActionAt(clientX: number, clientY: number): Action | null {
    const hit = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.dpad [data-action]');
    if (!hit || !this.element.contains(hit)) return null;
    const action = hit.dataset.action as Action | undefined;
    return action === 'left' || action === 'right' || action === 'up' || action === 'down' ? action : null;
  }

  private setDpadAction(next: Action | null): void {
    if (next === this.dpadAction) return;
    if (this.dpadAction) this.input.setTouch(this.dpadAction, false);
    this.dpadAction = next;
    if (next) {
      this.input.setTouch(next, true);
      this.vibrate(3);
    }
  }

  private beginDrag(event: PointerEvent, group: DragGroup): void {
    if (!this.editing) return;
    event.preventDefault();
    event.stopPropagation();
    const baseX = group === 'stick' ? this.settings.stickX : this.settings.buttonsX;
    const baseY = group === 'stick' ? this.settings.stickY : this.settings.buttonsY;
    this.drag = { group, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX, baseY };
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  private onDragMove = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - this.drag.startX;
    const dy = event.clientY - this.drag.startY;
    if (this.drag.group === 'stick') {
      this.settings.stickX = this.clamp(this.drag.baseX + dx, 8, Math.max(8, window.innerWidth * .38));
      this.settings.stickY = this.clamp(this.drag.baseY - dy, 8, Math.max(8, window.innerHeight * .3));
    } else {
      this.settings.buttonsX = this.clamp(this.drag.baseX - dx, 8, Math.max(8, window.innerWidth * .38));
      this.settings.buttonsY = this.clamp(this.drag.baseY - dy, 8, Math.max(8, window.innerHeight * .3));
    }
    this.applySettings();
    this.previewCallback?.(this.getSettings());
  };

  private endDrag = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    this.drag = null;
    this.commitCallback?.(this.getSettings());
  };

  private applySettings(): void {
    this.element.style.setProperty('--stick-scale', String(this.settings.stickScale));
    this.element.style.setProperty('--button-scale', String(this.settings.buttonScale));
    this.element.style.setProperty('--control-opacity', String(this.settings.opacity));
    this.element.style.setProperty('--stick-x', `${this.settings.stickX}px`);
    this.element.style.setProperty('--stick-y', `${this.settings.stickY}px`);
    this.element.style.setProperty('--buttons-x', `${this.settings.buttonsX}px`);
    this.element.style.setProperty('--buttons-y', `${this.settings.buttonsY}px`);
    const scaledButtonGroupWidth = 210 * this.settings.buttonScale;
    const scaledJumpInset = 37 * this.settings.buttonScale;
    this.element.style.setProperty('--jump-x', `${this.settings.buttonsX + scaledButtonGroupWidth + 10}px`);
    this.element.style.setProperty('--jump-y', `${this.settings.buttonsY + scaledJumpInset}px`);
  }

  private vibrate(ms: number): void {
    if (!this.settings.vibrationEnabled || !('vibrate' in navigator)) return;
    navigator.vibrate(ms);
  }

  private clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
}
