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
const MIN_CONTROL_SCALE = .7;
const DPAD_ACTIONS = ['up', 'down', 'left', 'right'] as const;

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

type TouchInsets = { left: number; right: number; top: number; bottom: number };

export function resolveTouchLayout(settings: TouchControlSettings, width: number, height: number, insets: TouchInsets) {
  const padSize = height <= 540 ? 142 : 176;
  const fightWidth = height <= 540 ? 180 : 210;
  const fightHeight = height <= 540 ? 124 : 144;
  const usableWidth = Math.max(1, width - insets.left - insets.right);
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(Math.max(low, high), value));
  let stickScale = Math.min(settings.stickScale, Math.max(.01, (usableWidth - 16) / padSize), Math.max(.01, (usableHeight - 16) / padSize));
  let buttonScale = Math.min(settings.buttonScale, Math.max(.01, (usableWidth - 26) / (fightWidth + 60)), Math.max(.01, (usableHeight - 80) / fightHeight));
  let padHeader = false;
  const position = () => ({
    stickX: clamp(settings.stickX, 8, usableWidth - padSize * stickScale - 8),
    stickY: clamp(settings.stickY, 8, usableHeight - padSize * stickScale - (padHeader ? 72 : 8)),
    buttonsX: clamp(settings.buttonsX, 8, usableWidth - (fightWidth + 60) * buttonScale - 18),
    buttonsY: clamp(settings.buttonsY, 8, usableHeight - fightHeight * buttonScale - 72),
  });
  let offsets = position();
  if (offsets.stickX + padSize * stickScale > usableWidth - 128
    && usableHeight - offsets.stickY - padSize * stickScale < 72) {
    padHeader = true;
    stickScale = Math.min(stickScale, Math.max(.01, (usableHeight - 80) / padSize));
    offsets = position();
  }
  const padTop = usableHeight - offsets.stickY - padSize * stickScale;
  const rightTop = usableHeight - offsets.buttonsY - fightHeight * buttonScale;
  const rightLeft = usableWidth - offsets.buttonsX - (fightWidth + 60) * buttonScale - 10;
  const overlap = offsets.stickX + padSize * stickScale + 12 > rightLeft
    && padTop < usableHeight - offsets.buttonsY + 12
    && rightTop < usableHeight - offsets.stickY + 12;
  if (overlap) {
    const contentWidth = padSize * stickScale + (fightWidth + 60) * buttonScale;
    const room = Math.max(1, usableWidth - 38);
    if (contentWidth > room) {
      const stickFloor = Math.min(stickScale, MIN_CONTROL_SCALE);
      const buttonFloor = Math.min(buttonScale, MIN_CONTROL_SCALE);
      const floorWidth = padSize * stickFloor + (fightWidth + 60) * buttonFloor;
      if (room >= floorWidth) {
        const keep = (room - floorWidth) / (contentWidth - floorWidth);
        stickScale = stickFloor + (stickScale - stickFloor) * keep;
        buttonScale = buttonFloor + (buttonScale - buttonFloor) * keep;
      } else {
        const fit = Math.max(.01, room / contentWidth);
        stickScale *= fit;
        buttonScale *= fit;
      }
    }
    offsets = position();
    const maxOffsets = usableWidth - padSize * stickScale - (fightWidth + 60) * buttonScale - 22;
    if (offsets.stickX + offsets.buttonsX > maxOffsets) {
      const extra = offsets.stickX + offsets.buttonsX - 16;
      const keep = extra > 0 ? clamp((maxOffsets - 16) / extra, 0, 1) : 0;
      offsets.stickX = 8 + (offsets.stickX - 8) * keep;
      offsets.buttonsX = 8 + (offsets.buttonsX - 8) * keep;
    }
  }
  return { ...offsets, stickScale, buttonScale, padSize, fightWidth, fightHeight,
    jumpOffsetX: fightWidth * buttonScale + 10, jumpOffsetY: 37 * buttonScale };
}


export interface TouchRect { left: number; top: number; right: number; bottom: number }

