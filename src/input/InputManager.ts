export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'lp' | 'mp' | 'hp' | 'lk' | 'mk' | 'hk' | 'confirm' | 'back' | 'start';

type ActionState = {
  held: boolean;
  pressed: boolean;
  released: boolean;
  keyboardHeld: boolean;
  touchHeld: boolean;
  touchPressed: boolean;
  touchReleased: boolean;
  gamepadHeld: boolean;
};

const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'confirm', 'back', 'start'];

export class InputManager {
  private states = new Map<Action, ActionState>(ACTIONS.map((a) => [a, {
    held: false, pressed: false, released: false, keyboardHeld: false, touchHeld: false, touchPressed: false, touchReleased: false, gamepadHeld: false,
  }]));

  private keyMap = new Map<string, Action>([
    ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
    ['ArrowUp', 'up'], ['KeyW', 'up'], ['ArrowDown', 'down'], ['KeyS', 'down'],
    ['KeyJ', 'lp'], ['KeyK', 'mp'], ['KeyL', 'hp'], ['KeyU', 'lk'], ['KeyI', 'mk'], ['KeyO', 'hk'],
    ['Space', 'jump'], ['Enter', 'confirm'], ['Escape', 'back'], ['Backspace', 'back'], ['KeyP', 'start'], ['Pause', 'start'],
  ]);

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
  }

  prepareTick(): void {
    this.pollGamepad();
  }

  endTick(): void {
    for (const state of this.states.values()) {
      state.pressed = false;
      state.released = false;
      state.touchPressed = false;
      state.touchReleased = false;
    }
  }

  setTouch(action: Action, held: boolean): void {
    const state = this.states.get(action);
    if (!state || state.touchHeld === held) return;
    state.touchHeld = held;
    if (held) state.touchPressed = true;
    else state.touchReleased = true;
    this.reconcile(state);
  }

  held(action: Action): boolean { return this.states.get(action)?.held ?? false; }
  pressed(action: Action): boolean { return this.states.get(action)?.pressed ?? false; }
  released(action: Action): boolean { return this.states.get(action)?.released ?? false; }
  touchHeld(action: Action): boolean { return this.states.get(action)?.touchHeld ?? false; }
  touchPressed(action: Action): boolean { return this.states.get(action)?.touchPressed ?? false; }
  touchReleased(action: Action): boolean { return this.states.get(action)?.touchReleased ?? false; }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const action = this.keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    const state = this.states.get(action)!;
    if (state.keyboardHeld) return;
    state.keyboardHeld = true;
    this.reconcile(state);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const action = this.keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    const state = this.states.get(action)!;
    state.keyboardHeld = false;
    this.reconcile(state);
  };

  private pollGamepad(): void {
    const pad = navigator.getGamepads?.()[0];
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
    this.setGamepad('lp', pad.buttons[0]?.pressed ?? false);
    this.setGamepad('mp', pad.buttons[1]?.pressed ?? false);
    this.setGamepad('hp', pad.buttons[3]?.pressed ?? false);
    this.setGamepad('lk', pad.buttons[2]?.pressed ?? false);
    this.setGamepad('mk', pad.buttons[4]?.pressed ?? false);
    this.setGamepad('hk', pad.buttons[5]?.pressed ?? false);
    this.setGamepad('start', pad.buttons[9]?.pressed ?? false);
  }

  private setGamepad(action: Action, held: boolean): void {
    const state = this.states.get(action)!;
    if (state.gamepadHeld === held) return;
    state.gamepadHeld = held;
    this.reconcile(state);
  }

  private reconcile(state: ActionState): void {
    const nextHeld = state.keyboardHeld || state.touchHeld || state.gamepadHeld;
    if (nextHeld === state.held) return;
    state.held = nextHeld;
    state.pressed ||= nextHeld;
    state.released ||= !nextHeld;
  }
}
