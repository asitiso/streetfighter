import { sanitizeGameSave, DEFAULT_SAVE } from '../dist/assets/save/SaveManager.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const app = readFileSync(join(root, 'assets/core/GameApp.js'), 'utf8');
const options = readFileSync(join(root, 'assets/scenes/OptionsScene.js'), 'utf8');
const touch = readFileSync(join(root, 'assets/ui/TouchControls.js'), 'utf8');
const save = readFileSync(join(root, 'assets/save/SaveManager.js'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');
const checks = [
  [app.includes("id: 'options'"), 'title OPTIONS entry'],
  [options.includes('EDIT TOUCH LAYOUT'), 'layout edit overlay'],
  [options.includes('touchStickScale') && options.includes('touchButtonsX'), 'options persistence'],
  [touch.includes('setEditMode') && touch.includes('beginDrag'), 'drag layout editor'],
  [touch.includes('vibrate') && touch.includes('vibrationEnabled'), 'touch haptics toggle'],
  [touch.includes('if (!visible) this.releaseAll()'), 'hidden touch controls release held input'],
  [touch.includes('onDpadPointerMove') && touch.includes('dpadActionAt') && touch.includes('setDpadAction'), 'd-pad slide direction tracking'],
  [css.includes('button:nth-of-type(-n+3)'), 'top fight-button row selector'],
  [save.includes('touchStickScale') && save.includes('touchOpacity'), 'save defaults'],
];
for (const [pass, label] of checks) if (!pass) throw new Error(`OPTIONS VERIFY FAIL: ${label}`);

const positioned = sanitizeGameSave({
  ...DEFAULT_SAVE,
  touchStickX: 260,
  touchStickY: 180,
  touchButtonsX: 250,
  touchButtonsY: 170,
}).save;
if (positioned.touchStickX !== 260 || positioned.touchStickY !== 180 || positioned.touchButtonsX !== 250 || positioned.touchButtonsY !== 170) {
  throw new Error('OPTIONS VERIFY FAIL: touch positions were clamped during save sanitization');
}

console.log('OPTIONS_VERIFY_PASS', {
  checks: checks.map(([,label]) => label),
  persistedTouchLayout: {
    stick: [positioned.touchStickX, positioned.touchStickY],
    buttons: [positioned.touchButtonsX, positioned.touchButtonsY],
  },
});
import { fileURLToPath } from 'node:url';