// Reposition only START when layout changes; never read layout during combat ticks.
export function resolveTouchStartPosition(width: number, height: number, insets: TouchInsets,
  occupied: readonly TouchRect[], buttonWidth = 86, buttonHeight = 36): { left: number; top: number } {
  const usableWidth = Math.max(1, width - insets.left - insets.right);
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  const logicalWidth = Math.max(1280, Math.round(720 * usableWidth / usableHeight));
  const scale = Math.min(usableWidth / logicalWidth, usableHeight / 720);
  const offsetY = insets.top + (usableHeight - 720 * scale) / 2;
  // Belt, duel and final-boss headers all fit within these logical bounds.
  const hud = { left: insets.left, right: width - insets.right, top: offsetY + 14 * scale, bottom: offsetY + 126 * scale };
  const intersects = (a: TouchRect, b: TouchRect) => a.left < b.right + 6 && a.right > b.left - 6
    && a.top < b.bottom + 6 && a.bottom > b.top - 6;
  const xs = [width - insets.right - buttonWidth - 28, insets.left + (usableWidth - buttonWidth) / 2, insets.left + 28, insets.left + 8, width - insets.right - buttonWidth - 8,
    ...occupied.map(r => r.right + 6), ...occupied.map(r => r.left - buttonWidth - 6)];
  const ys = [hud.bottom + 8, insets.top + 18, insets.top + 8, height - insets.bottom - buttonHeight - 8,
    ...occupied.map(r => r.bottom + 6), ...occupied.map(r => r.top - buttonHeight - 6)];
  for (const top of ys) for (const left of xs) {
    const rect = { left, top, right: left + buttonWidth, bottom: top + buttonHeight };
    if (left < insets.left + 8 || rect.right > width - insets.right - 8
      || top < insets.top + 8 || rect.bottom > height - insets.bottom - 8) continue;
    if (!intersects(rect, hud) && occupied.every(r => !intersects(rect, r))) return { left, top };
  }
  // Fully occupied or unsupported tiny layouts retain an accessible bounded button.
  return { left: Math.max(insets.left + 8, Math.min(xs[0]!, width - insets.right - buttonWidth - 8)),
    top: Math.max(insets.top + 8, Math.min(insets.top + 18, height - insets.bottom - buttonHeight - 8)) };
}

export class TouchControls {
  readonly element = document.createElement('div');
  private active = true;
  private editing = false;
  private paused = false;
  private recordsMode = false;
  private selectionMode = false;
  private endingMode = false;
  private postCombatMode = false;
  private utilityMode: 'update' | 'save' | null = null;
  private safeInsets: TouchInsets = { left: 0, right: 0, top: 0, bottom: 0 };
  private settings: TouchControlSettings = { ...DEFAULTS };
  private drag: { group: DragGroup; pointerId: number; startX: number; startY: number; baseX: number; baseY: number; prepared: boolean; before: TouchControlSettings } | null = null;
  private readonly buttonPointers = new Map<Action, Set<number>>();
  private readonly pointerPoints = new Map<number, { x: number; y: number; node: HTMLElement }>();
  private readonly directionButtons = new Map<string, HTMLButtonElement>();
  private directionPressed: HTMLButtonElement | null = null;
  private dpadPointerId: number | null = null;
  private dpadActions: readonly Action[] = [];
  private previewCallback: ((settings: TouchControlSettings) => void) | null = null;
  private commitCallback: ((settings: TouchControlSettings) => void) | null = null;

