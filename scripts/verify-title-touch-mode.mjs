import assert from 'node:assert/strict';
import {TitleScene} from '../dist/assets/scenes/TitleScene.js';
const audio={unlock:()=>Promise.resolve(),startFrontendTheme(){},stopFrontendTheme(){}};
const modes=[];const scene=new TitleScene({},audio,[{id:'new-game',enabled:true}],undefined,undefined,active=>modes.push(active));
scene.enter();assert.deepEqual(modes,[true],'Entering title must request compact menu controls');
scene.exit();assert.deepEqual(modes,[true,false],'Leaving title must restore controls for the next screen');
scene.enter();scene.destroy();assert.deepEqual(modes,[true,false,true,false],'Destroyed title must release its menu mode');
console.log('TITLE_TOUCH_MODE_PASS',{enterExitDestroy:true});

const options = Array.from({length: 14}, (_, i) => ({
  id: i === 0 ? 'new-game' : 'options',
  label: 'OPTION ' + i,
  detail: '',
  enabled: i !== 1,
  action() {},
}));
const menu = new TitleScene({}, audio, options);
function capture(compact) {
  const rows = [];
  const labels = [];
  const gradient = {addColorStop() {}};
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'roundRect' ? (x, y, w, h) => rows.push(y + h)
      : key === 'fillText' ? (label, x, y) => labels.push({label, y})
      : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient
      : () => {},
  });
  menu.render({ctx, width: 1280, height: 720, compactTouchControls: compact});
  return {rows, labels};
}
const compact = capture(true);
assert.equal(compact.rows.length, options.length, 'Compact layout displays every menu row');
assert(Math.max(...compact.rows) <= 550, 'Rows fit above the touch footer');
assert(compact.labels.some(({label, y}) => label === '← → SELECT  •  CONFIRM' && y < 588));
menu.actionError = 'OPEN FAILED • RETRY';
assert(capture(true).labels.some(({label, y}) => label === menu.actionError && y < 588));
menu.actionError = '';
const desktop = capture(false);
assert.equal(Math.max(...desktop.rows), 651);
assert(desktop.labels.some(({label, y}) => label === '↑ ↓ SELECT  •  ENTER / START CONFIRM' && y === 674));
console.log('COMPACT_TITLE_FOOTER_PASS');
