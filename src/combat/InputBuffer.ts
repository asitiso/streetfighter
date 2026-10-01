import type { Action, InputManager } from '../input/InputManager.js';

export interface BufferedInput {
  tick: number;
  held: Set<Action>;
  pressed: Set<Action>;
}

const WATCHED: Action[] = ['left', 'right', 'up', 'down', 'jump', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'start'];

export class InputBuffer {
  private frames: BufferedInput[] = [];

  capture(input: InputManager, tick: number): void {
    const held = new Set<Action>();
    const pressed = new Set<Action>();
    for (const action of WATCHED) {
      if (input.held(action)) held.add(action);
      if (input.pressed(action)) pressed.add(action);
    }
    this.frames.push({ tick, held, pressed });
    if (this.frames.length > 30) this.frames.shift();
  }

  latest(): BufferedInput | undefined {
    return this.frames[this.frames.length - 1];
  }

  pressedWithin(action: Action, frames: number): boolean {
    const recent = this.frames.slice(-frames);
    return recent.some((frame) => frame.pressed.has(action));
  }

  doubleTap(action: Action, within = 11): boolean {
    const recent = this.frames.slice(-within);
    let presses = 0;
    for (let i = recent.length - 1; i >= 0; i -= 1) {
      if (recent[i]?.pressed.has(action)) {
        presses += 1;
        if (presses >= 2) return true;
      }
    }
    return false;
  }

  motion(tokens: readonly string[], facing: 1 | -1, within = 16): boolean {
    const recent = this.frames.slice(-within);
    let tokenIndex = tokens.length - 1;
    let previous = '';
    for (let i = recent.length - 1; i >= 0 && tokenIndex >= 0; i -= 1) {
      const token = this.directionToken(recent[i]!, facing);
      if (!token || token === previous) continue;
      previous = token;
      if (token === tokens[tokenIndex]) tokenIndex -= 1;
    }
    return tokenIndex < 0;
  }

  private directionToken(frame: BufferedInput, facing: 1 | -1): string {
    const vertical = frame.held.has('down') ? 'D' : frame.held.has('up') ? 'U' : '';
    const worldForward = facing === 1 ? 'right' : 'left';
    const worldBack = facing === 1 ? 'left' : 'right';
    const horizontal = frame.held.has(worldForward) ? 'F' : frame.held.has(worldBack) ? 'B' : '';
    if (vertical === 'D' && horizontal === 'F') return 'DF';
    if (vertical === 'D' && horizontal === 'B') return 'DB';
    if (vertical === 'U' && horizontal === 'F') return 'UF';
    if (vertical === 'U' && horizontal === 'B') return 'UB';
    return vertical || horizontal || 'N';
  }
}