  constructor(private readonly input: InputManager) {
    this.element.className = 'touch-controls';
    this.element.innerHTML = `
      <div class="dpad" data-layout-group="stick" aria-label="movement">
        <div class="layout-handle">MOVE</div>
        <button data-directions="up left" class="dpad-up-left" aria-label="up left">↖</button>
        <button data-action="up" class="dpad-up">▲</button>
        <button data-directions="up right" class="dpad-up-right" aria-label="up right">↗</button>
        <button data-action="left" class="dpad-left">◀</button>
        <div class="dpad-center"></div>
        <button data-action="right" class="dpad-right">▶</button>
        <button data-directions="down left" class="dpad-down-left" aria-label="down left">↙</button>
        <button data-action="down" class="dpad-down">▼</button>
        <button data-directions="down right" class="dpad-down-right" aria-label="down right">↘</button>
      </div>
      <div class="fight-buttons" data-layout-group="buttons" aria-label="six button controls">
        <div class="layout-handle">MOVE</div>
        <button data-action="lp">LP</button><button data-action="mp">MP</button><button data-action="hp">HP</button>
        <button data-action="lk">LK</button><button data-action="mk">MK</button><button data-action="hk">HK</button>
      </div>
      <button class="jump-button" data-action="jump">JUMP</button>
      <button class="layout-cancel" data-action="back">CANCEL</button>
      <button class="start-button" data-action="start">START</button>`;

    for (const node of this.element.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const action = node.dataset.action as Action;
      // The captured pad pointer owns all directions, including diagonals.
      if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
        this.directionButtons.set(action, node);
        continue;
      }
      const down = (e: PointerEvent) => {
        e.preventDefault();
        if (action === 'back' && !this.editing) return;
        if ((this.paused || this.postCombatMode) && action !== 'start') return;
        if (this.editing && action !== 'start' && action !== 'back') return;
        if (this.utilityMode && !(action === 'lp' || action === 'mp' || action === 'start'
          || (action === 'hp' && this.utilityMode === 'update'))) return;
        if (this.active) {
          const pointers = this.buttonPointers.get(action) ?? new Set<number>();
          pointers.add(e.pointerId);
          this.buttonPointers.set(action, pointers);
          this.pointerPoints.set(e.pointerId, { x: e.clientX, y: e.clientY, node });
          node.classList.toggle('pressed', true);
          this.input.setTouch(action, true);
          this.vibrate(7);
        }
      };
      const up = (e: PointerEvent) => {
        e.preventDefault();
        this.finishButtonPointer(node, action, e.pointerId, e.type === 'pointerup');
      };
      node.addEventListener('pointerdown', down);
      node.addEventListener('pointermove', e => {
        const point = this.pointerPoints.get(e.pointerId);
        if (point) { point.x = e.clientX; point.y = e.clientY; }
      });
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
      node.addEventListener('pointerleave', up);
      node.addEventListener('lostpointercapture', up);
    }

    for (const node of this.element.querySelectorAll<HTMLButtonElement>('[data-directions]')) {
      this.directionButtons.set(node.dataset.directions!, node);
    }
    const dpad = this.element.querySelector<HTMLElement>('.dpad');
    dpad?.addEventListener('pointerdown', this.onDpadPointerDown, { capture: true });
    dpad?.addEventListener('pointermove', this.onDpadPointerMove, { passive: false });
    dpad?.addEventListener('pointerup', this.onDpadPointerEnd);
    dpad?.addEventListener('pointercancel', this.onDpadPointerEnd);
    dpad?.addEventListener('lostpointercapture', this.onDpadPointerEnd);

    for (const group of this.element.querySelectorAll<HTMLElement>('[data-layout-group]')) {
      group.addEventListener('pointerdown', (event) => this.beginDrag(event, group.dataset.layoutGroup as DragGroup), { capture: true });
      group.addEventListener('lostpointercapture', this.endDrag);
    }
    window.addEventListener('pointermove', this.onDragMove, { passive: false });
    window.addEventListener('pointerup', this.endDrag, { passive: false });
    window.addEventListener('pointercancel', this.endDrag, { passive: false });
    window.addEventListener('blur', () => this.releaseAll());
    window.addEventListener('pagehide', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
    window.addEventListener('resize', this.onViewportResize, { passive: true });
    this.readInsets();
    this.applySettings();
  }


  releaseAll(): void {
    for (const point of this.pointerPoints.values()) point.node.classList.toggle('pressed', false);
    this.directionPressed?.classList.toggle('pressed', false);
    this.directionPressed = null;
    this.buttonPointers.clear();
    this.pointerPoints.clear();
    this.cancelLayoutDrag();
    this.dpadPointerId = null;
    this.dpadActions = [];
    this.input.discardTouchInput();
  }

  get visible(): boolean { return this.active; }
  get endingReturnVisible(): boolean { return this.active && this.endingMode; }

