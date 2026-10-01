import type { AudioManager } from '../core/AudioManager.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import { Stage1Scene } from './Stage1Scene.js';
import type { StageResult } from '../game/StageResult.js';

export class Stage3Scene extends Stage1Scene {
  constructor(input: InputManager, audio: AudioManager, playerDef: CharacterDef, superArt: SuperArtDef, onClear?: (result: StageResult) => void, onDefeat?: () => void) {
    super(input, audio, playerDef, superArt, 3, onClear, onDefeat);
  }
}
