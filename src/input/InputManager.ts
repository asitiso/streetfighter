export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'lp' | 'mp' | 'hp' | 'lk' | 'mk' | 'hk' | 'confirm' | 'back' | 'start';

type ActionState = {
  held: boolean;
  pressed: boolean;
  released: boolean;
  keyboardHeld: boolean;
  touchHeld: boolean;
  touchPressed: boolean;
  touchReleased: boolean;
  touchAttackDirections?: readonly Action[];
  touchAttackOrder?: number;
  touchAttackDirectionSample?: number;
  completedTouchAttackDirections?: readonly Action[];
  gamepadHeld: boolean;
};

const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'confirm', 'back', 'start'];
const DIRECTIONS = ['left', 'right', 'up', 'down'] as const;
const ATTACK_BUTTONS: readonly Action[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
type AttackChord = readonly [Action, Action];
const ATTACK_CHORDS: readonly AttackChord[] = [['lp', 'lk'], ['lp', 'mp'], ['lp', 'hp'], ['mp', 'hp']];

export type KeyBinding = readonly [code: string, action: Action];

/** Single-player keyboard layout: arrows or WASD, J K L punches, U I O kicks. */
export const DEFAULT_KEY_BINDINGS: readonly KeyBinding[] = [
  ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
  ['ArrowUp', 'up'], ['KeyW', 'up'], ['ArrowDown', 'down'], ['KeyS', 'down'],
  ['KeyJ', 'lp'], ['KeyK', 'mp'], ['KeyL', 'hp'], ['KeyU', 'lk'], ['KeyI', 'mk'], ['KeyO', 'hk'],
  ['Space', 'jump'], ['Enter', 'confirm'], ['Escape', 'back'], ['Backspace', 'back'], ['KeyP', 'start'], ['Pause', 'start'],
];

/** VERSUS P1: left side of the keyboard (arrows go to P2). */
export const P1_VERSUS_KEY_BINDINGS: readonly KeyBinding[] = [
  ['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'up'], ['KeyS', 'down'],
  ['KeyJ', 'lp'], ['KeyK', 'mp'], ['KeyL', 'hp'], ['KeyU', 'lk'], ['KeyI', 'mk'], ['KeyO', 'hk'],
  ['Space', 'jump'], ['Enter', 'confirm'], ['Escape', 'back'], ['Backspace', 'back'], ['KeyP', 'start'], ['Pause', 'start'],
];

/** VERSUS P2: arrows + numpad (7 8 9 kicks / 4 5 6 punches), or the Insert/Delete block for keyboards without a numpad. */
export const P2_VERSUS_KEY_BINDINGS: readonly KeyBinding[] = [
  ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down'],
  ['Numpad4', 'lp'], ['Numpad5', 'mp'], ['Numpad6', 'hp'], ['Numpad7', 'lk'], ['Numpad8', 'mk'], ['Numpad9', 'hk'],
  ['Delete', 'lp'], ['End', 'mp'], ['PageDown', 'hp'], ['Insert', 'lk'], ['Home', 'mk'], ['PageUp', 'hk'],
  ['Numpad0', 'jump'], ['NumpadEnter', 'confirm'], ['NumpadDecimal', 'back'], ['NumpadAdd', 'start'], ['Backslash', 'start'],
];

export interface InputManagerOptions { bindings?: readonly KeyBinding[]; gamepadSlot?: number }

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP',
  NumpadEnter: 'NUM ENT', NumpadDecimal: 'NUM .', NumpadAdd: 'NUM +', Backslash: '\\', Delete: 'DEL', End: 'END', PageDown: 'PGDN',
  Insert: 'INS', Home: 'HOME', PageUp: 'PGUP', Pause: 'PAUSE',
};

/** Short display label for a KeyboardEvent.code ("KeyJ" -> "J", "Numpad4" -> "NUM 4"). */
export function keyLabel(code: string): string {
  if (KEY_LABELS[code]) return KEY_LABELS[code]!;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  if (code.startsWith('Digit')) return code.slice(5);
  return code.toUpperCase();
}

/** Every key bound to an action, as display labels ("J", "NUM 4 / DEL"). */
export function keysForAction(bindings: readonly KeyBinding[], action: Action): string[] {
  return bindings.filter(([, a]) => a === action).map(([code]) => keyLabel(code));
}

/** The light punch and kick chord has the same ownership in every combat mode. */
export function throwChordPressed(input: InputManager): boolean {
  const lightChord = (input.pressed('lp') && (input.held('lk') || input.pressed('lk'))) || (input.pressed('lk') && input.held('lp'));
  return lightChord && input.allowsAttackChord?.('lp', 'lk') !== false;
}

export class InputManager {
  private states = new Map<Action, ActionState>(ACTIONS.map((a) => [a, {
    held: false, pressed: false, released: false, keyboardHeld: false, touchHeld: false, touchPressed: false, touchReleased: false, gamepadHeld: false,
  }]));

  // Source edges let an aborted touch discard only its own pending press.
  private readonly physicalPresses = new Set<Action>();
  private readonly completedTouchPresses = new Set<Action>();
  private readonly completedTouchEdges = new Set<Action>();
  private readonly touchChordOverlaps = new Map<AttackChord, Set<Action>>();
  private touchAttackSequence = 0;

  private historyVersion = 0;

  private readonly keyboardKeys = new Set<string>();
  private readonly directionHistory: Set<Action>[] = [];
  // Count samples even when the bounded history drops its oldest snapshot.
  private directionSampleCount = 0;

  private keyMap = new Map<string, Action>(DEFAULT_KEY_BINDINGS);
  /** Which connected gamepad (in index order) this input owns: 0 = first pad (P1), 1 = second pad (P2). */
  private readonly gamepadSlot: number;

  constructor(options: InputManagerOptions = {}) {
    if (options.bindings) this.keyMap = new Map(options.bindings);
    this.gamepadSlot = Math.max(0, Math.floor(options.gamepadSlot ?? 0));
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pagehide', this.onBlur);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  get bindings(): readonly KeyBinding[] { return [...this.keyMap.entries()]; }
  get padSlot(): number { return this.gamepadSlot; }

  /** Swap the keyboard layout (VERSUS splits the keyboard); keys held under the old layout are released. */
  setKeyBindings(bindings: readonly KeyBinding[]): void {
    this.keyMap = new Map(bindings);
    this.onBlur();
  }

  /** Connected gamepads (index order) for the controls screen. */
  static connectedGamepads(): Gamepad[] {
    try { return Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => !!pad && pad.connected !== false); }
    catch { return []; }
  }

  prepareTick(): void {
    this.pollGamepad();
  }

  endTick(): void {
    this.touchChordOverlaps.clear();
    this.touchAttackSequence = 0;
    this.physicalPresses.clear();
    this.completedTouchPresses.clear();
    this.completedTouchEdges.clear();
    this.directionHistory.length = 0;
    this.directionSampleCount = 0;
    for (const state of this.states.values()) {
      state.pressed = false;
      state.released = false;
      state.touchPressed = false;
      state.touchReleased = false;
      state.touchAttackDirections = undefined;
      state.touchAttackOrder = undefined;
      state.touchAttackDirectionSample = undefined;
      state.completedTouchAttackDirections = undefined;
    }
  }

  setTouch(action: Action, held: boolean): void {
    const state = this.states.get(action);
    if (!state || state.touchHeld === held) return;
    const wasHeld = state.held;
    if (!held) this.completeTouchPress(action);
    state.touchHeld = held;
    if (held) {
      state.touchPressed = true;
      if (ATTACK_BUTTONS.includes(action)) {
        for (const pair of ATTACK_CHORDS) {
          if (pair.includes(action) && pair.every(button => this.touchHeld(button)) && !this.touchChordOverlaps.has(pair)) {
            this.touchChordOverlaps.set(pair, new Set());
          }
        }
        if (!wasHeld && !state.pressed) {
          state.touchAttackOrder = this.touchAttackSequence++;
          state.touchAttackDirectionSample = this.directionSampleCount;
          state.touchAttackDirections = DIRECTIONS.filter(direction => this.held(direction));
        }
      }
    } else state.touchReleased = true;
    this.reconcile(state);
    if (state.held !== wasHeld) this.recordDirection(action);
  }

  completeTouchPress(action: Action): void {
    const state = this.states.get(action);
    // A released finger still counts for a chord it overlapped before release.
    if (state?.touchHeld) {
      for (const [pair, completed] of this.touchChordOverlaps) {
        if (pair.includes(action)) completed.add(action);
      }
    }
    if (state?.touchPressed) {
      this.completedTouchPresses.add(action);
      if (state.pressed) {
        this.completedTouchEdges.add(action);
        state.completedTouchAttackDirections = state.touchAttackDirections;
      }
    }
  }

  cancelTouch(action: Action): void {
    const state = this.states.get(action);
    if (!state) return;
    const wasHeld = state.held;
    const pendingTouch = state.touchPressed;
    if (state.touchHeld) {
      state.touchReleased = true;
      for (const [pair, completed] of this.touchChordOverlaps) {
        if (pair.includes(action) && !completed.has(action)) this.touchChordOverlaps.delete(pair);
      }
    }
    state.touchHeld = false;
    state.touchPressed = this.completedTouchPresses.has(action);
    if (!this.completedTouchEdges.has(action)) {
      state.touchAttackOrder = undefined;
      state.touchAttackDirectionSample = undefined;
    }
    state.touchAttackDirections = state.completedTouchAttackDirections;
    this.reconcile(state);
    if (pendingTouch) state.pressed &&= this.completedTouchEdges.has(action) || this.physicalPresses.has(action);
    if (state.held !== wasHeld) this.recordDirection(action);
  }

  discardTouchInput(): void {
    this.touchChordOverlaps.clear();
    const pendingDirection = DIRECTIONS.some(action => this.touchPressed(action));
    this.completedTouchPresses.clear();
    this.completedTouchEdges.clear();
    this.setTouchDirections([]);
    for (const action of ACTIONS) {
      this.states.get(action)!.completedTouchAttackDirections = undefined;
      this.cancelTouch(action);
    }
    if (pendingDirection) this.resetCommandHistory();
  }

  // A pad drag changes one direction set atomically, without intermediate keys.
  setTouchDirections(directions: readonly Action[]): void {
    const previousDirections = this.directionHistory.length === 0
      ? new Set<Action>(DIRECTIONS.filter(action => this.held(action))) : undefined;
    let changed = false;
    for (const action of DIRECTIONS) {
      const state = this.states.get(action)!;
      const held = directions.includes(action);
      if (state.touchHeld === held) continue;
      const wasHeld = state.held;
      state.touchHeld = held;
      if (held) state.touchPressed = true;
      else state.touchReleased = true;
      this.reconcile(state);
      changed ||= state.held !== wasHeld;
    }
    if (changed) this.recordDirection(undefined, previousDirections);
  }

  // Scene boundaries invalidate command sequences without releasing held devices.
  resetCommandHistory(): void {
    this.historyVersion += 1;
    this.directionHistory.length = 0;
    for (const state of this.states.values()) {
      state.touchAttackDirections = undefined;
      state.completedTouchAttackDirections = undefined;
    }
  }

  get historyEpoch(): number { return this.historyVersion; }

  directionChanges(): readonly ReadonlySet<Action>[] { return this.directionHistory; }

  // Compatibility for input consumers that previously read keyboard-only history.
  keyboardDirectionChanges(): readonly ReadonlySet<Action>[] { return this.directionChanges(); }

  held(action: Action): boolean { return this.states.get(action)?.held ?? false; }
  pressed(action: Action): boolean { return this.states.get(action)?.pressed ?? false; }
  released(action: Action): boolean { return this.states.get(action)?.released ?? false; }
  touchHeld(action: Action): boolean { return this.states.get(action)?.touchHeld ?? false; }
  touchPressed(action: Action): boolean { return this.states.get(action)?.touchPressed ?? false; }
  touchReleased(action: Action): boolean { return this.states.get(action)?.touchReleased ?? false; }

  firstTouchAttack<T extends Action>(buttons: readonly T[]): T | undefined {
    let first: T | undefined;
    let earliest = Infinity;
    for (const button of buttons) {
      if (this.physicalPresses.has(button)) return undefined;
      const state = this.states.get(button)!;
      if (state.pressed && state.touchAttackOrder !== undefined && state.touchAttackOrder < earliest) {
        first = button;
        earliest = state.touchAttackOrder;
      }
    }
    return first;
  }

  directionSamplesAfterAttack(buttons: readonly Action[]): number | undefined {
    let latestSample = -1;
    for (const button of buttons) {
      if (!this.pressed(button)) continue;
      const sample = this.states.get(button)?.touchAttackDirectionSample;
      if (this.physicalPresses.has(button) || sample === undefined) return undefined;
      latestSample = Math.max(latestSample, sample);
    }
    return latestSample < 0 ? undefined : this.directionSampleCount - latestSample;
  }

  allowsAttackChord(first: Action, second: Action): boolean {
    // Keyboard and gamepad retain their existing per-tick chord behavior.
    if ([first, second].some(action => {
      const state = this.states.get(action)!;
      return state.keyboardHeld || state.gamepadHeld || this.physicalPresses.has(action);
    })) return true;
    for (const pair of this.touchChordOverlaps.keys()) {
      if (pair.includes(first) && pair.includes(second)) return true;
    }
    return false;
  }

  touchDirectionsAtAttack(action: Action): readonly Action[] | undefined {
    return this.physicalPresses.has(action) ? undefined : this.states.get(action)?.touchAttackDirections;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pagehide', this.onBlur);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) this.onBlur();
  };

  private onBlur = (): void => {
    this.touchChordOverlaps.clear();
    this.resetCommandHistory();
    this.keyboardKeys.clear();
    this.physicalPresses.clear();
    this.completedTouchPresses.clear();
    this.completedTouchEdges.clear();
    for (const state of this.states.values()) {
      state.keyboardHeld = false;
      this.reconcile(state);
      state.pressed = false;
      state.touchPressed = false;
      state.touchAttackOrder = undefined;
      state.touchAttackDirectionSample = undefined;
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const action = this.keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    // Focus loss clears keyboard ownership; OS repeat must not recreate a press.
    if (event.repeat) return;
    const state = this.states.get(action)!;
    if (this.keyboardKeys.has(event.code)) return;
    const wasHeld = state.held;
    const freshPhysical = !state.keyboardHeld;
    this.keyboardKeys.add(event.code);
    state.keyboardHeld = true;
    this.reconcile(state);
    if (freshPhysical && state.pressed) this.physicalPresses.add(action);
    if (state.held !== wasHeld) this.recordDirection(action);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const action = this.keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    const state = this.states.get(action)!;
    const wasHeld = state.held;
    this.keyboardKeys.delete(event.code);
    state.keyboardHeld = [...this.keyboardKeys].some((code) => this.keyMap.get(code) === action);
    this.reconcile(state);
    if (state.held !== wasHeld) this.recordDirection(action);
  };

  private recordDirection(action?: Action, previousDirections?: ReadonlySet<Action>): void {
    if (action !== undefined && action !== 'left' && action !== 'right' && action !== 'up' && action !== 'down') return;
    const held = new Set<Action>();
    for (const direction of ['left', 'right', 'up', 'down'] as const) {
      if (this.held(direction)) held.add(direction);
    }
    if (this.directionHistory.length === 0) {
      // The queue may begin while a direction is already held (new scene/buffer).
      // Preserve its real pre-change state instead of assuming a neutral start.
      const before = new Set(previousDirections ?? held);
      if (action !== undefined) {
        if (held.has(action)) before.delete(action);
        else before.add(action);
      }
      this.directionHistory.push(before);
      this.directionSampleCount += 1;
    }
    this.directionHistory.push(held);
    this.directionSampleCount += 1;
    if (this.directionHistory.length > 32) this.directionHistory.shift();
  }

  private pollGamepad(): void {
    let pad: Gamepad | null | undefined;
    try {
      pad = Array.from(navigator.getGamepads?.() ?? [])
        .filter((candidate) => candidate && candidate.connected !== false)[this.gamepadSlot];
    } catch {
      // Browser policy or device failures must not stop keyboard/touch polling.
    }
    if (!pad) {
      for (const action of ACTIONS) {
        const state = this.states.get(action)!;
        if (state.gamepadHeld) {
          state.gamepadHeld = false;
          this.reconcile(state);
        }
      }
      return;
    }
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;
    this.setGamepad('left', axisX < -0.45 || (pad.buttons[14]?.pressed ?? false));
    this.setGamepad('right', axisX > 0.45 || (pad.buttons[15]?.pressed ?? false));
    this.setGamepad('up', axisY < -0.45 || (pad.buttons[12]?.pressed ?? false));
    this.setGamepad('down', axisY > 0.45 || (pad.buttons[13]?.pressed ?? false));
    this.setGamepad('jump', pad.buttons[8]?.pressed ?? false);
    this.setGamepad('back', pad.buttons[8]?.pressed ?? false);
    this.setGamepad('lp', pad.buttons[0]?.pressed ?? false);
    this.setGamepad('mp', pad.buttons[1]?.pressed ?? false);
    this.setGamepad('hp', pad.buttons[3]?.pressed ?? false);
    this.setGamepad('lk', pad.buttons[2]?.pressed ?? false);
    this.setGamepad('mk', pad.buttons[4]?.pressed ?? false);
    this.setGamepad('hk', pad.buttons[5]?.pressed ?? false);
    this.setGamepad('confirm', pad.buttons[9]?.pressed ?? false);
    this.setGamepad('start', pad.buttons[9]?.pressed ?? false);
  }

  private setGamepad(action: Action, held: boolean): void {
    const state = this.states.get(action)!;
    if (state.gamepadHeld === held) return;
    state.gamepadHeld = held;
    this.reconcile(state);
    if (held && state.pressed) this.physicalPresses.add(action);
  }

  private reconcile(state: ActionState): void {
    const nextHeld = state.keyboardHeld || state.touchHeld || state.gamepadHeld;
    if (nextHeld === state.held) return;
    state.held = nextHeld;
    state.pressed ||= nextHeld;
    state.released ||= !nextHeld;
  }
}