  setEndingMode(endingMode: boolean): void {
    if (this.endingMode === endingMode) return;
    this.endingMode = endingMode;
    this.releaseAll();
    this.input.endTick();
    this.element.classList.toggle('ending-mode', endingMode);
    const start = this.element.querySelector<HTMLButtonElement>('.start-button');
    if (start) start.textContent = endingMode ? 'BACK TO TITLE' : 'START';
    this.applySettings();
  }

  setPostCombatMode(active: boolean): void {
    if (this.postCombatMode === active) return;
    this.postCombatMode = active;
    this.releaseAll();
    this.input.resetCommandHistory();
    this.input.endTick();
    this.element.classList.toggle('post-combat-mode', active);
    this.applySettings();
  }

  setUpdateMode(active: boolean): void {
    if (active || this.utilityMode === 'update') this.setUtilityMode(active ? 'update' : null);
  }

  setSaveToolsMode(active: boolean): void {
    if (active || this.utilityMode === 'save') this.setUtilityMode(active ? 'save' : null);
  }

  private setUtilityMode(mode: 'update' | 'save' | null): void {
    if (this.utilityMode === mode) return;
    this.utilityMode = mode;
    this.releaseAll();
    this.input.resetCommandHistory();
    this.input.endTick();
    this.element.classList.toggle('update-mode', mode === 'update');
    this.element.classList.toggle('save-tools-mode', mode === 'save');
    // HP follows the current rollback/restore action shown on the scene's card.
    for (const [action, label] of [['lp', mode === 'save' ? 'EXPORT' : 'CHECK'], ['mp', mode === 'save' ? 'IMPORT' : 'APPLY'], ['hp', 'HP'], ['start', 'BACK']] as const) {
      const button = this.element.querySelector(`[data-action="${action}"]`);
      if (button) button.textContent = mode ? label : action === 'start' ? 'START' : action.toUpperCase();
    }
    this.applySettings();
  }

  setTitleMode(active: boolean): void {
    this.element.classList.toggle('title-mode', active);
    this.setSelectionMode(active);
  }

  setSelectionMode(active: boolean): void {
    if (this.selectionMode === active) return;
    this.selectionMode = active; this.releaseAll(); this.input.resetCommandHistory(); this.input.endTick();
    this.element.classList.toggle('selection-mode', active);
    const start = this.element.querySelector('[data-action="start"]');
    const back = this.element.querySelector('[data-action="lk"]');
    if (start) start.textContent = active ? 'CONFIRM' : 'START';
    if (back) back.textContent = active ? 'BACK' : 'LK';
    this.applySettings();
  }

  setOptionsMode(active: boolean): void {
    this.element.classList.toggle('options-mode', active);
    this.setSelectionMode(active);
  }

  setRecordsMode(recordsMode: boolean): void {
    if (this.recordsMode === recordsMode) return;
    this.recordsMode = recordsMode;
    this.releaseAll();
    this.input.endTick();
    this.element.classList.toggle('records-mode', recordsMode);
    this.applySettings();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.releaseAll();
    this.element.classList.toggle('paused', paused);
    const start = this.element.querySelector<HTMLButtonElement>('.start-button');
    if (start) start.textContent = paused ? 'RESUME' : 'START';
  }

  setVisible(visible: boolean): void {
    if (!visible) this.releaseAll();
    this.active = visible;
    this.element.classList.toggle('hidden', !visible);
    if (visible) this.applySettings();
  }

