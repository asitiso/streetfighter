import type { Action, InputManager } from '../input/InputManager.js';

export interface BufferedInput {
  tick: number;
  held: Set<Action>;
  pressed: Set<Action>;
}

const WATCHED: Action[] = ['left', 'right', 'up', 'down', 'jump', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'start'];

export class InputBuffer {
  private historyEpoch?: number;
  private frames: BufferedInput[] = [];
  private directionFrames: Array<Pick<BufferedInput, 'tick' | 'held'>> = [];

  capture(input: InputManager, tick: number): void {
    // Backgrounding stops combat ticks; elapsed-tick expiry cannot clear old commands.
    // Each fighter observes the reset independently without consuming shared input.
    if (input.historyEpoch !== this.historyEpoch) {
      this.frames = [];
      this.directionFrames = [];
      this.historyEpoch = input.historyEpoch;
    }
    const held = new Set<Action>();
    const pressed = new Set<Action>();
    for (const action of WATCHED) {
      if (input.held(action)) held.add(action);
      if (input.pressed(action)) pressed.add(action);
    }
    this.frames.push({ tick, held, pressed });
    if (this.frames.length > 30) this.frames.shift();
    // Keep sub-frame keyboard/touch directions separate from button presses so one
    // direction press cannot become multiple taps in the existing dash buffer.
    for (const direction of input.directionChanges?.() ?? input.keyboardDirectionChanges?.() ?? []) {
      this.directionFrames.push({ tick, held: new Set(direction) });
    }
    this.directionFrames.push({ tick, held });
    this.directionFrames = this.directionFrames.filter(frame => frame.tick > tick - 30 && frame.tick <= tick).slice(-240);
  }

  latest(): BufferedInput | undefined {
    return this.frames[this.frames.length - 1];
  }

  pressedWithin(action: Action, frames: number): boolean {
    const recent = this.recentFrames(frames);
    return recent.some((frame) => frame.pressed.has(action));
  }

  doubleTap(action: Action, within = 11): boolean {
    const recent = this.recentFrames(within);
    let presses = 0;
    let singleTick: number | undefined;
    const opposite = action === 'left' ? 'right' : action === 'right' ? 'left' : null;
    for (let i = recent.length - 1; i >= 0; i -= 1) {
      if (recent[i]?.pressed.has(action) && (!opposite || !recent[i]?.held.has(opposite))) {
        singleTick = recent[i]!.tick;
        presses += 1;
        if (presses >= 2) return true;
      }
    }
    if (singleTick === undefined) return false;
    // Two real presses can arrive before one render/capture. Reuse the ordered
    // direction history; duplicate snapshots and diagonal drags keep held=true
    // and therefore cannot manufacture another tap. No extra input history is kept.
    let wasHeld = this.directionFrames[0]?.held.has(action) ?? false;
    let taps = 0;
    for (let i = 1; i < this.directionFrames.length; i += 1) {
      const frame = this.directionFrames[i]!;
      const held = frame.held.has(action);
      if (frame.tick === singleTick && held && !wasHeld && (!opposite || !frame.held.has(opposite))) {
        taps += 1;
        if (taps >= 2) return true;
      }
      wasHeld = held;
    }
    return false;
  }

  motion(tokens: readonly string[], facing: 1 | -1, within = 16): boolean {
    const latest = this.latest();
    if (!latest) return false;
    const recent = this.directionFrames.filter(frame => frame.tick > latest.tick - within && frame.tick <= latest.tick);
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

  private recentFrames(within: number): readonly BufferedInput[] {
    const latest = this.latest();
    if (!latest) return [];
    // A paused scene can skip capture while the game tick keeps advancing.
    // Count elapsed ticks rather than the number of stored input snapshots.
    return this.frames.filter(frame => frame.tick > latest.tick - within && frame.tick <= latest.tick);
  }

  private directionToken(frame: Pick<BufferedInput, 'held'>, facing: 1 | -1): string {
    const vertical = frame.held.has('down') === frame.held.has('up') ? ''
      : frame.held.has('down') ? 'D' : 'U';
    const worldForward = facing === 1 ? 'right' : 'left';
    const worldBack = facing === 1 ? 'left' : 'right';
    const horizontal = frame.held.has(worldForward) === frame.held.has(worldBack) ? ''
      : frame.held.has(worldForward) ? 'F' : 'B';
    if (vertical === 'D' && horizontal === 'F') return 'DF';
    if (vertical === 'D' && horizontal === 'B') return 'DB';
    if (vertical === 'U' && horizontal === 'F') return 'UF';
    if (vertical === 'U' && horizontal === 'B') return 'UB';
    return vertical || horizontal || 'N';
  }
}
