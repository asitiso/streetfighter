import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const app = readFileSync(join(root, 'assets/core/GameApp.js'), 'utf8');
const options = readFileSync(join(root, 'assets/scenes/OptionsScene.js'), 'utf8');
const touch = readFileSync(join(root, 'assets/ui/TouchControls.js'), 'utf8');
const save = readFileSync(join(root, 'assets/save/SaveManager.js'), 'utf8');
const checks = [
  [app.includes("id: 'options'"), 'title OPTIONS entry'],
  [options.includes('EDIT TOUCH LAYOUT'), 'layout edit overlay'],
  [options.includes('touchStickScale') && options.includes('touchButtonsX'), 'options persistence'],
  [touch.includes('setEditMode') && touch.includes('beginDrag'), 'drag layout editor'],
  [touch.includes('vibrate') && touch.includes('vibrationEnabled'), 'touch haptics toggle'],
  [save.includes('touchStickScale') && save.includes('touchOpacity'), 'save defaults'],
];
for (const [pass, label] of checks) if (!pass) throw new Error(`OPTIONS VERIFY FAIL: ${label}`);
console.log('OPTIONS_VERIFY_PASS', checks.map(([,label]) => label));
import { fileURLToPath } from 'node:url';