  setSettings(settings: Partial<TouchControlSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings,
      stickScale: this.clamp(settings.stickScale ?? this.settings.stickScale, MIN_CONTROL_SCALE, 1.4),
      buttonScale: this.clamp(settings.buttonScale ?? this.settings.buttonScale, MIN_CONTROL_SCALE, 1.4),
      opacity: this.clamp(settings.opacity ?? this.settings.opacity, .3, 1),
      stickX: this.clamp(settings.stickX ?? this.settings.stickX, 0, 2048),
      stickY: this.clamp(settings.stickY ?? this.settings.stickY, 0, 1024),
      buttonsX: this.clamp(settings.buttonsX ?? this.settings.buttonsX, 0, 2048),
      buttonsY: this.clamp(settings.buttonsY ?? this.settings.buttonsY, 0, 1024),
    };
    this.readInsets();
    this.applySettings();
  }

  getSettings(): TouchControlSettings { return { ...this.settings }; }

  resetSettings(): TouchControlSettings {
    this.settings = { ...DEFAULTS, vibrationEnabled: this.settings.vibrationEnabled };
    this.applySettings();
    return this.getSettings();
  }

  cancelLayoutDrag(): boolean {
    const drag = this.drag;
    this.drag = null;
    if (!drag?.prepared) return false;
    this.settings = { ...drag.before };
    this.applySettings();
    this.previewCallback?.(this.getSettings());
    return true;
  }

  setEditMode(
    editing: boolean,
    onPreview?: (settings: TouchControlSettings) => void,
    onCommit?: (settings: TouchControlSettings) => void,
  ): void {
    const changed = this.editing !== editing;
    this.releaseAll();
    this.editing = editing;
    this.previewCallback = onPreview ?? null;
    this.commitCallback = onCommit ?? null;
    this.element.classList.toggle('editing', editing);
    if (changed) {
      const start = this.element.querySelector<HTMLButtonElement>('.start-button');
      if (start) start.textContent = editing ? 'DONE' : this.selectionMode ? 'CONFIRM' : 'START';
    }
  }

  private onDpadPointerDown = (event: PointerEvent): void => {
    if (this.editing || this.paused || this.postCombatMode || this.utilityMode || !this.active || this.dpadPointerId !== null) return;
    event.preventDefault();
    this.dpadPointerId = event.pointerId;
    this.pointerPoints.set(event.pointerId, { x: event.clientX, y: event.clientY, node: event.currentTarget as HTMLElement });
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.setDpadActions(this.dpadActionsAt(event.clientX, event.clientY));
  };

  private onDpadPointerMove = (event: PointerEvent): void => {
    if (this.editing || this.paused || event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    const point = this.pointerPoints.get(event.pointerId);
    if (point) { point.x = event.clientX; point.y = event.clientY; }
    this.setDpadActions(this.dpadActionsAt(event.clientX, event.clientY), event.getCoalescedEvents?.());
  };

  private onDpadPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    const completed = event.type === 'pointerup';
    const point = this.pointerPoints.get(event.pointerId);
    const releaseSample = completed && event.pointerType === 'touch' && !this.selectionMode && !this.recordsMode
      && point && (point.x !== event.clientX || point.y !== event.clientY) ? event : undefined;
    this.finishDpadPointer(event.pointerId, completed, releaseSample);
  };

  private finishButtonPointer(node: HTMLElement, action: Action, pointerId: number, completed: boolean): void {
    const pointers = this.buttonPointers.get(action);
    if (!pointers?.delete(pointerId)) return;
    if (completed) this.input.completeTouchPress(action);
    this.pointerPoints.delete(pointerId);
    if (pointers.size > 0) return;
    this.buttonPointers.delete(action);
    node.classList.toggle('pressed', false);
    if (completed) this.input.setTouch(action, false);
    else this.input.cancelTouch(action);
  }

  private finishDpadPointer(pointerId: number, completed: boolean, releaseSample?: PointerEvent): void {
    // The release can supply the last direction without leaving that direction held.
    this.setDpadActions([], releaseSample ? [releaseSample] : undefined);
    if (completed) {
      for (const action of DPAD_ACTIONS) this.input.completeTouchPress(action);
    } else {
      // Discard pending presses from directions visited anywhere in the canceled drag.
      for (const action of DPAD_ACTIONS) this.input.cancelTouch(action);
      this.input.resetCommandHistory();
    }
    this.pointerPoints.delete(pointerId);
    this.dpadPointerId = null;
  }

  private dpadActionsAt(clientX: number, clientY: number): readonly Action[] {
    const hit = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.dpad [data-action], .dpad [data-directions]');
    if (hit && this.element.contains(hit)) {
      return (hit.dataset.directions ?? hit.dataset.action ?? '').split(' ').filter((action): action is Action =>
        action === 'left' || action === 'right' || action === 'up' || action === 'down');
    }
    if (this.recordsMode || this.selectionMode) return [];
    // The small CSS gutters still belong to a direction cell. Only the center
    // or leaving the pad is neutral, so a slow diagonal drag keeps shared keys.
    const bounds = this.element.querySelector<HTMLElement>('.dpad')?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0 || clientX < bounds.left || clientX >= bounds.right || clientY < bounds.top || clientY >= bounds.bottom) return [];
    const col = Math.floor((clientX - bounds.left) * 3 / bounds.width);
    const row = Math.floor((clientY - bounds.top) * 3 / bounds.height);
    const actions: Action[] = [];
    if (row !== 1) actions.push(row === 0 ? 'up' : 'down');
    if (col !== 1) actions.push(col === 0 ? 'left' : 'right');
    return actions;
  }

  private setDpadActions(next: readonly Action[], samples?: readonly PointerEvent[]): void {
    // A fast swipe may cross a diagonal between dispatched pointermove events.
    // Feed the samples only to input history; show and vibrate for the final direction.
    for (const sample of samples ?? []) {
      this.input.setTouchDirections(this.dpadActionsAt(sample.clientX, sample.clientY));
    }
    const unchanged = next.length === this.dpadActions.length && next.every(action => this.dpadActions.includes(action));
    if (samples?.length || !unchanged) this.input.setTouchDirections(next);
    if (unchanged) return;
    this.dpadActions = next;
    this.directionPressed?.classList.toggle('pressed', false);
    const key = DPAD_ACTIONS.filter(action => next.includes(action)).join(' ');
    this.directionPressed = this.directionButtons.get(key) ?? null;
    this.directionPressed?.classList.toggle('pressed', true);
    if (next.length > 0) this.vibrate(3);
  }

  private beginDrag(event: PointerEvent, group: DragGroup): void {
    if (!this.editing) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.drag) return;
    let baseX = group === 'stick' ? this.settings.stickX : this.settings.buttonsX;
    let baseY = group === 'stick' ? this.settings.stickY : this.settings.buttonsY;
    const node = event.currentTarget as HTMLElement | null;
    const rect = node?.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0 && typeof getComputedStyle === 'function') {
      const style = getComputedStyle(node!);
      const inset = (side: string) => Math.max(0, Number.parseFloat(style.getPropertyValue('--safe-' + side)) || 0);
      baseX = group === 'stick' ? rect.left - inset('left') : window.innerWidth - rect.right - inset('right');
      baseY = window.innerHeight - rect.bottom - inset('bottom');
    }
    this.drag = { group, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX, baseY, prepared: false, before: this.getSettings() };
    node?.setPointerCapture?.(event.pointerId);
  }

  private onDragMove = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - this.drag.startX;
    const dy = event.clientY - this.drag.startY;
    if (!this.drag.prepared) {
      if (dx === 0 && dy === 0) return;
      const layout = resolveTouchLayout(this.settings, typeof window === 'undefined' ? 1280 : window.innerWidth || 1280,
        typeof window === 'undefined' ? 720 : window.innerHeight || 720, this.safeInsets);
      this.settings.stickX = layout.stickX;
      this.settings.stickY = layout.stickY;
      this.settings.buttonsX = layout.buttonsX;
      this.settings.buttonsY = layout.buttonsY;
      this.drag.prepared = true;
    }
    if (this.drag.group === 'stick') {
      this.settings.stickX = this.clamp(this.drag.baseX + dx, 8, Math.max(this.layoutMaxX(), this.drag.baseX));
      this.settings.stickY = this.clamp(this.drag.baseY - dy, 8, Math.max(this.layoutMaxY(), this.drag.baseY));
    } else {
      this.settings.buttonsX = this.clamp(this.drag.baseX - dx, 8, Math.max(this.layoutMaxX(), this.drag.baseX));
      this.settings.buttonsY = this.clamp(this.drag.baseY - dy, 8, Math.max(this.layoutMaxY(), this.drag.baseY));
    }
    this.applySettings();
    this.previewCallback?.(this.getSettings());
  };

  private endDrag = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    if (event.type !== 'pointerup') { this.cancelLayoutDrag(); return; }
    this.drag = null;
    this.commitCallback?.(this.getSettings());
  };

  private onViewportResize = (): void => {
    this.readInsets();
    if (!this.cancelLayoutDrag()) this.applySettings();
    // Keep captured gestures that still address the same control after relayout.
    for (const [id, point] of this.pointerPoints) {
      const bounds = point.node?.getBoundingClientRect?.();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;
      const outside = point.x < bounds.left || point.x >= bounds.right || point.y < bounds.top || point.y >= bounds.bottom;
      const isDpad = id === this.dpadPointerId;
      const next = isDpad && !outside ? this.dpadActionsAt(point.x, point.y) : null;
      const changedDirection = next && (next.length !== this.dpadActions.length || next.some(action => !this.dpadActions.includes(action)));
      if (!outside && !changedDirection) continue;
      if (isDpad) this.finishDpadPointer(id, false);
      else if (point.node.dataset.action) this.finishButtonPointer(point.node, point.node.dataset.action as Action, id, false);
    }
  };

  private readInsets(): void {
    if (typeof getComputedStyle !== 'function' || typeof document === 'undefined' || !document.documentElement) return;
    const style = getComputedStyle(document.documentElement);
    const read = (side: string) => Math.max(0, Number.parseFloat(style.getPropertyValue('--safe-' + side)) || 0);
    this.safeInsets = { left: read('left'), right: read('right'), top: read('top'), bottom: read('bottom') };
  }

  private applySettings(): void {
    const layout = resolveTouchLayout(this.settings, typeof window === 'undefined' ? 1280 : window.innerWidth || 1280,
      typeof window === 'undefined' ? 720 : window.innerHeight || 720, this.safeInsets);
    this.element.style.setProperty('--render-stick-scale', String(layout.stickScale));
    this.element.style.setProperty('--render-button-scale', String(layout.buttonScale));
    this.element.style.setProperty('--layout-stick-x', layout.stickX + 'px');
    this.element.style.setProperty('--layout-stick-y', layout.stickY + 'px');
    this.element.style.setProperty('--layout-buttons-x', layout.buttonsX + 'px');
    this.element.style.setProperty('--layout-buttons-y', layout.buttonsY + 'px');
    this.element.style.setProperty('--stick-scale', String(this.settings.stickScale));
    this.element.style.setProperty('--button-scale', String(this.settings.buttonScale));
    this.element.style.setProperty('--control-opacity', String(this.settings.opacity));
    this.element.style.setProperty('--stick-x', `${this.settings.stickX}px`);
    this.element.style.setProperty('--stick-y', `${this.settings.stickY}px`);
    this.element.style.setProperty('--buttons-x', `${this.settings.buttonsX}px`);
    this.element.style.setProperty('--buttons-y', `${this.settings.buttonsY}px`);
    const scaledButtonGroupWidth = layout.jumpOffsetX - 10;
    const scaledJumpInset = layout.jumpOffsetY;
    this.element.style.setProperty('--jump-x', `${this.settings.buttonsX + scaledButtonGroupWidth + 10}px`);
    this.element.style.setProperty('--jump-y', `${this.settings.buttonsY + scaledJumpInset}px`);
    const start = this.element.querySelector<HTMLButtonElement>('.start-button');
    if (start) {
      const bounds = start.getBoundingClientRect?.();
      const occupied = Array.from(this.element.querySelectorAll<HTMLButtonElement>('button'))
        .filter(node => node !== start).map(node => node.getBoundingClientRect?.())
        .filter((rect): rect is DOMRect => !!rect && rect.width > 0 && rect.height > 0);
      const position = resolveTouchStartPosition(typeof window === 'undefined' ? 1280 : window.innerWidth || 1280,
        typeof window === 'undefined' ? 720 : window.innerHeight || 720, this.safeInsets, occupied, bounds?.width || 86, bounds?.height || 36);
      start.style.left = position.left + 'px';
      start.style.top = position.top + 'px';
      start.style.right = 'auto';
    }
  }

  private layoutMaxX(): number {
    return typeof window === 'undefined' ? 320 : Math.max(260, window.innerWidth * .38);
  }

  private layoutMaxY(): number {
    return typeof window === 'undefined' ? 220 : Math.max(180, window.innerHeight * .3);
  }

  private vibrate(ms: number): void {
    if (!this.settings.vibrationEnabled || !('vibrate' in navigator)) return;
    navigator.vibrate(ms);
  }

  private clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
}
